import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Save, 
  HelpCircle, 
  Settings, 
  Copy, 
  ArrowRight, 
  AlertCircle, 
  Search, 
  FileText,
  Clock,
  Award,
  DollarSign,
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const AdminMocktestEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(id ? true : false);
  const [saving, setSaving] = useState(false);
  
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    passingScore: 60,
    exam: 'dha',
    isActive: true,
    isPaid: false,
    isListed: true,
    price: ''
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }
  ]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activePane, setActivePane] = useState<'question' | 'settings'>('question');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  
  // Safe in-app alerts and confirmation dialogs for iframe compatibility
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [questionToDeleteIndex, setQuestionToDeleteIndex] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate('/adminlandingpage');
    }
  };

  useEffect(() => {
    if (id) {
      const fetchTest = async () => {
        try {
          const docRef = doc(db, 'mocktests', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTestData({
              title: data.title || '',
              description: data.description || '',
              timeLimit: data.timeLimit || 30,
              passingScore: data.passingScore !== undefined ? data.passingScore : (data.passScore !== undefined ? data.passScore : 60),
              exam: data.exam || 'dha',
              isActive: data.isActive !== undefined ? data.isActive : true,
              isPaid: data.isPaid !== undefined ? data.isPaid : false,
              isListed: data.isListed !== undefined ? data.isListed : true,
              price: data.price || ''
            });
            if (data.questions && data.questions.length > 0) {
              setQuestions(data.questions);
              setSelectedIndex(0);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `mocktests/${id}`);
        } finally {
          setLoading(false);
        }
      };
      fetchTest();
    }
  }, [id]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <h1 className="text-4xl text-gray-400">Access Denied</h1>
      </div>
    );
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };
    const updated = [...questions, newQuestion];
    setQuestions(updated);
    setSelectedIndex(updated.length - 1);
    setActivePane('question');
    setIsDirty(true);
    setSidebarOpenMobile(false);
  };

  const duplicateQuestion = (index: number) => {
    const original = questions[index];
    if (!original) return;
    const copy: Question = {
      ...original,
      id: Math.random().toString(36).substr(2, 9),
      text: original.text ? `${original.text} (Copy)` : ''
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, copy);
    setQuestions(updated);
    setSelectedIndex(index + 1);
    setIsDirty(true);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setErrorAlert("At least one question is required for a mock test.");
      return;
    }
    setQuestionToDeleteIndex(index);
  };

  const confirmDeleteQuestionAction = () => {
    if (questionToDeleteIndex === null) return;
    const index = questionToDeleteIndex;
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setIsDirty(true);
    setQuestionToDeleteIndex(null);
    showNotification("Question removed from test.");
    
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    } else if (selectedIndex === index) {
      setSelectedIndex(Math.max(0, index - 1));
    }
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
    setIsDirty(true);
  };

  const updateOption = (qIndex: number, oIndex: number, val: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[oIndex] = val;
    updated[qIndex].options = newOptions;
    setQuestions(updated);
    setIsDirty(true);
  };

  const isQuestionIncomplete = (q: Question) => {
    return !q.text.trim() || q.options.some(opt => !opt.trim());
  };

  const handleSave = async () => {
    if (!testData.title.trim()) {
      setActivePane('settings');
      setErrorAlert("Please enter a Test Title in Test Settings.");
      return;
    }
    
    const incompleteIndex = questions.findIndex(isQuestionIncomplete);
    if (incompleteIndex !== -1) {
      setSelectedIndex(incompleteIndex);
      setActivePane('question');
      setErrorAlert(`Question ${incompleteIndex + 1} has empty text or missing options. Please complete all fields before saving.`);
      return;
    }

    if (testData.isPaid && !testData.price) {
      setActivePane('settings');
      setErrorAlert("Please specify a price for a paid test simulator.");
      return;
    }

    setSaving(true);
    try {
      const finalData = {
        ...testData,
        passScore: testData.passingScore,
        questions: questions,
        updatedAt: new Date().toISOString()
      };

      if (id) {
        await setDoc(doc(db, 'mocktests', id), finalData, { merge: true });
      } else {
        await addDoc(collection(db, 'mocktests'), {
          ...finalData,
          createdAt: new Date().toISOString()
        });
      }
      setIsDirty(false);
      navigate('/adminlandingpage');
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, id ? `mocktests/${id}` : 'mocktests');
    } finally {
      setSaving(false);
    }
  };

  const currentQuestion = questions[selectedIndex] || questions[0];

  const filteredQuestions = questions.map((q, originalIndex) => ({
    q,
    originalIndex
  })).filter(({ q, originalIndex }) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesText = (q.text || '').toLowerCase().includes(query);
    const matchesNumber = (originalIndex + 1).toString().includes(query);
    return matchesText || matchesNumber;
  });

  const incompleteCount = questions.filter(isQuestionIncomplete).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center text-teal-600 font-bold gap-3">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading Mock Test Editor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-gray-800 antialiased flex flex-col">
      {/* Top Header Bar matching Gentelella v4 Header */}
      <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-brand-blue hover:bg-gray-100 transition-colors px-3 py-2 rounded-xl shrink-0 cursor-pointer"
            title="Return to Admin Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          
          <div className="h-4 w-px bg-gray-200 hidden sm:block shrink-0" />
          
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/promedo-logo.png"
              alt="Promedo"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 truncate">
              <span className="text-gray-900 font-extrabold hidden md:inline">Promedo Global</span>
              <span className="text-gray-300 hidden md:inline">/</span>
              <span className="text-gray-600 hidden sm:inline">Mock Exams</span>
              <span className="text-gray-300">/</span>
              <span className="text-brand-blue font-black truncate max-w-[200px] sm:max-w-[320px]">
                {testData.title || 'Untitled Mock Test'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActivePane(activePane === 'settings' ? 'question' : 'settings');
              setSidebarOpenMobile(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activePane === 'settings'
                ? 'bg-teal-50 text-teal-700 border-teal-300 shadow-2xs font-black'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Test Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
            className="lg:hidden inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
          >
            <FileText size={14} />
            <span>({questions.length})</span>
          </button>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#151B26] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{id ? 'Update Test' : 'Publish Test'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Sub Header & KPI Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                MOCK EXAM EDITOR
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700">
                {testData.exam.toUpperCase()}
              </span>
              {isDirty && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] tracking-tight">
              {testData.title || 'Untitled Mock Test'}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Build full-length exam simulations with timed constraints, pass-mark thresholds, and detailed explanations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 bg-white rounded-xl border border-gray-200/80 shadow-2xs text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Questions</p>
              <p className="text-base font-black text-gray-900 leading-none mt-0.5">{questions.length}</p>
            </div>
            <div className="px-3.5 py-2 bg-white rounded-xl border border-gray-200/80 shadow-2xs text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Duration</p>
              <p className="text-base font-black text-gray-900 leading-none mt-0.5">{testData.timeLimit}m</p>
            </div>
            <div className="px-3.5 py-2 bg-white rounded-xl border border-gray-200/80 shadow-2xs text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Passing</p>
              <p className="text-base font-black text-teal-600 leading-none mt-0.5">{testData.passingScore}%</p>
            </div>
          </div>
        </div>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {errorAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-bold shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{errorAlert}</span>
              </div>
              <button onClick={() => setErrorAlert(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl flex items-center justify-between text-xs font-bold shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-teal-600 hover:text-teal-800 cursor-pointer">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Two-Pane Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane / Sidebar: Questions List */}
          <div 
            className={`lg:col-span-4 xl:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col ${
              sidebarOpenMobile ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">Questions</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {questions.length}
                  </span>
                  {incompleteCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={`${incompleteCount} incomplete questions`}>
                      <AlertCircle size={10} />
                      <span>{incompleteCount} incomplete</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by question text..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Test Settings Shortcut Tab in Sidebar */}
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => {
                  setActivePane('settings');
                  setSidebarOpenMobile(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  activePane === 'settings'
                    ? 'bg-[#151B26] text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    activePane === 'settings' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
                  }`}>
                    <Settings size={14} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">General Test Settings</p>
                    <p className={`text-[10px] truncate ${activePane === 'settings' ? 'text-slate-300' : 'text-gray-400'}`}>
                      {testData.exam.toUpperCase()} • {testData.timeLimit}m • {testData.isPaid ? 'Paid' : 'Free'}
                    </p>
                  </div>
                </div>
                <ArrowRight size={13} className={activePane === 'settings' ? 'text-white' : 'text-gray-400'} />
              </button>
            </div>

            {/* Scrollable Questions List */}
            <div className="max-h-[calc(100vh-340px)] overflow-y-auto p-2 space-y-1.5 divide-y-0">
              {filteredQuestions.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 italic">
                  No questions match your filter.
                </div>
              ) : (
                filteredQuestions.map(({ q, originalIndex }) => {
                  const isSelected = activePane === 'question' && selectedIndex === originalIndex;
                  const incomplete = isQuestionIncomplete(q);
                  const correctLetter = ['A', 'B', 'C', 'D'][q.correctAnswer] || 'A';

                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setSelectedIndex(originalIndex);
                        setActivePane('question');
                        setSidebarOpenMobile(false);
                      }}
                      className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-teal-50/30 border-teal-500 shadow-2xs ring-1 ring-teal-500/20' 
                          : 'bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/60'
                      }`}
                    >
                      {/* Number Pill */}
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-teal-600 text-white' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                        {originalIndex + 1}
                      </span>

                      {/* Question Content Snippet */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className={`text-xs font-semibold line-clamp-2 leading-relaxed ${
                          isSelected ? 'text-gray-900 font-bold' : 'text-gray-700'
                        }`}>
                          {q.text.trim() || <span className="text-gray-400 italic font-normal">Untitled question stem...</span>}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isSelected 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            Key: {correctLetter}
                          </span>

                          {incomplete && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle size={8} />
                              <span>Missing fields</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Delete Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(originalIndex);
                        }}
                        className="absolute right-2 top-2.5 p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom Add Bar */}
            <div className="p-2.5 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={addQuestion}
                className="w-full py-2 rounded-xl border border-dashed border-gray-300 hover:border-teal-500 text-gray-600 hover:text-teal-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Another Question</span>
              </button>
            </div>
          </div>
          {/* Right Pane / Main Editing Area */}
          <div className="lg:col-span-8 xl:col-span-8">
            <AnimatePresence mode="wait">
              {activePane === 'question' ? (
                /* Question Details Editor */
                <motion.div
                  key={`question-${currentQuestion.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 sm:p-7 space-y-5"
                >
                  {/* Editor Sub-Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 font-black flex items-center justify-center text-sm">
                        Q{selectedIndex + 1}
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">
                          Question {selectedIndex + 1} of {questions.length}
                        </h2>
                        <p className="text-xs text-gray-400">
                          Set question stem, 4 options, key, and rationale.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(selectedIndex)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:text-teal-700 bg-gray-50 hover:bg-teal-50 border border-gray-200 transition-colors cursor-pointer"
                        title="Duplicate this question"
                      >
                        <Copy size={13} />
                        <span>Duplicate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeQuestion(selectedIndex)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                        title="Delete this question"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Stem Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Question Stem / Scenario <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {currentQuestion.text.length} characters
                      </span>
                    </div>
                    <textarea
                      value={currentQuestion.text}
                      onChange={e => updateQuestion(selectedIndex, { text: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium text-gray-800 text-sm leading-relaxed transition-all resize-none min-h-[110px]"
                      placeholder="Enter the clinical scenario, problem statement, or question prompt here..."
                      rows={4}
                    />
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Answer Options <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs text-gray-400">
                        Click <span className="text-teal-600 font-bold">"Mark Correct"</span> to specify the key
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt, oIndex) => {
                        const isCorrect = currentQuestion.correctAnswer === oIndex;
                        const optionLetter = String.fromCharCode(65 + oIndex);

                        return (
                          <div 
                            key={oIndex}
                            className={`p-3 rounded-xl border transition-all ${
                              isCorrect 
                                ? 'bg-teal-50/30 border-teal-500 shadow-2xs ring-1 ring-teal-500/20' 
                                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-md text-xs font-black flex items-center justify-center ${
                                  isCorrect 
                                    ? 'bg-teal-600 text-white' 
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {optionLetter}
                                </span>
                                <span className="text-xs font-bold text-gray-600">
                                  Option {optionLetter}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => updateQuestion(selectedIndex, { correctAnswer: oIndex })}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isCorrect
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'bg-white text-gray-400 hover:text-teal-600 border border-gray-200 hover:border-teal-300'
                                }`}
                              >
                                <CheckCircle2 size={12} />
                                <span>{isCorrect ? 'Correct Answer' : 'Mark Correct'}</span>
                              </button>
                            </div>

                            <input
                              type="text"
                              value={opt}
                              onChange={e => updateOption(selectedIndex, oIndex, e.target.value)}
                              placeholder={`Enter answer choice ${optionLetter}...`}
                              className={`w-full px-3.5 py-2 rounded-lg text-sm font-medium outline-none transition-all ${
                                isCorrect 
                                  ? 'bg-white border border-teal-300 text-gray-900 focus:ring-2 focus:ring-teal-500/20' 
                                  : 'bg-white border border-gray-300 text-gray-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation Section */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle size={15} className="text-teal-600" />
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Answer Rationale / Explanation (Optional)
                      </label>
                    </div>
                    <textarea
                      value={currentQuestion.explanation}
                      onChange={e => updateQuestion(selectedIndex, { explanation: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50/70 rounded-xl border border-gray-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none font-medium text-gray-800 text-sm leading-relaxed transition-all resize-none min-h-[80px]"
                      rows={3}
                      placeholder="Explain why the selected option is correct and provide clinical references or exam hints..."
                    />
                  </div>

                  {/* Bottom Navigation for Questions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={selectedIndex === 0}
                      onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-bold text-gray-400">
                      {selectedIndex + 1} of {questions.length}
                    </span>

                    {selectedIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(selectedIndex + 1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#151B26] hover:bg-slate-800 text-white shadow-2xs transition-all cursor-pointer"
                      >
                        <span>Next</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add Next</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Test Settings Form */
                <motion.div
                  key="settings-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 sm:p-7 space-y-5"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 font-bold flex items-center justify-center">
                        <Settings size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">
                          Mock Test Configuration & Settings
                        </h2>
                        <p className="text-xs text-gray-400">
                          Set exam category, timer, passing score, and access pricing.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActivePane('question')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>Back to Questions</span>
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Test Title */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Test Title <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={testData.title}
                        onChange={e => { setTestData({...testData, title: e.target.value}); setIsDirty(true); }}
                        className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-bold text-gray-800 text-sm transition-all"
                        placeholder="e.g. DHA General Practice Comprehensive Mock 1"
                      />
                    </div>

                    {/* Exam Authority */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Exam Authority / Category
                      </label>
                      <select 
                        value={testData.exam}
                        onChange={e => { 
                          const val = e.target.value;
                          setTestData({
                            ...testData, 
                            exam: val,
                            isPaid: val === 'free' ? false : testData.isPaid
                          }); 
                          setIsDirty(true); 
                        }}
                        className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-bold text-gray-800 text-sm transition-all"
                      >
                        <option value="dha">DHA (Dubai Health Authority)</option>
                        <option value="haad">HAAD / DOH (Abu Dhabi)</option>
                        <option value="moat">MOH / MOAT</option>
                        <option value="omsb">OMSB (Oman)</option>
                        <option value="nhra">NHRA (Bahrain)</option>
                        <option value="smle">SMLE (Saudi Medical)</option>
                        <option value="general">General Medical Practice</option>
                        <option value="free">Free Mock Test</option>
                      </select>
                    </div>

                    {/* Time Limit & Passing Score */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Time (Mins)
                        </label>
                        <input 
                          type="number"
                          value={testData.timeLimit}
                          onChange={e => { setTestData({...testData, timeLimit: parseInt(e.target.value) || 0}); setIsDirty(true); }}
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-bold text-gray-800 text-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Passing (%)
                        </label>
                        <input 
                          type="number"
                          value={testData.passingScore}
                          onChange={e => { setTestData({...testData, passingScore: parseInt(e.target.value) || 0}); setIsDirty(true); }}
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-bold text-gray-800 text-sm transition-all"
                        />
                      </div>
                    </div>

                    {/* Catalog Listing Status */}
                    <div className="sm:col-span-2 space-y-2.5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                          Catalog Visibility (Student Side)
                        </label>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          testData.isListed !== false
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {testData.isListed !== false ? 'Listed on User Side' : 'Unlisted / Hidden'}
                        </span>
                      </div>
                      <div className="flex gap-2.5">
                        <button 
                          type="button"
                          onClick={() => { setTestData({...testData, isListed: true}); setIsDirty(true); }}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            testData.isListed !== false 
                              ? 'bg-emerald-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <Eye size={14} />
                          <span>Listed (Visible)</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setTestData({...testData, isListed: false}); setIsDirty(true); }}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            testData.isListed === false 
                              ? 'bg-amber-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <EyeOff size={14} />
                          <span>Unlisted (Hidden)</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {testData.isListed !== false
                          ? 'This mock test will appear on the public and student catalog.'
                          : 'This mock test is unlisted and will not be displayed on the student catalog.'}
                      </p>
                    </div>

                    {/* Access Pricing */}
                    <div className="sm:col-span-2 space-y-2.5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        Access Model
                      </label>
                      <div className="flex gap-2.5">
                        <button 
                          type="button"
                          onClick={() => { setTestData({...testData, isPaid: false}); setIsDirty(true); }}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            !testData.isPaid 
                              ? 'bg-[#151B26] text-white shadow-2xs' 
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Free Access
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setTestData({...testData, isPaid: true}); setIsDirty(true); }}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            testData.isPaid 
                              ? 'bg-teal-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Paid Simulator
                        </button>
                      </div>

                      {testData.isPaid && (
                        <div className="pt-1.5 space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Price Display (e.g. $29 or 150 AED)
                          </label>
                          <input 
                            type="text"
                            value={testData.price}
                            onChange={e => { setTestData({...testData, price: e.target.value}); setIsDirty(true); }}
                            className="w-full px-3.5 py-2 bg-white rounded-lg border border-gray-300 focus:border-teal-500 outline-none font-bold text-xs"
                            placeholder="Enter test price..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Overview & Instructions */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Description / Student Instructions
                      </label>
                      <textarea 
                        rows={3}
                        value={testData.description}
                        onChange={e => { setTestData({...testData, description: e.target.value}); setIsDirty(true); }}
                        className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium text-gray-800 text-xs transition-all resize-none"
                        placeholder="Provide test overview, exam syllabus coverage, or instructions for students..."
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActivePane('question')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#151B26] text-white hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Proceed to Questions Editor</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Delete Question */}
      <AnimatePresence>
        {questionToDeleteIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuestionToDeleteIndex(null)}
              className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 border border-gray-200"
            >
              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Remove Question?</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Question {questionToDeleteIndex + 1} will be removed from this test.</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuestionToDeleteIndex(null)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteQuestionAction}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Leave with Unsaved Changes */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveConfirm(false)}
              className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 border border-gray-200"
            >
              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Unsaved Changes</h3>
                  <p className="text-[11px] text-gray-400 font-medium">You have unsaved changes that will be lost.</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    navigate('/adminlandingpage');
                  }}
                  className="flex-1 py-2 px-3 bg-[#151B26] hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Leave</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMocktestEditor;
