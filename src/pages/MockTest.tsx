import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, FileText, CheckCircle2, Clock, Trophy, RefreshCw, ChevronLeft, ChevronRight, Send, ListChecks, Timer, AlertTriangle, LogOut } from 'lucide-react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { recordMockAttempt } from '../lib/stats';
import QuestionImage from '../components/QuestionImage';

const MockTest = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testState, setTestState] = useState<'intro' | 'active' | 'finished'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setVisitedIndices(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  useEffect(() => {
    const fetchTest = async () => {
      try {
        if (id) {
          const docRef = doc(db, 'mocktests', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTest({ id: docSnap.id, ...data });
            setQuestions(data.questions || []);
            const duration = (data.timeLimit || 30) * 60;
            setTimeLeft(duration);
            setTotalSeconds(duration);

            // Handle direct start if coming from intro page
            if (location.state?.autoStart) {
              setTestState('active');
              setStartTime(Date.now());
              setVisitedIndices(new Set([0]));
            }
          }
        } else {
          // Default test data if no ID
          const defaultQuestions = [
            {
              text: "What is the most common cause of community-acquired pneumonia in adults?",
              options: ["Streptococcus pneumoniae", "Mycoplasma pneumoniae", "Haemophilus influenzae", "Legionella pneumophila"],
              correctAnswer: 0,
              explanation: "Streptococcus pneumoniae remains the most common cause of community-acquired pneumonia across all age groups."
            },
            {
              text: "Which of the following is a first-line treatment for uncomplicated hypertension in a non-black patient under 55?",
              options: ["Beta-blocker", "Calcium channel blocker", "ACE inhibitor", "Thiazide diuretic"],
              correctAnswer: 2,
              explanation: "NICE guidelines recommend ACE inhibitors or ARBs as initial therapy for non-black patients under 55 years old."
            }
          ];
          const duration = 30 * 60;
          setTest({
            title: "Free GP Prometric Mock Test",
            description: "Test your knowledge before the real exam",
            timeLimit: 30,
            passingScore: 60,
            passScore: 60,
            exam: "DHA"
          });
          setQuestions(defaultQuestions);
          setTimeLeft(duration);
          setTotalSeconds(duration);

          if (location.state?.autoStart) {
            setTestState('active');
            setStartTime(Date.now());
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `mocktests/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, location.state]);

  useEffect(() => {
    if (testState !== 'active') return;

    // Push dummy state to capture browser back button attempts
    window.history.pushState({ examActive: true }, '');

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = (e: PopStateEvent) => {
      // Re-push history state so user stays on page and prompt for confirmation
      window.history.pushState({ examActive: true }, '');
      setShowExitConfirm(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [testState]);

  const handleExit = () => {
    setShowExitConfirm(true);
  };
  useEffect(() => {
    let timer: any;
    if (testState === 'active' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testState, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    return `${mins}m ${secs}s`;
  };

  const handleStart = () => {
    if (questions.length === 0) return alert("This test has no questions yet.");
    setTestState('active');
    setStartTime(Date.now());
    setVisitedIndices(new Set([0]));
  };

  const handleAnswer = (optionIndex: number) => {
    setUserAnswers({ ...userAnswers, [currentQuestionIndex]: optionIndex });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    if (startTime) {
      const finishedAt = Date.now();
      setTimeTaken(Math.floor((finishedAt - startTime) / 1000));
    }

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setTestState('finished');

    const answeredCount = Object.keys(userAnswers).length;
    if (user?.uid) {
      recordMockAttempt(user.uid, {
        testId: test?.id || id || 'general-mock',
        testTitle: test?.title || 'GP Prometric Mock Test',
        score: finalScore,
        questionsAttempted: answeredCount,
        totalQuestions: questions.length
      }).catch(err => {
        console.warn('Could not record mock attempt:', err);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-brand-blue">
        <RefreshCw size={40} className="animate-spin mb-4" />
        <p className="font-bold">Syncing Exam Paper...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <h1 className="text-3xl mb-4 font-bold">Paper Missing</h1>
        <p className="text-gray-500 mb-8">We couldn't locate the mock test you requested.</p>
        <Link to="/" className="btn-primary px-8 py-3">Return to Hub</Link>
      </div>
    );
  }

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {testState === 'intro' && (
          <div className="pt-12 pb-20 max-w-[1500px] mx-auto px-4">
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 max-w-[1500px] mx-auto"
            >
              <button 
                onClick={() => navigate(-1)} 
                className="inline-flex items-center gap-2 text-brand-blue font-bold mb-8 hover:underline"
              >
                <ArrowLeft size={20} />
                Back to Last Page
              </button>
              
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">{test.title}</h1>
                    <p className="text-gray-500">{test.description}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-gray-50 p-6 rounded-3xl text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Questions</p>
                    <p className="text-2xl font-bold">{questions.length} Items</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Time Limit</p>
                    <p className="text-2xl font-bold">{test.timeLimit} Minutes</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Passing Score</p>
                    <p className="text-2xl font-bold">{test.passingScore ?? test.passScore ?? 60}%</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-12">
                  <h3 className="text-xl font-bold">Instructions:</h3>
                  {[
                    "Each question has only one correct answer.",
                    "You can navigate through questions using previous/next buttons.",
                    "The timer starts as soon as you click 'Start Test'.",
                    "Results will be displayed immediately after submission."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-500 mt-1 flex-shrink-0" size={18} />
                      <p className="text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
                
                <button onClick={handleStart} className="btn-primary w-full py-5 text-xl">
                  START TEST NOW
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {testState === 'active' && (
          <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Top Bar Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-brand-dark text-white shadow-xl px-4 py-3 md:py-4">
              <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex w-10 h-10 bg-white/10 rounded-xl items-center justify-center text-brand-blue">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h1 className="text-sm md:text-base font-bold truncate max-w-[150px] md:max-w-xs">{test.title}</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{test.exam} Licensing Exam</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-2 text-gray-400 mb-0.5">
                        <ListChecks size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Progress</span>
                      </div>
                      <p className="text-sm font-bold">{answeredCount} <span className="text-gray-500 font-normal">/ {questions.length}</span></p>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 md:px-6 py-2 rounded-2xl">
                    <Timer className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-400'} size={18} />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter leading-none mb-1">Time Remaining</p>
                      <p className={`font-mono text-lg md:text-xl font-bold leading-none ${timeLeft < 60 ? 'text-red-500' : ''}`}>
                        {formatTime(timeLeft)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleExit} 
                      className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
                    >
                      <LogOut size={14} />
                      Quit Exam
                    </button>
                    <button onClick={handleSubmit} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 md:px-8 py-2 md:py-2.5 rounded-xl font-bold transition-all text-sm shadow-lg shadow-green-500/20">
                      Finish
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-grow pt-24 md:pt-28 pb-12 px-4 md:px-8">
              <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Sidebar: Question Navigation */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-dark/5 border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-brand-dark flex items-center gap-2">
                        <ListChecks size={18} className="text-brand-blue" />
                        Question Paper
                      </h3>
                      <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-md font-bold text-gray-400">
                        {questions.length} TOTAL
                      </span>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {questions.map((_, idx) => {
                        const isAnswered = userAnswers[idx] !== undefined;
                        const isVisited = visitedIndices.has(idx);
                        const isActive = currentQuestionIndex === idx;
                        const isSkipped = isVisited && !isAnswered && !isActive;

                        let statusColor = "bg-white text-gray-400 border-gray-100 hover:border-brand-blue/30";
                        if (isActive) statusColor = "bg-brand-blue text-white ring-4 ring-brand-blue/20 border-brand-blue";
                        else if (isAnswered) statusColor = "bg-green-500 text-white border-green-500";
                        else if (isSkipped) statusColor = "bg-orange-500 text-white border-orange-500";
                        else if (isVisited) statusColor = "bg-blue-50 text-brand-blue border-brand-blue/20";

                        return (
                          <button
                            key={idx}
                            onClick={() => navigateToQuestion(idx)}
                            className={`w-full aspect-square rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center ${statusColor} ${!isActive && 'hover:scale-105'}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Answered</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Skipped</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-gray-200"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Unseen</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-blue/5 rounded-[32px] p-6 border border-brand-blue/10">
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-2">Pro Tip</p>
                    <p className="text-xs text-blue-900/60 leading-relaxed font-medium">
                      You can click any question number to jump directly to it. Answered questions will turn green.
                    </p>
                  </div>
                </div>

                {/* Right Area: Question & Options */}
                <div className="lg:col-span-9 space-y-6">
                  <motion.div
                    key={`header-${currentQuestionIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl shadow-brand-dark/5 border border-gray-100"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-bold uppercase tracking-widest">
                        Case Question #{currentQuestionIndex + 1}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-3xl font-bold text-brand-dark leading-tight md:leading-snug">
                      {questions[currentQuestionIndex].text}
                    </h2>

                    {questions[currentQuestionIndex].imageUrl && (
                      <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center">
                        <QuestionImage 
                          imageUrl={questions[currentQuestionIndex].imageUrl}
                          altText={`Question ${currentQuestionIndex + 1} clinical media`}
                          className="max-h-72 w-auto rounded-2xl"
                        />
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    key={`options-${currentQuestionIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl shadow-brand-dark/5 border border-gray-100"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Select the correct option</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {questions[currentQuestionIndex].options.map((option: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(i)}
                          className={`w-full text-left px-6 md:px-8 py-5 md:py-6 rounded-2xl border-2 transition-all flex items-center gap-4 group ${userAnswers[currentQuestionIndex] === i ? 'border-brand-blue bg-blue-50 shadow-lg shadow-brand-blue/10' : 'border-gray-50 hover:border-brand-blue/30 bg-gray-50/20 hover:bg-white'}`}
                        >
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all ${userAnswers[currentQuestionIndex] === i ? 'bg-brand-blue text-white' : 'bg-white text-gray-400 border border-gray-100 group-hover:bg-brand-blue/10 group-hover:text-brand-blue group-hover:border-brand-blue/20'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className={`text-base md:text-lg font-medium transition-colors ${userAnswers[currentQuestionIndex] === i ? 'text-brand-dark' : 'text-gray-600'}`}>{option}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-12 flex justify-between items-center pt-8 border-t border-gray-50">
                      <button 
                        disabled={currentQuestionIndex === 0}
                        onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                        className="px-6 py-4 rounded-2xl font-bold bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        <ChevronLeft size={20} />
                        Previous
                      </button>

                      <div className="flex gap-4">
                        {currentQuestionIndex === questions.length - 1 ? (
                          <button onClick={handleSubmit} className="btn-primary px-12 py-4 flex items-center gap-2 group">
                            Final Submit
                            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                            className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-brand-blue/30 transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20"
                          >
                            Next Question
                            <ChevronRight size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        )}

        {testState === 'finished' && (
          <div className="pt-12 pb-20 max-w-[1500px] mx-auto px-4">
            <motion.div 
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-center"
            >
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-gray-100 mx-auto">
                {(() => {
                  const requiredPassScore = test.passingScore !== undefined ? test.passingScore : (test.passScore !== undefined ? test.passScore : 60);
                  const isPassed = score >= requiredPassScore;
                  return (
                    <>
                      <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-8 ${isPassed ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                        {isPassed ? <Trophy size={48} /> : <RefreshCw size={48} />}
                      </div>
                      
                      <h2 className="text-4xl font-bold mb-2">{isPassed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
                      <p className="text-gray-500 mb-8 text-lg">You scored <span className="font-bold text-brand-dark">{score}%</span> in the {test.title}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        <div className="bg-gray-50 p-6 rounded-3xl md:col-span-1">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Result</p>
                          <p className={`text-xl font-bold ${isPassed ? 'text-green-500' : 'text-red-500'}`}>{isPassed ? 'PASSED' : 'FAILED'}</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl md:col-span-1">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Pass Mark</p>
                          <p className="text-xl font-bold">{requiredPassScore}%</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl md:col-span-1">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Time Taken</p>
                          <p className="text-xl font-bold">{formatDuration(timeTaken)}</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl md:col-span-1">
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Accuracy</p>
                          <p className="text-xl font-bold">{Math.round((Object.keys(userAnswers).length / questions.length) * 100)}%</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
                
                <div className="flex flex-col md:flex-row gap-4 mb-16">
                  <button onClick={() => {
                    setTestState('intro');
                    setCurrentQuestionIndex(0);
                    setUserAnswers({});
                    setTimeLeft(totalSeconds);
                  }} className="btn-primary flex-1 py-5 text-xl">
                    TRY AGAIN
                  </button>
                  <Link to="/" className="flex-1 py-5 border-2 border-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                    Back to Hub
                  </Link>
                </div>

                {/* Question Review Section */}
                <div className="mt-12 pt-12 border-t border-gray-100 text-left">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
                    <h3 className="text-2xl font-bold">Answer Breakdown</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm shadow-green-500/20"></div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Correct</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-500/20"></div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Incorrect</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm shadow-orange-500/20"></div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Skipped</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {questions.map((q, i) => {
                      const userChoice = userAnswers[i];
                      const isSkipped = userChoice === undefined;
                      const isCorrect = !isSkipped && userChoice === q.correctAnswer;
                      
                      let statusBg = 'bg-red-500 shadow-red-500/30';
                      let statusLabel = 'Incorrect';
                      if (isCorrect) {
                        statusBg = 'bg-green-500 shadow-green-500/30';
                        statusLabel = 'Correct';
                      } else if (isSkipped) {
                        statusBg = 'bg-orange-500 shadow-orange-500/30';
                        statusLabel = 'Skipped';
                      }
                      
                      return (
                        <div key={i} className="bg-white rounded-[32px] p-6 md:p-10 border border-gray-100 shadow-xl shadow-brand-dark/5 overflow-hidden relative">
                          <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-bold text-[10px] uppercase tracking-[0.2em] text-white shadow-lg ${statusBg}`}>
                            {statusLabel}
                          </div>

                          <div className="flex gap-4 mb-6">
                            <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0 text-lg shadow-lg ${statusBg}`}>
                              {i + 1}
                            </span>
                            <div className="space-y-3 flex-1 min-w-0">
                              <p className="font-bold text-lg md:text-2xl text-brand-dark leading-tight pt-1">{q.text}</p>
                              {q.imageUrl && (
                                <div className="max-w-md pt-2">
                                  <QuestionImage 
                                    imageUrl={q.imageUrl}
                                    altText={`Question ${i + 1} reference visual`}
                                    className="max-h-60 rounded-2xl"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-10 pl-0 md:pl-14">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isChoiceCorrect = optIdx === q.correctAnswer;
                              const isUserSelected = userChoice === optIdx;
                              
                              let borderClass = 'border-gray-50 bg-gray-50/30';
                              let iconClass = 'bg-white text-gray-300 border-gray-100';
                              let textClass = 'text-gray-500';
                              
                              if (isChoiceCorrect) {
                                borderClass = 'border-green-500 bg-green-50 shadow-lg shadow-green-500/10 ring-2 ring-green-500/10';
                                iconClass = 'bg-green-500 text-white border-green-500';
                                textClass = 'text-brand-dark font-bold';
                              } else if (isUserSelected && !isCorrect) {
                                borderClass = 'border-red-500 bg-red-50 shadow-lg shadow-red-500/10 ring-2 ring-red-500/10';
                                iconClass = 'bg-red-500 text-white border-red-500';
                                textClass = 'text-red-900 font-medium';
                              }

                              return (
                                <div 
                                  key={optIdx} 
                                  className={`px-6 py-4 md:py-5 rounded-2xl border-2 text-base md:text-lg flex items-center gap-4 transition-all ${borderClass}`}
                                >
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border transition-all ${iconClass}`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className={textClass}>
                                    {opt}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-brand-blue/5 p-6 md:p-10 rounded-[32px] border border-brand-blue/10 ml-0 md:ml-14 relative overflow-hidden group hover:bg-brand-blue/[0.08] transition-colors">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/5 rounded-full transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                              <p className="text-[11px] font-bold text-brand-blue uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                <div className="p-1.5 bg-brand-blue rounded-lg text-white shadow-lg shadow-brand-blue/20">
                                  <FileText size={14} />
                                </div>
                                Educational Insight
                              </p>
                              <p className="text-blue-900/80 text-base md:text-lg leading-relaxed font-medium">
                                {q.explanation || "No detailed explanation available for this question. Our medical experts are currently updating the rationale for this topic. Please consult standard guidelines."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Exit Confirmation Dialogue */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              id="exit-modal-backdrop"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl overflow-hidden z-10 text-center border border-gray-100"
              id="exit-modal-card"
            >
              {/* Decorative Warning Sign */}
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6" id="exit-modal-warning-icon">
                <AlertTriangle size={32} />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2" id="exit-modal-title">
                Quit Exam Session?
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-500 mb-8 leading-relaxed" id="exit-modal-message">
                Are you sure you want to quit the exam? Your active progress will be lost and your exam session will be terminated.
              </p>

              {/* Controls */}
              <div className="flex gap-4">
                <button
                  id="exit-modal-cancel-btn"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
                >
                  Continue Exam
                </button>
                <button
                  id="exit-modal-confirm-btn"
                  onClick={() => {
                    setShowExitConfirm(false);
                    setTestState('intro');
                    navigate('/mock-tests');
                  }}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 transition-all text-center flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <LogOut size={16} />
                  Yes, Quit Exam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GraduationCap = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

export default MockTest;


