import express from 'express';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import dns from 'dns';
import rateLimit from 'express-rate-limit';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
const firebaseApp = initializeApp();
const auth = getAuth(firebaseApp);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

// --- Rate Limiting ---

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { status: 429, message: 'Too many requests, please try again later.' },
});

const aiEndpointLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { status: 429, message: 'AI request limit reached. Please wait a moment before trying again.' },
});

const proxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { status: 429, message: 'Proxy request limit reached. Please wait a moment.' },
});

app.use('/api', globalLimiter);

// --- Authentication Middleware ---

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- SSRF Protection ---

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^ffff:127\./,
  /^ffff:10\./,
  /^ffff:172\./,
  /^ffff:192\.168\./,
];

function isPrivateOrReservedIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

function isAllowedExtractHost(hostname: string): boolean {
  const allowed = [
    'linkedin.com', 'www.linkedin.com',
    'indeed.com', 'www.indeed.com',
    'glassdoor.com', 'www.glassdoor.com',
    'stepstone.de', 'www.stepstone.de',
    'xing.com', 'www.xing.com',
    'google.com', 'www.google.com',
  ];
  return allowed.includes(hostname.toLowerCase());
}

async function validateUrlForFetch(urlString: string, allowListCheck?: (hostname: string) => boolean): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (allowListCheck && !allowListCheck(hostname)) {
    throw new Error(`Hostname "${hostname}" is not on the allowed list`);
  }

  // DNS resolution to catch DNS rebinding
  const addresses = await new Promise<string[]>((resolve, reject) => {
    dns.resolve4(hostname, (err, addrs) => {
      if (err) {
        // Try resolve6 as fallback
        dns.resolve6(hostname, (err6, addrs6) => {
          if (err6) reject(new Error(`DNS resolution failed for "${hostname}"`));
          else resolve(addrs6);
        });
      } else {
        resolve(addrs);
      }
    });
  });

  for (const addr of addresses) {
    if (isPrivateOrReservedIP(addr)) {
      throw new Error(`URL resolves to a private/reserved IP address: ${addr}`);
    }
  }
}

// Helper to get Gemini client
function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  return new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper to retry AI calls on transient errors
async function callAIWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient = error.status === 503 || error.status === 429 || (error.error && (error.error.code === 503 || error.error.code === 429));
    if (retries > 0 && isTransient) {
      console.warn(`Retrying AI call due to transient error. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper for Auth
function getOAuthClient(req: express.Request) {
  const token = req.headers['x-google-access-token'] as string;
  if (!token) {
    throw new Error('Missing X-Google-Access-Token header');
  }
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  return oauth2Client;
}

// 1. Analyze CV against Job Description
app.post('/api/analyze', requireAuth, aiEndpointLimiter, upload.single('cv'), async (req, res) => {
  try {
    const jobDescription = req.body.jobDescription;
    const cvText = req.body.cvText;
    const file = req.file;

    if (!jobDescription || (!file && !cvText)) {
      return res.status(400).json({ error: 'Missing jobDescription, and neither cv file nor cvText was provided' });
    }

    const ai = getGenAI();
    
    const prompt = `
      You are an expert ATS and career coach.
      Analyze this CV against the following job description.
      Provide a JSON response matching this EXACT TypeScript schema:
      {
        "score": number, // Overall ATS match score (0-100)
        "skillGaps": string[], // Skills missing from CV
        "missingKeywords": string[], // Important keywords missing from CV
        "recommendations": string[], // Improvement recommendations
        "extractedInfo": {
          "role": string, // Title/role extracted from JD (e.g., "Business Analyst Intern")
          "experience": string, // Experience required extracted from JD (e.g., "0-2 years")
          "location": string, // Location extracted from JD (e.g., "Düsseldorf, Germany")
          "employmentType": string, // Employment type extracted from JD (e.g., "Internship")
          "industry": string // Industry category extracted from JD (e.g., "Pharmaceutical")
        },
        "matchBreakdown": {
          "skills": number, // Match score for skills (0-100)
          "experience": number, // Match score for experience (0-100)
          "education": number, // Match score for education (0-100)
          "keywords": number, // Match score for keywords (0-100)
          "otherFactors": number // Match score for other factors (0-100)
        },
        "skillsList": Array<{
          "name": string, // The skill name (e.g., "Business Analysis", "SAP")
          "status": "matched" | "partial" | "missing" // Whether this skill matches the CV
        }> // Extract 8-12 key skills from the job description and evaluate their status against the CV
      }
      
      Job Description:
      ${jobDescription}
    `;

    let response;
    if (file) {
      response = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: file.buffer.toString('base64'),
                  mimeType: file.mimetype,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        }
      }));
    } else {
      response = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt + `\n\nCV/Resume Content:\n${cvText}` }
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        }
      }));
    }

    if (response.text) {
      const data = JSON.parse(response.text);
      res.json(data);
    } else {
      res.status(500).json({ error: 'Failed to generate analysis' });
    }
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract text from an uploaded resume PDF
app.post('/api/extract-resume-text', requireAuth, aiEndpointLimiter, upload.single('cv'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Missing cv file' });
    }
    const ai = getGenAI();
    const prompt = `
      You are an expert resume parser.
      Extract all text from this CV/resume PDF and format it in clean, well-structured, professional plain text.
      Maintain headers, bullet points, contact info, and structure so it is highly legible. Do not use Markdown styling.
    `;
    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype,
              },
            },
          ],
        },
      ],
    }));
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Extract resume text error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Generate CV & Cover Letter in Google Docs with ATS Optimization and Dual-Pass Check
app.post('/api/generate-docs', requireAuth, aiEndpointLimiter, upload.single('cv'), async (req, res) => {
  try {
    const jobDescription = req.body.jobDescription;
    const targetLanguage = req.body.language || 'English'; // English or German
    const cvText = req.body.cvText;
    const file = req.file;
    const oauth2Client = getOAuthClient(req);

    if (!jobDescription || (!file && !cvText)) {
      return res.status(400).json({ error: 'Missing jobDescription, and neither cv file nor cvText was provided' });
    }

    const ai = getGenAI();
    
    // Generate CV Content
    const cvPrompt = `
      You are an expert resume writer.
      Rewrite and optimize this CV/resume for the given job description.
      
      IMPORTANT: Specifically target and integrate any missing skills, gaps, or critical keywords required for the job description. Highlight relevant experiences, framing them to professionally showcase the required qualifications without fabricating facts. Ensure the CV gets a maximum possible ATS match percentage.
      
      Output ONLY the raw text for the CV. Do NOT use markdown.
      The output should be structured clearly with Name/Contact, Summary, Experience, Education, Skills.
      Language: ${targetLanguage}
      
      Job Description:
      ${jobDescription}
    `;

    let cvResponse;
    if (file) {
      cvResponse = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: cvPrompt },
              {
                inlineData: {
                  data: file.buffer.toString('base64'),
                  mimeType: file.mimetype,
                },
              },
            ],
          },
        ],
      }));
    } else {
      cvResponse = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: cvPrompt + `\n\nOriginal CV Content:\n${cvText}` }
            ],
          },
        ],
      }));
    }

    // Generate Cover Letter
    const clPrompt = `
      You are an expert career coach.
      Write a compelling cover letter based on this CV for the given job description.
      IMPORTANT: Frame the qualifications and experiences to strongly target the job description, integrating missing skills and key keywords in a highly persuasive, natural manner.
      Output ONLY the raw text for the cover letter. Do NOT use markdown.
      Language: ${targetLanguage}
      
      Job Description:
      ${jobDescription}
    `;

    let clResponse;
    if (file) {
      clResponse = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: clPrompt },
              {
                inlineData: {
                  data: file.buffer.toString('base64'),
                  mimeType: file.mimetype,
                },
              },
            ],
          },
        ],
      }));
    } else {
      clResponse = await callAIWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: clPrompt + `\n\nOriginal CV Content:\n${cvText}` }
            ],
          },
        ],
      }));
    }

    const generatedCV = cvResponse.text || '';
    const generatedCL = clResponse.text || '';

    // Create the dual-pass improved ATS analysis on the optimized CV
    const improvedPrompt = `
      You are an expert ATS and career coach.
      Analyze this newly tailored CV against the following job description to verify how well it now matches.
      Provide a JSON response with:
      - score: A number from 0-100 indicating ATS match (which should be significantly higher, ideally close to 90-100%).
      - skillGaps: Array of strings of skills still missing (should be minimal or empty).
      - missingKeywords: Array of strings of important keywords still missing (should be minimal or empty).
      - recommendations: Array of strings for further improvement.
      
      Job Description:
      ${jobDescription}

      Tailored CV Content:
      ${generatedCV}
    `;

    const improvedResponse = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: improvedPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    }));

    let improvedAnalysis = null;
    if (improvedResponse.text) {
      try {
        improvedAnalysis = JSON.parse(improvedResponse.text);
      } catch (e) {
        console.error('Failed to parse improved analysis JSON:', e);
      }
    }

    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    
    // Create CV Doc
    const cvDocRes = await docs.documents.create({
      requestBody: { title: `Optimized CV - ${targetLanguage}` },
    });
    const cvDocId = cvDocRes.data.documentId!;
    await docs.documents.batchUpdate({
      documentId: cvDocId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: generatedCV } }],
      },
    });

    // Create Cover Letter Doc
    const clDocRes = await docs.documents.create({
      requestBody: { title: `Cover Letter - ${targetLanguage}` },
    });
    const clDocId = clDocRes.data.documentId!;
    await docs.documents.batchUpdate({
      documentId: clDocId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: generatedCL } }],
      },
    });

    res.json({
      cvUrl: `https://docs.google.com/document/d/${cvDocId}/edit`,
      coverLetterUrl: `https://docs.google.com/document/d/${clDocId}/edit`,
      cvText: generatedCV,
      clText: generatedCL,
      improvedAnalysis
    });

  } catch (error: any) {
    console.error('Generate docs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Extract Job Details from URL
app.post('/api/extract-job-details', requireAuth, aiEndpointLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // SSRF protection: validate URL before fetching
    try {
      await validateUrlForFetch(url, isAllowedExtractHost);
    } catch (e: any) {
      return res.status(400).json({ error: `URL rejected: ${e.message}` });
    }

    let webpageText = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const html = await response.text();
        let text = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
        text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/\s+/g, ' ').trim();
        webpageText = text.substring(0, 8000);
      }
    } catch (fetchErr) {
      console.warn('Failed to fetch URL directly, falling back to URL-only analysis:', fetchErr);
    }

    const ai = getGenAI();
    const prompt = `
      You are an expert recruiter and parser.
      Analyze the following job posting URL and webpage content to extract structural job details.
      
      URL: ${url}
      Webpage content snippet: ${webpageText || 'Could not fetch page content directly'}
      
      Please return a clean JSON response with the following fields:
      - company: The hiring company name (e.g. "Google", "Microsoft", "Stripe")
      - role: The job title or role (e.g. "Working Student Software Engineer", "Product Manager Internship")
      - status: Must be exactly one of: "Draft", "Applied", "Interview", "Offer", "Rejected" (default to "Draft")
      - jobDescription: A concise summary of the key responsibilities and required skills.
      
      Ensure the output is valid JSON and matches the requested keys exactly.
    `;

    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    }));

    if (response.text) {
      const data = JSON.parse(response.text);
      res.json(data);
    } else {
      res.status(500).json({ error: 'Failed to extract job details' });
    }
  } catch (error: any) {
    console.error('Extract job details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Generate CV Text Only
app.post('/api/generate-cv-text', requireAuth, aiEndpointLimiter, async (req, res) => {
  try {
    const { jobDescription, cvText, language = 'English' } = req.body;
    if (!jobDescription || !cvText) {
      return res.status(400).json({ error: 'Missing jobDescription or cvText' });
    }

    const ai = getGenAI();
    const cvPrompt = `
      You are an expert resume writer.
      Rewrite and optimize this CV/resume for the given job description.
      
      IMPORTANT: Specifically target and integrate any missing skills, gaps, or critical keywords required for the job description. Highlight relevant experiences, framing them to professionally showcase the required qualifications without fabricating facts. Ensure the CV gets a maximum possible ATS match percentage.
      
      Output ONLY the raw text for the CV. Do NOT use markdown formatting outside of basic structure (like ## for headers if needed, matching the input format). Do NOT wrap the response in markdown code blocks. The output should be strictly formatted to match the style of the provided CV so it can be parsed properly into a PDF.
      Language: ${language}
      
      Job Description:
      ${jobDescription}
    `;

    const cvResponse = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: cvPrompt + `\n\nOriginal CV Content:\n${cvText}` }
          ],
        },
      ],
    }));

    res.json({ cvText: cvResponse.text });
  } catch (error: any) {
    console.error('Generate CV text error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Generate Cover Letter Text Only
app.post('/api/generate-cl-text', requireAuth, aiEndpointLimiter, async (req, res) => {
  try {
    const { jobDescription, cvText, language = 'English' } = req.body;
    if (!jobDescription || !cvText) {
      return res.status(400).json({ error: 'Missing jobDescription or cvText' });
    }

    const ai = getGenAI();
    const clPrompt = `
      You are an expert career coach.
      Write a compelling cover letter based on this CV for the given job description.
      IMPORTANT: Frame the qualifications and experiences to strongly target the job description, integrating missing skills and key keywords in a highly persuasive, natural manner.
      Output ONLY the raw text for the cover letter. Do NOT use markdown outside of basic structure if needed. Do NOT wrap the response in markdown code blocks. The output should be strictly formatted as plain text.
      Language: ${language}
      
      Job Description:
      ${jobDescription}
    `;

    const clResponse = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: clPrompt + `\n\nOriginal CV Content:\n${cvText}` }
          ],
        },
      ],
    }));

    res.json({ clText: clResponse.text });
  } catch (error: any) {
    console.error('Generate CL text error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chatbot Endpoint
app.post('/api/chat', requireAuth, aiEndpointLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages array' });
    }

    const ai = getGenAI();
    const systemInstruction = 'You are an expert career coach helping a user optimize their resume, write cover letters, and prepare for interviews.';

    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await callAIWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
      }
    }));

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for the web browser to bypass iframe restrictions
app.get('/api/proxy', requireAuth, proxyLimiter, async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }

    // SSRF protection: validate URL before fetching (no hostname allowlist for browser, but block private IPs)
    try {
      await validateUrlForFetch(targetUrl);
    } catch (e: any) {
      return res.status(400).send(`URL rejected: ${e.message}`);
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000)
    });

    const contentType = response.headers.get('content-type');

    // Forward only safe headers (allowlist instead of blocklist)
    const SAFE_HEADERS = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'expires'];
    for (const key of SAFE_HEADERS) {
      const value = response.headers.get(key);
      if (value) {
        res.setHeader(key, value);
      }
    }

    res.status(response.status);

    if (contentType && contentType.includes('text/html')) {
      let html = await response.text();
      // Inject base tag to fix relative links and assets
      const urlObj = new URL(targetUrl);
      const origin = urlObj.origin;
      const pathDir = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
      const baseHref = origin + pathDir;
      
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head><base href="${baseHref}">`);
      } else {
        html = `<head><base href="${baseHref}"></head>` + html;
      }
      res.send(html);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).send(`Failed to proxy: ${error.message}`);
  }
});

// API fallback for debugging
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: `API route not found: ${req.method} ${req.url}`,
    hint: 'Check if the route is defined correctly in server.ts'
  });
});


async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
