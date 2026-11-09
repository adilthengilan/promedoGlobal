import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  PlayCircle, 
  CheckCircle2, 
  ArrowLeft, 
  BookOpen, 
  Download, 
  FileText, 
  Award, 
  ChevronRight, 
  Menu, 
  X,
  Volume2,
  Settings,
  HelpCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CourseProgressBar from '../components/CourseProgressBar';

const CoursePlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'recalls' | 'discussion'>('notes');

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        if (!id) return;
        const docRef = doc(db, 'courses', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const cData = { id: docSnap.id, ...docSnap.data() };
          setCourse(cData);
          const cModules = Array.isArray((cData as any).modules) ? (cData as any).modules : [];
          setModules(cModules);
          const all = cModules.flatMap((m: any) => m.lessons || []);
          if (all.length > 0) {
            setCurrentLesson(all[0]);
          }
        } else {
          setCourse(null);
          setModules([]);
        }
      } catch (err) {
        console.error("Error fetching course player data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id]);

  const allLessons = modules.flatMap(m => m.lessons || []);
  const progressPercent = allLessons.length > 0 ? Math.round((completedLessonIds.length / allLessons.length) * 100) : 0;

  const toggleLessonCompleted = async (lessonId: string) => {
    setCompletedLessonIds(prev => {
      const next = prev.includes(lessonId) 
        ? prev.filter(x => x !== lessonId) 
        : [...prev, lessonId];
      
      // Update in Firestore if user is authenticated
      if (user && id) {
        const enrollmentRef = doc(db, 'enrollments', `${user.uid}_${id}`);
        setDoc(enrollmentRef, {
          progress: Math.round((next.length / allLessons.length) * 100),
          completedLessons: next.length,
          lastLessonId: lessonId,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error(err));
      }
      return next;
    });
  };

  const handleNextLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex > 0) {
      setCurrentLesson(allLessons[currentIndex - 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1C30] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3853A4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course || allLessons.length === 0 || !currentLesson) {
    return (
      <div className="min-h-screen bg-[#0B1C30] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 text-[#3853A4]">
          <PlayCircle size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">No Video Lectures Available</h2>
        <p className="text-xs text-gray-400 max-w-md mb-6">
          {!course ? 'The requested course does not exist.' : 'Video lectures for this track are currently being recorded by Promedo Global faculty.'}
        </p>
        <button
          onClick={() => navigate('/courses')}
          className="px-6 py-2.5 bg-[#3853A4] hover:bg-[#2F4487] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Browse All Courses
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1C30] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-[#0E223D] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Candidate Portal</span>
          </button>

          <div className="hidden sm:block border-l border-white/10 pl-4">
            <h1 className="text-xs font-black text-white line-clamp-1 max-w-md">
              {course?.title || 'Prometric GP Preparation'}
            </h1>
            <p className="text-[10px] text-gray-400 font-semibold">{currentLesson.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Award size={14} className="text-amber-400" />
            <span className="text-[11px] font-bold text-gray-300">Progress: {progressPercent}%</span>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-[#3853A4] text-white hover:bg-[#2F4487] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="hidden sm:inline">{sidebarOpen ? 'Hide Curriculum' : 'Show Curriculum'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left / Center Video Stage */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#071322]">
          
          {/* 16:9 Video Canvas */}
          <div className="relative aspect-video max-h-[65vh] w-full bg-black flex items-center justify-center">
            <video
              key={currentLesson.videoUrl}
              src={currentLesson.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          {/* Video Controls / Status Bar */}
          <div className="p-4 sm:p-6 bg-[#0E223D] border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 bg-[#3853A4] text-white font-black text-[9px] uppercase tracking-wider rounded">
                Active Lesson
              </span>
              <h2 className="text-base sm:text-lg font-black text-white mt-1">
                {currentLesson.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => toggleLessonCompleted(currentLesson.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  completedLessonIds.includes(currentLesson.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>{completedLessonIds.includes(currentLesson.id) ? 'Completed' : 'Mark Complete'}</span>
              </button>

              <button
                onClick={handlePrevLesson}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-bold"
                title="Previous Lesson"
              >
                Prev
              </button>

              <button
                onClick={handleNextLesson}
                className="px-4 py-2.5 rounded-xl bg-[#3853A4] hover:bg-[#2F4487] text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Lower Panel: Notes, Recall Cheat-Sheets & Discussion */}
          <div className="p-6 max-w-5xl space-y-6">
            <div className="flex gap-4 border-b border-white/10 pb-3">
              {[
                { id: 'notes', label: 'Clinical Study Notes & Transcripts' },
                { id: 'recalls', label: 'Downloadable PDF Handouts' },
                { id: 'discussion', label: 'Faculty Q&A' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-xs font-bold pb-2 transition-all cursor-pointer ${
                    activeTab === tab.id ? 'text-white border-b-2 border-[#3853A4]' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'notes' && (
              <div className="space-y-4 text-xs text-gray-300 leading-relaxed bg-[#0E223D] p-6 rounded-2xl border border-white/10">
                <h4 className="font-extrabold text-sm text-white">Clinical High-Yield Summary: {currentLesson.title}</h4>
                <p>
                  1. Diagnostic Triad: Immediate electrocardiogram evaluation within 10 minutes of presentation.
                  Always verify ST segment elevation in contiguous leads (II, III, aVF for inferior infarction).
                </p>
                <p>
                  2. Pharmacotherapy: Dual antiplatelet therapy (Aspirin 300mg chewable + Clopidogrel 300/600mg or Ticagrelor) prior to catheterization lab transfer.
                </p>
                <p>
                  3. Examination Traps: Be vigilant for right ventricular infarction (hypotension with clear lungs and elevated JVP) where nitrates are strictly contraindicated.
                </p>
              </div>
            )}

            {activeTab === 'recalls' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: 'Cardiology_Clinical_Recalls_2026.pdf', size: '2.4 MB' },
                  { name: 'ECG_Diagnostic_Algorithms_CheatSheet.pdf', size: '1.8 MB' }
                ].map((docItem, idx) => (
                  <div key={idx} className="p-4 bg-[#0E223D] rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-[#3853A4]" size={20} />
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{docItem.name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">{docItem.size}</p>
                      </div>
                    </div>
                    <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer">
                      <Download size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'discussion' && (
              <div className="bg-[#0E223D] p-6 rounded-2xl border border-white/10 text-center py-10">
                <HelpCircle size={32} className="mx-auto text-gray-400 mb-3" />
                <h5 className="font-bold text-sm text-white mb-1">Have questions about this case scenario?</h5>
                <p className="text-xs text-gray-400 mb-4">Post your clinical question and our consultant specialist team will respond within 24 hours.</p>
                <button className="px-5 py-2.5 bg-[#3853A4] text-white text-xs font-bold rounded-xl hover:bg-[#2F4487] transition-all">
                  Post New Question
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar Curriculum Playlist */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="w-full lg:w-80 bg-[#0E223D] border-l border-white/10 flex flex-col h-full shrink-0"
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="font-black text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Course Modules & Lessons
                </h3>
                <CourseProgressBar 
                  progress={progressPercent} 
                  totalLessons={allLessons.length}
                  completedLessons={completedLessonIds.length}
                  compact
                  className="bg-transparent"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {modules.map((module: any, mIdx: number) => (
                  <div key={module.moduleId || mIdx} className="space-y-1.5">
                    <h4 className="text-[11px] font-black text-gray-400 px-2 uppercase tracking-wide">
                      {module.moduleTitle || module.title || `Module ${mIdx + 1}`}
                    </h4>

                    {(module.lessons || []).map((lesson: any) => {
                      const isCurrent = currentLesson.id === lesson.id;
                      const isDone = completedLessonIds.includes(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setCurrentLesson(lesson)}
                          className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3853A4] text-white shadow-md'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 line-clamp-1 pr-2">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLessonCompleted(lesson.id);
                              }}
                              className={`cursor-pointer ${isDone ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                            >
                              <CheckCircle2 size={15} />
                            </span>
                            <span className="font-bold text-[11px] line-clamp-1">{lesson.title}</span>
                          </div>

                          <span className="text-[10px] text-gray-400 shrink-0 font-medium">{lesson.duration}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default CoursePlayer;
