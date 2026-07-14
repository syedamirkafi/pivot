import { CVContent } from '../types';

export const MASTER_CV_TEXT = `Personal Information
Name: [Your Full Name]
Location: [Your City, Country]
Phone: [Your Phone Number]
Email: [your.email@example.com]
LinkedIn: [https://www.linkedin.com/in/your-profile]

Profile
[Write a 2-3 sentence professional summary highlighting your key strengths and career objectives.]

Education
[Your Highest Degree] – [Your Field of Study]
[Your University], [Your City, Country]
[Start Date] – [End Date]
[Key Focus Areas or Achievements]

Core Skills
[Category 1]
• [Skill 1]
• [Skill 2]

[Category 2]
• [Skill 1]
• [Skill 2]

Tools & Platforms
• [Tool 1]
• [Tool 2]
• [Tool 3]

Professional Experience 
[Job Title] – [Company Name], [Location]
[Start Date] – [End Date]
• [Achievement 1 with metric if possible]
• [Achievement 2]
• [Achievement 3]

[Previous Job Title] – [Company Name], [Location]
[Start Date] – [End Date]
• [Achievement 1]
• [Achievement 2]

Languages 
• [Language 1] – [Level]
• [Language 2] – [Level]

Availability 
[Your availability and work arrangement preferences]`;

export const masterCVContent: CVContent = {
  personalInfo: {
    fullName: '[Your Full Name]',
    title: '[Your Job Title or Field of Study]',
    email: '[your.email@example.com]',
    phone: '[Your Phone Number]',
    location: '[Your City, Country]',
    linkedin: '[https://www.linkedin.com/in/your-profile]',
    github: '[https://github.com/your-username]'
  },
  summary: '[Write a 2-3 sentence professional summary highlighting your key strengths and career objectives.]',
  experience: [
    {
      id: 'exp1',
      role: '[Your Current/Most Recent Job Title]',
      company: '[Company Name], [Location]',
      period: '[Start Date] – [End Date]',
      bullets: [
        '[Achievement 1 with metric if possible]',
        '[Achievement 2]',
        '[Achievement 3]'
      ]
    },
    {
      id: 'exp2',
      role: '[Previous Job Title]',
      company: '[Company Name], [Location]',
      period: '[Start Date] – [End Date]',
      bullets: [
        '[Achievement 1]',
        '[Achievement 2]',
        '[Achievement 3]'
      ]
    }
  ],
  skills: ['[Skill 1]', '[Skill 2]', '[Skill 3]', '[Skill 4]', '[Skill 5]'],
  education: [
    {
      id: 'edu1',
      degree: '[Your Highest Degree]',
      school: '[Your University], [Location]',
      period: '[Start Date] – [End Date]',
      gpa: '[Your GPA or Key Achievement]'
    }
  ],
  projects: [],
  certifications: [],
  languages: [
    { id: 'lang1', name: '[Language 1]', level: '[Level]' },
    { id: 'lang2', name: '[Language 2]', level: '[Level]' }
  ]
};
