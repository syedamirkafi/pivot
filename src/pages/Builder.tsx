import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResumePDF } from '../components/ResumePDF';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Download, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  GripVertical, 
  BookOpen, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Layout, 
  FileText, 
  Sliders, 
  Layers, 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Github, 
  CheckCircle, 
  MoreVertical,
  X,
  PlusCircle,
  EyeOff
} from 'lucide-react';
import { User } from '../types';
import { masterCVContent } from '../data/masterCV';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, setDoc } from '../firebase';

interface CVContent {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  experience: {
    id: string;
    role: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  skills: string[];
  education: {
    id: string;
    degree: string;
    school: string;
    period: string;
    gpa?: string;
  }[];
  projects: {
    id: string;
    title: string;
    period: string;
    description: string;
  }[];
  certifications: {
    id: string;
    name: string;
    year: string;
  }[];
  languages: {
    id: string;
    name: string;
    level: string;
  }[];
}

const defaultCVContent: CVContent = masterCVContent;
const colorsList = [
  { name: 'Purple', hex: '#A855F7', class: 'bg-[#A855F7]' },
  { name: 'Blue', hex: '#3B82F6', class: 'bg-[#3B82F6]' },
  { name: 'Green', hex: '#10B981', class: 'bg-[#10B981]' },
  { name: 'Orange', hex: '#F97316', class: 'bg-[#F97316]' },
  { name: 'Pink', hex: '#EC4899', class: 'bg-[#EC4899]' },
  { name: 'Dark Grey', hex: '#374151', class: 'bg-[#374151]' },
  { name: 'Dark Blue', hex: '#1E3A8A', class: 'bg-[#1E3A8A]' },
  { name: 'Dark Green', hex: '#064E3B', class: 'bg-[#064E3B]' },
  { name: 'Red', hex: '#EF4444', class: 'bg-[#EF4444]' },
  { name: 'Teal', hex: '#14B8A6', class: 'bg-[#14B8A6]' }
];

const fontsList = ['Inter', 'Playfair Display', 'JetBrains Mono', 'Outfit', 'Poppins', 'Lato'];

export interface CVListItem {
  id: string;
  name: string;
  content: CVContent;
  template?: string;
  color?: string;
  font?: string;
  fontSize?: number;
  spacing?: string;
  margins?: 'Narrow' | 'Normal' | 'Wide';
  showIcons?: boolean;
  showDividers?: boolean;
}

export function Builder({ user }: { user: User }) {
  // Customization Settings
  const [activeTemplate, setActiveTemplate] = useState<'single' | 'two-column' | 'accent' | 'executive'>('single');
  const [activeColor, setActiveColor] = useState('Purple');
  const [activeFont, setActiveFont] = useState('Inter');
  const [fontSize, setFontSize] = useState(10); // in pt
  const [spacing, setSpacing] = useState<'Compact' | 'Normal' | 'Spacious'>('Normal');
  const [margins, setMargins] = useState<'Narrow' | 'Normal' | 'Wide'>('Normal');
  const [showIcons, setShowIcons] = useState(true);
  const [showDividers, setShowDividers] = useState(true);

  // Pagination & Auto-Scaling States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cvPrintAreaRef = React.useRef<HTMLDivElement>(null);

  // Data state
  const [cvName, setCvName] = useState('Software Engineer CV');
  const [cvContent, setCvContent] = useState<CVContent>(defaultCVContent);
  const [cvs, setCvs] = useState<CVListItem[]>([]);
  const [activeCvId, setActiveCvId] = useState<string>('default-cv');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Error'>('Saved');
  const [isExporting, setIsExporting] = useState(false);

  const exportCVAsPDF = async () => {
    if (!cvPrintAreaRef.current) return;
    setIsExporting(true);
    try {
      const originalTransform = cvPrintAreaRef.current.style.transform;
      cvPrintAreaRef.current.style.transform = 'none';

      const canvas = await html2canvas(cvPrintAreaRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        logging: false,
        windowWidth: 794,
        windowHeight: 1123
      });
      
      cvPrintAreaRef.current.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`${cvName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Interactive left sidebar editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Export States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(null);
  const [googleDocTitle, setGoogleDocTitle] = useState<string | null>(null);

  const buildDocsText = (content: CVContent) => {
    let text = "";
    text += `${content.personalInfo.fullName.toUpperCase()}\n`;
    text += `${content.personalInfo.title.toUpperCase()}\n\n`;
    text += `CONTACT INFORMATION\n`;
    text += `Email: ${content.personalInfo.email}\n`;
    text += `Phone: ${content.personalInfo.phone}\n`;
    text += `Location: ${content.personalInfo.location}\n`;
    if (content.personalInfo.linkedin) text += `LinkedIn: ${content.personalInfo.linkedin}\n`;
    if (content.personalInfo.github) text += `GitHub: ${content.personalInfo.github}\n`;
    text += `--------------------------------------------------\n\n`;
    
    if (content.summary) {
      text += `PROFESSIONAL SUMMARY\n`;
      text += `${content.summary}\n`;
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.experience && content.experience.length > 0) {
      text += `WORK EXPERIENCE\n`;
      content.experience.forEach(exp => {
        text += `${exp.role} | ${exp.company} (${exp.period})\n`;
        exp.bullets.forEach(b => {
          text += `- ${b}\n`;
        });
        text += `\n`;
      });
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.skills && content.skills.length > 0) {
      text += `SKILLS\n`;
      text += `${content.skills.join(', ')}\n`;
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.education && content.education.length > 0) {
      text += `EDUCATION\n`;
      content.education.forEach(edu => {
        text += `${edu.degree} | ${edu.school} (${edu.period})\n`;
        if (edu.gpa) text += `${edu.gpa}\n`;
        text += `\n`;
      });
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.projects && content.projects.length > 0) {
      text += `PROJECTS\n`;
      content.projects.forEach(proj => {
        text += `${proj.title} (${proj.period})\n`;
        if (proj.description) text += `${proj.description}\n`;
        text += `\n`;
      });
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.certifications && content.certifications.length > 0) {
      text += `CERTIFICATIONS\n`;
      content.certifications.forEach(cert => {
        text += `${cert.name} (${cert.year})\n`;
      });
      text += `--------------------------------------------------\n\n`;
    }
    
    if (content.languages && content.languages.length > 0) {
      text += `LANGUAGES\n`;
      content.languages.forEach(lang => {
        text += `${lang.name} - ${lang.level}\n`;
      });
      text += `--------------------------------------------------\n\n`;
    }
    
    return text;
  };

  const handleExportToGoogleDocs = async () => {
    setExportLoading(true);
    setExportError(null);
    setGoogleDocUrl(null);
    
    try {
      throw new Error("Google Sign-In is not available in offline mode. Export to Google Docs requires authentication.");
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Load CVs from Firestore
  useEffect(() => {
    async function loadDocs() {
      try {
        const q = query(collection(db, 'resumes'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const docs: CVListItem[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let parsedContent: CVContent = defaultCVContent;
          try {
            if (data.content) {
              parsedContent = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            }
          } catch (e) {
            console.error('Error parsing CV content', e);
          }
          return {
            id: doc.id,
            name: data.name || 'Untitled CV',
            content: parsedContent,
            template: data.template || 'single',
            color: data.color || 'Purple',
            font: data.font || 'Inter',
            fontSize: data.fontSize || 10,
            spacing: data.spacing || 'Normal',
            margins: data.margins || 'Normal',
            showIcons: data.showIcons !== undefined ? data.showIcons : true,
            showDividers: data.showDividers !== undefined ? data.showDividers : true
          };
        });

        if (docs.length > 0) {
          setCvs(docs);
          setActiveCvId(docs[0].id);
          setCvName(docs[0].name);
          setCvContent(docs[0].content);
          
          // Load styling states
          if (docs[0].template) setActiveTemplate(docs[0].template as any);
          if (docs[0].color) setActiveColor(docs[0].color);
          if (docs[0].font) setActiveFont(docs[0].font);
          if (docs[0].fontSize) setFontSize(docs[0].fontSize);
          if (docs[0].spacing) setSpacing(docs[0].spacing as any);
          if (docs[0].margins) setMargins(docs[0].margins as any);
          if (docs[0].showIcons !== undefined) setShowIcons(docs[0].showIcons);
          if (docs[0].showDividers !== undefined) setShowDividers(docs[0].showDividers);
          
          // Auto open Personal Info
          setEditingSection('Personal Info');
        } else {
          // No documents: setup default CV in firestore immediately
          const newDocPayload = {
            name: 'Software Engineer CV',
            content: JSON.stringify(defaultCVContent),
            userId: user.uid,
            createdAt: Date.now(),
            template: 'single',
            color: 'Purple',
            font: 'Inter',
            fontSize: 10,
            spacing: 'Normal',
            margins: 'Normal',
            showIcons: true,
            showDividers: true
          };
          const docRef = await addDoc(collection(db, 'resumes'), newDocPayload);
          const defaultCVItem: CVListItem = {
            id: docRef.id,
            name: 'Software Engineer CV',
            content: defaultCVContent,
            template: 'single',
            color: 'Purple',
            font: 'Inter',
            fontSize: 10,
            spacing: 'Normal',
            margins: 'Normal',
            showIcons: true,
            showDividers: true
          };
          setCvs([defaultCVItem]);
          setActiveCvId(docRef.id);
          setEditingSection('Personal Info');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'resumes');
      }
    }
    loadDocs();
  }, [user.uid]);

  // Responsive scaling logic using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // Target unscaled A4 page width is exactly 794px
        const targetWidth = 794;
        // Subtract 16px safety margin for the scrollbar to guarantee no horizontal scrollbar is triggered
        const computedScale = Math.min(1, (width - 16) / targetWidth);
        setScale(Math.max(0.2, computedScale));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Measure content height and dynamically update pages count
  useEffect(() => {
    if (!cvPrintAreaRef.current) return;
    // Standard A4 height is exactly 1123px (297mm) at 96 DPI
    const unscaledHeight = cvPrintAreaRef.current.scrollHeight;
    const pages = Math.max(1, Math.ceil(unscaledHeight / 1122));
    setTotalPages(pages);
    
    // Safety guard current page range
    if (currentPage > pages) {
      setCurrentPage(pages);
    }
  }, [cvContent, activeTemplate, spacing, fontSize, activeFont, showDividers, scale]);

  // Autosave to firestore when layout or content changes
  const saveCV = async (
    updatedName?: string, 
    updatedContent?: CVContent,
    customStyle?: {
      template?: string;
      color?: string;
      font?: string;
      fontSize?: number;
      spacing?: string;
      margins?: string;
      showIcons?: boolean;
      showDividers?: boolean;
    }
  ) => {
    setSaveStatus('Saving');
    const targetName = updatedName !== undefined ? updatedName : cvName;
    const targetContent = updatedContent !== undefined ? updatedContent : cvContent;

    const t = customStyle?.template !== undefined ? customStyle.template : activeTemplate;
    const c = customStyle?.color !== undefined ? customStyle.color : activeColor;
    const f = customStyle?.font !== undefined ? customStyle.font : activeFont;
    const fs = customStyle?.fontSize !== undefined ? customStyle.fontSize : fontSize;
    const s = customStyle?.spacing !== undefined ? customStyle.spacing : spacing;
    const m = customStyle?.margins !== undefined ? customStyle.margins : margins;
    const si = customStyle?.showIcons !== undefined ? customStyle.showIcons : showIcons;
    const sd = customStyle?.showDividers !== undefined ? customStyle.showDividers : showDividers;

    try {
      if (activeCvId && activeCvId !== 'default-cv') {
        const docRef = doc(db, 'resumes', activeCvId);
        await updateDoc(docRef, {
          name: targetName,
          content: JSON.stringify(targetContent),
          template: t,
          color: c,
          font: f,
          fontSize: fs,
          spacing: s,
          margins: m,
          showIcons: si,
          showDividers: sd
        });
        setSaveStatus('Saved');
        // Update local array
        setCvs(prev => prev.map(item => item.id === activeCvId ? { 
          ...item, 
          name: targetName, 
          content: targetContent,
          template: t,
          color: c,
          font: f,
          fontSize: fs,
          spacing: s,
          margins: m as any,
          showIcons: si,
          showDividers: sd
        } : item));
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'resumes'), {
          name: targetName,
          content: JSON.stringify(targetContent),
          userId: user.uid,
          createdAt: Date.now(),
          template: t,
          color: c,
          font: f,
          fontSize: fs,
          spacing: s,
          margins: m,
          showIcons: si,
          showDividers: sd
        });
        setActiveCvId(docRef.id);
        setCvs(prev => [...prev.filter(x => x.id !== 'default-cv'), { 
          id: docRef.id, 
          name: targetName, 
          content: targetContent,
          template: t,
          color: c,
          font: f,
          fontSize: fs,
          spacing: s,
          margins: m as any,
          showIcons: si,
          showDividers: sd
        }]);
        setSaveStatus('Saved');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('Error');
    }
  };

  // Debounced autosave for style state changes
  useEffect(() => {
    if (!activeCvId || activeCvId === 'default-cv') return;
    const timer = setTimeout(() => {
      saveCV(cvName, cvContent, {
        template: activeTemplate,
        color: activeColor,
        font: activeFont,
        fontSize,
        spacing,
        margins,
        showIcons,
        showDividers
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeTemplate, activeColor, activeFont, fontSize, spacing, margins, showIcons, showDividers]);

  const handleSelectCV = (id: string) => {
    const selected = cvs.find(c => c.id === id);
    if (selected) {
      setActiveCvId(selected.id);
      setCvName(selected.name);
      setCvContent(selected.content);
      
      // Update local states matching this CV
      if (selected.template) setActiveTemplate(selected.template as any);
      if (selected.color) setActiveColor(selected.color);
      if (selected.font) setActiveFont(selected.font);
      if (selected.fontSize) setFontSize(selected.fontSize);
      if (selected.spacing) setSpacing(selected.spacing as any);
      if (selected.margins) setMargins(selected.margins as any);
      if (selected.showIcons !== undefined) setShowIcons(selected.showIcons);
      if (selected.showDividers !== undefined) setShowDividers(selected.showDividers);
      
      // Automatically open Personal Info section
      setEditingSection('Personal Info');
      setCurrentPage(1);
    }
  };

  const createNewCV = async () => {
    const newName = prompt('Enter name for the new CV:', 'Product Manager CV') || 'New CV';
    const newDocPayload = {
      name: newName,
      content: JSON.stringify(defaultCVContent),
      userId: user.uid,
      createdAt: Date.now(),
      template: 'single',
      color: 'Purple',
      font: 'Inter',
      fontSize: 10,
      spacing: 'Normal',
      margins: 'Normal',
      showIcons: true,
      showDividers: true
    };
    try {
      setSaveStatus('Saving');
      const docRef = await addDoc(collection(db, 'resumes'), newDocPayload);
      const newCVItem: CVListItem = {
        id: docRef.id,
        name: newName,
        content: defaultCVContent,
        template: 'single',
        color: 'Purple',
        font: 'Inter',
        fontSize: 10,
        spacing: 'Normal',
        margins: 'Normal',
        showIcons: true,
        showDividers: true
      };
      setCvs(prev => [...prev, newCVItem]);
      setActiveCvId(docRef.id);
      setCvName(newName);
      setCvContent(defaultCVContent);
      setActiveTemplate('single');
      setActiveColor('Purple');
      setActiveFont('Inter');
      setFontSize(10);
      setSpacing('Normal');
      setMargins('Normal');
      setShowIcons(true);
      setShowDividers(true);
      setEditingSection('Personal Info');
      setCurrentPage(1);
      setSaveStatus('Saved');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'resumes');
      setSaveStatus('Error');
    }
  };

  const resetToDefault = () => {
    setActiveTemplate('single');
    setActiveColor('Purple');
    setActiveFont('Inter');
    setFontSize(10);
    setSpacing('Normal');
    setMargins('Normal');
    setShowIcons(true);
    setShowDividers(true);
    setCvContent(defaultCVContent);
    setCurrentPage(1);
    saveCV(cvName, defaultCVContent);
  };

  const triggerPrint = () => {
    window.print();
  };

  // Section editor triggers
  const handleUpdatePersonalInfo = (key: keyof CVContent['personalInfo'], value: string) => {
    const updated = {
      ...cvContent,
      personalInfo: {
        ...cvContent.personalInfo,
        [key]: value
      }
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateSummary = (value: string) => {
    const updated = {
      ...cvContent,
      summary: value
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddSkill = (skill: string) => {
    if (!skill.trim() || cvContent.skills.includes(skill.trim())) return;
    const updated = {
      ...cvContent,
      skills: [...cvContent.skills, skill.trim()]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveSkill = (skill: string) => {
    const updated = {
      ...cvContent,
      skills: cvContent.skills.filter(s => s !== skill)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddExperience = () => {
    const newExp = {
      id: 'exp_' + Date.now(),
      role: 'New Role',
      company: 'New Company',
      period: '2024 - Present',
      bullets: ['Responsible for driving product delivery and engineering excellence.']
    };
    const updated = {
      ...cvContent,
      experience: [...cvContent.experience, newExp]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateExperience = (id: string, key: string, value: any) => {
    const updated = {
      ...cvContent,
      experience: cvContent.experience.map(item => item.id === id ? { ...item, [key]: value } : item)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveExperience = (id: string) => {
    const updated = {
      ...cvContent,
      experience: cvContent.experience.filter(item => item.id !== id)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddExperienceBullet = (expId: string) => {
    const updated = {
      ...cvContent,
      experience: cvContent.experience.map(item => {
        if (item.id === expId) {
          return {
            ...item,
            bullets: [...item.bullets, 'New impact statement detailing achievements']
          };
        }
        return item;
      })
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateExperienceBullet = (expId: string, index: number, value: string) => {
    const updated = {
      ...cvContent,
      experience: cvContent.experience.map(item => {
        if (item.id === expId) {
          const newBullets = [...item.bullets];
          newBullets[index] = value;
          return { ...item, bullets: newBullets };
        }
        return item;
      })
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveExperienceBullet = (expId: string, index: number) => {
    const updated = {
      ...cvContent,
      experience: cvContent.experience.map(item => {
        if (item.id === expId) {
          return {
            ...item,
            bullets: item.bullets.filter((_, idx) => idx !== index)
          };
        }
        return item;
      })
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddEducation = () => {
    const newEdu = {
      id: 'edu_' + Date.now(),
      degree: 'Degree / Certificate',
      school: 'Institution / School',
      period: '2020 - 2024',
      gpa: 'GPA: 3.5/4.0'
    };
    const updated = {
      ...cvContent,
      education: [...cvContent.education, newEdu]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateEducation = (id: string, key: string, value: string) => {
    const updated = {
      ...cvContent,
      education: cvContent.education.map(item => item.id === id ? { ...item, [key]: value } : item)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveEducation = (id: string) => {
    const updated = {
      ...cvContent,
      education: cvContent.education.filter(item => item.id !== id)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddProject = () => {
    const newProj = {
      id: 'proj_' + Date.now(),
      title: 'New Innovation Project',
      period: '2023',
      description: 'Engineered high-performance state solution with integrated web APIs.'
    };
    const updated = {
      ...cvContent,
      projects: [...cvContent.projects, newProj]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateProject = (id: string, key: string, value: string) => {
    const updated = {
      ...cvContent,
      projects: cvContent.projects.map(item => item.id === id ? { ...item, [key]: value } : item)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveProject = (id: string) => {
    const updated = {
      ...cvContent,
      projects: cvContent.projects.filter(item => item.id !== id)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddCertification = () => {
    const newCert = {
      id: 'cert_' + Date.now(),
      name: 'Google Cloud Certified Professional',
      year: '2023'
    };
    const updated = {
      ...cvContent,
      certifications: [...cvContent.certifications, newCert]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateCertification = (id: string, key: string, value: string) => {
    const updated = {
      ...cvContent,
      certifications: cvContent.certifications.map(item => item.id === id ? { ...item, [key]: value } : item)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveCertification = (id: string) => {
    const updated = {
      ...cvContent,
      certifications: cvContent.certifications.filter(item => item.id !== id)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleAddLanguage = () => {
    const newLang = {
      id: 'lang_' + Date.now(),
      name: 'French',
      level: 'Conversational'
    };
    const updated = {
      ...cvContent,
      languages: [...cvContent.languages, newLang]
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleUpdateLanguage = (id: string, key: string, value: string) => {
    const updated = {
      ...cvContent,
      languages: cvContent.languages.map(item => item.id === id ? { ...item, [key]: value } : item)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  const handleRemoveLanguage = (id: string) => {
    const updated = {
      ...cvContent,
      languages: cvContent.languages.filter(item => item.id !== id)
    };
    setCvContent(updated);
    saveCV(cvName, updated);
  };

  // Helper styles for colors
  const activeColorHex = colorsList.find(c => c.name === activeColor)?.hex || '#A855F7';

  // Spacing configurations
  const spacingStyles = {
    Compact: {
      padding: 'p-4 md:p-8',
      itemGap: 'gap-1.5',
      sectionGap: 'mt-3 mb-1',
      listSpacing: 'space-y-0.5',
      lineHeight: 'leading-tight'
    },
    Normal: {
      padding: 'p-6 md:p-12',
      itemGap: 'gap-3',
      sectionGap: 'mt-6 mb-2',
      listSpacing: 'space-y-1.5',
      lineHeight: 'leading-relaxed'
    },
    Spacious: {
      padding: 'p-8 md:p-16',
      itemGap: 'gap-5',
      sectionGap: 'mt-8 mb-4',
      listSpacing: 'space-y-3',
      lineHeight: 'leading-loose'
    }
  }[spacing];

  const marginStyles = {
    Narrow: '12mm',
    Normal: '20mm',
    Wide: '28mm'
  };

  return (
    <div className="h-full flex flex-col gap-5 text-gray-200 select-none max-w-[1400px] mx-auto relative px-1">
      {/* Dynamic Printing Style Injector */}
      <style>{`
        @media print {
          body, html, main, #root {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            width: auto !important;
          }
          aside, header, .no-print, button, select, nav, .tab-bar, .section-editor, .customize-panel {
            display: none !important;
          }
          #cv-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: ${marginStyles[margins]} !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            transform: none !important;
            border: none !important;
          }
          .print-container-bypass {
            overflow: visible !important;
            width: auto !important;
            height: auto !important;
            transform: none !important;
            background: transparent !important;
            position: static !important;
          }
        }
      `}</style>

      {/* Page Header matching uploaded design perfectly */}
      <header className="no-print shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 mb-1 gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-[#A855F7]" />
          <h1 className="text-2xl font-mono font-bold tracking-tight text-white uppercase">
            CV BUILDER
          </h1>
        </div>
        
        {/* CV Selector and compiler indicators */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-white/5 border border-white/10 px-2 py-1 rounded-none">
            <select 
              value={activeCvId}
              onChange={(e) => handleSelectCV(e.target.value)}
              className="bg-transparent border-none text-xs font-mono font-bold text-[#A855F7] focus:outline-none cursor-pointer pr-4 uppercase"
            >
              {cvs.map(cv => (
                <option key={cv.id} value={cv.id} className="bg-[#111113] text-gray-200">
                  {cv.name}
                </option>
              ))}
            </select>

            {/* Checkmark Saved indicator */}
            <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1 text-[10px] font-mono">
              {saveStatus === 'Saving' ? (
                <span className="text-amber-400 animate-pulse">Saving...</span>
              ) : saveStatus === 'Saved' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Saved
                </span>
              ) : (
                <span className="text-rose-400">Save Error</span>
              )}
            </div>
          </div>

          <button 
            onClick={createNewCV}
            className="p-1.5 bg-white/5 border border-white/10 hover:border-[#A855F7] text-gray-400 hover:text-[#A855F7] transition-all cursor-pointer"
            title="Create New CV"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button 
            id="export-cv-btn"
            onClick={exportCVAsPDF}
            className="px-3 py-1.5 bg-[#A855F7]/10 border border-[#A855F7]/20 text-[#A855F7] hover:bg-[#A855F7]/20 text-xs font-mono font-bold rounded-none transition-all flex items-center gap-1.5 cursor-pointer uppercase"
            disabled={isExporting}
          >
            <Download className="w-4 h-4" /> {isExporting ? 'PREPARING...' : 'EXPORT CV'}
          </button>

          <div className="flex items-center gap-2 bg-[#A855F7]/10 border border-[#A855F7]/20 px-3 py-1.5 text-xs font-mono text-[#A855F7]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> CV COMPILER ACTIVE
          </div>
        </div>
      </header>

      {/* Main Builder Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 items-start overflow-hidden">
          
          {/* COLUMN 1: SECTION EDITOR */}
          <div className="xl:col-span-3 bg-[#111113] border border-white/10 p-4 flex flex-col gap-4 section-editor self-stretch rounded-none max-h-[800px] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h2 className="text-xs font-mono font-bold text-gray-400 tracking-wider uppercase">
                {editingSection ? `EDITING: ${editingSection}` : 'SECTION EDITOR'}
              </h2>
              {editingSection && (
                <button 
                  onClick={() => setEditingSection(null)} 
                  className="text-[10px] font-mono text-gray-400 hover:text-[#A855F7] flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Back
                </button>
              )}
            </div>

            {/* Editing Views */}
            {editingSection === null ? (
              <div className="space-y-2.5">
                {/* Personal Info item */}
                <div 
                  onClick={() => setEditingSection('Personal Info')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Personal Info</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Full name, title, contact</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                </div>

                {/* Summary item */}
                <div 
                  onClick={() => setEditingSection('Summary')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Summary</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Professional summary</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                </div>

                {/* Experience item */}
                <div 
                  onClick={() => setEditingSection('Experience')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Experience</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.experience.length} items</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500/40" />
                </div>

                {/* Skills item */}
                <div 
                  onClick={() => setEditingSection('Skills')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Skills</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.skills.length} skills</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                </div>

                {/* Education item */}
                <div 
                  onClick={() => setEditingSection('Education')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Education</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.education.length} items</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                </div>

                {/* Projects item */}
                <div 
                  onClick={() => setEditingSection('Projects')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Projects</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.projects.length} items</p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </div>

                {/* Certifications item */}
                <div 
                  onClick={() => setEditingSection('Certifications')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Certifications</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.certifications.length} items</p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </div>

                {/* Languages item */}
                <div 
                  onClick={() => setEditingSection('Languages')}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/30 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Languages</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{cvContent.languages.length} languages</p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </div>

                <button 
                  onClick={() => {
                    const extra = prompt('Add custom section title:', 'Achievements');
                    if (extra) alert('Custom sections can be integrated into the layout.');
                  }}
                  className="w-full mt-3 py-2.5 border border-dashed border-white/10 hover:border-[#A855F7] bg-[#A855F7]/5 hover:bg-[#A855F7]/10 text-xs font-mono font-bold text-[#A855F7] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD SECTION
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Editing PERSONAL INFO */}
                {editingSection === 'Personal Info' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Full Name</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.fullName} 
                        onChange={(e) => handleUpdatePersonalInfo('fullName', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Job Title</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.title} 
                        onChange={(e) => handleUpdatePersonalInfo('title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Email Address</label>
                      <input 
                        type="email" 
                        value={cvContent.personalInfo.email} 
                        onChange={(e) => handleUpdatePersonalInfo('email', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Phone Number</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.phone} 
                        onChange={(e) => handleUpdatePersonalInfo('phone', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Location</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.location} 
                        onChange={(e) => handleUpdatePersonalInfo('location', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">LinkedIn Username</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.linkedin} 
                        onChange={(e) => handleUpdatePersonalInfo('linkedin', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">GitHub Username</label>
                      <input 
                        type="text" 
                        value={cvContent.personalInfo.github} 
                        onChange={(e) => handleUpdatePersonalInfo('github', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Editing SUMMARY */}
                {editingSection === 'Summary' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-400 uppercase block">Professional Summary</label>
                    <textarea 
                      value={cvContent.summary} 
                      onChange={(e) => handleUpdateSummary(e.target.value)}
                      rows={8}
                      className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none resize-none"
                    />
                  </div>
                )}

                {/* Editing SKILLS */}
                {editingSection === 'Skills' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-400 uppercase block">Add Skill Keyword</label>
                      <input 
                        type="text"
                        placeholder="Type skill & press Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSkill(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-500 uppercase block">Current Skills (Click to delete)</label>
                      <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto p-1.5 bg-black/25">
                        {cvContent.skills.map((skill) => (
                          <span 
                            key={skill}
                            onClick={() => handleRemoveSkill(skill)}
                            className="px-2 py-0.5 bg-[#A855F7]/10 hover:bg-rose-500/20 border border-[#A855F7]/20 hover:border-rose-500/40 text-[#C084FC] hover:text-white transition-all text-[10px] font-mono cursor-pointer flex items-center gap-1"
                          >
                            {skill} <span className="text-[8px] opacity-70">×</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Editing EXPERIENCE */}
                {editingSection === 'Experience' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {cvContent.experience.map((exp, expIdx) => (
                      <div key={exp.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-2 relative">
                        <button 
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-gray-500">EXPERIENCE BLOCK #{expIdx+1}</span>
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Role / Title" 
                            value={exp.role} 
                            onChange={(e) => handleUpdateExperience(exp.id, 'role', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Company Name" 
                            value={exp.company} 
                            onChange={(e) => handleUpdateExperience(exp.id, 'company', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Period (e.g., 2021 - Present)" 
                            value={exp.period} 
                            onChange={(e) => handleUpdateExperience(exp.id, 'period', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                        </div>
                        {/* Bullets sub-list */}
                        <div className="space-y-1.5 pt-1 border-t border-white/5 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono text-gray-400">IMPACT BULLETS:</span>
                            <button 
                              onClick={() => handleAddExperienceBullet(exp.id)}
                              className="text-[9px] font-mono text-[#A855F7] hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              + Add Bullet
                            </button>
                          </div>
                          {exp.bullets.map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex gap-1.5 items-start">
                              <textarea 
                                value={bullet}
                                onChange={(e) => handleUpdateExperienceBullet(exp.id, bulletIdx, e.target.value)}
                                rows={2}
                                className="flex-1 bg-white/5 border border-white/10 p-1 text-[10px] font-mono text-white focus:border-[#A855F7] focus:outline-none resize-none"
                              />
                              <button 
                                onClick={() => handleRemoveExperienceBullet(exp.id, bulletIdx)}
                                className="text-gray-500 hover:text-rose-400 transition-colors pt-1"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddExperience}
                      className="w-full py-2 border border-dashed border-[#A855F7]/30 text-xs font-mono text-[#A855F7] hover:bg-[#A855F7]/5 transition-all cursor-pointer"
                    >
                      + ADD EXPERIENCE BLOCK
                    </button>
                  </div>
                )}

                {/* Editing EDUCATION */}
                {editingSection === 'Education' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {cvContent.education.map((edu, idx) => (
                      <div key={edu.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-2 relative">
                        <button 
                          onClick={() => handleRemoveEducation(edu.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-gray-500">EDUCATION BLOCK #{idx+1}</span>
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Degree / Major" 
                            value={edu.degree} 
                            onChange={(e) => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="School Name" 
                            value={edu.school} 
                            onChange={(e) => handleUpdateEducation(edu.id, 'school', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Period" 
                            value={edu.period} 
                            onChange={(e) => handleUpdateEducation(edu.id, 'period', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="GPA details" 
                            value={edu.gpa || ''} 
                            onChange={(e) => handleUpdateEducation(edu.id, 'gpa', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddEducation}
                      className="w-full py-2 border border-dashed border-[#A855F7]/30 text-xs font-mono text-[#A855F7] hover:bg-[#A855F7]/5 transition-all cursor-pointer"
                    >
                      + ADD EDUCATION BLOCK
                    </button>
                  </div>
                )}

                {/* Editing PROJECTS */}
                {editingSection === 'Projects' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {cvContent.projects.map((proj, idx) => (
                      <div key={proj.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-2 relative">
                        <button 
                          onClick={() => handleRemoveProject(proj.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-gray-500">PROJECT BLOCK #{idx+1}</span>
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Project Title" 
                            value={proj.title} 
                            onChange={(e) => handleUpdateProject(proj.id, 'title', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Period / Year" 
                            value={proj.period} 
                            onChange={(e) => handleUpdateProject(proj.id, 'period', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <textarea 
                            placeholder="Short description" 
                            value={proj.description} 
                            onChange={(e) => handleUpdateProject(proj.id, 'description', e.target.value)}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddProject}
                      className="w-full py-2 border border-dashed border-[#A855F7]/30 text-xs font-mono text-[#A855F7] hover:bg-[#A855F7]/5 transition-all cursor-pointer"
                    >
                      + ADD PROJECT BLOCK
                    </button>
                  </div>
                )}

                {/* Editing CERTIFICATIONS */}
                {editingSection === 'Certifications' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {cvContent.certifications.map((cert, idx) => (
                      <div key={cert.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-2 relative">
                        <button 
                          onClick={() => handleRemoveCertification(cert.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-gray-500">CERTIFICATE #{idx+1}</span>
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Certification Name" 
                            value={cert.name} 
                            onChange={(e) => handleUpdateCertification(cert.id, 'name', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Year" 
                            value={cert.year} 
                            onChange={(e) => handleUpdateCertification(cert.id, 'year', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddCertification}
                      className="w-full py-2 border border-dashed border-[#A855F7]/30 text-xs font-mono text-[#A855F7] hover:bg-[#A855F7]/5 transition-all cursor-pointer"
                    >
                      + ADD CERTIFICATION
                    </button>
                  </div>
                )}

                {/* Editing LANGUAGES */}
                {editingSection === 'Languages' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {cvContent.languages.map((lang, idx) => (
                      <div key={lang.id} className="p-3 bg-white/[0.02] border border-white/10 space-y-2 relative">
                        <button 
                          onClick={() => handleRemoveLanguage(lang.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-gray-500">LANGUAGE #{idx+1}</span>
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Language Name" 
                            value={lang.name} 
                            onChange={(e) => handleUpdateLanguage(lang.id, 'name', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Proficiency Level (e.g. Native)" 
                            value={lang.level} 
                            onChange={(e) => handleUpdateLanguage(lang.id, 'level', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-1.5 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={handleAddLanguage}
                      className="w-full py-2 border border-dashed border-[#A855F7]/30 text-xs font-mono text-[#A855F7] hover:bg-[#A855F7]/5 transition-all cursor-pointer"
                    >
                      + ADD LANGUAGE
                    </button>
                  </div>
                )}

                {/* Form Save Action */}
                <button 
                  onClick={() => setEditingSection(null)}
                  className="w-full py-2.5 bg-[#A855F7] hover:bg-[#A855F7]/90 text-black text-xs font-mono font-bold transition-colors cursor-pointer text-center uppercase"
                >
                  Apply & Return
                </button>
              </div>
            )}
          </div>

          {/* COLUMN 2: THE A4 PAPER CV PREVIEW */}
          <div className="xl:col-span-6 flex flex-col items-center gap-4 overflow-hidden self-stretch">
            {/* Top Bar for A4 Print Preview with Pagination and Scale */}
            <div className="no-print w-full flex justify-between items-center bg-[#111113] border border-white/10 px-4 py-2 text-xs font-mono text-gray-400 shrink-0 select-none">
              <span className="flex items-center gap-1.5 text-[#A855F7] font-bold">
                <Eye className="w-4 h-4" /> A4 PRINT PREVIEW
              </span>
              
              {/* Pagination Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={clsx(
                    "p-1 border border-white/10 text-white transition-all rounded-none",
                    currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5 hover:border-[#A855F7]"
                  )}
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-gray-300 font-bold min-w-[70px] text-center">
                  PAGE {currentPage} OF {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    "p-1 border border-white/10 text-white transition-all rounded-none",
                    currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5 hover:border-[#A855F7]"
                  )}
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-[10px] text-gray-500 font-mono uppercase">
                {Math.round(scale * 100)}% SCALE
              </span>
            </div>

            {/* A4 Canvas Container - scaled and scrollable */}
            <div 
              ref={containerRef} 
              className="w-full flex-1 overflow-x-hidden overflow-y-auto bg-black/40 p-6 flex justify-center custom-scrollbar max-h-[800px] border border-white/5 relative"
            >
              <div 
                className="shadow-2xl bg-white shrink-0 print-container-bypass transition-all duration-300 relative"
                style={{
                  width: `${794 * scale}px`,
                  height: `${1123 * scale}px`,
                  overflow: 'hidden'
                }}
              >
                <div 
                  ref={cvPrintAreaRef}
                  id="cv-print-area"
                  className="bg-white text-[#18181b] relative transition-all duration-300 origin-top-left"
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm',
                    padding: marginStyles[margins],
                    fontFamily: activeFont,
                    fontSize: `${fontSize}pt`,
                    transform: `scale(${scale}) translateY(-${(currentPage - 1) * 297}mm)`,
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                >
                
                {/* TEMPLATE LAYOUT 1: SINGLE COLUMN TRADITIONAL */}
                {activeTemplate === 'single' && (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      {/* Name & Title */}
                      <div className="text-center pb-4">
                        <h1 className="text-4xl font-extrabold tracking-tight uppercase text-gray-900" style={{ fontSize: `${fontSize * 2.8}pt` }}>
                          {cvContent.personalInfo.fullName}
                        </h1>
                        <p className="text-xs font-mono font-bold tracking-widest mt-1 uppercase" style={{ color: activeColorHex }}>
                          {cvContent.personalInfo.title}
                        </p>

                        {/* Contact info row with dynamic icons */}
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-3 font-mono">
                          {cvContent.personalInfo.email && (
                            <span className="flex items-center gap-1">
                              {showIcons && <Mail className="w-3.5 h-3.5" style={{ color: activeColorHex }} />} {cvContent.personalInfo.email}
                            </span>
                          )}
                          {cvContent.personalInfo.phone && (
                            <span className="flex items-center gap-1">
                              {showIcons && <Phone className="w-3.5 h-3.5" style={{ color: activeColorHex }} />} {cvContent.personalInfo.phone}
                            </span>
                          )}
                          {cvContent.personalInfo.location && (
                            <span className="flex items-center gap-1">
                              {showIcons && <MapPin className="w-3.5 h-3.5" style={{ color: activeColorHex }} />} {cvContent.personalInfo.location}
                            </span>
                          )}
                          {cvContent.personalInfo.linkedin && (
                            <span className="flex items-center gap-1">
                              {showIcons && <Linkedin className="w-3.5 h-3.5" style={{ color: activeColorHex }} />} {cvContent.personalInfo.linkedin}
                            </span>
                          )}
                          {cvContent.personalInfo.github && (
                            <span className="flex items-center gap-1">
                              {showIcons && <Github className="w-3.5 h-3.5" style={{ color: activeColorHex }} />} {cvContent.personalInfo.github}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SUMMARY */}
                      {cvContent.summary && (
                        <div className="mt-4">
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex, fontSize: `${fontSize * 1.15}pt` }}>
                            PROFESSIONAL SUMMARY
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <p className={clsx("text-gray-600 leading-normal", spacingStyles.lineHeight)}>
                            {cvContent.summary}
                          </p>
                        </div>
                      )}

                      {/* EXPERIENCE */}
                      {cvContent.experience.length > 0 && (
                        <div className={spacingStyles.sectionGap}>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex, fontSize: `${fontSize * 1.15}pt` }}>
                            EXPERIENCE
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className={spacingStyles.itemGap}>
                            {cvContent.experience.map((exp) => (
                              <div key={exp.id} className="mb-3">
                                <div className="flex justify-between items-baseline">
                                  <h4 className="font-bold text-gray-800">{exp.role}</h4>
                                  <span className="text-[11px] text-gray-400 font-mono">{exp.period}</span>
                                </div>
                                <p className="text-[11px] font-bold text-gray-500 font-mono mt-0.5">{exp.company}</p>
                                <ul className="list-disc list-inside mt-1 space-y-1 pl-1">
                                  {exp.bullets.map((bullet, bulletIdx) => (
                                    <li key={bulletIdx} className="text-gray-600 pl-1 leading-normal">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SKILLS */}
                      {cvContent.skills.length > 0 && (
                        <div className={spacingStyles.sectionGap}>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex, fontSize: `${fontSize * 1.15}pt` }}>
                            SKILLS
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {cvContent.skills.map((skill) => (
                              <span 
                                key={skill}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10.5px] font-medium transition-all"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* EDUCATION */}
                      {cvContent.education.length > 0 && (
                        <div className={spacingStyles.sectionGap}>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex, fontSize: `${fontSize * 1.15}pt` }}>
                            EDUCATION
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-2">
                            {cvContent.education.map((edu) => (
                              <div key={edu.id} className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-gray-800">{edu.degree}</h4>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{edu.school}</p>
                                  {edu.gpa && <p className="text-[10px] font-mono text-gray-400">{edu.gpa}</p>}
                                </div>
                                <span className="text-[11px] text-gray-400 font-mono">{edu.period}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PROJECTS */}
                      {cvContent.projects.length > 0 && (
                        <div className={spacingStyles.sectionGap}>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex, fontSize: `${fontSize * 1.15}pt` }}>
                            PROJECTS
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-3">
                            {cvContent.projects.map((proj) => (
                              <div key={proj.id} className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-800">{proj.title}</h4>
                                  <p className="text-gray-600 mt-1 text-[11px]">{proj.description}</p>
                                </div>
                                <span className="text-[11px] text-gray-400 font-mono ml-4">{proj.period}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEMPLATE LAYOUT 2: TWO COLUMN */}
                {activeTemplate === 'two-column' && (
                  <div className="grid grid-cols-12 gap-6 h-full items-start">
                    {/* Left Sidebar column */}
                    <div className="col-span-4 bg-gray-50 p-4 border border-gray-100 flex flex-col gap-5 self-stretch">
                      <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight uppercase">
                          {cvContent.personalInfo.fullName}
                        </h1>
                        <p className="text-[10px] font-bold tracking-wider mt-1 uppercase" style={{ color: activeColorHex }}>
                          {cvContent.personalInfo.title}
                        </p>
                      </div>

                      {/* Contact Details stack */}
                      <div className="flex flex-col gap-2 text-[10.5px] text-gray-500 font-mono">
                        {cvContent.personalInfo.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            {showIcons && <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: activeColorHex }} />} {cvContent.personalInfo.email}
                          </div>
                        )}
                        {cvContent.personalInfo.phone && (
                          <div className="flex items-center gap-1.5">
                            {showIcons && <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: activeColorHex }} />} {cvContent.personalInfo.phone}
                          </div>
                        )}
                        {cvContent.personalInfo.location && (
                          <div className="flex items-center gap-1.5">
                            {showIcons && <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: activeColorHex }} />} {cvContent.personalInfo.location}
                          </div>
                        )}
                        {cvContent.personalInfo.linkedin && (
                          <div className="flex items-center gap-1.5 truncate">
                            {showIcons && <Linkedin className="w-3.5 h-3.5 shrink-0" style={{ color: activeColorHex }} />} {cvContent.personalInfo.linkedin}
                          </div>
                        )}
                        {cvContent.personalInfo.github && (
                          <div className="flex items-center gap-1.5 truncate">
                            {showIcons && <Github className="w-3.5 h-3.5 shrink-0" style={{ color: activeColorHex }} />} {cvContent.personalInfo.github}
                          </div>
                        )}
                      </div>

                      {/* SKILLS tag array */}
                      {cvContent.skills.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-black tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            SKILLS
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cvContent.skills.map((skill) => (
                              <span 
                                key={skill}
                                className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LANGUAGES */}
                      {cvContent.languages.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-black tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            LANGUAGES
                          </h3>
                          <div className="space-y-1 mt-2">
                            {cvContent.languages.map((lang) => (
                              <div key={lang.id} className="flex justify-between items-center text-[10.5px]">
                                <span className="font-bold text-gray-700">{lang.name}</span>
                                <span className="text-gray-400 font-mono text-[9px]">{lang.level}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CERTIFICATIONS */}
                      {cvContent.certifications.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-black tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            CERTIFICATIONS
                          </h3>
                          <div className="space-y-1.5 mt-2">
                            {cvContent.certifications.map((cert) => (
                              <div key={cert.id} className="text-[10.5px]">
                                <h4 className="font-bold text-gray-700">{cert.name}</h4>
                                <span className="text-gray-400 font-mono text-[9px]">{cert.year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right core column */}
                    <div className="col-span-8 flex flex-col gap-4">
                      {/* SUMMARY */}
                      {cvContent.summary && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            PROFESSIONAL SUMMARY
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <p className="text-gray-600 leading-normal">
                            {cvContent.summary}
                          </p>
                        </div>
                      )}

                      {/* EXPERIENCE */}
                      {cvContent.experience.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            EXPERIENCE
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-4">
                            {cvContent.experience.map((exp) => (
                              <div key={exp.id}>
                                <div className="flex justify-between items-baseline">
                                  <h4 className="font-bold text-gray-800">{exp.role}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">{exp.period}</span>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 font-mono mt-0.5">{exp.company}</p>
                                <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                                  {exp.bullets.map((bullet, bulletIdx) => (
                                    <li key={bulletIdx} className="text-gray-600 leading-normal pl-1">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* EDUCATION */}
                      {cvContent.education.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            EDUCATION
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-2">
                            {cvContent.education.map((edu) => (
                              <div key={edu.id} className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-gray-800">{edu.degree}</h4>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{edu.school}</p>
                                  {edu.gpa && <p className="text-[10px] font-mono text-gray-400">{edu.gpa}</p>}
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">{edu.period}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PROJECTS */}
                      {cvContent.projects.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            PROJECTS
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-3">
                            {cvContent.projects.map((proj) => (
                              <div key={proj.id} className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-800">{proj.title}</h4>
                                  <p className="text-gray-600 mt-1 text-[11px]">{proj.description}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono ml-4">{proj.period}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEMPLATE LAYOUT 3: ACCENT BANNER */}
                {activeTemplate === 'accent' && (
                  <div className="h-full flex flex-col gap-4">
                    {/* Top Accent Banner Box */}
                    <div className="p-6 text-white" style={{ backgroundColor: activeColorHex }}>
                      <h1 className="text-3xl font-black tracking-wide uppercase">{cvContent.personalInfo.fullName}</h1>
                      <p className="text-xs font-bold tracking-widest mt-1 opacity-90 uppercase">{cvContent.personalInfo.title}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] mt-4 font-mono opacity-80">
                        {cvContent.personalInfo.email && <span>Email: {cvContent.personalInfo.email}</span>}
                        {cvContent.personalInfo.phone && <span>Tel: {cvContent.personalInfo.phone}</span>}
                        {cvContent.personalInfo.location && <span>Loc: {cvContent.personalInfo.location}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* SUMMARY */}
                      {cvContent.summary && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            SUMMARY
                          </h3>
                          <p className="text-gray-600 leading-normal">{cvContent.summary}</p>
                        </div>
                      )}

                      {/* EXPERIENCE */}
                      {cvContent.experience.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            EXPERIENCE RECORD
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-4">
                            {cvContent.experience.map((exp) => (
                              <div key={exp.id}>
                                <div className="flex justify-between items-baseline">
                                  <h4 className="font-bold text-gray-800">{exp.role}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">{exp.period}</span>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 font-mono mt-0.5">{exp.company}</p>
                                <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                                  {exp.bullets.map((bullet, idx) => (
                                    <li key={idx} className="text-gray-600 pl-1 leading-normal">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SKILLS */}
                      {cvContent.skills.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            SKILLS & CAPABILITIES
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {cvContent.skills.map((skill) => (
                              <span key={skill} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10.5px]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEMPLATE LAYOUT 4: EXECUTIVE */}
                {activeTemplate === 'executive' && (
                  <div className="h-full flex flex-col gap-5">
                    <div className="border-b-4 pb-4 text-center" style={{ borderColor: activeColorHex }}>
                      <h1 className="text-4xl font-serif text-gray-900 leading-none">{cvContent.personalInfo.fullName}</h1>
                      <p className="text-xs font-serif italic tracking-wider mt-1 text-gray-500">{cvContent.personalInfo.title}</p>
                      
                      <div className="flex flex-wrap items-center justify-center gap-3 text-[10.5px] mt-3 font-mono text-gray-400">
                        {cvContent.personalInfo.email && <span>{cvContent.personalInfo.email}</span>}
                        <span>•</span>
                        {cvContent.personalInfo.phone && <span>{cvContent.personalInfo.phone}</span>}
                        <span>•</span>
                        {cvContent.personalInfo.location && <span>{cvContent.personalInfo.location}</span>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {cvContent.summary && (
                        <div>
                          <h3 className="text-xs font-bold tracking-widest text-center uppercase mb-1" style={{ color: activeColorHex }}>
                            EXECUTIVE PROFILE
                          </h3>
                          <p className="text-gray-600 text-center leading-relaxed italic px-8">
                            "{cvContent.summary}"
                          </p>
                        </div>
                      )}

                      {/* EXPERIENCE */}
                      {cvContent.experience.length > 0 && (
                        <div>
                          <h3 className="text-xs font-extrabold tracking-wider uppercase mb-1" style={{ color: activeColorHex }}>
                            EXPERIENCE HISTORY
                          </h3>
                          {showDividers && <hr className="border-t border-gray-200 mb-2" />}
                          <div className="space-y-4">
                            {cvContent.experience.map((exp) => (
                              <div key={exp.id}>
                                <div className="flex justify-between items-baseline">
                                  <h4 className="font-bold text-gray-800">{exp.role}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">{exp.period}</span>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 font-mono mt-0.5">{exp.company}</p>
                                <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                                  {exp.bullets.map((bullet, idx) => (
                                    <li key={idx} className="text-gray-600 pl-1 leading-normal">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: CUSTOMIZE PANEL */}
          <div className="xl:col-span-3 bg-[#111113] border border-white/10 p-5 flex flex-col gap-6 customize-panel self-stretch rounded-none max-h-[800px] overflow-y-auto">
            
            {/* Customize Header */}
            <div>
              <h2 className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase">CUSTOMIZE</h2>
            </div>

            {/* Template Card Previews (4 miniatures matching screenshot) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Template Layout</label>
              <div className="grid grid-cols-4 gap-2">
                {/* Mini 1: Single */}
                <button 
                  onClick={() => setActiveTemplate('single')}
                  className={clsx(
                    "h-16 border rounded-none p-1.5 flex flex-col justify-between cursor-pointer transition-all bg-white/[0.01]",
                    activeTemplate === 'single' ? "border-[#A855F7] bg-[#A855F7]/5" : "border-white/10 hover:border-white/20"
                  )}
                  title="Traditional Single Column"
                >
                  <div className="w-full bg-white/10 h-1 mx-auto rounded-none"></div>
                  <div className="space-y-1 w-full">
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-2/3 bg-white/5 h-1 rounded-none"></div>
                  </div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase text-center block w-full">Classic</span>
                </button>

                {/* Mini 2: Two Column */}
                <button 
                  onClick={() => setActiveTemplate('two-column')}
                  className={clsx(
                    "h-16 border rounded-none p-1.5 flex gap-1 cursor-pointer transition-all bg-white/[0.01]",
                    activeTemplate === 'two-column' ? "border-[#A855F7] bg-[#A855F7]/5" : "border-white/10 hover:border-white/20"
                  )}
                  title="Sidebar Split Layout"
                >
                  <div className="w-1/3 bg-white/10 h-full rounded-none"></div>
                  <div className="flex-1 space-y-1">
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-1/2 bg-white/5 h-1 rounded-none"></div>
                  </div>
                </button>

                {/* Mini 3: Accent */}
                <button 
                  onClick={() => setActiveTemplate('accent')}
                  className={clsx(
                    "h-16 border rounded-none flex flex-col cursor-pointer transition-all bg-white/[0.01] overflow-hidden",
                    activeTemplate === 'accent' ? "border-[#A855F7] bg-[#A855F7]/5" : "border-white/10 hover:border-white/20"
                  )}
                  title="Accent Banner Top"
                >
                  <div className="w-full bg-[#A855F7]/20 h-4 rounded-none"></div>
                  <div className="p-1.5 space-y-1 flex-1">
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-2/3 bg-white/5 h-1 rounded-none"></div>
                  </div>
                </button>

                {/* Mini 4: Executive */}
                <button 
                  onClick={() => setActiveTemplate('executive')}
                  className={clsx(
                    "h-16 border rounded-none p-1.5 flex flex-col justify-between cursor-pointer transition-all bg-white/[0.01]",
                    activeTemplate === 'executive' ? "border-[#A855F7] bg-[#A855F7]/5" : "border-white/10 hover:border-white/20"
                  )}
                  title="Sleek Executive Centered"
                >
                  <div className="w-1/2 bg-white/10 h-1 mx-auto rounded-none"></div>
                  <div className="space-y-1 w-full mt-2">
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                    <div className="w-full bg-white/5 h-1 rounded-none"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Color Scheme Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Color Scheme</label>
              <div className="flex items-center gap-3">
                {colorsList.map((colorItem) => {
                  const isActive = activeColor === colorItem.name;
                  return (
                    <button
                      key={colorItem.name}
                      onClick={() => setActiveColor(colorItem.name)}
                      className={clsx(
                        "w-6 h-6 rounded-full cursor-pointer transition-all relative flex items-center justify-center border border-white/10 hover:scale-110",
                        colorItem.class,
                        isActive && "ring-2 ring-offset-2 ring-offset-[#111113] ring-[#A855F7]"
                      )}
                      title={colorItem.name}
                    >
                      {isActive && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Font Family</label>
              <select
                value={activeFont}
                onChange={(e) => setActiveFont(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-none p-2 text-xs font-mono text-white focus:border-[#A855F7] focus:outline-none cursor-pointer"
              >
                {fontsList.map(font => (
                  <option key={font} value={font} className="bg-[#111113] text-gray-200">
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size Selector (pt values decrement/increment) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Font Size</label>
              <div className="flex items-center bg-white/5 border border-white/10 p-1 justify-between max-w-[140px]">
                <button 
                  onClick={() => setFontSize(Math.max(8, fontSize - 1))}
                  className="px-2.5 py-1 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold rounded-none cursor-pointer"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-white text-center flex-1">{fontSize}pt</span>
                <button 
                  onClick={() => setFontSize(Math.min(14, fontSize + 1))}
                  className="px-2.5 py-1 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold rounded-none cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Spacing Selector (Density compact/normal/spacious) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Spacing Density</label>
              <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 border border-white/10">
                {(['Compact', 'Normal', 'Spacious'] as const).map(option => {
                  const isSelected = spacing === option;
                  return (
                    <button
                      key={option}
                      onClick={() => setSpacing(option)}
                      className={clsx(
                        "py-1 text-[10px] font-mono transition-all text-center rounded-none cursor-pointer uppercase",
                        isSelected 
                          ? "bg-[#A855F7] text-black font-bold" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Margins Selector (Narrow, Normal, Wide) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Page Margins</label>
              <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 border border-white/10">
                {(['Narrow', 'Normal', 'Wide'] as const).map(option => {
                  const isSelected = margins === option;
                  return (
                    <button
                      key={option}
                      id={`margin-btn-${option.toLowerCase()}`}
                      onClick={() => setMargins(option)}
                      className={clsx(
                        "py-1 text-[10px] font-mono transition-all text-center rounded-none cursor-pointer uppercase",
                        isSelected 
                          ? "bg-[#A855F7] text-black font-bold" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switches / Toggles for Show Icons and Section Dividers */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Show Icons</span>
                <button 
                  onClick={() => setShowIcons(!showIcons)}
                  className={clsx(
                    "w-9 h-5 rounded-full transition-colors relative focus:outline-none cursor-pointer",
                    showIcons ? "bg-[#A855F7]" : "bg-white/10"
                  )}
                >
                  <span 
                    className={clsx(
                      "w-4 h-4 rounded-full bg-black absolute top-0.5 transition-transform",
                      showIcons ? "left-4.5" : "left-0.5"
                    )}
                  />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Show Dividers</span>
                <button 
                  onClick={() => setShowDividers(!showDividers)}
                  className={clsx(
                    "w-9 h-5 rounded-full transition-colors relative focus:outline-none cursor-pointer",
                    showDividers ? "bg-[#A855F7]" : "bg-white/10"
                  )}
                >
                  <span 
                    className={clsx(
                      "w-4 h-4 rounded-full bg-black absolute top-0.5 transition-transform",
                      showDividers ? "left-4.5" : "left-0.5"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* RESET TO DEFAULT BUTTON */}
            <button 
              onClick={resetToDefault}
              className="w-full mt-auto py-2.5 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/10 text-xs font-mono font-bold text-gray-400 hover:text-rose-400 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
            >
              <RotateCcw className="w-4 h-4" /> RESET TO DEFAULT
            </button>

          </div>

        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div 
            id="export-modal-backdrop"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <div 
              id="export-modal-card"
              className="bg-[#111113] border border-white/10 p-6 max-w-md w-full relative space-y-4"
            >
              <button 
                id="close-export-modal-btn"
                onClick={() => {
                  setShowExportModal(false);
                  setExportError(null);
                  setGoogleDocUrl(null);
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Sparkles className="w-5 h-5 text-[#A855F7]" />
                <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">
                  Export Your CV
                </h3>
              </div>

              <p className="text-xs font-mono text-gray-400 leading-relaxed">
                Select how you would like to export your current document:
              </p>

              <div className="space-y-3 pt-2">
                {/* Option 1: PDF */}
                <button
                  id="export-pdf-card-btn"
                  onClick={() => {
                    setShowExportModal(false);
                    triggerPrint();
                  }}
                  disabled={exportLoading}
                  className="w-full text-left p-4 bg-white/[0.02] border border-white/10 hover:border-[#A855F7] hover:bg-white/[0.04] transition-all flex items-start gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-2 bg-[#A855F7]/10 text-[#A855F7] rounded-none group-hover:bg-[#A855F7]/20">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-mono font-bold text-white uppercase group-hover:text-[#A855F7]">
                      Download as PDF
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono leading-normal">
                      Generate and download a high-fidelity print-ready PDF file of your CV.
                    </p>
                  </div>
                </button>

                {/* Option 2: Google Docs */}
                <button
                  id="export-gdocs-card-btn"
                  onClick={handleExportToGoogleDocs}
                  disabled={exportLoading}
                  className="w-full text-left p-4 bg-white/[0.02] border border-white/10 hover:border-[#A855F7] hover:bg-white/[0.04] transition-all flex items-start gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-2 bg-[#A855F7]/10 text-[#A855F7] rounded-none group-hover:bg-[#A855F7]/20">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-mono font-bold text-white uppercase group-hover:text-[#A855F7]">
                      Open in Google Docs
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono leading-normal">
                      Export editable plain-text structure into a fresh document in Google Workspace.
                    </p>
                  </div>
                </button>
              </div>

              {/* Loading Indicator */}
              {exportLoading && (
                <div 
                  id="export-loading-indicator"
                  className="flex flex-col items-center justify-center p-4 bg-white/[0.01] border border-dashed border-white/10 space-y-2 animate-pulse"
                >
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#A855F7] rounded-full animate-spin" />
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    Configuring Google Docs & Writing Content...
                  </span>
                </div>
              )}

              {/* Error Message */}
              {exportError && (
                <div 
                  id="export-error-alert"
                  className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono space-y-1"
                >
                  <div className="font-bold uppercase tracking-wider">Export Error</div>
                  <p className="text-[10px] leading-relaxed text-gray-300">{exportError}</p>
                  <button
                    onClick={handleExportToGoogleDocs}
                    className="text-[9px] text-[#A855F7] hover:underline uppercase block font-bold pt-1 cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {/* Success with URL */}
              {googleDocUrl && (
                <div 
                  id="export-success-container"
                  className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono text-center space-y-3"
                >
                  <div className="font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 stroke-[3]" /> Document Created Successfully
                  </div>
                  <p className="text-[10px] leading-relaxed text-gray-300">
                    Your CV has been exported to a Google Doc titled <strong className="text-white">"{googleDocTitle}"</strong>.
                  </p>
                  <div className="pt-1">
                    <a
                      id="open-gdoc-link"
                      href={googleDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold tracking-wider text-[10px] uppercase transition-colors rounded-none"
                    >
                      Open Google Doc
                    </a>
                  </div>
                  <p className="text-[9px] text-gray-500">
                    If the document didn't open in a new tab, use the link above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
