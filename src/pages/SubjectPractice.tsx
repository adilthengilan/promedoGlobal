import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Star, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Award, 
  Clock, 
  Sparkles, 
  Check, 
  X, 
  LogOut, 
  AlertTriangle, 
  HelpCircle,
  BarChart3,
  List,
  Eye,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchQuestionsForSubject, 
  prepareShuffledQuestions, 
  savePracticeAttempt, 
  getUserPracticeAttempts, 
  calculateSubjectPerformanceStats, 
  SubjectQuestion, 
  ShuffledPracticeQuestion, 
  PracticeAttemptRecord, 
  SubjectPerformanceStats,
  fetchListedSubjects,
  PracticeSubject
} from '../lib/subjectPracticeService';
import { subscribeToUserBookmarks, toggleUserBookmark } from '../lib/userQuestionService';

export default function SubjectPractice() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode States: 'learn' | 'practice' | 'results' | 'review'
  const [activeMode, setActiveMode] = useState<'learn' | 'practice' | 'results' | 'review'>('learn');

  // Data States
  const [subjectInfo, setSubjectInfo] = useState<PracticeSubject | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<SubjectQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Subject Stats & Past Attempts
  const [pastAttempts, setPastAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectPerformanceStats>({
    totalAttempts: 0,
    bestScore: 0,
    latestScore: 0,
    averageScore: 0,
    totalQuestionsAnswered: 0
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Learning Mode State
  const [learnIdx, setLearnIdx] = useState(0);

  // Interactive Practice Mode State
  const [practiceDeck, setPracticeDeck] = useState<ShuffledPracticeQuestion[]>([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({}); // questionId -> selectedOptionIndex
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  // Last Completed Practice Attempt for Results & Review
  const [lastAttempt, setLastAttempt] = useState<PracticeAttemptRecord | null>(null);

  // 1. Fetch Subject Info, Questions, and Performance Stats on mount
  useEffect(() => {
    if (!subjectId) return;

    setLoading(true);

    // Fetch subjects catalog to get subject metadata
    fetchListedSubjects(true).then((subjects) => {
      const match = subjects.find(s => s.id === subjectId || s.id.toLowerCase() === subjectId.toLowerCase());
      if (match) {
        setSubjectInfo(match);
      } else {
        setSubjectInfo({
          id: subjectId,
          name: subjectId.replace(/[-_]/g, ' ').toUpperCase(),
          description: 'Subject Question Bank & Practice Module',
          questionCount: 0,
          isListed: true
        });
      }
    });

    // Fetch Subject Questions
    fetchQuestionsForSubject(subjectId).then((qs) => {
      setOriginalQuestions(qs);
      setLoading(false);
    });

    // Fetch User Practice Attempts for this subject
    if (user?.uid) {
      getUserPracticeAttempts(user.uid, subjectId).then((records) => {
        setPastAttempts(records);
        setSubjectStats(calculateSubjectPerformanceStats(records, subjectId));
      });
    } else {
      setLoading(false);
    }
  }, [subjectId, user?.uid]);

  // 2. Subscribe to Bookmarks
  useEffect(() => {
    if (user?.uid) {
      const unsub = subscribeToUserBookmarks(user.uid, (list) => {
        setBookmarkedIds(new Set(list.map(b => b.questionId)));
      });
      return () => unsub();
    }
  }, [user?.uid]);

  // 3. Timer effect during Practice Mode
  useEffect(() => {
    if (activeMode === 'practice') {
      setTimerSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeMode]);

  // Toggle Bookmark for a question
  const handleToggleBookmark = async (questionId: string) => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    const isBookmarked = bookmarkedIds.has(questionId);
    const qObj = originalQuestions.find(q => q.id === questionId);
    const subjectName = subjectInfo?.name || subjectId || 'Subject';

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

    try {
      await toggleUserBookmark(
        user.uid,
        { questionId, subjectId: subjectId!, subjectName },
        isBookmarked
      );
    } catch (err) {
      console.warn('Bookmark toggle error:', err);
    }
  };

  // Start a new Practice Quiz
  const handleStartPractice = () => {
    if (originalQuestions.length === 0) return;

    const shuffled = prepareShuffledQuestions(originalQuestions);
    setPracticeDeck(shuffled);
    setPracticeIdx(0);
    setSelectedAnswers({});
    setShowSubmitModal(false);
    setShowQuitModal(false);
    setActiveMode('practice');
  };

  // Select an Option during Practice
  const handleSelectPracticeOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  // Submit Practice Attempt
  const handleFinalSubmitPractice = async () => {
    setShowSubmitModal(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const reviews = practiceDeck.map((q) => {
      const selectedIndex = selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : null;
      const isCorrect = selectedIndex !== null && selectedIndex === q.correctAnswer;

      if (selectedIndex === null) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        questionId: q.originalQuestionId,
        text: q.text,
        options: q.options,
        selectedAnswerIndex: selectedIndex,
        correctAnswerIndex: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        imageUrl: q.imageUrl
      };
    });

    const totalQuestions = practiceDeck.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const record: PracticeAttemptRecord = {
      userId: user?.uid || 'guest',
      subjectId: subjectId!,
      subjectName: subjectInfo?.name || subjectId || 'Subject',
      completedAt: new Date().toISOString(),
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      scorePercent,
      timeTakenSeconds: timerSeconds,
      questionReviews: reviews
    };

    setLastAttempt(record);

    // Save to Firestore & LocalStorage if user logged in
    if (user?.uid) {
      try {
        const saved = await savePracticeAttempt(user.uid, record);
        setLastAttempt(saved);

        // Refresh stats
        const updatedRecords = await getUserPracticeAttempts(user.uid, subjectId);
        setPastAttempts(updatedRecords);
        setSubjectStats(calculateSubjectPerformanceStats(updatedRecords, subjectId!));
      } catch (err) {
        console.warn('Error saving attempt:', err);
      }
    }

    setActiveMode('results');
  };

  // Format Timer Display (mm:ss)
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading subject practice deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-24 bg-slate-50/60 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* TOP BAR: BACK BUTTON & MODE SWITCHER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => {
              if (activeMode === 'practice') {
                setShowQuitModal(true);
              } else {
                navigate('/dashboard');
              }
            }}
            className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-600 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          {/* Mode Tabs (Only visible when not in active test / results) */}
          {activeMode !== 'practice' && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0 border border-slate-200/60">
              <button
                onClick={() => setActiveMode('learn')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMode === 'learn'
                    ? 'bg-white text-blue-600 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={14} />
                <span>Learn Mode ({originalQuestions.length})</span>
              </button>

              <button
                onClick={handleStartPractice}
                disabled={originalQuestions.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play size={13} fill="currentColor" />
                <span>Start Practice Quiz</span>
              </button>
            </div>
          )}
        </div>

        {/* SUBJECT HEADER BANNER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-200">
                  Subject Module
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {originalQuestions.length} Questions Available
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {subjectInfo?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium max-w-2xl">
                {subjectInfo?.description || subjectInfo?.details || 'Master key clinical concepts, recall vignettes, and diagnostic reasoning.'}
              </p>
            </div>

            {/* Performance Summary Pill */}
            {subjectStats.totalAttempts > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0 space-y-2 text-right">
                <div className="text-xs font-extrabold text-slate-700 flex items-center justify-end gap-1.5">
                  <Award size={16} className="text-amber-500" />
                  <span>Your Best Score:</span>
                  <span className="text-sm font-black text-emerald-600">{subjectStats.bestScore}%</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-end gap-3">
                  <span>Attempts: {subjectStats.totalAttempts}</span>
                  <span>Avg: {subjectStats.averageScore}%</span>
                </div>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <BarChart3 size={12} />
                  <span>View Attempt History</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODE 1: LEARNING MODE (EXPLORE QUESTIONS & ANSWERS) */}
        {activeMode === 'learn' && (
          <div className="space-y-6">
            {originalQuestions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
                <HelpCircle size={40} className="text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-slate-900 text-base">No Questions Configured Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Administrators are currently adding clinical recall questions to this subject module. Please check back shortly!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Learn Navigation Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>Learning Mode: Question {learnIdx + 1} of {originalQuestions.length}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={learnIdx === 0}
                      onClick={() => setLearnIdx(prev => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>
                    <button
                      disabled={learnIdx === originalQuestions.length - 1}
                      onClick={() => setLearnIdx(prev => Math.min(originalQuestions.length - 1, prev + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Question Card */}
                {(() => {
                  const q = originalQuestions[learnIdx];
                  if (!q) return null;
                  const isBookmarked = bookmarkedIds.has(q.id);

                  return (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                      {/* Top Bar: Sparkle & Bookmark */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-extrabold text-blue-600 flex items-center gap-1.5">
                          <Sparkles size={14} /> Clinical Recall Vignette
                        </span>

                        <button
                          onClick={() => handleToggleBookmark(q.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            isBookmarked
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-50 hover:bg-amber-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Star size={14} className={isBookmarked ? 'fill-amber-500 text-amber-500' : ''} />
                          <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                        </button>
                      </div>

                      {/* Question Text */}
                      <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
                        {q.text}
                      </p>

                      {/* Question Image if present */}
                      {q.imageUrl && (
                        <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 p-2 max-h-80 flex items-center justify-center">
                          <img src={q.imageUrl} alt="Clinical media" className="max-h-80 w-auto object-contain rounded-xl" />
                        </div>
                      )}

                      {/* Correct Answer Only (Learn mode shows ONLY the answer, no options) */}
                      <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-5 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Check size={12} />
                            Answer
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-extrabold text-emerald-950 leading-relaxed">
                          {q.options && q.options[q.correctAnswer] !== undefined 
                            ? q.options[q.correctAnswer] 
                            : (q.options?.[0] || 'N/A')}
                        </p>
                      </div>

                      {/* Explanation Section */}
                      {q.explanation && (
                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 space-y-2 text-xs">
                          <div className="font-extrabold text-blue-900 flex items-center gap-1.5 text-xs">
                            <CheckCircle2 size={16} className="text-blue-600" />
                            <span>Clinical Rationale & Explanation</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed font-medium">
                            {q.explanation}
                          </p>
                        </div>
                      )}

                      {/* Bottom Quick Jump & Practice Trigger */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
                          {originalQuestions.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLearnIdx(idx)}
                              className={`w-7 h-7 rounded-lg text-[11px] font-extrabold transition-all shrink-0 cursor-pointer ${
                                idx === learnIdx
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={handleStartPractice}
                          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <Play size={14} fill="currentColor" />
                          <span>Start Interactive Practice Quiz</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: INTERACTIVE PRACTICE QUIZ MODE */}
        {activeMode === 'practice' && (
          <div className="space-y-6">
            {/* Practice Header Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQuitModal(true)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Quit Practice</span>
                </button>
                <div className="text-xs font-bold text-slate-700">
                  Question <span className="text-blue-600 font-black">{practiceIdx + 1}</span> of {practiceDeck.length}
                </div>
              </div>

              {/* Live Timer */}
              <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200/80 text-xs font-black text-slate-800">
                <Clock size={15} className="text-blue-600 animate-pulse" />
                <span>{formatTime(timerSeconds)}</span>
              </div>

              {/* Progress Count */}
              <div className="text-xs font-bold text-slate-500">
                Answered: <span className="text-emerald-600 font-black">{Object.keys(selectedAnswers).length}</span> / {practiceDeck.length}
              </div>
            </div>

            {/* Active Practice Question Card */}
            {(() => {
              const q = practiceDeck[practiceIdx];
              if (!q) return null;
              const selectedOptIdx = selectedAnswers[q.id];

              return (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${((practiceIdx + 1) / practiceDeck.length) * 100}%` }}
                    />
                  </div>

                  {/* Question Text */}
                  <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
                    {q.text}
                  </p>

                  {/* Question Image if present */}
                  {q.imageUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 p-2 max-h-80 flex items-center justify-center">
                      <img src={q.imageUrl} alt="Clinical media" className="max-h-80 w-auto object-contain rounded-xl" />
                    </div>
                  )}

                  {/* Options List - No answers/explanations revealed during test */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                      Select Answer Choice
                    </span>
                    <div className="grid gap-3">
                      {q.options.map((optText, optIdx) => {
                        const isSelected = selectedOptIdx === optIdx;
                        const optionLetters = ['A', 'B', 'C', 'D', 'E'];

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectPracticeOption(q.id, optIdx)}
                            className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                                : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                              }`}>
                                {optionLetters[optIdx] || optIdx + 1}
                              </span>
                              <span>{optText}</span>
                            </div>

                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <button
                      disabled={practiceIdx === 0}
                      onClick={() => setPracticeIdx(prev => Math.max(0, prev - 1))}
                      className="px-5 py-3 rounded-2xl border border-slate-200 font-bold text-xs hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Previous Question</span>
                    </button>

                    {practiceIdx === practiceDeck.length - 1 ? (
                      <button
                        onClick={() => setShowSubmitModal(true)}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>Finish & Submit Practice</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setPracticeIdx(prev => Math.min(practiceDeck.length - 1, prev + 1))}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Question</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* MODE 3: PRACTICE RESULTS DASHBOARD */}
        {activeMode === 'results' && lastAttempt && (
          <div className="space-y-6 animate-in fade-in">
            {/* Main Score Banner */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 animate-pulse">
                <Award size={40} />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-200">
                  Practice Completed
                </span>
                <h2 className="text-3xl font-black text-slate-900 mt-2">
                  {lastAttempt.scorePercent >= 70 ? 'Excellent Mastery!' : 'Practice Assessment Summary'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  You completed the practice quiz for <strong className="text-slate-800">{lastAttempt.subjectName}</strong> in {formatTime(lastAttempt.timeTakenSeconds)}.
                </p>
              </div>

              {/* 4 Score Metrics Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Final Score</span>
                  <p className={`text-2xl font-black ${lastAttempt.scorePercent >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {lastAttempt.scorePercent}%
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-700">Correct</span>
                  <p className="text-2xl font-black text-emerald-700">
                    {lastAttempt.correctCount} / {lastAttempt.totalQuestions}
                  </p>
                </div>

                <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200/80 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-red-700">Incorrect</span>
                  <p className="text-2xl font-black text-red-700">
                    {lastAttempt.incorrectCount}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-amber-700">Unanswered</span>
                  <p className="text-2xl font-black text-amber-700">
                    {lastAttempt.unansweredCount}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveMode('review')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Eye size={16} />
                  <span>Review Answers & Explanations</span>
                </button>

                <button
                  onClick={handleStartPractice}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>Retry Practice Quiz</span>
                </button>

                <button
                  onClick={() => setActiveMode('learn')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  Back to Learning Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 4: ANSWER REVIEW MODE */}
        {activeMode === 'review' && lastAttempt?.questionReviews && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/80">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Answer Review: {lastAttempt.subjectName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review your selected options alongside the correct answers and clinical rationale.
                </p>
              </div>

              <button
                onClick={() => setActiveMode('results')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back to Results
              </button>
            </div>

            <div className="space-y-6">
              {lastAttempt.questionReviews.map((rev, idx) => (
                <div
                  key={rev.questionId || idx}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-500">
                      Question {idx + 1}
                    </span>

                    {rev.selectedAnswerIndex === null ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200">
                        Unanswered
                      </span>
                    ) : rev.isCorrect ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                        <Check size={12} /> Correct
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200 flex items-center gap-1">
                        <X size={12} /> Incorrect
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed">
                    {rev.text}
                  </p>

                  {/* Options List with selected vs correct */}
                  <div className="grid gap-2 pt-2">
                    {rev.options.map((optText, optIdx) => {
                      const isSelected = rev.selectedAnswerIndex === optIdx;
                      const isCorrect = rev.correctAnswerIndex === optIdx;
                      const optionLetters = ['A', 'B', 'C', 'D', 'E'];

                      let cardStyle = 'bg-slate-50/60 border-slate-200/80 text-slate-700';
                      if (isCorrect) {
                        cardStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                      } else if (isSelected && !isCorrect) {
                        cardStyle = 'bg-red-50 border-red-300 text-red-900 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isSelected
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white text-slate-500 border border-slate-200'
                            }`}>
                              {optionLetters[optIdx] || optIdx + 1}
                            </span>
                            <span>{optText}</span>
                          </div>

                          {isCorrect && (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                              Correct Choice
                            </span>
                          )}

                          {isSelected && !isCorrect && (
                            <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-md shrink-0">
                              Your Choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {rev.explanation && (
                    <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-1 text-xs">
                      <span className="font-extrabold text-blue-900 block">Diagnostic Rationale:</span>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {rev.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CONFIRMATION MODAL: SUBMIT PRACTICE */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center border border-slate-200 z-10 space-y-6"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Submit Practice Quiz?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have answered <strong>{Object.keys(selectedAnswers).length}</strong> of <strong>{practiceDeck.length}</strong> questions.
                  {practiceDeck.length - Object.keys(selectedAnswers).length > 0 && (
                    <span className="block text-amber-600 font-bold mt-1">
                      Note: {practiceDeck.length - Object.keys(selectedAnswers).length} questions are currently unanswered.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Keep Answering
                </button>
                <button
                  onClick={handleFinalSubmitPractice}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Yes, Submit Quiz
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODAL: QUIT PRACTICE */}
      <AnimatePresence>
        {showQuitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuitModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center border border-slate-200 z-10 space-y-6"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
                <AlertTriangle size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Quit Practice Exam?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to exit? Your current selections for this session will be discarded.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuitModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Continue Practice
                </button>
                <button
                  onClick={() => {
                    setShowQuitModal(false);
                    setActiveMode('learn');
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  Yes, Quit Exam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAST ATTEMPTS HISTORY MODAL */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 space-y-6 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  Past Practice Attempts ({pastAttempts.length})
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {pastAttempts.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {new Date(att.completedAt).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Correct: {att.correctCount} / {att.totalQuestions} ({att.unansweredCount} skipped)
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-base font-black ${
                        att.scorePercent >= 70 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {att.scorePercent}%
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Time: {Math.floor(att.timeTakenSeconds / 60)}m {att.timeTakenSeconds % 60}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
