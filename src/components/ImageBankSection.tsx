import React, { useState, useMemo, useRef } from 'react';
import { 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles,
  Maximize2,
  X,
  Layers,
  ArrowRight,
  ArrowLeft,
  Activity,
  Award,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  HelpCircle,
  Check,
  AlertCircle,
  RotateCcw,
  FileText,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortalSections } from '../lib/portalSections';

export interface ImageBankItem {
  id: string;
  code: string; // e.g. "Q-IMG-101"
  title: string;
  subject: string;
  authority: string;
  imageUrl: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  clinicalPearl: string;
  isCustom?: boolean;
}

const DEFAULT_IMAGE_ITEMS: ImageBankItem[] = [];

const ITEMS_PER_PAGE = 6;

const STANDARD_SUBJECTS = [
  'Orthopaedics & Trauma',
  'Internal Medicine & Cardiology',
  'Radiology & Imaging',
  'Dermatology & Skin Lesions',
  'Ophthalmology',
  'General Surgery & Trauma',
  'Paediatrics & Neonatology',
  'Obstetrics & Gynaecology',
  'Pathology & Hematology',
  'Emergency & Neurosurgery'
];

interface ImageBankSectionProps {
  isStudent?: boolean;
  isAdmin?: boolean;
}

export default function ImageBankSection({}: ImageBankSectionProps) {
  // Mode / Tab selection: 'browse' for practice or 'create' for new image question
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');

  // Custom uploaded questions stored in localStorage
  const [customQuestions, setCustomQuestions] = useState<ImageBankItem[]>(() => {
    try {
      const saved = localStorage.getItem('promedo_custom_image_questions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combined questions list
  const allQuestions = useMemo(() => {
    return [...customQuestions, ...DEFAULT_IMAGE_ITEMS];
  }, [customQuestions]);

  // Selected Subject Filter
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Bookmarks state persisted in localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('promedo_image_bank_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filter bookmarked only toggle
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState<boolean>(false);

  // Pagination page (1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Currently active selected item
  const [activeItemId, setActiveItemId] = useState<string>(() => {
    return allQuestions[0]?.id || '';
  });

  // Candidate selected option for interactive answering
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Reveal answer / explanation toggle
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // Zoom modal
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Toast / feedback message
  const [notification, setNotification] = useState<string | null>(null);

  // ---------------- FORM STATE FOR UPLOADING IMAGE QUESTIONS ----------------
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formImage, setFormImage] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('Orthopaedics & Trauma');
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAuthority, setFormAuthority] = useState<string>('DHA / SMLE / Prometric Exam Grade');
  const [formOptions, setFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formPearl, setFormPearl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { activeSections: activeImageBankSections } = usePortalSections('imagebank');

  // Extract all available subjects including synchronized active portal categories
  const availableSubjects = useMemo(() => {
    const fromQuestions = allQuestions.map(i => i.subject);
    const fromPortal = activeImageBankSections.map(s => s.name);
    const combined = Array.from(new Set([...fromPortal, ...fromQuestions]));
    return ['All', ...combined.sort()];
  }, [allQuestions, activeImageBankSections]);

  // Filter items by subject and bookmarks, hiding items whose section is disabled in Student Portal
  const filteredItems = useMemo(() => {
    const activeSectionNames = new Set(activeImageBankSections.map(s => s.name));
    return allQuestions.filter(item => {
      // If portal sections are defined, ensure the section is active
      const isSectionActive = activeImageBankSections.length === 0 || activeSectionNames.has(item.subject);
      const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      const matchesBookmark = !showOnlyBookmarked || bookmarkedIds.includes(item.id);
      return isSectionActive && matchesSubject && matchesBookmark;
    });
  }, [allQuestions, selectedSubject, showOnlyBookmarked, bookmarkedIds, activeImageBankSections]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  // Current page items
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Active item object
  const activeItem = useMemo(() => {
    const found = filteredItems.find(i => i.id === activeItemId);
    if (found) return found;
    return filteredItems[0] || allQuestions[0];
  }, [filteredItems, activeItemId, allQuestions]);

  // Show a timed notification
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle bookmark function
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('promedo_image_bank_bookmarks', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Navigate Previous
  const handlePrevious = () => {
    const currentIndex = filteredItems.findIndex(i => i.id === activeItem.id);
    if (currentIndex > 0) {
      const prevItem = filteredItems[currentIndex - 1];
      setActiveItemId(prevItem.id);
      setSelectedAnswer(null);
      setShowAnswer(false);
      const targetPage = Math.floor((currentIndex - 1) / ITEMS_PER_PAGE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  // Navigate Next
  const handleNext = () => {
    const currentIndex = filteredItems.findIndex(i => i.id === activeItem.id);
    if (currentIndex < filteredItems.length - 1) {
      const nextItem = filteredItems[currentIndex + 1];
      setActiveItemId(nextItem.id);
      setSelectedAnswer(null);
      setShowAnswer(false);
      const targetPage = Math.floor((currentIndex + 1) / ITEMS_PER_PAGE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  // Handle Option selection in Practice mode
  const handleSelectOption = (option: string) => {
    setSelectedAnswer(option);
    setShowAnswer(true);
  };

  // File Upload Handler (FileReader -> base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFormError('Image size exceeds 8MB. Please choose a smaller file.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFormImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update a specific option A, B, C, or D
  const handleOptionTextChange = (index: number, text: string) => {
    setFormOptions(prev => {
      const updated: [string, string, string, string] = [prev[0], prev[1], prev[2], prev[3]];
      updated[index] = text;
      return updated;
    });
  };

  // Handle Create / Submit new image-based question
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations (Image upload is optional)
    if (!formTitle.trim()) {
      setFormError('Please enter the question text or clinical vignette.');
      return;
    }

    const trimmedOptions = formOptions.map(opt => opt.trim());
    if (trimmedOptions.some(opt => !opt)) {
      setFormError('Please provide all 4 options (A, B, C, and D).');
      return;
    }

    if (!formExplanation.trim()) {
      setFormError('Please provide a diagnostic explanation for the correct answer.');
      return;
    }

    const finalSubject = formSubject === 'Custom' ? (customSubjectInput.trim() || 'General Medicine') : formSubject;
    const finalCode = formCode.trim() || `Q-IMG-${allQuestions.length + 101}`;
    const finalCorrectAnswer = trimmedOptions[formCorrectIndex];

    const newQuestion: ImageBankItem = {
      id: `custom-img-${Date.now()}`,
      code: finalCode,
      title: formTitle.trim(),
      subject: finalSubject,
      authority: formAuthority.trim() || 'DHA / Prometric Licensing Core',
      imageUrl: formImage.trim() || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
      options: trimmedOptions,
      correctAnswer: finalCorrectAnswer,
      explanation: formExplanation.trim(),
      clinicalPearl: formPearl.trim() || 'High-Yield Prometric clinical spotter takeaway.',
      isCustom: true
    };

    setIsSubmitting(true);
    try {
      const updatedCustom = [newQuestion, ...customQuestions];
      setCustomQuestions(updatedCustom);
      try {
        localStorage.setItem('promedo_custom_image_questions', JSON.stringify(updatedCustom));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }

      // Reset form
      setFormImage('');
      setFormTitle('');
      setFormCode('');
      setFormOptions(['', '', '', '']);
      setFormCorrectIndex(0);
      setFormExplanation('');
      setFormPearl('');
      setCustomSubjectInput('');
      setFormError('');

      // Auto-select new question and switch to browse view
      setActiveItemId(newQuestion.id);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setActiveTab('browse');
      triggerNotification(`Question ${newQuestion.code} added to Image Bank successfully!`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete custom question
  const handleDeleteCustomQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this custom image question?')) return;

    const updated = customQuestions.filter(q => q.id !== id);
    setCustomQuestions(updated);
    try {
      localStorage.setItem('promedo_custom_image_questions', JSON.stringify(updated));
    } catch (_) {}

    if (activeItemId === id) {
      setActiveItemId(DEFAULT_IMAGE_ITEMS[0]?.id || '');
    }
    triggerNotification('Custom question deleted.');
  };

  const isCurrentBookmarked = bookmarkedIds.includes(activeItem?.id || '');

  return (
    <div className="bg-white rounded-3xl border border-[#E5EEFF] shadow-xs p-6 sm:p-8 space-y-6">
      
      {/* SUCCESS NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER & SECTION NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EEFF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF4FF] border border-[#E5EEFF] rounded-full text-[11px] font-black text-[#006591] uppercase tracking-wider">
              <Sparkles size={12} className="text-[#3853A4]" />
              <span>Prometric Image Bank</span>
            </span>
            {customQuestions.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {customQuestions.length} Custom Added
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-[#0B1C30] tracking-tight">
            Clinical Image Bank
          </h1>
          <p className="text-xs text-[#45464D] font-medium mt-0.5">
            Practice visual diagnostic spotters or add new image-based clinical questions with 4 options and detailed explanations.
          </p>
        </div>

        {/* SECTION TABS: BROWSE VS CREATE */}
        <div className="flex items-center gap-2 bg-[#EFF4FF] p-1.5 rounded-2xl border border-[#E5EEFF] self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:text-[#0B1C30]'
            }`}
          >
            <Eye size={15} />
            <span>Practice Questions ({allQuestions.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('create');
              if (!formCode) {
                setFormCode(`Q-IMG-${allQuestions.length + 101}`);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#006591] text-white shadow-md shadow-[#006591]/20'
                : 'bg-white text-[#006591] hover:bg-sky-50 border border-sky-200'
            }`}
          >
            <Plus size={15} />
            <span>Add Image Question</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: BROWSE & PRACTICE IMAGE QUESTIONS                   */}
      {/* ============================================================== */}
      {activeTab === 'browse' && (
        allQuestions.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#E5EEFF] rounded-3xl p-8 bg-[#EFF4FF]/30">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#E5EEFF] flex items-center justify-center mx-auto mb-4 text-[#3853A4] shadow-sm">
              <Eye size={28} />
            </div>
            <h3 className="text-lg font-bold font-display text-[#0B1C30] mb-1">
              No Clinical Image Cases Published
            </h3>
            <p className="text-sm text-[#45464D] max-w-md mx-auto mb-6">
              There are currently no visual diagnostic cases in the image bank. You can add image-based clinical questions using the button below.
            </p>
            <button
              onClick={() => {
                setActiveTab('create');
                setFormCode(`Q-IMG-101`);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3853A4] text-white text-xs font-bold shadow-md hover:bg-[#2A4080] transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Image Question</span>
            </button>
          </div>
        ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Main Image Display & Interactive Question (8 of 12 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
              <div>
                {/* Authority & Custom indicator */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#45464D] font-bold">
                      {activeItem?.authority}
                    </span>
                    {activeItem?.isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black uppercase">
                        Custom Added
                      </span>
                    )}
                  </div>

                  {activeItem?.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustomQuestion(activeItem.id, e)}
                      title="Delete this custom question"
                      className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete Question</span>
                    </button>
                  )}
                </div>

                {/* Question Title & Bookmark Button */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black font-display text-[#0B1C30] tracking-tight">
                      <span className="text-[#3853A4] mr-2">{activeItem?.code}.</span>
                      {activeItem?.title}
                    </h2>
                    {/* Subject Badge */}
                    <div className="mt-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#EFF4FF] text-[#3853A4] border border-[#E5EEFF] inline-flex items-center gap-1.5">
                        <Layers size={13} />
                        <span>{activeItem?.subject}</span>
                      </span>
                    </div>
                  </div>

                  {/* Bookmark Toggle Ribbon */}
                  <button
                    onClick={(e) => toggleBookmark(activeItem?.id || '', e)}
                    title={isCurrentBookmarked ? "Remove Bookmark" : "Bookmark this case"}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                      isCurrentBookmarked 
                        ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-sm' 
                        : 'bg-[#EFF4FF] border-[#E5EEFF] text-[#45464D] hover:text-[#0B1C30]'
                    }`}
                  >
                    <Bookmark 
                      size={20} 
                      className={isCurrentBookmarked ? "fill-amber-400 text-amber-500" : "fill-none text-current"} 
                    />
                  </button>
                </div>
              </div>

              {/* Clinical Image Container */}
              <div className="relative bg-[#0B1C30] rounded-2xl overflow-hidden border border-[#E5EEFF] flex items-center justify-center min-h-[380px] max-h-[520px] shadow-sm group">
                <img 
                  src={activeItem?.imageUrl} 
                  alt={activeItem?.title}
                  className="w-full h-full object-contain max-h-[500px] cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                  onClick={() => setIsZoomed(true)}
                />

                {/* Authority Tag Overlay */}
                <div className="absolute bottom-3 left-3 bg-[#131B2E]/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-white/90 border border-white/10 pointer-events-none">
                  {activeItem?.authority}
                </div>

                {/* Hover Zoom Pill */}
                <button
                  onClick={() => setIsZoomed(true)}
                  className="absolute top-3 right-3 bg-[#131B2E]/90 hover:bg-[#3853A4] text-white p-2.5 rounded-xl border border-white/15 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
                >
                  <Maximize2 size={14} />
                  <span>Inspect Image</span>
                </button>
              </div>

              {/* 4 MULTIPLE CHOICE OPTIONS (A, B, C, D) */}
              {activeItem?.options && activeItem.options.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#0B1C30]">
                      Select the Single Best Diagnosis:
                    </span>
                    {selectedAnswer && (
                      <button
                        onClick={() => { setSelectedAnswer(null); setShowAnswer(false); }}
                        className="text-[11px] text-[#3853A4] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <RotateCcw size={12} />
                        <span>Try Again</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeItem.options.map((optionText, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isChosen = selectedAnswer === optionText;
                      const isCorrect = optionText === activeItem.correctAnswer;
                      
                      let cardStyle = "bg-white border-[#E5EEFF] hover:border-[#3853A4] hover:bg-[#EFF4FF]/50 text-[#0B1C30]";
                      if (selectedAnswer) {
                        if (isCorrect) {
                          cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-xs";
                        } else if (isChosen && !isCorrect) {
                          cardStyle = "bg-rose-50 border-rose-300 text-rose-900";
                        } else {
                          cardStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(optionText)}
                          className={`p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${cardStyle}`}
                        >
                          <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                            selectedAnswer && isCorrect
                              ? 'bg-emerald-600 text-white'
                              : isChosen && !isCorrect
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#EFF4FF] text-[#3853A4]'
                          }`}>
                            {letter}
                          </span>
                          <span className="font-medium pt-0.5 leading-snug">{optionText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reveal Diagnostic Findings & Pearl Drawer */}
              <div className="pt-2">
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#3853A4] font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#E5EEFF]"
                >
                  {showAnswer ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span>{showAnswer ? 'Hide Diagnostic Findings & Pearl' : 'Reveal Diagnostic Findings & Exam Pearl'}</span>
                </button>

                <AnimatePresence>
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-5 bg-[#EFF4FF]/60 border border-[#E5EEFF] rounded-2xl space-y-4 text-xs overflow-hidden"
                    >
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          Confirmed Diagnosis (Single Best Answer)
                        </span>
                        <p className="font-black text-sm text-emerald-950 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>{activeItem?.correctAnswer}</span>
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#45464D] block">
                          Diagnostic Rationale & Imaging Analysis:
                        </span>
                        <p className="text-xs text-[#0B1C30] leading-relaxed font-medium">
                          {activeItem?.explanation}
                        </p>
                      </div>

                      {activeItem?.clinicalPearl && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-600" />
                            <span>Prometric Licensing Exam Pearl</span>
                          </span>
                          <p className="text-xs leading-relaxed font-medium">
                            {activeItem?.clinicalPearl}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT COLUMN: Subject Filter, Bookmark Counter & Item List (4 of 12 cols) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Top Controls: Subject Dropdown & Bookmark Filter */}
              <div className="flex items-end justify-between gap-3">
                {/* Subject Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-black text-[#0B1C30] uppercase tracking-wider mb-1.5">
                    Subject Filter
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4] focus:border-[#3853A4] cursor-pointer shadow-2xs transition-all"
                    >
                      {availableSubjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bookmarks Toggle Pill */}
                <button
                  onClick={() => {
                    setShowOnlyBookmarked(!showOnlyBookmarked);
                    setCurrentPage(1);
                  }}
                  title="Filter bookmarked questions"
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    showOnlyBookmarked 
                      ? 'bg-amber-500 border-amber-500 text-white shadow-xs' 
                      : 'bg-[#EFF4FF] border-[#E5EEFF] text-[#45464D] hover:bg-[#E5EEFF] hover:text-[#0B1C30]'
                  }`}
                >
                  <Bookmark 
                    size={14} 
                    className={showOnlyBookmarked ? "fill-white text-white" : "fill-none text-current"} 
                  />
                  <span>Saved ({bookmarkedIds.length})</span>
                </button>
              </div>

              {/* Item List Container Styled in Promedo Design */}
              <div className="bg-white border border-[#E5EEFF] rounded-2xl shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-[#EFF4FF]/60 border-b border-[#E5EEFF] flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#006591]">
                    Question List
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveTab('create'); setFormCode(`Q-IMG-${allQuestions.length + 101}`); }}
                      className="text-[10px] font-black text-[#3853A4] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>Add New</span>
                    </button>
                    <span className="text-[11px] font-bold text-[#45464D]">
                      ({filteredItems.length})
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[#E5EEFF] max-h-[480px] overflow-y-auto no-scrollbar">
                  {paginatedItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#45464D] font-medium">
                      No cases found in this filter.
                    </div>
                  ) : (
                    paginatedItems.map((item) => {
                      const isSelected = item.id === activeItem?.id;
                      const isItemBookmarked = bookmarkedIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveItemId(item.id);
                            setSelectedAnswer(null);
                            setShowAnswer(false);
                          }}
                          className={`px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-[#3853A4] text-white shadow-xs' 
                              : 'hover:bg-[#EFF4FF]/60 text-[#0B1C30]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className={`block text-xs truncate ${
                              isSelected ? 'font-black text-white' : 'font-bold text-[#0B1C30]'
                            }`}>
                              <span className={isSelected ? 'text-white/80 mr-1.5' : 'text-[#3853A4] mr-1.5'}>
                                {item.code}.
                              </span>
                              {item.title}
                            </span>
                            <span className={`text-[10px] block truncate mt-0.5 ${
                              isSelected ? 'text-white/70' : 'text-[#45464D]'
                            }`}>
                              {item.subject} {item.isCustom ? '• (Custom)' : ''}
                            </span>
                          </div>

                          <button
                            onClick={(e) => toggleBookmark(item.id, e)}
                            className={`p-1 rounded-lg transition-colors shrink-0 ${
                              isSelected 
                                ? 'text-white/80 hover:text-white' 
                                : 'text-gray-300 hover:text-amber-500'
                            }`}
                          >
                            <Bookmark 
                              size={16} 
                              className={isItemBookmarked ? "fill-amber-400 text-amber-400" : "fill-none text-current"} 
                            />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Promedo Pagination Bar */}
                {totalPages > 1 && (
                  <div className="py-3 px-4 border-t border-[#E5EEFF] bg-[#EFF4FF]/40 flex items-center justify-center gap-2 text-xs select-none">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg border border-[#E5EEFF] bg-white hover:bg-[#EFF4FF] text-[#3853A4] font-black flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition-all"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const isActivePage = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            isActivePage 
                              ? 'bg-[#3853A4] text-white shadow-xs' 
                              : 'bg-white hover:bg-[#EFF4FF] text-[#45464D] border border-[#E5EEFF]'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="w-7 h-7 rounded-lg border border-[#E5EEFF] bg-white hover:bg-[#EFF4FF] text-[#3853A4] font-black flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition-all"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* BOTTOM ACTION BAR: Centered Previous & Next Navigation */}
          <div className="pt-6 border-t border-[#E5EEFF] flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={filteredItems.findIndex(i => i.id === activeItem?.id) <= 0}
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#3853A4] border border-[#E5EEFF] disabled:opacity-40 disabled:hover:bg-[#EFF4FF] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Previous Case</span>
            </button>

            <button
              onClick={handleNext}
              disabled={filteredItems.findIndex(i => i.id === activeItem?.id) >= filteredItems.length - 1}
              className="px-7 py-2.5 rounded-xl font-black text-xs bg-[#3853A4] hover:bg-[#2F4487] text-white shadow-md shadow-[#3853A4]/20 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Next Case</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* SECTION 2: ADD / UPLOAD NEW IMAGE-BASED QUESTION               */}
      {/* ============================================================== */}
      {activeTab === 'create' && (
        <form onSubmit={handleSaveQuestion} className="space-y-8 animate-fadeIn">
          
          {/* Header of Creation Form */}
          <div className="bg-gradient-to-r from-[#EFF4FF] to-white p-6 rounded-2xl border border-[#E5EEFF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#3853A4] block">
                Authoring Module
              </span>
              <h2 className="text-xl font-black font-display text-[#0B1C30]">
                Add New Image-Based Question
              </h2>
              <p className="text-xs text-[#45464D] font-medium mt-1">
                Upload clinical images (Radiographs, CT, ECG, dermatological rashes, fundoscopy), define 4 multiple choice options, designate the correct answer, and provide a diagnostic explanation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-[#45464D] border border-[#E5EEFF] rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              Back to Questions
            </button>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-xs font-bold">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Image Upload, Preview & Drag-and-Drop (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <label className="block text-xs font-black text-[#0B1C30] uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Clinical Image Upload</span>
                <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageFileChange} 
                className="hidden" 
              />

              {/* Dropzone Container */}
              {!formImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#3853A4]/30 hover:border-[#3853A4] bg-[#F8FAFF] hover:bg-[#EFF4FF]/60 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] space-y-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF4FF] group-hover:bg-[#3853A4] text-[#3853A4] group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#0B1C30]">
                      Click to Browse or Drag & Drop Clinical Image
                    </p>
                    <p className="text-[11px] text-[#45464D] mt-1 font-medium">
                      Supports X-Ray, CT scans, ECG strips, derm photos (PNG, JPG, WebP up to 8MB)
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-white border border-[#E5EEFF] rounded-xl text-[11px] font-bold text-[#3853A4] shadow-2xs">
                    Select File From Device
                  </span>
                </div>
              ) : (
                /* Uploaded Image Preview */
                <div className="relative rounded-2xl overflow-hidden border border-[#E5EEFF] bg-[#0B1C30] group">
                  <img 
                    src={formImage} 
                    alt="Uploaded preview" 
                    className="w-full max-h-[320px] object-contain p-2" 
                  />
                  <div className="p-3 bg-white border-t border-[#E5EEFF] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-black">
                      <CheckCircle2 size={15} />
                      <span>Image Uploaded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-[#3853A4] hover:underline cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormImage('')}
                        className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternative: Image URL Input */}
              <div className="pt-1">
                <span className="text-[11px] text-[#45464D] font-bold block mb-1">
                  Or paste direct image URL:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/clinical-scan.jpg"
                    value={formImage.startsWith('data:') ? '' : formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="flex-1 bg-white border border-[#E5EEFF] rounded-xl px-3 py-2 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                  />
                </div>
              </div>

              {/* Sample Images for quick testing */}
              <div className="p-3 bg-[#EFF4FF]/70 rounded-xl border border-[#E5EEFF] space-y-1.5">
                <span className="text-[10px] font-black uppercase text-[#006591] block">
                  Quick Load Demo Images:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Forearm X-Ray', url: '/public/assets/aistudio/Screenshot_2026-10-30_at_9.46.23_AM_dd559279.png' },
                    { label: 'Chest X-Ray', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'ECG Strip', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Fundoscopy', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80' }
                  ].map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormImage(s.url)}
                      className="px-2 py-1 bg-white hover:bg-white/80 border border-[#E5EEFF] text-[10px] font-bold text-[#3853A4] rounded-lg cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Question Details, Subject, Code (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <label className="block text-xs font-black text-[#0B1C30] uppercase tracking-wider">
                2. Question Clinical Vignette <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Subject Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                    Subject / Discipline
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4] cursor-pointer"
                  >
                    {STANDARD_SUBJECTS.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                    <option value="Custom">+ Custom Subject...</option>
                  </select>
                </div>

                {/* Custom Subject Input if selected */}
                {formSubject === 'Custom' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                      Type Custom Subject Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ENT & Otolaryngology"
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                    />
                  </div>
                ) : (
                  /* Question Code */
                  <div>
                    <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                      Question Code / Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q-IMG-113"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                    />
                  </div>
                )}
              </div>

              {/* Question Authority / Exam Focus */}
              <div>
                <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                  Exam Licensing Authority
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHA / SMLE / MOH UAE Prometric Core"
                  value={formAuthority}
                  onChange={(e) => setFormAuthority(e.target.value)}
                  className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                />
              </div>

              {/* Question Clinical Prompt / Vignette */}
              <div>
                <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                  Question Prompt / Clinical Presentation <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. A 28-year-old male presents with persistent wrist pain following a fall. Based on the provided radiograph, identify the definitive condition:"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white border border-[#E5EEFF] rounded-xl p-3 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4] leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: 4 MULTIPLE CHOICE OPTIONS (A, B, C, D) */}
          <div className="pt-4 border-t border-[#E5EEFF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-black text-[#0B1C30] uppercase tracking-wider">
                  3. Four Options & Correct Answer Selection <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-[#45464D] font-medium">
                  Enter 4 distinct diagnosis options and click the radio badge on the correct answer.
                </p>
              </div>

              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                Correct Answer: Option {String.fromCharCode(65 + formCorrectIndex)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formOptions.map((optText, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelectedCorrect = formCorrectIndex === idx;

                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelectedCorrect
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-[#E5EEFF] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                          isSelectedCorrect ? 'bg-emerald-600 text-white' : 'bg-[#EFF4FF] text-[#3853A4]'
                        }`}>
                          {letter}
                        </span>
                        <span className="text-xs font-bold text-[#0B1C30]">
                          Option {letter}
                        </span>
                      </div>

                      {/* Correct answer toggle button */}
                      <button
                        type="button"
                        onClick={() => setFormCorrectIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                          isSelectedCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 text-[#45464D] hover:bg-emerald-100 hover:text-emerald-800'
                        }`}
                      >
                        <Check size={11} />
                        <span>{isSelectedCorrect ? 'Correct Answer' : 'Mark Correct'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder={`Enter diagnosis for Option ${letter}...`}
                      value={optText}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      className="w-full bg-white border border-[#E5EEFF] rounded-xl px-3 py-2.5 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: EXPLANATION & PROMETRIC PEARL */}
          <div className="pt-4 border-t border-[#E5EEFF] space-y-4">
            <label className="block text-xs font-black text-[#0B1C30] uppercase tracking-wider">
              4. Diagnostic Explanation & Exam Pearls <span className="text-red-500">*</span>
            </label>

            <div className="space-y-4">
              {/* Detailed Explanation */}
              <div>
                <label className="block text-[11px] font-bold text-[#45464D] mb-1">
                  Diagnostic Rationale & Imaging Analysis <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain why Option X is correct, describing key pathognomonic radiological or clinical features visible in the image, and why distractors are incorrect."
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  className="w-full bg-white border border-[#E5EEFF] rounded-xl p-3.5 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4] leading-relaxed"
                />
              </div>

              {/* Prometric Licensing Pearl */}
              <div>
                <label className="block text-[11px] font-bold text-[#45464D] mb-1 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>High-Yield Prometric Exam Pearl (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Must-know exam takeaway or gold standard management step tested in DHA/SMLE/HAAD exams..."
                  value={formPearl}
                  onChange={(e) => setFormPearl(e.target.value)}
                  className="w-full bg-white border border-[#E5EEFF] rounded-xl p-3 text-xs font-medium text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#3853A4]"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON BAR */}
          <div className="pt-6 border-t border-[#E5EEFF] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 text-[#45464D] transition-all cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormImage('');
                  setFormTitle('');
                  setFormOptions(['', '', '', '']);
                  setFormCorrectIndex(0);
                  setFormExplanation('');
                  setFormPearl('');
                  setFormError('');
                }}
                className="px-4 py-2.5 text-xs font-bold text-[#45464D] hover:text-[#0B1C30] cursor-pointer"
              >
                Reset Fields
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-black text-xs bg-[#3853A4] hover:bg-[#2F4487] text-white shadow-md shadow-[#3853A4]/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Saving Question...' : 'Save & Publish Question'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {isZoomed && (
          <div 
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-[#0B1C30]/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[90vh] bg-[#0B1C30] border border-white/20 rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-2xl"
            >
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-xl cursor-pointer z-10 transition-colors"
              >
                <X size={18} />
              </button>

              <img 
                src={activeItem?.imageUrl} 
                alt={activeItem?.title}
                className="w-auto h-auto max-w-full max-h-[75vh] object-contain p-4"
              />

              <div className="w-full bg-[#131B2E] border-t border-white/10 p-4 text-white text-xs flex items-center justify-between">
                <div>
                  <span className="font-black text-sky-300 block">{activeItem?.code}. {activeItem?.title}</span>
                  <span className="text-slate-300 text-[11px]">{activeItem?.subject} • {activeItem?.authority}</span>
                </div>
                <button
                  onClick={() => setIsZoomed(false)}
                  className="px-4 py-2 bg-[#3853A4] hover:bg-[#2F4487] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
