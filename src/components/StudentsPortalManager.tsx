import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  HelpCircle, 
  Image as ImageIcon, 
  Award, 
  Search, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  RotateCcw, 
  Sliders, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark, 
  BookOpen, 
  FolderPlus, 
  Folder, 
  ListChecks, 
  Filter, 
  CheckSquare, 
  Square, 
  Play, 
  Loader2,
  ChevronRight,
  ArrowLeft,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  PortalCategory, 
  PortalSection, 
  usePortalSections 
} from '../lib/portalSections';
import {
  getQuestionFolders,
  saveQuestionFolders,
  addQuestionFolder,
  updateQuestionFolder,
  deleteQuestionFolder,
  toggleQuestionFolderActive,
  fetchAllSubjectBuilderQuestions,
  getBookmarkedQuestionIds,
  saveBookmarkedQuestionIds,
  toggleQuestionBookmark,
  QuestionFolder,
  QuestionItem,
  SubjectItem
} from '../lib/questionFolders';

export default function StudentsPortalManager() {
  const navigate = useNavigate();
  const { 
    sections, 
    toggleActive, 
    addSection, 
    updateSection, 
    deleteSection, 
    resetToDefaults 
  } = usePortalSections();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<PortalCategory>('qbank');
  const [qbankSubFilter, setQbankSubFilter] = useState<'subjects' | 'custom'>('subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

  // Question Folders state (created from Subject-Wise Question Builder)
  const [questionFolders, setQuestionFolders] = useState<QuestionFolder[]>(() => getQuestionFolders());
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<QuestionFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderCode, setFolderCode] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderSelectedQuestionIds, setFolderSelectedQuestionIds] = useState<string[]>([]);
  const [folderError, setFolderError] = useState('');
  const [loadingQuestionsForModal, setLoadingQuestionsForModal] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectItem[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);
  const [folderSubjectFilter, setFolderSubjectFilter] = useState<string>('all');
  const [folderQuestionSearch, setFolderQuestionSearch] = useState<string>('');
  const [previewFolder, setPreviewFolder] = useState<QuestionFolder | null>(null);

  // Bookmarked MCQs state in Subject Folders
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>(() => getBookmarkedQuestionIds());
  const [selectedBookmarkFolderId, setSelectedBookmarkFolderId] = useState<string>('all');
  const [bookmarkQuestionFilter, setBookmarkQuestionFilter] = useState<'all' | 'bookmarked-only'>('all');

  // Modal states for Section Add / Edit (non-folder sections)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<PortalSection | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'folder' | 'section'; id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Add / Edit Section
  const [formCategory, setFormCategory] = useState<PortalCategory>('qbank');
  const [formSubType, setFormSubType] = useState<'subject' | 'bookmarked' | 'custom'>('subject');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('');
  const [formItemCount, setFormItemCount] = useState<number>(100);
  const [formTimeLimit, setFormTimeLimit] = useState<number>(180);
  const [formPassingScore, setFormPassingScore] = useState<number>(60);
  const [formDifficulty, setFormDifficulty] = useState('Exam Grade');
  const [formAuthority, setFormAuthority] = useState('DHA Dubai / Prometric');
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync question folders and bookmarks on window events
  useEffect(() => {
    const handleFoldersUpdated = (e: any) => {
      if (e.detail) {
        setQuestionFolders(e.detail);
      }
    };
    const handleBookmarksUpdated = (e: any) => {
      if (e.detail) {
        setBookmarkedQuestionIds(e.detail);
      }
    };
    window.addEventListener('promedo:question_folders_updated', handleFoldersUpdated);
    window.addEventListener('promedo:bookmarked_questions_updated', handleBookmarksUpdated);
    return () => {
      window.removeEventListener('promedo:question_folders_updated', handleFoldersUpdated);
      window.removeEventListener('promedo:bookmarked_questions_updated', handleBookmarksUpdated);
    };
  }, []);

  // Open Create Folder Modal (fetches questions from subject builder)
  const handleOpenCreateFolderModal = async () => {
    setEditingFolder(null);
    const existingCount = questionFolders.length + 1;
    setFolderName('');
    setFolderCode(`QB-FLD-${existingCount.toString().padStart(2, '0')}`);
    setFolderDescription('Folder of questions selected from the subject-wise question builder.');
    setFolderSelectedQuestionIds([]);
    setFolderError('');
    setFolderSubjectFilter('all');
    setFolderQuestionSearch('');
    setIsFolderModalOpen(true);
    setLoadingQuestionsForModal(true);

    try {
      const { subjects, questions } = await fetchAllSubjectBuilderQuestions();
      setAvailableSubjects(subjects);
      setAvailableQuestions(questions);
    } catch (e) {
      console.error('Error fetching questions for folder builder:', e);
    } finally {
      setLoadingQuestionsForModal(false);
    }
  };

  // Open Edit Folder Modal
  const handleOpenEditFolderModal = async (folder: QuestionFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderCode(folder.code);
    setFolderDescription(folder.description);
    setFolderSelectedQuestionIds(folder.selectedQuestionIds);
    setFolderError('');
    setFolderSubjectFilter('all');
    setFolderQuestionSearch('');
    setIsFolderModalOpen(true);
    setLoadingQuestionsForModal(true);

    try {
      const { subjects, questions } = await fetchAllSubjectBuilderQuestions();
      setAvailableSubjects(subjects);
      setAvailableQuestions(questions);
    } catch (e) {
      console.error('Error fetching questions for folder builder:', e);
    } finally {
      setLoadingQuestionsForModal(false);
    }
  };

  // Toggle selection of a question for the folder
  const handleToggleQuestionSelect = (questionId: string) => {
    setFolderSelectedQuestionIds(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Filter questions for the question picker modal
  const filteredModalQuestions = availableQuestions.filter(q => {
    const matchesSubj = folderSubjectFilter === 'all' || q.subjectId === folderSubjectFilter;
    const term = folderQuestionSearch.toLowerCase().trim();
    const matchesSearch = !term || 
      q.text.toLowerCase().includes(term) || 
      q.subjectName.toLowerCase().includes(term) ||
      q.options.some(opt => opt.toLowerCase().includes(term));
    return matchesSubj && matchesSearch;
  });

  // Select all or deselect all filtered questions
  const handleSelectAllFilteredQuestions = () => {
    const filteredIds = filteredModalQuestions.map(q => q.id);
    const allSelected = filteredIds.every(id => folderSelectedQuestionIds.includes(id));
    if (allSelected) {
      setFolderSelectedQuestionIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setFolderSelectedQuestionIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };



  // Save or Update Folder containing selected questions
  const handleSaveQuestionFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setFolderError('Folder name is required.');
      return;
    }
    if (!folderCode.trim()) {
      setFolderError('Folder code identifier is required.');
      return;
    }
    if (folderSelectedQuestionIds.length === 0) {
      setFolderError('Please select at least one question from the subject-wise question builder.');
      return;
    }

    const selectedQObjects = availableQuestions.filter(q => folderSelectedQuestionIds.includes(q.id));
    const subjectNames: string[] = Array.from(new Set(selectedQObjects.map(q => q.subjectName)));

    if (editingFolder) {
      const updated = updateQuestionFolder(editingFolder.id, {
        name: folderName.trim(),
        code: folderCode.trim().toUpperCase(),
        description: folderDescription.trim(),
        selectedQuestionIds: folderSelectedQuestionIds,
        selectedQuestions: selectedQObjects,
        subjectNames,
      });
      setQuestionFolders(updated);
      showToast(`Folder "${folderName}" updated with ${folderSelectedQuestionIds.length} questions.`);
    } else {
      const created = addQuestionFolder({
        name: folderName.trim(),
        code: folderCode.trim().toUpperCase(),
        description: folderDescription.trim(),
        selectedQuestionIds: folderSelectedQuestionIds,
        selectedQuestions: selectedQObjects,
        subjectNames,
        isActive: true
      });
      setQuestionFolders(prev => [created, ...prev]);
      showToast(`New folder "${folderName}" created with ${folderSelectedQuestionIds.length} questions!`);
    }

    setIsFolderModalOpen(false);
  };

  // Delete a Question Folder
  const handleDeleteFolder = (id: string, name: string) => {
    setDeleteConfirmTarget({ type: 'folder', id, name });
  };

  // Toggle Folder Active / Hidden
  const handleToggleFolderActive = (id: string, name: string) => {
    const updated = toggleQuestionFolderActive(id);
    setQuestionFolders(updated);
    const item = updated.find(f => f.id === id);
    showToast(`Folder "${name}" is now ${item?.isActive ? 'active in' : 'hidden from'} candidate portal.`);
  };

  // Toggle Bookmark for a question in a Subject Folder
  const handleToggleBookmark = (questionId: string) => {
    const updated = toggleQuestionBookmark(questionId);
    setBookmarkedQuestionIds(updated);
    const isNowBookmarked = updated.includes(questionId);
    showToast(isNowBookmarked ? 'Question added to Bookmarked MCQs' : 'Question removed from Bookmarked MCQs');
  };

  // Bookmark all questions in a specific Subject Folder
  const handleBookmarkAllInFolder = (folder: QuestionFolder) => {
    const current = new Set<string>(bookmarkedQuestionIds);
    folder.selectedQuestions.forEach(q => current.add(q.id));
    const next: string[] = Array.from(current);
    saveBookmarkedQuestionIds(next);
    setBookmarkedQuestionIds(next);
    showToast(`All ${folder.selectedQuestions.length} questions in "${folder.name}" marked as bookmarked!`);
  };

  // Clear all bookmarks for questions in a specific Subject Folder
  const handleClearBookmarksInFolder = (folder: QuestionFolder) => {
    const folderQIds = new Set(folder.selectedQuestions.map(q => q.id));
    const next = bookmarkedQuestionIds.filter(id => !folderQIds.has(id));
    saveBookmarkedQuestionIds(next);
    setBookmarkedQuestionIds(next);
    showToast(`Bookmarks cleared for "${folder.name}".`);
  };

  // Count how many questions in a folder are bookmarked
  const getFolderBookmarkedCount = (folder: QuestionFolder) => {
    return folder.selectedQuestions.filter(q => bookmarkedQuestionIds.includes(q.id)).length;
  };

  // Non-folder Section Edit / Delete handlers
  const handleOpenEditModal = (sec: PortalSection) => {
    setEditingSection(sec);
    setFormCategory(sec.category);
    setFormSubType(sec.metadata?.subType || (sec.id === 'qb-sec-bookmarked' ? 'bookmarked' : sec.id === 'qb-sec-custom' ? 'custom' : 'subject'));
    setFormName(sec.name);
    setFormCode(sec.code);
    setFormDescription(sec.description);
    setFormBadgeText(sec.badgeText || '');
    setFormItemCount(sec.itemCount || 0);
    setFormTimeLimit(sec.metadata?.timeLimit || 180);
    setFormPassingScore(sec.metadata?.passingScore || 60);
    setFormDifficulty(sec.metadata?.difficulty || 'Exam Grade');
    setFormAuthority(sec.metadata?.authority || 'Prometric');
    setFormError('');
  };

  const handleOpenAddModal = (defaultCat?: PortalCategory, defaultSubType?: 'subject' | 'bookmarked' | 'custom') => {
    const targetCat = defaultCat || activeCategoryFilter;
    setFormCategory(targetCat);
    const subType = defaultSubType || (qbankSubFilter === 'bookmarked' ? 'bookmarked' : qbankSubFilter === 'custom' ? 'custom' : 'subject');
    setFormSubType(subType);
    setFormName('');
    const count = sections.filter(s => s.category === targetCat).length + 1;
    const prefix = targetCat === 'imagebank' ? 'IB' : 'MT';
    setFormCode(`${prefix}-${count.toString().padStart(2, '0')}`);
    setFormDescription('');
    setFormBadgeText(targetCat === 'imagebank' ? 'Diagnostic Spotter' : 'Prometric Simulator');
    setFormItemCount(targetCat === 'mocktests' ? 150 : 50);
    setFormTimeLimit(180);
    setFormPassingScore(60);
    setFormDifficulty('Exam Grade');
    setFormAuthority('DHA Dubai / Prometric');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmitSectionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Section title/name is required.');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Section code identifier is required.');
      return;
    }

    if (editingSection) {
      updateSection(editingSection.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        badgeText: formBadgeText.trim(),
        itemCount: Number(formItemCount) || 0,
        metadata: {
          ...editingSection.metadata,
          timeLimit: Number(formTimeLimit),
          passingScore: Number(formPassingScore),
          difficulty: formDifficulty,
          authority: formAuthority,
          subType: formSubType
        }
      });
      showToast(`Section "${formName}" updated successfully.`);
      setEditingSection(null);
    } else {
      addSection({
        category: formCategory,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        badgeText: formBadgeText.trim(),
        itemCount: Number(formItemCount) || 0,
        isActive: true,
        order: sections.filter(s => s.category === formCategory).length + 1,
        metadata: {
          timeLimit: Number(formTimeLimit),
          passingScore: Number(formPassingScore),
          difficulty: formDifficulty,
          authority: formAuthority,
          subType: formSubType
        }
      });
      showToast(`New section "${formName}" added to candidate portal.`);
      setIsAddModalOpen(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmTarget({ type: 'section', id, name });
  };

  const confirmExecuteDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'folder') {
      const updated = deleteQuestionFolder(deleteConfirmTarget.id);
      setQuestionFolders(updated);
      showToast(`Folder "${deleteConfirmTarget.name}" deleted.`);
    } else {
      deleteSection(deleteConfirmTarget.id);
      showToast(`Section "${deleteConfirmTarget.name}" deleted.`);
    }
    setDeleteConfirmTarget(null);
  };

  // Section category counts
  const customSections = sections.filter(s => 
    s.id === 'qb-sec-custom' || 
    s.metadata?.subType === 'custom' || 
    s.name.toLowerCase().includes('custom')
  );

  const customCount = customSections.length;
  const questionFoldersCount = questionFolders.length;
  const qbankTotalCount = questionFoldersCount + questionFoldersCount + customCount;
  const imagebankCount = sections.filter(s => s.category === 'imagebank').length;
  const mocktestsCount = sections.filter(s => s.category === 'mocktests').length;

  // Filtered Question Folders (when in Subject Banks)
  const filteredFolders = questionFolders.filter(f => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && f.isActive) || 
      (statusFilter === 'hidden' && !f.isActive);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      f.name.toLowerCase().includes(q) || 
      f.code.toLowerCase().includes(q) || 
      f.description.toLowerCase().includes(q) ||
      f.subjectNames.some(s => s.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // Filtered non-folder sections (for Custom, Image Bank, Mock Tests)
  const filteredSections = sections.filter(sec => {
    let matchesCategory = sec.category === activeCategoryFilter;

    if (activeCategoryFilter === 'qbank') {
      if (qbankSubFilter === 'custom') {
        matchesCategory = sec.id === 'qb-sec-custom' || sec.metadata?.subType === 'custom' || sec.name.toLowerCase().includes('custom');
      } else {
        matchesCategory = false;
      }
    }

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && sec.isActive) || 
      (statusFilter === 'hidden' && !sec.isActive);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      sec.name.toLowerCase().includes(q) || 
      sec.code.toLowerCase().includes(q) || 
      sec.description.toLowerCase().includes(q) ||
      (sec.metadata?.authority && sec.metadata.authority.toLowerCase().includes(q));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Active / Hidden counts for current view
  const currentTotalCount = activeCategoryFilter === 'qbank' && (qbankSubFilter === 'subjects' || qbankSubFilter === 'bookmarked')
    ? questionFolders.length
    : filteredSections.length;
  const currentActiveCount = activeCategoryFilter === 'qbank' && (qbankSubFilter === 'subjects' || qbankSubFilter === 'bookmarked')
    ? questionFolders.filter(f => f.isActive).length
    : sections.filter(s => s.category === activeCategoryFilter && s.isActive).length;
  const currentHiddenCount = activeCategoryFilter === 'qbank' && (qbankSubFilter === 'subjects' || qbankSubFilter === 'bookmarked')
    ? questionFolders.filter(f => !f.isActive).length
    : sections.filter(s => s.category === activeCategoryFilter && !s.isActive).length;

  // Selected folder for Bookmarked MCQ section
  const currentSelectedBookmarkFolder = selectedBookmarkFolderId !== 'all'
    ? questionFolders.find(f => f.id === selectedBookmarkFolderId)
    : null;

  return (
    <div className="space-y-8">
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* CORE PORTAL CATEGORY TABS (Question Bank, Image Bank, Mock Test Simulators) */}
      <div className="space-y-3 border-b border-[#E5EEFF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Segmented Tabs (3 Candidate Portal Categories) */}
          <div className="flex items-center gap-1.5 bg-[#EFF4FF] p-1.5 rounded-2xl border border-[#E5EEFF] overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setActiveCategoryFilter('qbank'); setQbankSubFilter('subjects'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategoryFilter === 'qbank'
                  ? 'bg-white text-[#0B1C30] shadow-xs font-black ring-1 ring-[#3853A4]/20'
                  : 'text-[#45464D] hover:text-[#0B1C30]'
              }`}
            >
              <HelpCircle size={14} className="text-[#3853A4]" />
              <span>Question Bank ({qbankTotalCount})</span>
            </button>

            <button
              onClick={() => { setActiveCategoryFilter('imagebank'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategoryFilter === 'imagebank'
                  ? 'bg-white text-[#0B1C30] shadow-xs font-black ring-1 ring-sky-500/20'
                  : 'text-[#45464D] hover:text-[#0B1C30]'
              }`}
            >
              <ImageIcon size={14} className="text-sky-600" />
              <span>Image Bank ({imagebankCount})</span>
            </button>

            <button
              onClick={() => { setActiveCategoryFilter('mocktests'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategoryFilter === 'mocktests'
                  ? 'bg-white text-[#0B1C30] shadow-xs font-black ring-1 ring-amber-500/20'
                  : 'text-[#45464D] hover:text-[#0B1C30]'
              }`}
            >
              <Award size={14} className="text-amber-600" />
              <span>Mock Test Simulators ({mocktestsCount})</span>
            </button>
          </div>
        </div>

        {/* INSIDE QUESTION BANK: 3 OPTIONS + OPTION TO CREATE NEW FOLDERS FROM SUBJECT BUILDER */}
        {activeCategoryFilter === 'qbank' && (
          <div className="bg-[#EFF4FF]/60 rounded-2xl p-2.5 border border-[#E5EEFF] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-black uppercase text-[#3853A4] tracking-wider px-2 py-1 bg-white border border-[#E5EEFF] rounded-lg shrink-0 flex items-center gap-1.5">
                <Layers size={13} />
                Inside Question Bank:
              </span>

              {/* Option 1: Subject Question Folders */}
              <button
                onClick={() => setQbankSubFilter('subjects')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  qbankSubFilter === 'subjects'
                    ? 'bg-[#3853A4] text-white shadow-2xs font-black'
                    : 'bg-white text-[#45464D] hover:text-[#0B1C30] border border-[#E5EEFF]'
                }`}
              >
                <BookOpen size={13} className={qbankSubFilter === 'subjects' ? 'text-white' : 'text-[#3853A4]'} />
                <span>Subject Folders ({questionFoldersCount})</span>
              </button>

              {/* Option 3: Custom Module */}
              <button
                onClick={() => setQbankSubFilter('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  qbankSubFilter === 'custom'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'bg-white text-indigo-700 hover:text-indigo-900 border border-indigo-200'
                }`}
              >
                <Sliders size={13} className={qbankSubFilter === 'custom' ? 'text-white' : 'text-indigo-600'} />
                <span>Custom Module ({customCount})</span>
              </button>
            </div>

            {/* Option to create new folders containing questions selected from subject builder */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={handleOpenCreateFolderModal}
                className="px-3.5 py-1.5 bg-[#3853A4] hover:bg-[#2E4387] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FolderPlus size={14} />
                <span>Create New Folder</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH & STATUS FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EEFF] shadow-2xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeCategoryFilter === 'qbank' && (qbankSubFilter === 'subjects' || qbankSubFilter === 'bookmarked')
                ? "Search folders by name, code, or subject..."
                : "Search by section name, code, or authority..."
            }
            className="w-full pl-9 pr-8 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-medium text-[#0B1C30] outline-none focus:border-[#3853A4] transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-[#F8FAFF] p-1 rounded-xl border border-[#E5EEFF] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                statusFilter === 'all' ? 'bg-[#3853A4] text-white shadow-2xs' : 'text-[#45464D]'
              }`}
            >
              All Status ({currentTotalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-[#45464D]'
              }`}
            >
              Live Active ({currentActiveCount})
            </button>
            <button
              onClick={() => setStatusFilter('hidden')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                statusFilter === 'hidden' ? 'bg-slate-700 text-white shadow-2xs' : 'text-[#45464D]'
              }`}
            >
              Hidden ({currentHiddenCount})
            </button>
          </div>
        </div>
      </div>

      {/* SECTIONS / FOLDERS MANAGEMENT CONTENT */}
      {activeCategoryFilter === 'qbank' && qbankSubFilter === 'subjects' ? (
        /* SUBJECT QUESTION FOLDERS SECTION */
        <div className="space-y-4">
          {/* Header Action Banner */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5EEFF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3853A4] flex items-center justify-center shrink-0 border border-blue-100">
                <FolderPlus size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0B1C30]">Subject Question Folders</h3>
                <p className="text-xs text-[#45464D]">
                  Custom folders containing questions selected from the subject-wise question builder ({questionFolders.length} folders created).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenCreateFolderModal}
                className="px-4 py-2 bg-[#3853A4] hover:bg-[#2E4387] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Create New Folder</span>
              </button>
            </div>
          </div>

          {/* Folder Cards List */}
          {filteredFolders.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E5EEFF] rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF4FF] text-[#3853A4] mx-auto flex items-center justify-center">
                <FolderPlus size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#0B1C30] text-base">No Question Folders Found</h4>
                <p className="text-xs text-[#45464D] max-w-md mx-auto">
                  {searchQuery 
                    ? `No question folders match "${searchQuery}".` 
                    : 'Create new folders containing questions selected from the subject-wise question builder to organize drills for candidates.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleOpenCreateFolderModal}
                  className="px-4 py-2.5 bg-[#3853A4] hover:bg-[#2E4387] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all"
                >
                  <FolderPlus size={15} />
                  <span>Create New Folder</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    folder.isActive ? 'border-[#E5EEFF]' : 'border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border text-[#3853A4] bg-blue-50 border-blue-200">
                        <FolderPlus size={12} />
                        <span>Question Folder</span>
                      </span>

                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        {folder.code}
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#3853A4] border border-blue-200">
                        {folder.selectedQuestionIds.length} Questions Selected
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        folder.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${folder.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        <span>{folder.isActive ? 'Active in Portal' : 'Hidden from Candidates'}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-[#0B1C30] tracking-tight">
                        {folder.name}
                      </h4>
                      {folder.description && (
                        <p className="text-xs text-[#45464D] mt-0.5 line-clamp-2 leading-relaxed">
                          {folder.description}
                        </p>
                      )}
                    </div>

                    {/* Subjects represented badges */}
                    <div className="text-[11px] text-[#45464D] font-medium flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Selected From Subjects:</span>
                      {folder.subjectNames.length === 0 ? (
                        <span className="text-slate-500 text-xs">General Subject Builder</span>
                      ) : (
                        folder.subjectNames.map(subj => (
                          <span key={subj} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                            {subj}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5EEFF]">
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => handleToggleFolderActive(folder.id, folder.name)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        folder.isActive 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                      title={folder.isActive ? "Hide folder from candidate portal" : "Show folder in candidate portal"}
                    >
                      {folder.isActive ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-gray-500" />}
                      <span>{folder.isActive ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    {/* View Questions inside Folder */}
                    <button
                      onClick={() => setPreviewFolder(folder)}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="View questions inside this folder"
                    >
                      <ListChecks size={13} />
                      <span>View ({folder.selectedQuestionIds.length})</span>
                    </button>

                    {/* Edit Folder */}
                    <button
                      onClick={() => handleOpenEditFolderModal(folder)}
                      className="p-2 text-slate-600 hover:text-[#3853A4] hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                      title="Edit Folder and Selected Questions"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete Folder */}
                    <button
                      onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeCategoryFilter === 'qbank' && qbankSubFilter === 'bookmarked' ? (
        /* BOOKMARKED MCQ SECTION: DISPLAYING FOLDERS CREATED IN SUBJECT WITH OPTION TO SELECT */
        <div className="space-y-5">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-white rounded-3xl p-5 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bookmark size={22} className="fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#0B1C30]">
                    Bookmarked MCQs by Subject Folder
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    High Yield
                  </span>
                </div>
                <p className="text-xs text-[#45464D] mt-0.5">
                  Subject folders created from the question builder are displayed here. Select from these subject folders to manage and drill candidate bookmarks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 bg-white border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>{questionFolders.length} Subject Folders Available</span>
              </span>
            </div>
          </div>

          {/* OPTION TO SELECT FROM THESE SUBJECT FOLDERS */}
          {questionFolders.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-[#E5EEFF] shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Filter size={13} className="text-[#3853A4]" />
                    <span>Select Subject Folder:</span>
                  </span>
                </div>

                {/* Dropdown Selector */}
                <div className="relative w-full sm:w-72">
                  <select
                    value={selectedBookmarkFolderId}
                    onChange={(e) => setSelectedBookmarkFolderId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-bold text-[#0B1C30] outline-none focus:border-[#3853A4] cursor-pointer"
                  >
                    <option value="all">📁 All Subject Folders ({questionFolders.length})</option>
                    {questionFolders.map(folder => {
                      const count = getFolderBookmarkedCount(folder);
                      return (
                        <option key={folder.id} value={folder.id}>
                          {folder.name} ({count} bookmarked / {folder.selectedQuestionIds.length} total)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Segmented Quick-Select Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <button
                  onClick={() => setSelectedBookmarkFolderId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedBookmarkFolderId === 'all'
                      ? 'bg-amber-500 text-white shadow-2xs font-black'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span>All Folders ({questionFolders.length})</span>
                </button>

                {questionFolders.map(folder => {
                  const bCount = getFolderBookmarkedCount(folder);
                  const isSelected = selectedBookmarkFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedBookmarkFolderId(folder.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-2xs font-black'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <Bookmark size={11} className={isSelected ? 'fill-white text-white' : 'text-amber-500'} />
                      <span>{folder.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {bCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FOLDERS DISPLAY CONTENT */}
          {questionFolders.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E5EEFF] rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                <Bookmark size={28} className="fill-amber-500 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#0B1C30] text-base">No Subject Folders Found</h4>
                <p className="text-xs text-[#45464D] max-w-md mx-auto">
                  Create question folders in the Subject section first. They will automatically be displayed here so you can select them and manage bookmarked MCQs.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setQbankSubFilter('subjects')}
                  className="px-4 py-2.5 bg-[#3853A4] hover:bg-[#2E4387] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all"
                >
                  <BookOpen size={15} />
                  <span>Go to Subject Folders</span>
                </button>
                <button
                  onClick={handleOpenCreateFolderModal}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all"
                >
                  <FolderPlus size={15} />
                  <span>Create New Folder</span>
                </button>
              </div>
            </div>
          ) : currentSelectedBookmarkFolder ? (
            /* DETAILED DRILLDOWN FOR SELECTED SUBJECT FOLDER */
            <div className="space-y-4 animate-in fade-in">
              {/* Selected Folder Banner */}
              <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedBookmarkFolderId('all')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3853A4] hover:underline cursor-pointer mb-1"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to All Subject Folders</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {currentSelectedBookmarkFolder.code}
                    </span>
                    <h3 className="text-base font-extrabold text-[#0B1C30]">
                      {currentSelectedBookmarkFolder.name}
                    </h3>
                  </div>
                  <p className="text-xs text-[#45464D]">
                    {getFolderBookmarkedCount(currentSelectedBookmarkFolder)} of {currentSelectedBookmarkFolder.selectedQuestions.length} questions in this folder are bookmarked as high-yield.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleBookmarkAllInFolder(currentSelectedBookmarkFolder)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check size={13} className="text-amber-600" />
                    <span>Bookmark All</span>
                  </button>
                  <button
                    onClick={() => handleClearBookmarksInFolder(currentSelectedBookmarkFolder)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear Bookmarks
                  </button>
                  <button
                    onClick={() => {
                      const bookmarkedList = currentSelectedBookmarkFolder.selectedQuestions.filter(q => bookmarkedQuestionIds.includes(q.id));
                      if (bookmarkedList.length === 0) {
                        showToast('Please bookmark at least one question in this folder first.');
                        return;
                      }
                      navigate('/subject-practice', {
                        state: {
                          folderId: `${currentSelectedBookmarkFolder.id}-bkm`,
                          folderName: `${currentSelectedBookmarkFolder.name} (Bookmarked MCQs)`,
                          folderDesc: `Targeted review of ${bookmarkedList.length} bookmarked MCQs.`,
                          folderQuestions: bookmarkedList
                        }
                      });
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Play size={13} className="fill-white" />
                    <span>Practice Bookmarked ({getFolderBookmarkedCount(currentSelectedBookmarkFolder)})</span>
                  </button>
                </div>
              </div>

              {/* Filter toggle: All Questions vs Bookmarked Only */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-1 bg-[#F8FAFF] p-1 rounded-xl border border-[#E5EEFF] text-xs">
                  <button
                    onClick={() => setBookmarkQuestionFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                      bookmarkQuestionFilter === 'all' ? 'bg-[#3853A4] text-white shadow-2xs' : 'text-[#45464D]'
                    }`}
                  >
                    All Questions ({currentSelectedBookmarkFolder.selectedQuestions.length})
                  </button>
                  <button
                    onClick={() => setBookmarkQuestionFilter('bookmarked-only')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                      bookmarkQuestionFilter === 'bookmarked-only' ? 'bg-amber-500 text-white shadow-2xs' : 'text-[#45464D]'
                    }`}
                  >
                    Bookmarked Only ({getFolderBookmarkedCount(currentSelectedBookmarkFolder)})
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  Click the bookmark ribbon on any question to add or remove it from the candidate vault.
                </span>
              </div>

              {/* Questions List with 1-Click Bookmark Toggle */}
              <div className="space-y-3">
                {currentSelectedBookmarkFolder.selectedQuestions
                  .filter(q => bookmarkQuestionFilter === 'all' || bookmarkedQuestionIds.includes(q.id))
                  .map((q, idx) => {
                    const isBookmarked = bookmarkedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id || idx}
                        className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs space-y-2.5 ${
                          isBookmarked 
                            ? 'border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-r from-amber-50/20 to-white' 
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-[#3853A4] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Question #{idx + 1} · {q.subjectName}
                            </span>
                            {q.imageUrl && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <ImageIcon size={11} /> Image
                              </span>
                            )}
                          </div>

                          {/* 1-Click Bookmark Toggle */}
                          <button
                            onClick={() => handleToggleBookmark(q.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              isBookmarked
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                : 'bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 border-slate-200'
                            }`}
                            title={isBookmarked ? "Remove bookmark" : "Add to Bookmarked MCQs"}
                          >
                            <Bookmark size={13} className={isBookmarked ? "fill-white text-white" : "text-amber-500"} />
                            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                          </button>
                        </div>

                        {q.imageUrl && (
                          <img 
                            src={q.imageUrl} 
                            alt="Question illustration" 
                            className="max-h-48 rounded-xl object-contain border border-slate-200 bg-slate-50"
                          />
                        )}

                        <p className="text-xs font-extrabold text-[#0B1C30] leading-relaxed">
                          {q.text}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {q.options.map((opt, optIdx) => (
                            <div 
                              key={optIdx} 
                              className={`p-2 rounded-xl border text-xs font-semibold ${
                                optIdx === q.correctAnswer 
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="font-mono mr-1.5">{['A', 'B', 'C', 'D'][optIdx]}.</span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-200 text-[11px] text-[#0B1C30]">
                            <span className="font-bold text-amber-800">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* ALL SUBJECT FOLDERS DISPLAYED AS CARDS IN BOOKMARKED MCQ SECTION */
            <div className="grid gap-3.5">
              {filteredFolders.map(folder => {
                const bookmarkedInFolder = getFolderBookmarkedCount(folder);
                return (
                  <div
                    key={folder.id}
                    className="bg-white rounded-2xl p-5 border border-amber-200/80 hover:border-amber-300 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-amber-50/20"
                  >
                    {/* Left: Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border text-amber-800 bg-amber-50 border-amber-300">
                          <Bookmark size={11} className="fill-amber-600 text-amber-600" />
                          <span>Bookmarked MCQ Folder</span>
                        </span>

                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {folder.code}
                        </span>

                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Star size={11} className="fill-amber-600 text-amber-600" />
                          <span>{bookmarkedInFolder} Bookmarked MCQs</span>
                        </span>

                        <span className="text-[10px] font-medium text-slate-500">
                          ({folder.selectedQuestionIds.length} Total Questions)
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-[#0B1C30] tracking-tight">
                          {folder.name}
                        </h4>
                        {folder.description && (
                          <p className="text-xs text-[#45464D] mt-0.5 line-clamp-2 leading-relaxed">
                            {folder.description}
                          </p>
                        )}
                      </div>

                      {/* Subjects represented badges */}
                      <div className="text-[11px] text-[#45464D] font-medium flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Subject Coverage:</span>
                        {folder.subjectNames.length === 0 ? (
                          <span className="text-slate-500 text-xs">General Question Bank</span>
                        ) : (
                          folder.subjectNames.map(subj => (
                            <span key={subj} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                              {subj}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5EEFF]">
                      {/* Select from this Subject Folder */}
                      <button
                        onClick={() => setSelectedBookmarkFolderId(folder.id)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Select this subject folder to manage bookmarked MCQs"
                      >
                        <span>Select Folder</span>
                        <ChevronRight size={14} />
                      </button>

                      {/* Practice Bookmarked in this Folder */}
                      <button
                        onClick={() => {
                          const bookmarkedList = folder.selectedQuestions.filter(q => bookmarkedQuestionIds.includes(q.id));
                          if (bookmarkedList.length === 0) {
                            showToast(`Folder "${folder.name}" has no bookmarked MCQs yet. Click "Select Folder" to flag questions.`);
                            setSelectedBookmarkFolderId(folder.id);
                            return;
                          }
                          navigate('/subject-practice', {
                            state: {
                              folderId: `${folder.id}-bkm`,
                              folderName: `${folder.name} (Bookmarked MCQs)`,
                              folderDesc: `Practice ${bookmarkedList.length} bookmarked high-yield MCQs.`,
                              folderQuestions: bookmarkedList
                            }
                          });
                        }}
                        className="px-3 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Practice Bookmarked MCQs from this folder in Candidate Portal"
                      >
                        <Play size={13} className="text-amber-600 fill-amber-600" />
                        <span>Practice ({bookmarkedInFolder})</span>
                      </button>

                      {/* View All Questions in Folder */}
                      <button
                        onClick={() => setPreviewFolder(folder)}
                        className="p-2 text-slate-600 hover:text-[#3853A4] hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-slate-200"
                        title="View Questions in this folder"
                      >
                        <ListChecks size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* OTHER CATEGORIES SECTIONS (CUSTOM MODULE, IMAGE BANK, MOCK TESTS) */
        <div className="space-y-4">
          {filteredSections.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E5EEFF] rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF4FF] text-[#3853A4] mx-auto flex items-center justify-center">
                <Layers size={22} />
              </div>
              <h4 className="font-extrabold text-[#0B1C30] text-sm">No sections match your filter</h4>
              <p className="text-xs text-[#45464D] max-w-sm mx-auto">
                {searchQuery 
                  ? `No candidate portal sections found matching "${searchQuery}".` 
                  : 'There are currently no sections under this category.'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="px-4 py-2 bg-[#3853A4] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Clear Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredSections.map((sec) => {
                const isCustom = sec.id === 'qb-sec-custom' || sec.metadata?.subType === 'custom' || sec.name.toLowerCase().includes('custom');

                const categoryBadge = 
                  isCustom
                    ? { label: 'Custom Module', icon: Sliders, style: 'text-indigo-800 bg-indigo-50 border-indigo-300' }
                    : sec.category === 'qbank' 
                      ? { label: 'Question Bank', icon: HelpCircle, style: 'text-[#3853A4] bg-blue-50 border-blue-200' }
                      : sec.category === 'imagebank'
                        ? { label: 'Image Bank', icon: ImageIcon, style: 'text-sky-700 bg-sky-50 border-sky-200' }
                        : { label: 'Mock Test Simulator', icon: Award, style: 'text-amber-800 bg-amber-50 border-amber-200' };

                const IconComponent = categoryBadge.icon;

                return (
                  <div
                    key={sec.id}
                    className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCustom && sec.isActive
                        ? 'border-indigo-200 hover:border-indigo-300 bg-gradient-to-r from-white to-indigo-50/10'
                        : sec.isActive
                          ? 'border-[#E5EEFF]'
                          : 'border-gray-200 bg-gray-50/50 opacity-80'
                    }`}
                  >
                    {/* Left Column */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${categoryBadge.style}`}>
                          <IconComponent size={12} />
                          <span>{categoryBadge.label}</span>
                        </span>

                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {sec.code}
                        </span>

                        {sec.badgeText && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {sec.badgeText}
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          sec.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sec.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          <span>{sec.isActive ? 'Active in Portal' : 'Hidden from Candidates'}</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-[#0B1C30] tracking-tight">
                          {sec.name}
                        </h4>
                        <p className="text-xs text-[#45464D] mt-0.5 line-clamp-2 leading-relaxed">
                          {sec.description}
                        </p>
                      </div>

                      <div className="text-[11px] text-[#45464D] font-medium flex flex-wrap items-center gap-2 pt-1">
                        <span>{sec.itemCount} items registered</span>
                        {sec.metadata?.authority && (
                          <>
                            <span>·</span>
                            <span>{sec.metadata.authority}</span>
                          </>
                        )}
                        {sec.category === 'mocktests' && sec.metadata?.timeLimit && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-[#0B1C30] font-semibold">
                              <Clock size={12} className="text-[#3853A4]" />
                              {sec.metadata.timeLimit} Mins / {sec.metadata.passingScore || 60}% Pass
                            </span>
                          </>
                        )}
                        {sec.category === 'imagebank' && sec.metadata?.modality && (
                          <>
                            <span>·</span>
                            <span>{sec.metadata.modality}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-wrap items-center gap-2 md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5EEFF]">
                      <button
                        onClick={() => {
                          toggleActive(sec.id);
                          showToast(`Section "${sec.name}" is now ${sec.isActive ? 'hidden from' : 'active in'} candidate portal.`);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          sec.isActive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                        title={sec.isActive ? "Hide section from candidate portal" : "Show section in candidate portal"}
                      >
                        {sec.isActive ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-gray-500" />}
                        <span>{sec.isActive ? 'Enabled' : 'Disabled'}</span>
                      </button>

                      {sec.category === 'imagebank' && (
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-3 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="View Image Bank in Candidate Portal"
                        >
                          <ExternalLink size={13} />
                          <span>View Cases</span>
                        </button>
                      )}

                      {sec.category === 'mocktests' && (
                        <button
                          onClick={() => navigate('/mock-test-intro')}
                          className="px-3 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Preview Prometric Test Simulator"
                        >
                          <ExternalLink size={13} />
                          <span>Launch Exam</span>
                        </button>
                      )}

                      {isCustom && (
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200"
                          title="Open in Candidate Portal"
                        >
                          <ExternalLink size={13} />
                          <span>Open Drill</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(sec)}
                        className="p-2 text-slate-600 hover:text-[#3853A4] hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                        title="Edit Section Parameters"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(sec.id, sec.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT QUESTION FOLDER MODAL (SELECT QUESTIONS FROM SUBJECT BUILDER) */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5EEFF] flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#3853A4] flex items-center justify-center border border-blue-200">
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1C30]">
                    {editingFolder ? 'Edit Question Folder' : 'Create New Question Folder'}
                  </h3>
                  <p className="text-xs text-[#45464D]">
                    Select questions from the Subject-Wise Question Builder to bundle into this candidate portal folder.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveQuestionFolder} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {folderError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{folderError}</span>
                </div>
              )}

              {/* Folder Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. Cardiology High-Yield Recalls, Pediatric Emergencies..."
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Folder Code *
                  </label>
                  <input
                    type="text"
                    value={folderCode}
                    onChange={(e) => setFolderCode(e.target.value)}
                    placeholder="e.g. QB-FLD-01"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-mono font-bold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Folder Description (Optional)
                </label>
                <input
                  type="text"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="e.g. High-frequency Prometric exam recalls and clinical scenario questions."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-medium text-[#0B1C30] outline-none focus:border-[#3853A4]"
                />
              </div>

              {/* QUESTION SELECTOR SECTION */}
              <div className="border border-[#E5EEFF] rounded-2xl p-4 bg-[#F8FAFF]/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0B1C30] flex items-center gap-1.5">
                      <ListChecks size={15} className="text-[#3853A4]" />
                      <span>Questions Selected from Subject-Wise Question Builder</span>
                    </h4>
                    <p className="text-[11px] text-[#45464D]">
                      Select questions to include in this folder. Checked questions will be bundled.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{folderSelectedQuestionIds.length} Selected</span>
                    </span>

                    {filteredModalQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllFilteredQuestions}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        {filteredModalQuestions.every(q => folderSelectedQuestionIds.includes(q.id))
                          ? 'Deselect Filtered'
                          : 'Select All Filtered'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Search & Subject Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={folderQuestionSearch}
                      onChange={(e) => setFolderQuestionSearch(e.target.value)}
                      placeholder="Search questions or keywords..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-medium outline-none focus:border-[#3853A4]"
                    />
                  </div>

                  {/* Subject Pills Filter */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setFolderSubjectFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        folderSubjectFilter === 'all'
                          ? 'bg-[#3853A4] text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      All ({availableQuestions.length})
                    </button>
                    {availableSubjects.map(subj => {
                      const count = availableQuestions.filter(q => q.subjectId === subj.id).length;
                      return (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => setFolderSubjectFilter(subj.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                            folderSubjectFilter === subj.id
                              ? 'bg-[#3853A4] text-white shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {subj.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Questions List Container */}
                {loadingQuestionsForModal ? (
                  <div className="py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#3853A4]" />
                    <p className="text-xs font-bold">Loading questions from Subject-Wise Question Builder...</p>
                  </div>
                ) : availableQuestions.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3853A4] flex items-center justify-center mx-auto">
                      <HelpCircle size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-[#0B1C30]">No questions found in the Subject-Wise Question Builder</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Create questions in the Question Builder first to organize them into folders for student practice.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFolderModalOpen(false);
                          navigate('/admin/subject-questions');
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <BookOpen size={13} />
                        <span>Open Subject-Wise Question Builder</span>
                      </button>
                    </div>
                  </div>
                ) : filteredModalQuestions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No questions match the current filter or search term.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                    {filteredModalQuestions.map(q => {
                      const isSelected = folderSelectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestionSelect(q.id)}
                          className={`p-3 rounded-xl transition-all cursor-pointer border ${
                            isSelected 
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300/40' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5 shrink-0 text-[#3853A4]">
                              {isSelected ? (
                                <CheckSquare size={17} className="text-[#3853A4]" />
                              ) : (
                                <Square size={17} className="text-slate-400" />
                              )}
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-[#3853A4] text-[10px] font-black uppercase">
                                  {q.subjectName}
                                </span>
                                {q.imageUrl && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center gap-1">
                                    <ImageIcon size={10} />
                                    <span>Image Attached</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-bold text-[#0B1C30] leading-snug">
                                {q.text}
                              </p>

                              {/* Options preview */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pt-0.5">
                                {q.options.map((opt, i) => (
                                  <div 
                                    key={i} 
                                    className={`truncate px-2 py-0.5 rounded ${
                                      i === q.correctAnswer 
                                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' 
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    <span className="font-mono font-bold mr-1">{['A', 'B', 'C', 'D'][i]}.</span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>

                              {q.explanation && (
                                <p className="text-[10px] text-slate-500 italic line-clamp-1 pt-0.5">
                                  <span className="font-semibold text-slate-600">Explanation:</span> {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5EEFF] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <span>Selected questions:</span>
                  <span className="text-[#3853A4] font-black">{folderSelectedQuestionIds.length}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2 bg-[#3853A4] hover:bg-[#2E4387] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{editingFolder ? 'Save Changes' : 'Create Folder'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW FOLDER QUESTIONS MODAL */}
      {previewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5EEFF] flex items-center justify-between bg-blue-50/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#3853A4] flex items-center justify-center">
                  <ListChecks size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1C30]">
                    {previewFolder.name} ({previewFolder.code})
                  </h3>
                  <p className="text-xs text-[#45464D]">
                    {previewFolder.selectedQuestionIds.length} questions bundled from Subject-Wise Question Builder
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFolder(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {previewFolder.selectedQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase text-[#3853A4] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Question #{idx + 1} · {q.subjectName}
                    </span>
                    {q.imageUrl && (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <ImageIcon size={11} /> Image
                      </span>
                    )}
                  </div>

                  {q.imageUrl && (
                    <img 
                      src={q.imageUrl} 
                      alt="Question reference" 
                      className="max-h-48 rounded-xl object-contain border border-slate-200 bg-slate-50"
                    />
                  )}

                  <p className="text-xs font-extrabold text-[#0B1C30] leading-relaxed">
                    {q.text}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div 
                        key={optIdx} 
                        className={`p-2 rounded-xl border text-xs font-semibold ${
                          optIdx === q.correctAnswer 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold' 
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="font-mono mr-1.5">{['A', 'B', 'C', 'D'][optIdx]}.</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-[#0B1C30]">
                      <span className="font-bold text-[#3853A4]">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#E5EEFF] flex items-center justify-end shrink-0 bg-slate-50">
              <button
                onClick={() => setPreviewFolder(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL FOR NON-FOLDER SECTIONS (CUSTOM MODULE, IMAGE BANK, MOCK TESTS) */}
      {(isAddModalOpen || editingSection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EEFF] pb-3">
              <h3 className="text-base font-extrabold text-[#0B1C30]">
                {editingSection ? 'Edit Section Parameters' : 'Add Section'}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingSection(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitSectionForm} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Section Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Section Title"
                    className="w-full px-3.5 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Section Code *
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. IB-01, MT-01"
                    className="w-full px-3.5 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-mono font-bold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    Item Count
                  </label>
                  <input
                    type="number"
                    value={formItemCount}
                    onChange={(e) => setFormItemCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Section coverage and content details"
                  className="w-full px-3.5 py-2 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-medium text-[#0B1C30] outline-none focus:border-[#3853A4]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingSection(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3853A4] hover:bg-[#2E4387] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200/60">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1.5">
              Delete {deleteConfirmTarget.type === 'folder' ? 'Question Folder' : 'Candidate Section'}?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{deleteConfirmTarget.name}"</span>? 
              {deleteConfirmTarget.type === 'folder' 
                ? ' Candidates will no longer be able to practice it from their portal.' 
                : ' This section will be removed from the candidate portal.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExecuteDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
