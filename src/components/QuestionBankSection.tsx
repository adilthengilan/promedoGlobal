import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  ChevronRight, 
  Star, 
  Sparkles, 
  Award, 
  RotateCcw, 
  Clock, 
  BarChart3, 
  Filter, 
  Zap, 
  Play, 
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  fetchListedSubjects, 
  subscribeToListedSubjects, 
  PracticeSubject, 
  getUserPracticeAttempts, 
  calculateSubjectPerformanceStats, 
  PracticeAttemptRecord,
  SubjectPerformanceStats
} from '../lib/subjectPracticeService';
import { 
  subscribeToUserSubjectBookmarks, 
  toggleUserSubjectBookmark 
} from '../lib/userQuestionService';
import BookmarkedQuestions from './BookmarkedQuestions';
import CustomPracticeBuilder from './CustomPracticeBuilder';
import { Sliders } from 'lucide-react';

export default function QuestionBankSection({ isStudent = false, isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [subjects, setSubjects] = useState<PracticeSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'subjects' | 'custom' | 'bookmarks' | 'history'>('subjects');
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [subjectStatsMap, setSubjectStatsMap] = useState<Record<string, SubjectPerformanceStats>>({});
  const [bookmarkedSubjectIds, setBookmarkedSubjectIds] = useState<Set<string>>(new Set());
  const [onlyBookmarkedFilter, setOnlyBookmarkedFilter] = useState(false);

  // 1. Subscribe to listed subjects from Firestore / LocalStorage
  useEffect(() => {
    setLoadingSubjects(true);
    const unsub = subscribeToListedSubjects(
      (list) => {
        setSubjects(list);
        setLoadingSubjects(false);
      },
      isAdmin,
      () => setLoadingSubjects(false)
    );
    return () => unsub();
  }, [isAdmin]);

  // 2. Subscribe to Bookmarked Subjects
  useEffect(() => {
    const unsub = subscribeToUserSubjectBookmarks(user?.uid || '', (ids) => {
      setBookmarkedSubjectIds(new Set(ids));
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Fetch user practice attempts to compute stats per subject
  useEffect(() => {
    if (user?.uid) {
      getUserPracticeAttempts(user.uid).then((records) => {
        setAttempts(records);
        const map: Record<string, SubjectPerformanceStats> = {};
        subjects.forEach((s) => {
          map[s.id] = calculateSubjectPerformanceStats(records, s.id);
        });
        setSubjectStatsMap(map);
      });
    }
  }, [user?.uid, subjects]);

  // Handle Toggle Subject Bookmark
  const handleToggleSubjectBookmark = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyBookmarked = bookmarkedSubjectIds.has(subjectId);
    setBookmarkedSubjectIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyBookmarked) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });

    try {
      await toggleUserSubjectBookmark(user?.uid || '', subjectId, isCurrentlyBookmarked);
    } catch (err) {
      console.warn('Error toggling subject bookmark:', err);
    }
  };

  // Filter subjects by search query and bookmarked toggle
  const filteredSubjects = subjects.filter((s) => {
    if (onlyBookmarkedFilter && !bookmarkedSubjectIds.has(s.id)) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.details && s.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Interactive Learning Suite
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              {subjects.length} Subjects Listed
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Question Bank</h2>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Explore clinical recall questions by subject, practice timed interactive drills, and track your licensing exam readiness.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl shrink-0 self-start md:self-center border border-slate-200/60 flex-wrap sm:flex-nowrap">
          <button 
            onClick={() => setActiveTab('subjects')} 
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'subjects' 
                ? 'bg-white text-blue-600 shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={15} />
            <span>Subjects ({subjects.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('custom')} 
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'custom' 
                ? 'bg-white text-blue-600 shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={15} />
            <span>Custom Practice Builder</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('bookmarks')} 
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bookmarks' 
                ? 'bg-white text-blue-600 shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star size={15} />
            <span>Bookmarked</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history' 
                ? 'bg-white text-blue-600 shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw size={15} />
            <span>Practice History ({attempts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBJECTS CATALOG */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {/* Search & Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject by title or description..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
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

            <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
              <button
                onClick={() => setOnlyBookmarkedFilter(!onlyBookmarkedFilter)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  onlyBookmarkedFilter
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Star size={14} className={onlyBookmarkedFilter ? 'fill-current' : 'text-amber-500'} />
                <span>Bookmarked Subjects ({bookmarkedSubjectIds.size})</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <Sparkles size={15} className="text-amber-500" />
                <span>Click any subject to start learning</span>
              </div>
            </div>
          </div>

          {/* Subject Cards Grid */}
          {loadingSubjects ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading listed subject modules...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <HelpCircle size={40} className="text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-900 text-base">No Subjects Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {onlyBookmarkedFilter
                  ? 'No subjects are currently bookmarked. Click the ⭐ star button on any subject card to bookmark it!'
                  : searchQuery
                    ? `No listed subjects match "${searchQuery}". Try clearing your search term.`
                    : 'No subject modules are currently listed for student practice.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((s) => {
                const isSubjectBookmarked = bookmarkedSubjectIds.has(s.id);
                const stats = subjectStatsMap[s.id] || {
                  totalAttempts: 0,
                  bestScore: 0,
                  latestScore: 0,
                  averageScore: 0,
                  totalQuestionsAnswered: 0
                };

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/student/subject/${s.id}`)}
                    className="bg-white border border-slate-200/90 hover:border-blue-500 rounded-3xl p-6 transition-all shadow-xs hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Card Header & Icon */}
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center font-extrabold shadow-xs shrink-0">
                          <BookOpen size={22} />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleToggleSubjectBookmark(s.id, e)}
                            className={`p-2 rounded-xl transition-all border cursor-pointer ${
                              isSubjectBookmarked
                                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                                : 'bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 border-slate-200'
                            }`}
                            title={isSubjectBookmarked ? 'Remove Subject Bookmark' : 'Bookmark Subject'}
                          >
                            <Star size={16} className={isSubjectBookmarked ? 'fill-amber-500 text-amber-500' : ''} />
                          </button>

                          <span className="px-3 py-1 bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-700 rounded-full text-[11px] font-black tracking-tight border border-slate-200 group-hover:border-blue-200 transition-colors">
                            {s.questionCount || 0} Questions
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                        {s.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium mb-6">
                        {s.description || s.details || 'Master key clinical concepts, recall vignettes, and diagnostic reasoning.'}
                      </p>
                    </div>

                    {/* Footer: Progress Badges & Action */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      {stats.totalAttempts > 0 ? (
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-bold">
                          <span className="text-slate-500">Best Score:</span>
                          <span className={`px-2 py-0.5 rounded-md font-black ${
                            stats.bestScore >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {stats.bestScore}% ({stats.totalAttempts} {stats.totalAttempts === 1 ? 'attempt' : 'attempts'})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-1">
                          <Zap size={13} className="text-amber-500" />
                          <span>Not attempted yet • Start learning</span>
                        </div>
                      )}

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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOM PRACTICE BUILDER */}
      {activeTab === 'custom' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <CustomPracticeBuilder subjects={subjects} />
        </div>
      )}

      {/* TAB 3: BOOKMARKED QUESTIONS */}
      {activeTab === 'bookmarks' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <BookmarkedQuestions />
        </div>
      )}

      {/* TAB 3: PRACTICE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <RotateCcw size={18} className="text-blue-600" />
              Your Practice History & Score Log
            </h3>
            <p className="text-xs text-slate-500 mt-1">Review all your previous subject practice attempts and performance records.</p>
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Award size={36} className="text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No Practice Attempts Saved Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Complete an interactive subject practice quiz to view your score breakdown and time analytics here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((att, idx) => (
                <div
                  key={att.id || idx}
                  className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                        {att.subjectName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {new Date(att.completedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Answered {att.correctCount} correct out of {att.totalQuestions} questions ({att.unansweredCount} skipped)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className={`text-lg font-black ${
                        att.scorePercent >= 70 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {att.scorePercent}%
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Time: {Math.floor(att.timeTakenSeconds / 60)}m {att.timeTakenSeconds % 60}s
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/student/subject/${att.subjectId}`)}
                      className="px-3.5 py-2 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Re-take Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
