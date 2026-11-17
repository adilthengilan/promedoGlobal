import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Star, 
  Play, 
  Plus, 
  Minus,
  Trash2, 
  Check, 
  X, 
  Zap,
  Edit3,
  Search,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getAvailableBuilderSubjects, 
  buildCustomQuestionPool, 
  saveCustomModule, 
  getUserCustomModules, 
  deleteCustomModule,
  updateCustomModule,
  CustomPracticeModule 
} from '../lib/customModuleService';
import { PracticeSubject } from '../lib/subjectPracticeService';
import { getBookmarkedQuestionIds } from '../lib/questionFolders';
import { subscribeToUserBookmarks } from '../lib/userQuestionService';

interface CustomPracticeBuilderProps {
  subjects?: PracticeSubject[];
}

export default function CustomPracticeBuilder({ subjects }: CustomPracticeBuilderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [availableSubjects, setAvailableSubjects] = useState<ReturnType<typeof getAvailableBuilderSubjects>>([]);
  const [savedModules, setSavedModules] = useState<CustomPracticeModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [userBookmarkedIds, setUserBookmarkedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  // Form State for Custom Module
  const [title, setTitle] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'learn' | 'practice'>('practice');
  const [filterSource, setFilterSource] = useState<'all' | 'bookmarked'>('all');
  
  // Time Duration State: 'unlimited' | 'seconds' | 'minutes'
  const [timeMode, setTimeMode] = useState<'unlimited' | 'seconds' | 'minutes'>('minutes');
  const [customTimeValue, setCustomTimeValue] = useState<string>('15');

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Subscribe to user's individual question bookmarks
  useEffect(() => {
    const unsub = subscribeToUserBookmarks(user?.uid || '', (list) => {
      setUserBookmarkedIds(new Set(list.map(b => b.questionId)));
    });
    return () => unsub();
  }, [user?.uid]);

  // Load subjects & candidate's saved modules on mount or when subjects update
  useEffect(() => {
    const subjs = getAvailableBuilderSubjects(subjects);
    setAvailableSubjects(subjs);

    if (user?.uid) {
      setLoadingModules(true);
      getUserCustomModules(user.uid).then((list) => {
        setSavedModules(list);
        setLoadingModules(false);
      });
    } else {
      setLoadingModules(false);
    }
  }, [user?.uid, subjects]);

  // Combined bookmarked question IDs across both local folder bookmarks and user Firestore bookmarks
  const combinedBookmarkedIds = useMemo(() => {
    const combined = new Set<string>(getBookmarkedQuestionIds());
    userBookmarkedIds.forEach(id => combined.add(id));
    return combined;
  }, [userBookmarkedIds]);

  // Helper: available question count for a specific subject matching current filterSource
  const getAvailableForSubject = (subjId: string): number => {
    const subj = availableSubjects.find(s => s.id === subjId);
    if (!subj) return 0;
    if (filterSource === 'all') {
      return subj.questions.length || subj.questionCount || 0;
    }
    return subj.questions.filter(q => combinedBookmarkedIds.has(q.id)).length;
  };

  // Compute sanitized numeric per-subject counts & total requested questions
  const numericSubjectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    selectedSubjectIds.forEach(subjId => {
      const avail = getAvailableForSubject(subjId);
      const raw = parseInt(subjectCounts[subjId] || '0', 10);
      const val = isNaN(raw) ? 0 : Math.max(0, Math.min(raw, avail));
      if (val > 0) {
        map[subjId] = val;
      }
    });
    return map;
  }, [selectedSubjectIds, subjectCounts, availableSubjects, filterSource, combinedBookmarkedIds]);

  const totalRequestedQuestions = useMemo(() => {
    return Object.values<number>(numericSubjectCounts).reduce((sum: number, n: number) => sum + n, 0);
  }, [numericSubjectCounts]);

  const totalAvailableInForm = useMemo(() => {
    return selectedSubjectIds.reduce((sum, id) => sum + getAvailableForSubject(id), 0);
  }, [selectedSubjectIds, availableSubjects, filterSource, combinedBookmarkedIds]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingModuleId(null);
    setTitle(`Custom Practice Module #${savedModules.length + 1}`);
    setFilterSource('all');
    setMode('practice');
    setTimeMode('minutes');
    setCustomTimeValue('15');

    // Reset selection & counts cleanly so user picks subjects and enters counts
    setSelectedSubjectIds([]);
    setSubjectCounts({});
    setIsModalOpen(true);
  };

  // Open edit modal for existing custom module
  const handleOpenEditModal = (mod: CustomPracticeModule) => {
    setEditingModuleId(mod.id);
    setTitle(mod.title);
    const modSubjIds = mod.selectedSubjectIds || [];
    setSelectedSubjectIds(modSubjIds);
    setMode(mod.mode || 'practice');
    setFilterSource(mod.filterSource || 'all');

    const initialCounts: Record<string, string> = {};
    if (mod.subjectCounts && Object.keys(mod.subjectCounts).length > 0) {
      modSubjIds.forEach(id => {
        initialCounts[id] = String(mod.subjectCounts?.[id] ?? 0);
      });
    } else if (modSubjIds.length > 0) {
      // Legacy module fallback: distribute total questionCount across selected subjects
      const total = Math.max(1, mod.questionCount || 10);
      const base = Math.floor(total / modSubjIds.length);
      let remainder = total % modSubjIds.length;
      modSubjIds.forEach(id => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;
        initialCounts[id] = String(base + extra);
      });
    }
    setSubjectCounts(initialCounts);

    if (mod.isUnlimitedTime || mod.timeDurationMinutes === 0) {
      setTimeMode('unlimited');
      setCustomTimeValue('0');
    } else if (mod.timeDurationSeconds && mod.timeDurationSeconds < 60) {
      setTimeMode('seconds');
      setCustomTimeValue(String(mod.timeDurationSeconds));
    } else {
      setTimeMode('minutes');
      setCustomTimeValue(String(mod.timeDurationMinutes || 15));
    }

    setIsModalOpen(true);
  };

  // Toggle subject selection in modal form
  const handleToggleSubject = (subId: string) => {
    const isCurrentlySelected = selectedSubjectIds.includes(subId);
    if (isCurrentlySelected) {
      setSelectedSubjectIds(prev => prev.filter(id => id !== subId));
    } else {
      const avail = getAvailableForSubject(subId);
      setSelectedSubjectIds(prev => [...prev, subId]);
      setSubjectCounts(prev => {
        const currentVal = parseInt(prev[subId] || '0', 10);
        if (!currentVal || currentVal <= 0) {
          return { ...prev, [subId]: String(avail > 0 ? Math.min(10, avail) : 0) };
        }
        return prev;
      });
    }
  };

  // Update count for a specific subject (auto-selects subject if count > 0)
  const handleSubjectCountChange = (subId: string, rawValue: string) => {
    const sanitized = rawValue.replace(/[^\d]/g, '');
    setSubjectCounts(prev => ({ ...prev, [subId]: sanitized }));

    const parsed = parseInt(sanitized || '0', 10);
    if (parsed > 0 && !selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(prev => [...prev, subId]);
    }
  };

  // Step count up/down or set All for a subject
  const handleSetSubjectCount = (subId: string, nextVal: number) => {
    const avail = getAvailableForSubject(subId);
    const clamped = Math.max(0, Math.min(nextVal, avail));
    setSubjectCounts(prev => ({ ...prev, [subId]: String(clamped) }));
    if (clamped > 0 && !selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(prev => [...prev, subId]);
    } else if (clamped === 0 && selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(prev => prev.filter(id => id !== subId));
    }
  };

  const handleSelectAllSubjects = () => {
    const selectable = availableSubjects.filter(s => getAvailableForSubject(s.id) > 0);
    if (selectedSubjectIds.length === selectable.length && selectable.length > 0) {
      setSelectedSubjectIds([]);
    } else {
      const nextIds = selectable.map(s => s.id);
      setSelectedSubjectIds(nextIds);
      setSubjectCounts(prev => {
        const next = { ...prev };
        selectable.forEach(s => {
          const avail = getAvailableForSubject(s.id);
          const existing = parseInt(next[s.id] || '0', 10);
          if (!existing || existing <= 0) {
            next[s.id] = String(Math.min(10, avail));
          }
        });
        return next;
      });
    }
  };

  // Calculate normalized time settings
  const getNormalizedTimeSettings = () => {
    if (timeMode === 'unlimited') {
      return { timeDurationMinutes: 0, timeDurationSeconds: 0, isUnlimitedTime: true, displayLabel: 'Unlimited Time' };
    }

    const val = parseFloat(customTimeValue) || 0;
    if (timeMode === 'seconds') {
      const secs = Math.max(30, Math.round(val));
      const mins = Number((secs / 60).toFixed(2));
      return { timeDurationMinutes: mins, timeDurationSeconds: secs, isUnlimitedTime: false, displayLabel: `${secs} Seconds` };
    } else {
      const mins = Math.max(0.5, val);
      const secs = Math.round(mins * 60);
      return { timeDurationMinutes: mins, timeDurationSeconds: secs, isUnlimitedTime: false, displayLabel: `${mins} ${mins === 1 ? 'Minute' : 'Minutes'}` };
    }
  };

  // Save / Submit Custom Module
  const handleSaveModule = async (launchImmediately: boolean = false) => {
    if (selectedSubjectIds.length === 0) {
      showToast('Please select at least one subject and enter a question count.');
      return;
    }

    if (totalAvailableInForm === 0) {
      showToast('No questions match your selected subjects and bookmark filter.');
      return;
    }

    const activeSubjectIds = Object.keys(numericSubjectCounts).filter(id => numericSubjectCounts[id] > 0);
    if (activeSubjectIds.length === 0 || totalRequestedQuestions === 0) {
      showToast('Please enter at least 1 question for your selected subject(s).');
      return;
    }

    const finalQuestions = buildCustomQuestionPool(
      activeSubjectIds,
      filterSource,
      totalRequestedQuestions,
      subjects,
      numericSubjectCounts,
      userBookmarkedIds
    );

    if (finalQuestions.length === 0) {
      showToast('No questions available matching your selection criteria.');
      return;
    }

    const timeSettings = getNormalizedTimeSettings();

    const selectedSubjNames = availableSubjects
      .filter(s => activeSubjectIds.includes(s.id))
      .map(s => s.name);

    const payloadData = {
      title: title.trim() || 'Custom Practice Module',
      selectedSubjectIds: activeSubjectIds,
      selectedSubjectNames: selectedSubjNames,
      subjectCounts: numericSubjectCounts,
      filterSource,
      questionCount: finalQuestions.length,
      timeDurationMinutes: timeSettings.timeDurationMinutes,
      timeDurationSeconds: timeSettings.timeDurationSeconds,
      isUnlimitedTime: timeSettings.isUnlimitedTime,
      mode
    };

    let savedResult: CustomPracticeModule;

    if (editingModuleId) {
      const existing = savedModules.find(m => m.id === editingModuleId);
      savedResult = await updateCustomModule(user?.uid || 'guest', {
        ...existing!,
        ...payloadData
      });
      setSavedModules(prev => prev.map(m => m.id === editingModuleId ? savedResult : m));
      showToast(`Custom module "${savedResult.title}" updated successfully!`);
    } else {
      savedResult = await saveCustomModule(user?.uid || 'guest', payloadData);
      setSavedModules(prev => [savedResult, ...prev]);
      showToast(`Custom module "${savedResult.title}" created successfully!`);
    }

    setIsModalOpen(false);

    if (launchImmediately) {
      handleLaunchModule(savedResult, finalQuestions);
    }
  };

  // Launch Exam Runner
  const handleLaunchModule = (mod: CustomPracticeModule, precomputedQuestions?: any[]) => {
    const questionsPool = precomputedQuestions || buildCustomQuestionPool(
      mod.selectedSubjectIds,
      mod.filterSource,
      mod.questionCount,
      subjects,
      mod.subjectCounts,
      userBookmarkedIds
    );

    if (questionsPool.length === 0) {
      showToast('No questions available in this custom module pool.');
      return;
    }

    let timeLabel = 'Unlimited';
    if (!mod.isUnlimitedTime && mod.timeDurationMinutes > 0) {
      if (mod.timeDurationSeconds && mod.timeDurationSeconds < 60) {
        timeLabel = `${mod.timeDurationSeconds} Seconds`;
      } else {
        timeLabel = `${mod.timeDurationMinutes} Minutes`;
      }
    }

    navigate(`/student/subject/custom-practice`, {
      state: {
        isCustomModule: true,
        customTitle: mod.title,
        customDescription: `Custom Practice Exam (${questionsPool.length} Qs • ${timeLabel})`,
        customQuestions: questionsPool,
        initialMode: mod.mode,
        timeDurationMinutes: mod.timeDurationMinutes,
        timeDurationSeconds: mod.timeDurationSeconds,
        isUnlimitedTime: mod.isUnlimitedTime
      }
    });
  };

  // Delete Custom Module
  const handleDeleteModule = async (modId: string, modTitle: string) => {
    await deleteCustomModule(user?.uid || 'guest', modId);
    setSavedModules(prev => prev.filter(m => m.id !== modId));
    showToast(`Custom module "${modTitle}" deleted.`);
  };

  // Filter saved modules by search query
  const filteredSavedModules = savedModules.filter(m => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.selectedSubjectNames.some(name => name.toLowerCase().includes(q))
    );
  });

  const selectableCount = availableSubjects.filter(s => getAvailableForSubject(s.id) > 0).length;

  return (
    <div className="space-y-8">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER BAR WITH "+ CREATE CUSTOM MODULE" BUTTON */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-blue-800/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
              Practice Exam Simulator
            </span>
            <span className="text-xs text-blue-200/80 font-bold">
              {savedModules.length} Modules Created
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Sliders size={28} className="text-blue-400" />
            <span>Custom Practice Modules</span>
          </h2>
          <p className="text-xs sm:text-sm text-blue-200/90 font-medium max-w-xl leading-relaxed">
            Build personalized practice exams by selecting duration or entering a custom time limit, choosing subjects, and entering the exact question count from each subject.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Create Custom Module</span>
        </button>
      </div>

      {/* SEARCH BAR & LIST SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search your custom practice modules..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="text-xs font-extrabold text-slate-500 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <span>{savedModules.length} Saved Practice Modules</span>
          </div>
        </div>

        {/* CUSTOM MODULES CARDS GRID */}
        {loadingModules ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading custom practice modules...</p>
          </div>
        ) : filteredSavedModules.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
              <Sliders size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-lg">
                {searchFilter ? 'No Custom Modules Found' : 'No Custom Modules Created Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchFilter
                  ? `No custom module matches "${searchFilter}".`
                  : 'Design your own custom practice exams! Select your duration or enter a custom timer, pick subjects, enter how many questions you need from each subject, and create it.'}
              </p>
            </div>
            {!searchFilter && (
              <button
                onClick={handleOpenCreateModal}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Plus size={16} />
                <span>Create Your First Custom Module</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSavedModules.map(mod => {
              let timeBadge = 'Unlimited Time';
              if (!mod.isUnlimitedTime && mod.timeDurationMinutes > 0) {
                if (mod.timeDurationSeconds && mod.timeDurationSeconds < 60) {
                  timeBadge = `${mod.timeDurationSeconds} Seconds`;
                } else {
                  timeBadge = `${mod.timeDurationMinutes} Mins`;
                }
              }

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/90 hover:border-blue-500 rounded-3xl p-6 transition-all shadow-xs hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        mod.mode === 'learn'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {mod.mode === 'learn' ? 'Study Mode' : 'Timed Quiz'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(mod)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Custom Module"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id, mod.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Custom Module"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {mod.title}
                    </h3>

                    {/* Meta Specs */}
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 text-xs font-semibold text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Total Questions:</span>
                        <span className="font-black text-slate-900">{mod.questionCount} Qs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Duration:</span>
                        <span className="font-black text-blue-600 flex items-center gap-1">
                          <Clock size={12} />
                          {timeBadge}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Filter:</span>
                        <span className="font-bold text-slate-800">
                          {mod.filterSource === 'bookmarked' ? 'Bookmarked Only' : 'All Questions'}
                        </span>
                      </div>
                    </div>

                    {/* Selected Subjects Tags with Per-Subject Counts */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                        Subjects Breakdown ({mod.selectedSubjectNames.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.selectedSubjectIds.slice(0, 4).map((subjId, i) => {
                          const name = mod.selectedSubjectNames[i] || availableSubjects.find(s => s.id === subjId)?.name || subjId;
                          const cnt = mod.subjectCounts?.[subjId];
                          return (
                            <span key={subjId} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold border border-slate-200/70">
                              {name}{cnt ? ` (${cnt})` : ''}
                            </span>
                          );
                        })}
                        {mod.selectedSubjectIds.length > 4 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black">
                            +{mod.selectedSubjectIds.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleLaunchModule(mod)}
                      className="w-full py-3 bg-slate-900 group-hover:bg-blue-600 text-white rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Start Custom Practice Exam</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CUSTOM MODULE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm">
                    <Sliders size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">
                      {editingModuleId ? 'Edit Custom Module' : 'Create Custom Practice Module'}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      Select or enter duration, pick subjects, enter how many questions you need from each subject, and create.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                
                {/* 1. Module Title & Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Module Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Anatomy & Physiology Rapid Drill"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Execution Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('practice')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          mode === 'practice'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-extrabold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Clock size={16} className="text-blue-600 shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold">Timed Quiz</p>
                          <p className="text-[10px] text-slate-500">Interactive exam</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('learn')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          mode === 'learn'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-extrabold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <BookOpen size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold">Learn Mode</p>
                          <p className="text-[10px] text-slate-500">Study answers</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Duration Selection or Custom Entry */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      1. Select Duration or Enter Custom Duration
                    </label>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      Duration: {getNormalizedTimeSettings().displayLabel}
                    </span>
                  </div>

                  {/* Time Mode Tabs */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTimeMode('minutes');
                        if (!customTimeValue || parseFloat(customTimeValue) < 0.5) setCustomTimeValue('15');
                      }}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        timeMode === 'minutes'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Clock size={14} />
                      <span>Minutes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTimeMode('seconds');
                        if (!customTimeValue || parseFloat(customTimeValue) < 30) setCustomTimeValue('60');
                      }}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        timeMode === 'seconds'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Zap size={14} />
                      <span>Seconds</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimeMode('unlimited')}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        timeMode === 'unlimited'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>Unlimited Time</span>
                    </button>
                  </div>

                  {/* Select Preset OR Enter Custom Duration */}
                  {timeMode !== 'unlimited' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">
                          Select Duration:
                        </span>
                        {timeMode === 'seconds' ? (
                          ['30', '45', '60', '90', '120'].map(sec => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setCustomTimeValue(sec)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition-colors ${
                                customTimeValue === sec
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {sec} Sec
                            </button>
                          ))
                        ) : (
                          ['5', '10', '15', '20', '30', '45', '60', '90'].map(min => (
                            <button
                              key={min}
                              type="button"
                              onClick={() => setCustomTimeValue(min)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer border transition-colors ${
                                customTimeValue === min
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {min} Min
                            </button>
                          ))
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-slate-200/70">
                        <label className="text-xs font-black text-slate-700 shrink-0">
                          Or Enter Duration ({timeMode === 'minutes' ? 'Minutes' : 'Seconds'}):
                        </label>
                        <input
                          type="number"
                          step={timeMode === 'minutes' ? '0.5' : '5'}
                          min={timeMode === 'minutes' ? 0.5 : 30}
                          value={customTimeValue}
                          onChange={e => setCustomTimeValue(e.target.value)}
                          placeholder={timeMode === 'minutes' ? 'e.g. 25' : 'e.g. 75'}
                          className="w-32 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-500">
                          {timeMode === 'minutes' ? 'minutes' : 'seconds'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Question Source Filter */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Question Source
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFilterSource('all')}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        filterSource === 'all'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <BookOpen size={14} />
                      <span>All Question Bank Questions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterSource('bookmarked')}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        filterSource === 'bookmarked'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Star size={14} className="fill-current" />
                      <span>Bookmarked Questions Only</span>
                    </button>
                  </div>
                </div>

                {/* 4. Select Subjects & Enter Question Count Per Subject */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        3. Select Subjects & Enter Question Count Per Subject
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Select each subject you want to include and enter how many questions to pull from it.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black">
                        {selectedSubjectIds.length} Subjects • {totalRequestedQuestions} Questions Total
                      </span>

                      {selectableCount > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllSubjects}
                          className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                        >
                          {selectedSubjectIds.length === selectableCount ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>
                  </div>

                  {availableSubjects.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-semibold">
                      No subjects available in the Question Bank yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto p-2 border border-slate-200/80 rounded-2xl bg-slate-50/60">
                      {availableSubjects.map(s => {
                        const avail = getAvailableForSubject(s.id);
                        const isSelected = selectedSubjectIds.includes(s.id);
                        const rawCountStr = subjectCounts[s.id] ?? '';
                        const parsedCount = parseInt(rawCountStr || '0', 10);
                        const exceedsMax = isSelected && parsedCount > avail;

                        return (
                          <div
                            key={s.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-white border-blue-500 shadow-2xs'
                                : avail === 0
                                  ? 'bg-slate-100/70 border-slate-200/70 opacity-60'
                                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Left: Checkbox + Subject Name + Available Count */}
                            <div
                              onClick={() => avail > 0 && handleToggleSubject(s.id)}
                              className={`flex items-center gap-3 min-w-0 flex-1 ${avail > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-extrabold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                                  {s.name}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400">
                                  {avail} {avail === 1 ? 'question' : 'questions'} available
                                </p>
                              </div>
                            </div>

                            {/* Right: Per-Subject Question Count Controls */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {exceedsMax && (
                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mr-1">
                                  <AlertCircle size={12} />
                                  Max {avail}
                                </span>
                              )}

                              <span className="text-[10px] font-extrabold text-slate-500 uppercase">Count:</span>

                              <button
                                type="button"
                                disabled={avail === 0}
                                onClick={() => handleSetSubjectCount(s.id, (isNaN(parsedCount) ? 0 : parsedCount) - 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                                title="Decrease count"
                              >
                                <Minus size={12} />
                              </button>

                              <input
                                type="number"
                                min={0}
                                max={avail}
                                disabled={avail === 0}
                                value={isSelected ? rawCountStr : ''}
                                placeholder="0"
                                onChange={e => handleSubjectCountChange(s.id, e.target.value)}
                                className={`w-16 px-2 py-1.5 text-center rounded-xl border text-xs font-black outline-none transition-all ${
                                  isSelected
                                    ? 'bg-blue-50/50 border-blue-400 text-blue-950 focus:border-blue-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500 focus:bg-white'
                                }`}
                              />

                              <button
                                type="button"
                                disabled={avail === 0 || (isSelected && parsedCount >= avail)}
                                onClick={() => handleSetSubjectCount(s.id, (isSelected && !isNaN(parsedCount) ? parsedCount : 0) + 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                                title="Increase count"
                              >
                                <Plus size={12} />
                              </button>

                              <button
                                type="button"
                                disabled={avail === 0}
                                onClick={() => handleSetSubjectCount(s.id, avail)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-[10px] font-black text-slate-600 disabled:opacity-40 cursor-pointer transition-colors"
                              >
                                Max ({avail})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSaveModule(false)}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm cursor-pointer"
                  >
                    {editingModuleId ? 'Save Changes' : `Create Module (${totalRequestedQuestions} Qs)`}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveModule(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>Create & Start Practice Now</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

