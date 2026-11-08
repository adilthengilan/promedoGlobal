import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Layers, 
  Clock, 
  Award, 
  DollarSign, 
  HelpCircle, 
  ArrowRight, 
  PlayCircle, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  Sliders, 
  BookOpen, 
  CheckCheck, 
  RotateCcw,
  Percent,
  ListOrdered
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export interface CatalogItem {
  id: string;
  type: 'mocktest' | 'subject';
  title: string;
  category: string;
  questionCount: number;
  questions?: any[];
  subjectId?: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourceCatalog?: string;
}

interface ExamGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdExamId?: string) => void;
  mode?: 'create_exam' | 'import_to_editor';
  onImportToEditor?: (importedQuestions: Question[]) => void;
}

export const ExamGeneratorModal: React.FC<ExamGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create_exam',
  onImportToEditor
}) => {
  const navigate = useNavigate();
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());
  
  // Specific question counts requested per catalog
  const [catalogCounts, setCatalogCounts] = useState<Record<string, number>>({});

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'subject' | 'mocktest'>('all');

  // Form parameters
  const [examTitle, setExamTitle] = useState('');
  const [examCategory, setExamCategory] = useState('dha');
  const [targetDistributeTotal, setTargetDistributeTotal] = useState<number>(80);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [price, setPrice] = useState<string>('49');
  const [description, setDescription] = useState('');

  // Result state
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [createdExamSummary, setCreatedExamSummary] = useState<{ catalogTitle: string; count: number }[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch available catalogs (Subject Question Banks & Mock Test Catalogs)
  useEffect(() => {
    if (!isOpen) return;

    const fetchCatalogs = async () => {
      setLoadingCatalogs(true);
      const catalogList: CatalogItem[] = [];
      const processedSubjectIds = new Set<string>();
      const processedMocktestIds = new Set<string>();

      try {
        // 1. Fetch Subject Question Catalogs from Firestore `questionBank`
        const subjSnap = await getDocs(collection(db, 'questionBank'));
        for (const docSnap of subjSnap.docs) {
          const sData = docSnap.data();
          const sId = docSnap.id;
          processedSubjectIds.add(sId);

          let sQuestions: any[] = [];
          try {
            const qSnap = await getDocs(collection(db, `questionBank/${sId}/questions`));
            sQuestions = qSnap.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() }));
          } catch (err) {
            console.warn(`Could not fetch questions for subject ${sId}:`, err);
          }

          // Local storage failover check for subject questions
          const localSaved = localStorage.getItem(`local_questions_${sId}`);
          if (localSaved && sQuestions.length === 0) {
            try {
              sQuestions = JSON.parse(localSaved);
            } catch {}
          }

          if (sQuestions.length > 0) {
            catalogList.push({
              id: `subject:${sId}`,
              type: 'subject',
              title: `${sData.name || sId} (Subject Bank)`,
              category: (sData.details || 'Subject Question Builder').slice(0, 30),
              questionCount: sQuestions.length,
              questions: sQuestions,
              subjectId: sId
            });
          }
        }
      } catch (err) {
        console.error("Error loading subject catalogs for generator:", err);
      }

      // 2. Check LocalStorage for subject question catalogs
      const savedLocalSubjects = localStorage.getItem('local_subjects');
      if (savedLocalSubjects) {
        try {
          const localSubjectsList = JSON.parse(savedLocalSubjects);
          for (const s of localSubjectsList) {
            const sId = s.id;
            if (!processedSubjectIds.has(sId)) {
              let localQs: any[] = [];
              const qStr = localStorage.getItem(`local_questions_${sId}`);
              if (qStr) {
                try { localQs = JSON.parse(qStr); } catch {}
              }
              if (localQs.length > 0) {
                catalogList.push({
                  id: `subject:${sId}`,
                  type: 'subject',
                  title: `${s.name || sId} (Subject Bank)`,
                  category: (s.details || 'Subject Question Builder').slice(0, 30),
                  questionCount: localQs.length,
                  questions: localQs,
                  subjectId: sId
                });
              }
            }
          }
        } catch (e) {
          console.error("Error parsing local_subjects in modal:", e);
        }
      }

      // 3. Fetch Existing Mock Tests as Catalogs from Firestore `mocktests`
      try {
        const mockSnap = await getDocs(collection(db, 'mocktests'));
        for (const docSnap of mockSnap.docs) {
          const mData = docSnap.data();
          const mId = docSnap.id;
          processedMocktestIds.add(mId);

          if (Array.isArray(mData.questions) && mData.questions.length > 0) {
            catalogList.push({
              id: `mocktest:${mId}`,
              type: 'mocktest',
              title: `${mData.title || 'Mock Exam'} (Mocktest Catalog)`,
              category: (mData.exam || 'Prometric Exam').toUpperCase(),
              questionCount: mData.questions.length,
              questions: mData.questions
            });
          }
        }
      } catch (err) {
        console.error("Error loading mocktest catalogs for generator:", err);
      }

      // 4. Check LocalStorage for any local mock tests
      const savedLocalMocktests = localStorage.getItem('local_mocktests');
      if (savedLocalMocktests) {
        try {
          const localMockList = JSON.parse(savedLocalMocktests);
          for (const m of localMockList) {
            if (!processedMocktestIds.has(m.id) && Array.isArray(m.questions) && m.questions.length > 0) {
              catalogList.push({
                id: `mocktest:${m.id}`,
                type: 'mocktest',
                title: `${m.title || 'Mock Exam'} (Mocktest Catalog)`,
                category: (m.exam || 'Prometric Exam').toUpperCase(),
                questionCount: m.questions.length,
                questions: m.questions
              });
            }
          }
        } catch (e) {
          console.error("Error parsing local_mocktests in modal:", e);
        }
      }

      setCatalogs(catalogList);

      // Initial state: select first few catalogs with sensible default counts
      const initialCounts: Record<string, number> = {};
      const initialSelected = new Set<string>();

      if (catalogList.length > 0) {
        // If 3 or fewer catalogs, select all of them; otherwise select first 3
        const defaultSelectedList = catalogList.slice(0, Math.min(catalogList.length, 3));
        
        defaultSelectedList.forEach((c) => {
          initialSelected.add(c.id);
          // Default count: up to 25 questions or full catalog count if smaller
          initialCounts[c.id] = Math.min(c.questionCount, 25);
        });

        // Set remaining catalogs to 0 count
        catalogList.forEach((c) => {
          if (!initialCounts[c.id]) {
            initialCounts[c.id] = 0;
          }
        });
      }

      setSelectedCatalogIds(initialSelected);
      setCatalogCounts(initialCounts);
      setLoadingCatalogs(false);
    };

    fetchCatalogs();
  }, [isOpen]);

  // Compute total questions calculated across all selected catalogs
  const totalAllocatedCount = useMemo(() => {
    return Array.from(selectedCatalogIds).reduce((sum: number, id: string) => {
      const count = catalogCounts[id] || 0;
      const cat = catalogs.find(c => c.id === id);
      return sum + Math.min(count, cat ? cat.questionCount : count);
    }, 0);
  }, [selectedCatalogIds, catalogCounts, catalogs]);

  // Total available pool across selected catalogs
  const totalAvailableInSelected = useMemo(() => {
    return catalogs
      .filter(c => selectedCatalogIds.has(c.id))
      .reduce((sum: number, c: CatalogItem) => sum + c.questionCount, 0);
  }, [catalogs, selectedCatalogIds]);

  // Filtered catalogs based on search query and type filter
  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(cat => {
      const matchesSearch = 
        cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = 
        filterType === 'all' ? true : cat.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [catalogs, searchQuery, filterType]);

  // Set count for a specific catalog
  const setCatalogCount = (catId: string, rawCount: number) => {
    const catalog = catalogs.find(c => c.id === catId);
    if (!catalog) return;

    const safeCount = Math.max(0, Math.min(Math.floor(rawCount || 0), catalog.questionCount));

    setCatalogCounts(prev => ({
      ...prev,
      [catId]: safeCount
    }));

    setSelectedCatalogIds(prev => {
      const next = new Set(prev);
      if (safeCount > 0) {
        next.add(catId);
      } else {
        next.delete(catId);
      }
      return next;
    });
  };

  // Toggle individual catalog selection
  const toggleCatalog = (id: string) => {
    const catalog = catalogs.find(c => c.id === id);
    if (!catalog) return;

    setSelectedCatalogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCatalogCounts(cPrev => ({ ...cPrev, [id]: 0 }));
      } else {
        next.add(id);
        // Default to min(25, catalog.questionCount) if previously 0
        const defaultCnt = catalogCounts[id] > 0 ? catalogCounts[id] : Math.min(catalog.questionCount, 25);
        setCatalogCounts(cPrev => ({ ...cPrev, [id]: defaultCnt }));
      }
      return next;
    });
  };

  // Select all with full capacity
  const handleSelectAllMax = () => {
    const newSelected = new Set<string>();
    const newCounts: Record<string, number> = {};

    catalogs.forEach(cat => {
      newSelected.add(cat.id);
      newCounts[cat.id] = cat.questionCount;
    });

    setSelectedCatalogIds(newSelected);
    setCatalogCounts(newCounts);
  };

  // Select None / Clear all counts
  const handleClearAll = () => {
    setSelectedCatalogIds(new Set());
    const resetCounts: Record<string, number> = {};
    catalogs.forEach(cat => {
      resetCounts[cat.id] = 0;
    });
    setCatalogCounts(resetCounts);
  };

  // Auto-distribute a target total count across selected catalogs (or all catalogs if none selected)
  const handleAutoDistribute = (targetTotal: number) => {
    if (targetTotal <= 0) return;

    let targetIds = Array.from(selectedCatalogIds);
    if (targetIds.length === 0) {
      targetIds = catalogs.map(c => c.id);
      setSelectedCatalogIds(new Set(targetIds));
    }

    const activeCatalogs = catalogs.filter(c => targetIds.includes(c.id));
    const totalCap = activeCatalogs.reduce((s: number, c: CatalogItem) => s + c.questionCount, 0);

    if (totalCap === 0) return;

    // Distribute proportionally based on catalog size
    let remainingToAssign = Math.min(targetTotal, totalCap);
    const newCounts: Record<string, number> = { ...catalogCounts };

    // Reset counts for active
    activeCatalogs.forEach(c => { newCounts[c.id] = 0; });

    // Initial proportional pass
    activeCatalogs.forEach(c => {
      const share = Math.floor((c.questionCount / totalCap) * targetTotal);
      const allocated = Math.min(share, c.questionCount);
      newCounts[c.id] = allocated;
      remainingToAssign -= allocated;
    });

    // Remainder distribution pass
    let idx = 0;
    while (remainingToAssign > 0 && idx < activeCatalogs.length * 2) {
      const cat = activeCatalogs[idx % activeCatalogs.length];
      if (newCounts[cat.id] < cat.questionCount) {
        newCounts[cat.id] += 1;
        remainingToAssign -= 1;
      }
      idx++;
    }

    setCatalogCounts(newCounts);
  };

  // Main Generator Handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (selectedCatalogIds.size === 0 || totalAllocatedCount === 0) {
      setModalError("Please select at least one catalog and enter the question count to pick.");
      return;
    }

    if (mode === 'create_exam' && !examTitle.trim()) {
      setModalError("Please enter a title for the new mock test exam.");
      return;
    }

    setGenerating(true);

    try {
      const sampledQuestions: Question[] = [];
      const summaryList: { catalogTitle: string; count: number }[] = [];

      // Extract specific randomized questions per catalog
      for (const catId of Array.from(selectedCatalogIds)) {
        const requestedCount = catalogCounts[catId] || 0;
        if (requestedCount <= 0) continue;

        const catalog = catalogs.find(c => c.id === catId);
        if (!catalog || !catalog.questions || catalog.questions.length === 0) continue;

        // Clean & normalize catalog questions
        const validCatalogPool: Question[] = [];
        catalog.questions.forEach((q: any) => {
          if (q && q.text && Array.isArray(q.options) && q.options.length > 0) {
            validCatalogPool.push({
              id: Math.random().toString(36).substring(2, 11),
              text: q.text,
              options: q.options.map((opt: any) => String(opt ?? '')),
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
              explanation: q.explanation || '',
              sourceCatalog: catalog.title
            });
          }
        });

        if (validCatalogPool.length === 0) continue;

        // Fisher-Yates Random Shuffle for this catalog
        for (let i = validCatalogPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [validCatalogPool[i], validCatalogPool[j]] = [validCatalogPool[j], validCatalogPool[i]];
        }

        // Pick requested count from this catalog
        const countToTake = Math.min(requestedCount, validCatalogPool.length);
        const pickedFromCat = validCatalogPool.slice(0, countToTake);

        sampledQuestions.push(...pickedFromCat);
        summaryList.push({
          catalogTitle: catalog.title,
          count: countToTake
        });
      }

      if (sampledQuestions.length === 0) {
        setModalError("No valid questions could be extracted. Please check the selected catalogs.");
        setGenerating(false);
        return;
      }

      // Shuffle final combined exam questions so topics are well-mixed
      for (let i = sampledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sampledQuestions[i], sampledQuestions[j]] = [sampledQuestions[j], sampledQuestions[i]];
      }

      // Re-index question IDs
      const finalQuestions = sampledQuestions.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`
      }));

      if (mode === 'import_to_editor' && onImportToEditor) {
        onImportToEditor(finalQuestions);
        setImportedCount(finalQuestions.length);
        setCreatedExamSummary(summaryList);
        setIsSuccess(true);
        setGenerating(false);
        return;
      }

      // Create Mock Test in Firestore (`mocktests` collection)
      const catalogBreakdownStr = summaryList.map(s => `${s.catalogTitle}: ${s.count} Qs`).join(' • ');
      const autoDescription = description || `Exam generated from ${summaryList.length} catalogs (${finalQuestions.length} Total Questions: ${catalogBreakdownStr}).`;

      const newExamData = {
        title: examTitle.trim(),
        exam: examCategory.toLowerCase(),
        description: autoDescription,
        timeLimit: durationMinutes || Math.max(30, Math.round(finalQuestions.length * 1.5)),
        passingScore: passingScore || 60,
        passScore: passingScore || 60,
        isActive: true,
        isPaid: isPaid,
        price: isPaid ? (price || '49') : '0',
        questions: finalQuestions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'mocktests'), newExamData);
      const newId = docRef.id;

      // Save to localStorage backup
      const existingLocal = localStorage.getItem('local_mocktests');
      let localArr = [];
      if (existingLocal) {
        try { localArr = JSON.parse(existingLocal); } catch {}
      }
      localArr.unshift({ id: newId, ...newExamData });
      localStorage.setItem('local_mocktests', JSON.stringify(localArr));

      setCreatedExamId(newId);
      setImportedCount(finalQuestions.length);
      setCreatedExamSummary(summaryList);
      setIsSuccess(true);

      if (onSuccess) {
        onSuccess(newId);
      }
    } catch (err) {
      console.error("Error generating exam from catalogs:", err);
      setModalError("Failed to generate exam. Please check catalog data and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setCreatedExamId(null);
    setImportedCount(0);
    setCreatedExamSummary([]);
    setModalError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-6"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 bg-[#151B26] text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#00A389]/20 text-[#00A389] flex items-center justify-center border border-[#00A389]/30 shrink-0 shadow-inner">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  {mode === 'import_to_editor' ? 'Import Custom Question Counts from Catalogs' : 'Create Exam with Custom Catalog Counts'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">
                  Select catalogs and specify exact question count per catalog (e.g., Catalog 1: 10 Qs, Catalog 2: 50 Qs, Catalog 3: 20 Qs).
                </p>
              </div>
            </div>

            <button 
              onClick={() => { setModalError(null); onClose(); }}
              className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-8 max-h-[82vh] overflow-y-auto">
            {modalError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
                <button 
                  onClick={() => setModalError(null)}
                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {isSuccess ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={48} />
                </div>

                <div>
                  <h4 className="text-2xl font-black text-[#0B1C30] mb-2">
                    {mode === 'import_to_editor' ? 'Questions Imported Successfully!' : 'Mock Test Exam Published!'}
                  </h4>
                  <p className="text-sm text-gray-600 max-w-lg mx-auto">
                    Compiled <span className="font-black text-[#006591]">{importedCount} total questions</span> with customized counts from {createdExamSummary.length} catalogs.
                  </p>
                </div>

                {/* Catalog Breakdown Pill Box */}
                {createdExamSummary.length > 0 && (
                  <div className="max-w-xl mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left">
                    <h5 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
                      <ListOrdered size={14} className="text-brand-blue" />
                      Compiled Catalog Distribution:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {createdExamSummary.map((item, idx) => (
                        <div key={idx} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
                          <span className="font-bold text-gray-800 truncate max-w-[220px]">{item.catalogTitle}</span>
                          <span className="px-2 py-0.5 bg-brand-blue text-white rounded-md text-[11px] font-black">
                            {item.count} Qs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  {mode === 'create_exam' && createdExamId && (
                    <>
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/mock-test/${createdExamId}`);
                        }}
                        className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <PlayCircle size={18} />
                        Attend Exam in LMS Area
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/adminlandingpage/mocktest/edit/${createdExamId}`);
                        }}
                        className="px-6 py-3.5 bg-brand-blue hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-brand-blue/20 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Edit3 size={18} />
                        Edit Questions in Exam Editor
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer transition-all"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-8">
                {/* 1. Exam Basic Info (if in create mode) */}
                {mode === 'create_exam' && (
                  <div className="bg-gray-50/80 p-5 sm:p-6 rounded-3xl border border-gray-100 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <Layers size={16} className="text-brand-blue" />
                      Step 1: Exam Basic Information
                    </h4>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">
                          Exam Title <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          value={examTitle}
                          onChange={e => setExamTitle(e.target.value)}
                          placeholder="e.g. 🔥 DHA & HAAD GP Grand Mock Exam (80 Questions)"
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">
                          Exam Category / Authority
                        </label>
                        <select
                          value={examCategory}
                          onChange={e => {
                            const val = e.target.value;
                            setExamCategory(val);
                            if (val === 'free') {
                              setIsPaid(false);
                            }
                          }}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-blue"
                        >
                          <option value="dha">DHA (Dubai Health Authority)</option>
                          <option value="haad">HAAD (Abu Dhabi DoH)</option>
                          <option value="moat">MOH (Ministry of Health UAE)</option>
                          <option value="smle">SMLE (Saudi Medical Licensing)</option>
                          <option value="omsb">OMSB (Oman Medical Specialty)</option>
                          <option value="nhra">NHRA (Bahrain Health)</option>
                          <option value="general">General Practice & Medical</option>
                          <option value="free">Free Mock Test</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">
                        Exam Description (Optional)
                      </label>
                      <input 
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. Multi-catalog practice exam with custom question allocation."
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                      />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1 flex items-center gap-1">
                          <Clock size={12} /> Duration (Minutes)
                        </label>
                        <input 
                          type="number"
                          required
                          min={5}
                          max={360}
                          value={durationMinutes}
                          onChange={e => setDurationMinutes(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1 flex items-center gap-1">
                          <Award size={12} /> Passing Score (%)
                        </label>
                        <input 
                          type="number"
                          required
                          min={10}
                          max={100}
                          value={passingScore}
                          onChange={e => setPassingScore(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1 flex items-center gap-1">
                          <DollarSign size={12} /> Access Type
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                            <input 
                              type="checkbox"
                              checked={isPaid}
                              onChange={e => setIsPaid(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
                            />
                            Is Paid Exam
                          </label>
                          {isPaid && (
                            <input 
                              type="text"
                              value={price}
                              onChange={e => setPrice(e.target.value)}
                              placeholder="$49"
                              className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-brand-blue"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Catalog Selection & Individual Count Configuration */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <CheckSquare size={16} className="text-brand-blue" />
                        Step {mode === 'create_exam' ? '2' : '1'}: Select Catalogs & Enter Question Counts
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Set the exact number of questions to pick from each selected catalog below.
                      </p>
                    </div>

                    {/* Quick Selection Actions */}
                    <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                      <button 
                        type="button" 
                        onClick={handleSelectAllMax} 
                        className="px-3 py-1.5 bg-blue-50 text-brand-blue hover:bg-blue-100 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        title="Select all catalogs with their maximum questions"
                      >
                        <CheckCheck size={14} />
                        Select All (Max)
                      </button>
                      <button 
                        type="button" 
                        onClick={handleClearAll} 
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        title="Clear all selections and reset counts to 0"
                      >
                        <RotateCcw size={13} />
                        Reset All
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-gray-50 p-2 rounded-2xl border border-gray-200/80">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search catalogs by name or category..."
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none border border-gray-200 focus:border-brand-blue"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(['all', 'subject', 'mocktest'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFilterType(t)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            filterType === t 
                              ? 'bg-brand-blue text-white shadow-2xs' 
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {t === 'all' ? 'All Catalogs' : t === 'subject' ? 'Subject Banks' : 'Mock Tests'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-distribute helper tool */}
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-blue text-white flex items-center justify-center shrink-0">
                        <Sliders size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-brand-dark block">Quick Distribution Tool</span>
                        <span className="text-[11px] text-gray-500">Auto-distribute a total question target across selected catalogs:</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input 
                        type="number"
                        min={1}
                        max={totalAvailableInSelected || 500}
                        value={targetDistributeTotal}
                        onChange={e => setTargetDistributeTotal(Number(e.target.value))}
                        className="w-20 px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-black text-center text-brand-dark"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoDistribute(targetDistributeTotal)}
                        className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Percent size={13} />
                        Distribute {targetDistributeTotal} Qs
                      </button>

                      {/* Quick preset buttons */}
                      {[50, 80, 100].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            setTargetDistributeTotal(cnt);
                            handleAutoDistribute(cnt);
                          }}
                          className="px-2.5 py-1.5 bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catalogs List with Custom Count Inputs */}
                  {loadingCatalogs ? (
                    <div className="py-12 text-center text-brand-blue font-bold text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={18} />
                      Loading question catalogs...
                    </div>
                  ) : filteredCatalogs.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs font-medium">
                      No matching question catalogs found. Add questions in the Subject Builder or Mocktest section first!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {filteredCatalogs.map(cat => {
                        const isSelected = selectedCatalogIds.has(cat.id);
                        const count = catalogCounts[cat.id] || 0;
                        const percentage = cat.questionCount > 0 ? Math.round((count / cat.questionCount) * 100) : 0;

                        return (
                          <div
                            key={cat.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isSelected && count > 0
                                ? 'bg-blue-50/70 border-brand-blue/60 shadow-xs' 
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* Catalog Header & Info */}
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleCatalog(cat.id)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                                  isSelected && count > 0 
                                    ? 'bg-brand-blue text-white shadow-2xs' 
                                    : 'border-2 border-gray-300 bg-white hover:border-brand-blue'
                                }`}
                              >
                                {isSelected && count > 0 && <CheckCircle2 size={16} />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-black text-xs sm:text-sm text-[#0B1C30] truncate">
                                    {cat.title}
                                  </h5>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                    cat.type === 'subject' 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {cat.type === 'subject' ? 'Subject Bank' : 'Mocktest'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{cat.category}</p>

                                {/* Mini capacity progress bar */}
                                <div className="mt-2 flex items-center gap-2 max-w-xs">
                                  <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-300 ${count > 0 ? 'bg-brand-blue' : 'bg-transparent'}`}
                                      style={{ width: `${Math.min(100, percentage)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500 shrink-0">
                                    {count} of {cat.questionCount} Qs ({percentage}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Question Count Input & Stepper Controls */}
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-center bg-white p-2 rounded-2xl border border-gray-200/90 shadow-2xs">
                              <span className="text-[10px] font-black uppercase text-gray-400 mr-1 hidden sm:inline">
                                Pick Qs:
                              </span>

                              {/* Decrement Button */}
                              <button
                                type="button"
                                onClick={() => setCatalogCount(cat.id, count - (count > 10 ? 5 : 1))}
                                disabled={count <= 0}
                                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                                title="Decrease question count"
                              >
                                <Minus size={14} />
                              </button>

                              {/* Number Input */}
                              <div className="relative">
                                <input 
                                  type="number"
                                  min={0}
                                  max={cat.questionCount}
                                  value={count}
                                  onChange={e => setCatalogCount(cat.id, Number(e.target.value))}
                                  className={`w-18 px-2 py-1.5 rounded-xl text-center text-sm font-black outline-none border transition-all ${
                                    count > 0 
                                      ? 'border-brand-blue bg-blue-50/50 text-brand-dark ring-2 ring-brand-blue/20' 
                                      : 'border-gray-200 bg-white text-gray-500'
                                  }`}
                                />
                              </div>

                              {/* Increment Button */}
                              <button
                                type="button"
                                onClick={() => setCatalogCount(cat.id, count + (count >= 10 ? 5 : 1))}
                                disabled={count >= cat.questionCount}
                                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                                title="Increase question count"
                              >
                                <Plus size={14} />
                              </button>

                              {/* Quick presets for this catalog */}
                              <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                                <button
                                  type="button"
                                  onClick={() => setCatalogCount(cat.id, 10)}
                                  disabled={cat.questionCount < 10}
                                  className="px-2 py-1 bg-gray-50 hover:bg-blue-50 text-[10px] font-extrabold text-gray-600 hover:text-brand-blue rounded-lg border border-gray-200 disabled:opacity-30 cursor-pointer"
                                >
                                  10
                                </button>
                                {cat.questionCount >= 50 && (
                                  <button
                                    type="button"
                                    onClick={() => setCatalogCount(cat.id, 50)}
                                    className="px-2 py-1 bg-gray-50 hover:bg-blue-50 text-[10px] font-extrabold text-gray-600 hover:text-brand-blue rounded-lg border border-gray-200 cursor-pointer"
                                  >
                                    50
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCatalogCount(cat.id, cat.questionCount)}
                                  className="px-2 py-1 bg-brand-blue/10 hover:bg-brand-blue text-[10px] font-extrabold text-brand-blue hover:text-white rounded-lg transition-all cursor-pointer"
                                  title={`Take all ${cat.questionCount} questions`}
                                >
                                  Max
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Live Total Summary Breakdown Bar */}
                <div className="p-6 bg-gradient-to-r from-[#0B1C30] via-[#162B48] to-[#006591] text-white rounded-3xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                        <Sparkles size={14} /> Total Exam Configuration
                      </span>
                      <h4 className="text-2xl font-black mt-0.5">
                        {totalAllocatedCount} Total Questions Selected
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-1.5 bg-white/10 rounded-xl text-xs font-bold border border-white/20">
                        Catalogs Active: <span className="font-black text-amber-300">{Array.from(selectedCatalogIds).filter(id => (catalogCounts[id] || 0) > 0).length}</span>
                      </div>
                      <div className="px-3.5 py-1.5 bg-white/10 rounded-xl text-xs font-bold border border-white/20">
                        Suggested Time: <span className="font-black text-emerald-300">{Math.max(30, Math.round(totalAllocatedCount * 1.5))} mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Breakdown Chips */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block mb-2">
                      Selected Breakdown by Catalog:
                    </span>
                    {Array.from(selectedCatalogIds).filter(id => (catalogCounts[id] || 0) > 0).length === 0 ? (
                      <p className="text-xs text-blue-200/70 italic">
                        No catalog question counts selected yet. Enter question count numbers above to add questions.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                        {Array.from(selectedCatalogIds)
                          .filter(id => (catalogCounts[id] || 0) > 0)
                          .map(id => {
                            const cat = catalogs.find(c => c.id === id);
                            const count = catalogCounts[id] || 0;
                            if (!cat) return null;

                            return (
                              <div 
                                key={id} 
                                className="px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2"
                              >
                                <span className="truncate max-w-[180px]">{cat.title}</span>
                                <span className="px-2 py-0.5 bg-amber-400 text-brand-dark rounded-md text-[10px] font-black shrink-0">
                                  {count} Qs
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={generating || totalAllocatedCount === 0}
                    className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-2xl font-black text-sm sm:text-base transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/40"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        Sampling Questions & Generating Exam...
                      </>
                    ) : (
                      <>
                        <Sparkles size={22} className="text-amber-200" />
                        {mode === 'import_to_editor'
                          ? `Import ${totalAllocatedCount} Custom Questions to Editor`
                          : `🎲 Create Exam with ${totalAllocatedCount} Questions from Catalogs`}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExamGeneratorModal;
