import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  Check, 
  Sparkles, 
  Trash2, 
  HelpCircle,
  ArrowRight,
  Filter,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToUserBookmarks, 
  resolveQuestionReferences, 
  toggleUserBookmark,
  subscribeToUserSubjectBookmarks,
  toggleUserSubjectBookmark,
  QuestionReference,
  ResolvedQuestion 
} from '../lib/userQuestionService';
import { 
  getBookmarkedQuestionIds, 
  getQuestionFolders, 
  toggleQuestionBookmark 
} from '../lib/questionFolders';
import { fetchListedSubjects, PracticeSubject } from '../lib/subjectPracticeService';

export default function BookmarkedQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeBookmarkSubTab, setActiveBookmarkSubTab] = useState<'questions' | 'subjects'>('questions');

  // Bookmarked Questions State
  const [questions, setQuestions] = useState<ResolvedQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'subject'>('date');

  // Bookmarked Subjects State
  const [allSubjects, setAllSubjects] = useState<PracticeSubject[]>([]);
  const [bookmarkedSubjectIds, setBookmarkedSubjectIds] = useState<Set<string>>(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // 1. Subscribe and resolve Bookmarked Questions
  useEffect(() => {
    let isSubscribed = true;

    const loadAllBookmarks = async (firestoreRefs: QuestionReference[] = []) => {
      const localIds = getBookmarkedQuestionIds();
      const refMap = new Map<string, QuestionReference>();

      const folders = getQuestionFolders();
      localIds.forEach((id) => {
        folders.forEach((f) => {
          (f.selectedQuestions || []).forEach((q) => {
            if (q.id === id && !refMap.has(id)) {
              refMap.set(id, {
                questionId: id,
                subjectId: f.id,
                subjectName: f.name,
                createdAt: q.createdAt
              });
            }
          });
        });
      });

      firestoreRefs.forEach((r) => {
        refMap.set(r.questionId, r);
      });

      const combinedRefs = Array.from(refMap.values());

      if (combinedRefs.length === 0) {
        if (isSubscribed) {
          setQuestions([]);
          setLoadingQuestions(false);
        }
        return;
      }

      try {
        const resolved = await resolveQuestionReferences(combinedRefs);
        if (isSubscribed) {
          setQuestions(resolved);
          setLoadingQuestions(false);
        }
      } catch (err) {
        console.warn('Error resolving bookmarks:', err);
        if (isSubscribed) setLoadingQuestions(false);
      }
    };

    setLoadingQuestions(true);

    if (user?.uid) {
      const unsub = subscribeToUserBookmarks(user.uid, (firestoreRefs) => {
        loadAllBookmarks(firestoreRefs);
      });
      return () => {
        isSubscribed = false;
        unsub();
      };
    } else {
      loadAllBookmarks([]);
    }

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // 2. Subscribe to Bookmarked Subjects & Catalog
  useEffect(() => {
    setLoadingSubjects(true);

    // Fetch subjects catalog
    fetchListedSubjects(true).then((subjs) => {
      setAllSubjects(subjs);
      setLoadingSubjects(false);
    });

    // Subscribe to subject bookmark IDs
    const unsub = subscribeToUserSubjectBookmarks(user?.uid || '', (ids) => {
      setBookmarkedSubjectIds(new Set(ids));
    });

    return () => unsub();
  }, [user?.uid]);

  // Remove / Toggle Question Bookmark
  const handleRemoveQuestionBookmark = async (q: ResolvedQuestion) => {
    setQuestions(prev => prev.filter(item => item.id !== q.id));
    toggleQuestionBookmark(q.id);

    if (user?.uid) {
      try {
        await toggleUserBookmark(
          user.uid,
          { questionId: q.id, subjectId: q.subjectId, subjectName: q.subjectName },
          true
        );
      } catch (err) {
        console.warn('Notice: Firestore bookmark sync deferred:', err);
      }
    }
  };

  // Remove / Toggle Subject Bookmark
  const handleRemoveSubjectBookmark = async (subjectId: string) => {
    setBookmarkedSubjectIds(prev => {
      const next = new Set(prev);
      next.delete(subjectId);
      return next;
    });

    try {
      await toggleUserSubjectBookmark(user?.uid || '', subjectId, true);
    } catch (err) {
      console.warn('Notice: Subject bookmark sync deferred:', err);
    }
  };

  // Unique subject names for filtering questions
  const uniqueSubjectNames = Array.from(new Set(questions.map(q => q.subjectName))).filter(Boolean);

  // Filtered & Sorted Bookmarked Questions
  const filteredQuestions = questions.filter(q => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || (
      q.text.toLowerCase().includes(query) ||
      q.subjectName.toLowerCase().includes(query) ||
      q.explanation.toLowerCase().includes(query)
    );
    const matchesSubject = selectedSubjectFilter === 'all' || q.subjectName === selectedSubjectFilter;
    return matchesQuery && matchesSubject;
  }).sort((a, b) => {
    if (sortBy === 'subject') return a.subjectName.localeCompare(b.subjectName);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Filtered Bookmarked Subjects List
  const bookmarkedSubjectsList = allSubjects.filter(s => bookmarkedSubjectIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* SUB-NAVIGATION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              Saved Study Deck
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {questions.length} Questions • {bookmarkedSubjectsList.length} Subjects Saved
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bookmarks Vault</h3>
          <p className="text-xs text-slate-500 font-medium">
            Quickly access your bookmarked high-yield questions and saved subject modules.
          </p>
        </div>

        {/* Sub-Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0 border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveBookmarkSubTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeBookmarkSubTab === 'questions'
                ? 'bg-white text-blue-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={14} />
            <span>Bookmarked Questions ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveBookmarkSubTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeBookmarkSubTab === 'subjects'
                ? 'bg-white text-blue-600 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Bookmarked Subjects ({bookmarkedSubjectsList.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BOOKMARKED QUESTIONS */}
      {activeBookmarkSubTab === 'questions' && (
        <div className="space-y-6">
          {/* SEARCH & FILTER CONTROLS */}
          {questions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="relative w-full max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookmarked questions by keyword or explanation..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto justify-end">
                {uniqueSubjectNames.length > 1 && (
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Subjects ({uniqueSubjectNames.length})</option>
                    {uniqueSubjectNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="date">Sort by Recent</option>
                  <option value="subject">Sort by Subject</option>
                </select>
              </div>
            </div>
          )}

          {/* QUESTIONS LIST */}
          {loadingQuestions ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Resolving bookmarked questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <Star size={32} className="fill-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">
                  {searchQuery || selectedSubjectFilter !== 'all' ? 'No Matching Bookmarks Found' : 'No Bookmarked Questions Yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {searchQuery || selectedSubjectFilter !== 'all'
                    ? 'Try adjusting your search query or subject filter.'
                    : 'Click the ⭐ Bookmark button on any clinical question while exploring subjects or taking practice drills to save high-yield questions here.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredQuestions.map((q, idx) => (
                <motion.div
                  key={q.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs hover:border-amber-400 transition-all space-y-5 group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-black uppercase tracking-wider">
                      {q.subjectName || 'Subject Question'}
                    </span>

                    <button
                      onClick={() => handleRemoveQuestionBookmark(q)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-red-50 text-amber-800 hover:text-red-700 border border-amber-200 hover:border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Remove Bookmark"
                    >
                      <Star size={14} className="fill-amber-500 text-amber-500 group-hover:text-red-500 group-hover:fill-red-500 transition-colors" />
                      <span>Remove Bookmark</span>
                    </button>
                  </div>

                  {/* Question Text */}
                  <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
                    {q.text}
                  </p>

                  {/* Media Image if Present */}
                  {q.imageUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 p-2 max-h-72 flex items-center justify-center">
                      <img src={q.imageUrl} alt="Clinical vignette media" className="max-h-72 w-auto object-contain rounded-xl" />
                    </div>
                  )}

                  {/* Answer Options */}
                  {q.options && q.options.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Options & Answer Key
                      </span>
                      <div className="grid gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correctAnswer;
                          const optionLetters = ['A', 'B', 'C', 'D', 'E'];

                          return (
                            <div
                              key={optIdx}
                              className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50/60 border-slate-200/80 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-400 border border-slate-200'
                                }`}>
                                  {optionLetters[optIdx] || optIdx + 1}
                                </span>
                                <span>{opt}</span>
                              </div>

                              {isCorrect && (
                                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <Check size={11} /> Correct Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rationale */}
                  {q.explanation && (
                    <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 space-y-1 text-xs">
                      <div className="font-extrabold text-blue-900 flex items-center gap-1.5 text-xs mb-1">
                        <CheckCircle2 size={15} className="text-blue-600" />
                        <span>Diagnostic Rationale & Clinical Explanation</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: BOOKMARKED SUBJECTS */}
      {activeBookmarkSubTab === 'subjects' && (
        <div className="space-y-6">
          {loadingSubjects ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading bookmarked subjects...</p>
            </div>
          ) : bookmarkedSubjectsList.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
                <BookOpen size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">No Bookmarked Subjects Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Click the ⭐ star button on any subject card in the Question Bank catalog to bookmark your priority study modules here!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedSubjectsList.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/student/subject/${s.id}`)}
                  className="bg-white border border-slate-200/90 hover:border-blue-500 rounded-3xl p-6 transition-all shadow-xs hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center font-extrabold shadow-xs shrink-0">
                        <BookOpen size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSubjectBookmark(s.id);
                          }}
                          className="p-2 bg-amber-50 hover:bg-red-50 text-amber-800 hover:text-red-700 border border-amber-300 rounded-xl transition-all cursor-pointer"
                          title="Remove Subject Bookmark"
                        >
                          <Star size={16} className="fill-amber-500 text-amber-500" />
                        </button>

                        <span className="px-3 py-1 bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-700 rounded-full text-[11px] font-black tracking-tight border border-slate-200 group-hover:border-blue-200 transition-colors">
                          {s.questionCount || 0} Qs
                        </span>
                      </div>
                    </div>

                    {/* Title & Details */}
                    <h4 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                      {s.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium mb-6">
                      {s.description || s.details || 'Master key clinical concepts, recall vignettes, and diagnostic reasoning.'}
                    </p>
                  </div>

                  {/* Start Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/subject/${s.id}`);
                      }}
                      className="w-full py-3 bg-slate-900 group-hover:bg-blue-600 text-white rounded-2xl font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Open Subject & Practice</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
