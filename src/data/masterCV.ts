import { CVContent } from '../types';

export const MASTER_CV_TEXT = `Personal Information
Name:  [REDACTED]
Location:  [REDACTED]6, Hamm, Germany 
Phone: +4915751443523 
Email: syedamirkafi@mail.com 
LinkedIn: https://www.linkedin.com/in/ [REDACTED] 

Profile
Master’s student in International Management & Information Systems with a strong focus on digital communication and collaboration in global IT environments. Experienced in translating complex technical and data-driven topics into clear communication, presentations and reports for diverse audiences. Skilled in supporting teams with structured content using digital tools such as SharePoint and Microsoft 365. Motivated to contribute to global IT initiatives, communication campaigns and executive-level reporting.

Education
Master of Arts – International Management & Information Systems (IMIS) 
Fachhochschule Südwestfalen, Soest, Germany 
Mar 2025 – Present 
Currently in the fourth semester 
Relevant Focus Areas: Information Systems, Digital Transformation, Data Analysis, Business Process Management 

Bachelor of Business Administration (B.B.A.) – Management Studies 
University of Rajshahi, Bangladesh 
Jan 2017 – Sep 2022 
Final Grade: 2.3 (German equivalent) 

Core Skills
IT & Digitalization 
• Understanding of IT systems, enterprise processes, and digital transformation 
• Data analysis, reporting, and insights for decision-making 

IT Communication & Collaboration 
• Executive presentation content creation and development (PowerPoint) 
• Translating complex IT topics into clear business communication for teammates 
• Global team collaboration and stakeholder communication 
• Supporting communication campaigns and internal initiatives 

Tools & Platforms 
• Microsoft Excel (Advanced – Pivot Tables, Lookups, Reporting) 
• Power BI - Basic power querying, data transformation and Data visualization 
• Microsoft PowerPoint, Word - professional fluency 
• Microsoft Teams, SharePoint, Slack and other collaboration tools 
• Jira, Notion 
• AI tools (ChatGPT, Gemini) for structured content and productivity
 
Professional Experience 
Working Student – Picnic Technologies, Hamm, Germany 
Oct 2024 – Present 
• Support operational and digital processes in a fast-paced e-commerce and logistics environment 
• Collaborate with cross-functional teams to improve efficiency and workflow coordination 
• Work with digital tools and internal systems to support daily operations and communication 

Territory Officer – Robi Axiata Ltd., Bangladesh 
Jan 2024 – Mar 2024 
• Managed sales operations, logistics coordination, and reporting for an assigned territory 
• Increased territory sales by 18% through data-driven stock planning and route optimization 
• Analyzed performance data and supported decision-making processes 
• Ranked 13th nationwide for territory performance 

Academic Writer – Assignoholic Research & Consultancy, Bangladesh 
Nov 2022 – Jun 2023 
• Conducted research, data analysis, and structured documentation for business and IT related projects 
• Produced reports, presentations, and analytical content explaining complex topics clearly 
• Managed multiple assignments with strong attention to detail and deadlines 

Internship – Dhaka Bank Ltd., Bangladesh 
Mar 2022 – May 2022 
• Supported banking operations, documentation and internal processes 
• Processed primarily with financial records, account openings and loan applications 
• Assisted in operational reporting and administrative coordination

Languages 
• English – C1 (CEFR) 
• German – A2 (CEFR, improving) 
• Bengali – Native 

Additional Strengths 
• Strong attention to detail in communication and documentation 
• Ability to explain technical concepts to non-technical audiences 
• Organized, self-driven, and collaborative team player 
• Interest in global IT strategy, digital communication, and internal engagement initiatives 

Availability 
Available as a Working Student (Werkstudent), up to 20 hours per week during the semester.`;

export const masterCVContent: CVContent = {
  personalInfo: {
    fullName: 'Syed Amir Kafi',
    title: 'International Management & Information Systems Student',
    email: 'syedamirkafi@mail.com',
    phone: '+4915751443523',
    location: ' [REDACTED]6, Hamm, Germany',
    linkedin: 'https://www.linkedin.com/in/syedamirkafi',
    github: ''
  },
  summary: 'Master’s student in International Management & Information Systems with a strong focus on digital communication and collaboration in global IT environments. Experienced in translating complex technical and data-driven topics into clear communication, presentations and reports for diverse audiences. Skilled in supporting teams with structured content using digital tools such as SharePoint and Microsoft 365. Motivated to contribute to global IT initiatives, communication campaigns and executive-level reporting.',
  experience: [
    {
      id: 'exp1',
      role: 'Working Student',
      company: 'Picnic Technologies, Hamm, Germany',
      period: 'Oct 2024 – Present',
      bullets: [
        'Support operational and digital processes in a fast-paced e-commerce and logistics environment',
        'Collaborate with cross-functional teams to improve efficiency and workflow coordination',
        'Work with digital tools and internal systems to support daily operations and communication'
      ]
    },
    {
      id: 'exp2',
      role: 'Territory Officer',
      company: 'Robi Axiata Ltd., Bangladesh',
      period: 'Jan 2024 – Mar 2024',
      bullets: [
        'Managed sales operations, logistics coordination, and reporting for an assigned territory',
        'Increased territory sales by 18% through data-driven stock planning and route optimization',
        'Analyzed performance data and supported decision-making processes',
        'Ranked 13th nationwide for territory performance'
      ]
    },
    {
      id: 'exp3',
      role: 'Academic Writer',
      company: 'Assignoholic Research & Consultancy, Bangladesh',
      period: 'Nov 2022 – Jun 2023',
      bullets: [
        'Conducted research, data analysis, and structured documentation for business and IT related projects',
        'Produced reports, presentations, and analytical content explaining complex topics clearly',
        'Managed multiple assignments with strong attention to detail and deadlines'
      ]
    },
    {
      id: 'exp4',
      role: 'Intern',
      company: 'Dhaka Bank Ltd., Bangladesh',
      period: 'Mar 2022 – May 2022',
      bullets: [
        'Supported banking operations, documentation and internal processes',
        'Processed primarily with financial records, account openings and loan applications',
        'Assisted in operational reporting and administrative coordination'
      ]
    }
  ],
  skills: [
    'Microsoft Excel (Advanced)', 'Power BI', 'Microsoft PowerPoint', 'Microsoft Word', 'Microsoft Teams', 'SharePoint', 'Slack', 'Jira', 'Notion', 'AI tools (ChatGPT, Gemini)'
  ],
  education: [
    {
      id: 'edu1',
      degree: 'Master of Arts – International Management & Information Systems (IMIS)',
      school: 'Fachhochschule Südwestfalen, Soest, Germany',
      period: 'Mar 2025 – Present',
      gpa: 'Currently in the fourth semester'
    },
    {
      id: 'edu2',
      degree: 'Bachelor of Business Administration (B.B.A.) – Management Studies',
      school: 'University of Rajshahi, Bangladesh',
      period: 'Jan 2017 – Sep 2022',
      gpa: 'Final Grade: 2.3 (German equivalent)'
    }
  ],
  projects: [],
  certifications: [],
  languages: [
    { id: 'lang1', name: 'English', level: 'C1 (CEFR)' },
    { id: 'lang2', name: 'German', level: 'A2 (CEFR, improving)' },
    { id: 'lang3', name: 'Bengali', level: 'Native' }
  ]
};
