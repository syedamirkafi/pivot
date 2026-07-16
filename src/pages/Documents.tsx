import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Eye, 
  Sparkles, 
  Search, 
  ChevronDown, 
  Grid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Folder, 
  ArrowRight,
  Pencil,
  Check,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase';
import { ResumeEditor } from '../components/ResumeEditor';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { ResumePDF } from '../components/ResumePDF';

interface DocumentItem {
  id: string;
  name: string;
  subtext: string;
  category: string;
  fileType: string;
  tags: string[];
  content: string;
  createdAt: any;
  updatedAtString?: string;
}

export function Documents({ user }: { user: User }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');

  // Interactive filters
  const [activeTab, setActiveTab] = useState<'All Documents' | 'Master CVs' | 'Generated CVs' | 'Imported'>('All Documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedTag, setSelectedTag] = useState('All Tags');
  const [selectedDate, setSelectedDate] = useState('Any time');
  const [sortBy, setSortBy] = useState('Last Modified');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  // Form States
  const [newCVName, setNewCVName] = useState('My Master CV');
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingState, setUploadingState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generation Wizard States
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [genSteps, setGenSteps] = useState([
    { label: 'Analyzing job description...', status: 'waiting' },
    { label: 'Mapping required skills & experience...', status: 'waiting' },
    { label: 'Injecting dynamic keywords for ATS alignment...', status: 'waiting' },
    { label: 'Compiling formatted PDF structure...', status: 'waiting' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'documents'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentItem));
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user.uid]);

  const handleCreateMasterCV = async () => {
    try {
      const newDocRef = doc(collection(db, 'documents'));
      const payload: Omit<DocumentItem, 'id'> = {
        name: newCVName,
        subtext: 'Comprehensive master CV',
        category: 'Master CV',
        fileType: 'TXT',
        tags: ['CV', 'Resume'],
        content: '',
        createdAt: serverTimestamp(),
        updatedAtString: undefined
      };
      await setDoc(newDocRef, { ...payload, userId: user.uid });
      setNewCVName('My Master CV');
      setIsCreateModalOpen(false);
      await loadDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const handleSaveEdit = async (updatedContent: string) => {
    if (!editingDoc) return;
    try {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const updatedAtString = `${dateString}\n${timeString}`;

      const docRef = doc(db, 'documents', editingDoc.id);
      await setDoc(docRef, {
        ...editingDoc,
        content: updatedContent,
        updatedAtString: updatedAtString
      }, { merge: true });
      setEditingDoc(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDocToDelete(id);
  };

  const confirmDelete = async () => {
    if (docToDelete) {
      try {
        await deleteDoc(doc(db, 'documents', docToDelete));
        await loadDocuments();
        setDocToDelete(null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadFile(file);
    setUploadingState('uploading');
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadingState('done');
          setTimeout(() => {
            saveImportedDocument(file);
          }, 600);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const saveImportedDocument = async (file: File) => {
    try {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'DOCX';
      const fileType = ext === 'PDF' ? 'PDF' : 'DOCX';
      const isCL = file.name.toLowerCase().includes('cover') || file.name.toLowerCase().includes('letter');
      const category = isCL ? 'Template' : 'Imported';
      const tags = isCL ? ['Cover Letter'] : ['Resume', 'Imported'];
      
      const newDocRef = doc(collection(db, 'documents'));
      const payload: Omit<DocumentItem, 'id'> = {
        name: file.name,
        subtext: `Imported from file upload on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        category,
        fileType,
        tags,
        content: `## Imported ${fileType} Document: ${file.name}\n\nThis document was successfully parsed on ${new Date().toLocaleDateString()}.\n\nPlaceholder parsed text content. Feel free to edit this content directly to construct your new tailored application.`,
        createdAt: serverTimestamp()
      };
      await setDoc(newDocRef, { ...payload, userId: user.uid });
      setUploadFile(null);
      setUploadingState('idle');
      setIsImportModalOpen(false);
      await loadDocuments();
    } catch (error) {
      console.error('Error saving imported document:', error);
    }
  };

  // Custom AI generation flow
  const handleGenerateCV = async () => {
    if (!targetRole || !targetCompany) return;
    setIsGenerating(true);
    setGenSteps([
      { label: 'Analyzing job description...', status: 'loading' },
      { label: 'Mapping required skills & experience...', status: 'waiting' },
      { label: 'Injecting dynamic keywords for ATS alignment...', status: 'waiting' },
      { label: 'Compiling formatted PDF structure...', status: 'waiting' }
    ]);

    const runStep = (index: number, nextDelay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setGenSteps((prev) => {
            const next = [...prev];
            next[index].status = 'done';
            if (index + 1 < next.length) {
              next[index + 1].status = 'loading';
            }
            return next;
          });
          resolve();
        }, nextDelay);
      });
    };

    await runStep(0, 1000);
    await runStep(1, 1200);
    await runStep(2, 1000);
    await runStep(3, 800);

    // Save newly generated CV
    try {
      const parentMaster = documents.find(d => d.id === selectedMasterId) || documents.find(d => d.category === 'Master CV');
      const contentBase = parentMaster?.content || '';
      
      const newDocRef = doc(collection(db, 'documents'));
      const payload: Omit<DocumentItem, 'id'> = {
        name: `${targetCompany} – ${targetRole}`,
        subtext: `Tailored for ${targetCompany} ${targetRole} role`,
        category: 'Generated CV',
        fileType: 'PDF',
        tags: ['CV', 'Generated'],
        content: `## Tailored for ${targetCompany} - ${targetRole}\n\n${contentBase}`,
        createdAt: serverTimestamp()
      };
      await setDoc(newDocRef, { ...payload, userId: user.uid });
      
      setIsGenerating(false);
      setIsGenerateModalOpen(false);
      setTargetRole('');
      setTargetCompany('');
      setJobDescription('');
      await loadDocuments();
    } catch (error) {
      console.error('Error creating generated document:', error);
      setIsGenerating(false);
    }
  };

  const handleDownloadFile = (docItem: DocumentItem) => {
    const element = document.createElement("a");
    const file = new Blob([docItem.content || ""], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const extension = docItem.fileType === 'TXT' ? '.txt' : '.docx';
    element.download = docItem.name.endsWith(extension) ? docItem.name : `${docItem.name}${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedType('All Types');
    setSelectedTag('All Tags');
    setSelectedDate('Any time');
    setActiveTab('All Documents');
  };

  // Helper date formatter
  const formatDocDate = (docItem: DocumentItem) => {
    if (docItem.updatedAtString) {
      const parts = docItem.updatedAtString.split('\n');
      return {
        date: parts[0]?.trim() || 'May 29, 2025',
        time: parts[1]?.trim() || '04:30 AM'
      };
    }
    
    let dateObj = new Date();
    if (docItem.createdAt) {
      if (typeof docItem.createdAt.toDate === 'function') {
        dateObj = docItem.createdAt.toDate();
      } else if (docItem.createdAt.seconds) {
        dateObj = new Date(docItem.createdAt.seconds * 1000);
      } else {
        dateObj = new Date(docItem.createdAt);
      }
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    
    return {
      date: `${month} ${day}, ${year}`,
      time: strTime
    };
  };

  // Compute filtering
  const filtered = documents.filter(docItem => {
    // 1. Tab Filters
    if (activeTab === 'Master CVs' && docItem.category !== 'Master CV') return false;
    if (activeTab === 'Generated CVs' && docItem.category !== 'Generated CV') return false;
    if (activeTab === 'Imported' && docItem.category !== 'Imported') return false;

    // 2. Sidebar categories filter
    if (selectedCategory !== 'All Categories' && docItem.category !== selectedCategory) return false;

    // 3. File type filter
    if (selectedType !== 'All Types' && docItem.fileType !== selectedType) return false;

    // 4. Tag filter
    if (selectedTag !== 'All Tags' && (!docItem.tags || !docItem.tags.includes(selectedTag))) return false;

    // 5. Date filter
    if (selectedDate !== 'Any time') {
      const now = Date.now();
      let docTime = now;
      if (docItem.createdAt) {
        docTime = docItem.createdAt.seconds ? docItem.createdAt.seconds * 1000 : new Date(docItem.createdAt).getTime();
      }
      const diffMs = now - docTime;
      const oneDay = 24 * 60 * 60 * 1000;
      if (selectedDate === 'Today' && diffMs > oneDay) return false;
      if (selectedDate === 'This week' && diffMs > oneDay * 7) return false;
      if (selectedDate === 'This month' && diffMs > oneDay * 30) return false;
      if (selectedDate === 'This year' && diffMs > oneDay * 365) return false;
    }

    // 6. Search input filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = docItem.name?.toLowerCase().includes(q);
      const matchSubtext = docItem.subtext?.toLowerCase().includes(q);
      if (!matchName && !matchSubtext) return false;
    }

    return true;
  });

  // Compute sorting
  const sortedAndFiltered = [...filtered].sort((a, b) => {
    if (sortBy === 'Last Modified') {
      const getMs = (item: DocumentItem) => {
        if (item.updatedAtString) {
          // parse simulated date May 29, 2025
          const monthStr = item.updatedAtString.split(' ')[0];
          const monthsIndex = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
          return new Date(2025, (monthsIndex as any)[monthStr] || 4, parseInt(item.updatedAtString.split(' ')[1] || '1')).getTime();
        }
        return item.createdAt?.seconds ? item.createdAt.seconds * 1000 : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
      };
      return getMs(b) - getMs(a);
    }
    if (sortBy === 'Document Name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'Type') {
      return (a.fileType || '').localeCompare(b.fileType || '');
    }
    return 0;
  });

  return (
    <div className="flex flex-col gap-8 text-[#E4E4E4] font-mono select-none" id="documents-panel">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#F43F5E] flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#F43F5E]" /> DOCUMENTS
          </h1>
        </div>
        <button 
          onClick={handleClearFilters}
          className="flex items-center gap-2 bg-[#F43F5E]/10 border border-[#F43F5E]/20 px-3 py-1.5 text-xs font-mono text-[#F43F5E] hover:bg-[#F43F5E]/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> DOCUMENT REPOSITORY
        </button>
      </header>

      {/* Quick Actions Container */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Quick Actions</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Action 1 */}
          <div 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-between p-4 bg-[#111113] hover:bg-[#151518] border border-white/5 hover:border-[#F43F5E]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-none shrink-0 text-[#F43F5E]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-sans font-bold text-white group-hover:text-[#F43F5E] transition-colors">Create Master CV</div>
                <div className="text-[11px] text-gray-400 font-sans">Build a comprehensive master CV</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#F43F5E] group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          {/* Action 2 */}
          <div 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-between p-4 bg-[#111113] hover:bg-[#151518] border border-white/5 hover:border-[#8B5CF6]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-none shrink-0 text-[#8B5CF6]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-sans font-bold text-white group-hover:text-[#8B5CF6] transition-colors">Import Document</div>
                <div className="text-[11px] text-gray-400 font-sans">Upload an existing PDF or DOCX</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          {/* Action 3 */}
          <div 
            onClick={() => {
              const masters = documents.filter(d => d.category === 'Master CV');
              if (masters.length > 0) setSelectedMasterId(masters[0].id);
              setIsGenerateModalOpen(true);
            }}
            className="flex items-center justify-between p-4 bg-[#111113] hover:bg-[#151518] border border-white/5 hover:border-[#10B981]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#10B981]/10 border border-[#10B981]/20 rounded-none shrink-0 text-[#10B981]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-sans font-bold text-white group-hover:text-[#10B981] transition-colors">Generate CV</div>
                <div className="text-[11px] text-gray-400 font-sans">Generate a CV from your master</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          {/* Action 4 */}
          <div 
            onClick={() => setActiveTab('All Documents')}
            className="flex items-center justify-between p-4 bg-[#111113] hover:bg-[#151518] border border-white/5 hover:border-[#F59E0B]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-none shrink-0 text-[#F59E0B]">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-sans font-bold text-white group-hover:text-[#F59E0B] transition-colors">Document Repository</div>
                <div className="text-[11px] text-gray-400 font-sans">Manage all your documents</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#F59E0B] group-hover:translate-x-1 transition-all shrink-0" />
          </div>

        </div>
      </div>

      {/* Main Grid Content */}
      <div className="w-full">
        
        {/* Documents List */}
        <section className="w-full flex flex-col gap-4">
          
          {/* Horizontal Tabs */}
          <div className="border-b border-white/10 flex gap-6 pb-2 mb-2 overflow-x-auto">
            {(['All Documents', 'Master CVs', 'Generated CVs', 'Imported'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 font-mono text-xs uppercase tracking-wider -mb-[10px] border-b-2 transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'text-[#F43F5E] border-[#F43F5E] font-bold' 
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Subheader status bar */}
          <div className="flex justify-between items-center bg-black/20 p-2.5 border border-white/5">
            <span className="text-xs text-gray-400 font-mono">{sortedAndFiltered.length} documents</span>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-mono">Sort by:</span>
              <div className="relative flex items-center mr-2">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-black/40 text-white border border-white/10 px-2 py-1 pr-6 text-xs focus:border-[#F43F5E] focus:outline-none cursor-pointer font-mono rounded-none uppercase appearance-none"
                >
                  <option value="Last Modified">Last Modified</option>
                  <option value="Document Name">Document Name</option>
                  <option value="Type">Type</option>
                </select>
                <ChevronDown className="w-3 h-3 text-gray-500 absolute right-1.5 pointer-events-none" />
              </div>

              {/* Layout togglers */}
              <button 
                onClick={() => setViewLayout('list')}
                className={`p-1.5 border transition-all ${
                  viewLayout === 'list' 
                    ? 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]' 
                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 border transition-all ${
                  viewLayout === 'grid' 
                    ? 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]' 
                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 border border-white/5 bg-black/10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F43F5E] mb-4"></div>
              <span className="text-xs text-gray-400">Syncing with secure repository...</span>
            </div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 border border-white/5 bg-black/10 text-center">
              <AlertCircle className="w-8 h-8 text-gray-500 mb-3" />
              <div className="text-sm font-bold text-white mb-1">No Documents Found</div>
              <p className="text-xs text-gray-500 max-w-sm">No items match the current filters or search query. Click 'Clear all' or add a new document.</p>
            </div>
          ) : viewLayout === 'list' ? (
            
            /* LIST LAYOUT (Table layout) */
            <div className="border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 items-center p-3 bg-black/40 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                <div className="col-span-5 md:col-span-6">Document</div>
                <div className="col-span-3 md:col-span-2">Category</div>
                <div className="col-span-1 text-center md:text-left">Type</div>
                <div className="col-span-3 md:col-span-2">Last Modified</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-white/5">
                {sortedAndFiltered.map(docItem => {
                  const docDate = formatDocDate(docItem);
                  
                  // Category pill colors
                  const catColors = {
                    'Master CV': 'border-red-500/20 bg-red-950/20 text-red-400',
                    'Generated CV': 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400',
                    'Imported': 'border-blue-500/20 bg-blue-950/20 text-blue-400',
                    'Template': 'border-purple-500/20 bg-purple-950/20 text-purple-400',
                    'Archive': 'border-gray-500/20 bg-gray-950/10 text-gray-400'
                  }[docItem.category] || 'border-gray-500/20 bg-gray-950/10 text-gray-400';

                  // File icon colors
                  const iconColors = {
                    'Master CV': 'bg-red-500/5 border-red-500/10 text-[#F43F5E]',
                    'Generated CV': 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
                    'Imported': 'bg-blue-500/5 border-blue-500/10 text-blue-400',
                    'Template': 'bg-purple-500/5 border-purple-500/10 text-purple-400',
                    'Archive': 'bg-gray-500/5 border-gray-500/10 text-gray-400'
                  }[docItem.category] || 'bg-gray-500/5 border-gray-500/10 text-gray-400';

                  return (
                    <div 
                      key={docItem.id}
                      className="grid grid-cols-12 items-center p-3 hover:bg-white/[0.02] transition-colors gap-2"
                    >
                      {/* Document column */}
                      <div className="col-span-5 md:col-span-6 flex items-center overflow-hidden pr-2">
                        <div className={`w-9 h-9 flex items-center justify-center border mr-3 shrink-0 ${iconColors}`}>
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="overflow-hidden">
                          <span 
                            onClick={() => setPreviewDoc(docItem)}
                            className="text-sm font-sans font-bold text-white hover:text-[#F43F5E] transition-colors cursor-pointer truncate block"
                          >
                            {docItem.name}
                          </span>
                          <span className="text-xs text-gray-500 truncate block mt-0.5">{docItem.subtext}</span>
                        </div>
                      </div>

                      {/* Category column */}
                      <div className="col-span-3 md:col-span-2">
                        <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-full text-center ${catColors}`}>
                          {docItem.category}
                        </span>
                      </div>

                      {/* Type column */}
                      <div className="col-span-1 font-mono text-xs text-gray-300">
                        {docItem.fileType}
                      </div>

                      {/* Last Modified column */}
                      <div className="col-span-3 md:col-span-2 font-sans">
                        <span className="text-xs text-gray-300 block">{docDate.date}</span>
                        <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">{docDate.time}</span>
                      </div>

                      {/* Actions column */}
                      <div className="col-span-1 flex items-center justify-end gap-2 shrink-0 pr-2">
                        <button 
                          onClick={() => setPreviewDoc(docItem)}
                          className="p-1.5 hover:bg-white/5 hover:text-white text-gray-400 transition-colors cursor-pointer"
                          title="Preview document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Conditioned download block */}
                        <PDFDownloadLink document={<ResumePDF content={docItem.content || ''} color="#A855F7" font="Inter" />} fileName={`${docItem.name.replace(/\.[^/.]+$/, "")}.pdf`}>
                          {({ loading: dlLoading }) => (
                            <button 
                              className="p-1.5 hover:bg-white/5 hover:text-emerald-400 text-gray-400 transition-colors cursor-pointer"
                              title="Download PDF"
                              disabled={dlLoading}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </PDFDownloadLink>

                        <button 
                          onClick={() => setEditingDoc(docItem)}
                          className="p-1.5 hover:bg-white/5 hover:text-blue-400 text-gray-400 transition-colors cursor-pointer"
                          title="Edit content"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleDelete(docItem.id)}
                          className="p-1.5 hover:bg-white/5 hover:text-rose-500 text-gray-400 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            
            /* GRID LAYOUT (Card layouts) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedAndFiltered.map(docItem => {
                const docDate = formatDocDate(docItem);
                
                const catColors = {
                  'Master CV': 'border-red-500/20 bg-red-950/20 text-red-400',
                  'Generated CV': 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400',
                  'Imported': 'border-blue-500/20 bg-blue-950/20 text-blue-400',
                  'Template': 'border-purple-500/20 bg-purple-950/20 text-purple-400',
                  'Archive': 'border-gray-500/20 bg-gray-950/10 text-gray-400'
                }[docItem.category] || 'border-gray-500/20 bg-gray-950/10 text-gray-400';

                const iconColors = {
                  'Master CV': 'bg-red-500/5 border-red-500/10 text-[#F43F5E]',
                  'Generated CV': 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
                  'Imported': 'bg-blue-500/5 border-blue-500/10 text-blue-400',
                  'Template': 'bg-purple-500/5 border-purple-500/10 text-purple-400',
                  'Archive': 'bg-gray-500/5 border-gray-500/10 text-gray-400'
                }[docItem.category] || 'bg-gray-500/5 border-gray-500/10 text-gray-400';

                return (
                  <div 
                    key={docItem.id}
                    className="p-5 bg-[#111113] border border-white/10 hover:border-[#F43F5E]/30 transition-all flex flex-col justify-between h-48 group"
                  >
                    <div>
                      {/* Top row info */}
                      <div className="flex justify-between items-start gap-2">
                        <div className={`w-9 h-9 flex items-center justify-center border shrink-0 ${iconColors}`}>
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-full ${catColors}`}>
                          {docItem.category}
                        </span>
                      </div>

                      {/* Header block */}
                      <h4 
                        onClick={() => setPreviewDoc(docItem)}
                        className="text-sm font-sans font-bold text-white hover:text-[#F43F5E] transition-colors cursor-pointer block mt-3 truncate"
                      >
                        {docItem.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate block mt-0.5">{docItem.subtext}</p>
                    </div>

                    {/* Bottom actions and timestamp */}
                    <div className="border-t border-white/5 pt-3 mt-3 flex justify-between items-center">
                      <div className="font-mono text-[10px] text-gray-500 uppercase">
                        {docItem.fileType} • {docDate.date}
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setPreviewDoc(docItem)}
                          className="p-1 hover:bg-white/5 hover:text-white text-gray-400 transition-colors cursor-pointer"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <PDFDownloadLink document={<ResumePDF content={docItem.content || ''} color="#A855F7" font="Inter" />} fileName={`${docItem.name.replace(/\.[^/.]+$/, "")}.pdf`}>
                          {({ loading: dlLoading }) => (
                            <button 
                              className="p-1 hover:bg-white/5 hover:text-emerald-400 text-gray-400 transition-colors cursor-pointer"
                              title="Download PDF"
                              disabled={dlLoading}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </PDFDownloadLink>

                        <button 
                          onClick={() => setEditingDoc(docItem)}
                          className="p-1 hover:bg-white/5 hover:text-blue-400 text-gray-400 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(docItem.id)}
                          className="p-1 hover:bg-white/5 hover:text-rose-500 text-gray-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table footer with pagination styling matching the image */}
          <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-2">
            <span className="text-xs text-gray-500 font-mono">
              Showing 1 to {sortedAndFiltered.length} of {sortedAndFiltered.length} documents
            </span>
            
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all rounded-none cursor-not-allowed shrink-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="px-3 py-1 bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] font-bold font-mono text-xs rounded-none">
                1
              </button>
              <button className="p-1.5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all rounded-none cursor-not-allowed shrink-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </section>
      </div>

      {/* MODAL 1: Create Master CV */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111113] border border-white/10 p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F43F5E]" /> CREATE MASTER CV
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 uppercase mb-1.5 block">Document Name</label>
                <input 
                  type="text"
                  value={newCVName}
                  onChange={(e) => setNewCVName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs px-3 py-2.5 focus:border-[#F43F5E] focus:outline-none transition-all rounded-none"
                />
              </div>
              <p className="text-[11px] text-gray-500 font-sans leading-relaxed">This will create a clean document initialized with your master profile data. You can access and customize this document at any time from this repository.</p>
            </div>

            <div className="flex justify-end gap-3 font-mono text-xs">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button 
                onClick={handleCreateMasterCV}
                className="px-4 py-2 bg-[#F43F5E] text-white hover:bg-[#ff6b82] transition-all cursor-pointer font-bold"
              >
                CREATE DOCUMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Import Document (Includes Drag & Drop Usability support) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111113] border border-white/10 p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setIsImportModalOpen(false);
                setUploadingState('idle');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#8B5CF6]" /> IMPORT DOCUMENT
            </h3>

            {uploadingState === 'idle' ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragActive 
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' 
                    : 'border-white/10 bg-black/20 hover:border-[#8B5CF6]/40 hover:bg-black/30'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />
                <Upload className={`w-8 h-8 text-[#8B5CF6] mb-3 ${isDragActive ? 'animate-bounce' : 'opacity-80'}`} />
                <p className="text-xs font-sans font-bold text-white mb-1">Drag & drop your file here</p>
                <p className="text-[11px] text-gray-500 font-sans mb-3">or click to browse from computer</p>
                <div className="px-3 py-1 border border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-wider text-gray-400">
                  PDF, DOCX, DOC, or TXT (MAX. 5MB)
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#8B5CF6]/10 mb-4 text-[#8B5CF6]">
                  {uploadingState === 'uploading' ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-b-transparent border-[#8B5CF6]"></div>
                  ) : (
                    <Check className="w-6 h-6" />
                  )}
                </div>
                <p className="text-xs text-white font-bold mb-1">
                  {uploadingState === 'uploading' ? 'Parsing & uploading document...' : 'Upload complete!'}
                </p>
                <p className="text-[10px] text-gray-500 font-sans mb-4 truncate max-w-xs">{uploadFile?.name}</p>
                
                {/* Simulated progress bar */}
                <div className="w-48 bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#8B5CF6] h-full transition-all duration-150" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 font-mono text-xs mt-6">
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setUploadingState('idle');
                }}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AI Resume tailoring Simulation */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111113] border border-white/10 p-6 shadow-2xl relative">
            <button 
              disabled={isGenerating}
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#10B981]" /> AI TAILORED CV GENERATOR
            </h3>

            {!isGenerating ? (
              <div className="space-y-4">
                
                {/* Select Master */}
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 block">Select Base Master CV</label>
                  <div className="relative flex items-center">
                    <select 
                      value={selectedMasterId}
                      onChange={(e) => setSelectedMasterId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white text-xs px-3 py-2.5 focus:border-[#10B981] focus:outline-none transition-all rounded-none cursor-pointer appearance-none"
                    >
                      {documents.filter(d => d.category === 'Master CV').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                      {documents.filter(d => d.category === 'Master CV').length === 0 && (
                        <option value="">Default Master Profile</option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 block">Target Company</label>
                    <input 
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g., Henkel"
                      className="w-full bg-black/40 border border-white/10 text-white text-xs px-3 py-2.5 focus:border-[#10B981] focus:outline-none transition-all rounded-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 block">Target Job Title</label>
                    <input 
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., Sales Enablement Intern"
                      className="w-full bg-black/40 border border-white/10 text-white text-xs px-3 py-2.5 focus:border-[#10B981] focus:outline-none transition-all rounded-none"
                    />
                  </div>
                </div>

                {/* Textarea job description */}
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 block">Job Description / Requirements</label>
                  <textarea 
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description keywords here to optimize ATS scan matching..."
                    className="w-full h-32 bg-black/40 border border-white/10 text-white text-xs px-3 py-2.5 focus:border-[#10B981] focus:outline-none transition-all rounded-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-3 font-mono text-xs pt-4 border-t border-white/5">
                  <button 
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleGenerateCV}
                    disabled={!targetRole || !targetCompany}
                    className="px-4 py-2 bg-[#10B981] text-white hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" /> GENERATE CV
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-emerald-400 shrink-0"></div>
                  <span>AI orchestration compiler actively processing guidelines...</span>
                </div>

                <div className="space-y-3 pl-1 font-sans text-xs">
                  {genSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-gray-300">
                      <div className="flex items-center gap-2.5">
                        {step.status === 'done' ? (
                          <div className="w-4 h-4 flex items-center justify-center bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        ) : step.status === 'loading' ? (
                          <div className="w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                            <div className="animate-spin rounded-full h-3 w-3 border border-b-transparent border-emerald-400"></div>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-white/10 rounded-full shrink-0" />
                        )}
                        <span className={step.status === 'waiting' ? 'opacity-40' : 'opacity-100'}>{step.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">
                        {step.status === 'done' ? 'DONE' : step.status === 'loading' ? 'RUNNING' : 'QUEUED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer / Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-[#111113] border border-white/10 flex flex-col shadow-2xl relative">
            <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-5 h-5 text-[#F43F5E] shrink-0" />
                <h3 className="font-mono text-sm font-bold text-white truncate max-w-md uppercase tracking-wider">{previewDoc.name}</h3>
                <span className="text-xs text-gray-500 font-mono hidden md:inline">({previewDoc.fileType})</span>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.fileType === 'PDF' ? (
                  <PDFDownloadLink document={<ResumePDF content={previewDoc.content || ''} color="#A855F7" font="Inter" />} fileName={`${previewDoc.name}.pdf`}>
                    {({ loading: dlLoading }) => (
                      <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30 text-xs font-mono tracking-wide transition-all cursor-pointer"
                        disabled={dlLoading}
                      >
                        <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
                      </button>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <button 
                    onClick={() => handleDownloadFile(previewDoc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono tracking-wide transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> DOWNLOAD DOCX
                  </button>
                )}
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-black/40 p-4">
              {previewDoc.fileType === 'PDF' ? (
                <div className="h-full w-full min-h-[500px]">
                  <PDFViewer className="w-full h-full border-0">
                    <ResumePDF content={previewDoc.content || ''} />
                  </PDFViewer>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white text-gray-800 p-8 shadow font-sans text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {previewDoc.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal wrapper */}
      {editingDoc && (
        <ResumeEditor 
          initialContent={editingDoc.content || ''}
          onSave={handleSaveEdit}
          onClose={() => setEditingDoc(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111113] border border-white/10 flex flex-col shadow-2xl relative p-6">
            <h3 className="font-mono text-lg font-bold text-white mb-4">Delete Document</h3>
            <p className="text-sm text-gray-400 font-sans mb-6">Are you sure you want to delete this document? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-mono text-xs font-bold uppercase transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold uppercase transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
