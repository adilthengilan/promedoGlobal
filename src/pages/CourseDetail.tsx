import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  PlayCircle, 
  Clock, 
  BookOpen, 
  Star, 
  CheckCircle2, 
  Award, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  ChevronRight,
  ArrowLeft,
  Lock,
  Share2,
  Calendar,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_LMS_CATALOG } from './Courses';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'overview' | 'faqs'>('syllabus');

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        if (!id) return;

        // Try fetching from Firestore
        const docRef = doc(db, 'courses', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() });
        } else {
          setCourse(null);
        }

        // Check if user is enrolled
        if (user && id) {
          const q = query(
            collection(db, 'enrollments'), 
            where('userId', '==', user.uid), 
            where('courseId', '==', id)
          );
          const enrollSnap = await getDocs(q);
          setIsEnrolled(!enrollSnap.empty);
        }
      } catch (err) {
        console.error("Error fetching course detail:", err);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3853A4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-gray-500">Loading course curriculum...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] pt-32 text-center px-4">
        <h2 className="text-2xl font-black text-[#0B1C30] mb-3">Course Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">The requested Prometric preparation track could not be loaded.</p>
        <Link to="/courses" className="px-6 py-3 bg-[#3853A4] text-white text-xs font-bold rounded-xl">
          Browse All Courses
        </Link>
      </div>
    );
  }

  const courseModules = Array.isArray(course?.modules) ? course.modules : [];


  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-24">
      {/* Top Breadcrumb & Hero */}
      <div className="bg-[#0B1C30] text-white pt-8 pb-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <button 
            onClick={() => navigate('/courses')}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white mb-6 cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Courses
          </button>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-[#3853A4] text-white font-black text-[10px] uppercase tracking-wider rounded-lg">
                  {course.category || 'General Practitioner Prometric'}
                </span>
                <span className="px-3 py-1 bg-white/10 text-gray-300 font-black text-[10px] uppercase tracking-wider rounded-lg border border-white/10">
                  {course.tag || 'Updated 2026'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-sm text-gray-300 leading-relaxed max-w-2xl font-normal">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-gray-300">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star size={16} fill="currentColor" />
                  <span className="text-white font-black">{course.rating || 4.9}</span>
                  <span className="text-gray-400">({course.reviews || 120} candidate reviews)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-[#3853A4]" />
                  <span>{course.hours || '38h 45m'} Course Duration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen size={16} className="text-[#3853A4]" />
                  <span>{course.videos || 42} High-Yield Lessons</span>
                </div>
              </div>
            </div>

            {/* Quick Sticky Preview / Enrollment CTA on Desktop */}
            <div className="lg:col-span-4">
              <div className="bg-white text-[#0B1C30] rounded-3xl p-6 shadow-2xl border border-[#E5EEFF] space-y-6">
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 group">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#0B1C30]/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white text-[#3853A4] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <PlayCircle size={28} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-[#0B1C30]">${course.price}</span>
                    {course.originalPrice && (
                      <span className="text-sm text-gray-400 line-through font-bold">${course.originalPrice}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-bold">✓ Full Lifetime Access • Free Updates Included</p>
                </div>

                <div className="space-y-2.5">
                  {isEnrolled ? (
                    <button
                      onClick={() => navigate(`/player/${course.id}`)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={18} />
                      <span>Resume Course Player</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/checkout/${course.id}`)}
                      className="w-full py-4 rounded-2xl bg-[#3853A4] text-white font-extrabold text-sm hover:bg-[#2F4487] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#3853A4]/30"
                    >
                      <span>Enroll Now (${course.price})</span>
                    </button>
                  )}

                  <Link
                    to="/mocktests"
                    className="w-full py-3 rounded-2xl bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#3853A4] font-bold text-xs transition-all flex items-center justify-center gap-2 text-center"
                  >
                    <span>Practice Corresponding Mock Test</span>
                  </Link>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-500 font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Prometric CBT Aligned</span>
                    <span className="font-bold text-[#0B1C30]">Yes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><FileText size={14} className="text-[#3853A4]" /> Downloadable Recall PDFs</span>
                    <span className="font-bold text-[#0B1C30]">Included</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Award size={14} className="text-amber-500" /> Certificate of Completion</span>
                    <span className="font-bold text-[#0B1C30]">Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Details & Curriculum Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-8 space-y-8">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-[#E5EEFF] pb-3">
              {[
                { id: 'syllabus', label: 'Course Syllabus' },
                { id: 'overview', label: 'What You Will Learn' },
                { id: 'faqs', label: 'Exam FAQs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 font-extrabold text-sm transition-all cursor-pointer relative ${
                    activeTab === tab.id ? 'text-[#3853A4]' : 'text-gray-400 hover:text-[#0B1C30]'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="courseTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3853A4]" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab 1: Syllabus Modules */}
            {activeTab === 'syllabus' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-xl text-[#0B1C30]">Curriculum Modules</h3>
                  <span className="text-xs font-bold text-gray-500">{courseModules.length} Modules</span>
                </div>

                {courseModules.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E5EEFF] p-8 text-center text-[#45464D]">
                    <BookOpen size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold text-[#0B1C30] mb-1">No Curriculum Modules Uploaded Yet</p>
                    <p className="text-xs text-gray-500">Video lectures and modules for this track are currently being prepared by faculty.</p>
                  </div>
                ) : (
                  courseModules.map((module: any, mIdx: number) => (
                    <div key={mIdx} className="bg-white rounded-2xl border border-[#E5EEFF] p-5 shadow-xs">
                      <h4 className="font-extrabold text-sm text-[#0B1C30] mb-4 flex items-center justify-between">
                        <span>{module.title}</span>
                        <span className="text-[11px] text-gray-400 font-semibold">{(module.lessons || []).length} Lessons</span>
                      </h4>

                      <div className="space-y-2.5">
                        {(module.lessons || []).map((lesson: any, lIdx: number) => (
                          <div 
                            key={lIdx}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFF] border border-[#E5EEFF]/60 hover:border-[#3853A4]/30 transition-all text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <PlayCircle size={16} className={lesson.isFree ? 'text-[#3853A4]' : 'text-gray-400'} />
                              <span className="font-bold text-[#0B1C30]">{lesson.title}</span>
                              {lesson.isFree && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-black text-[9px] rounded uppercase">
                                  Free Preview
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-gray-400 font-semibold">
                              <span>{lesson.duration || ''}</span>
                              {!lesson.isFree && !isEnrolled && <Lock size={12} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Overview */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-3xl border border-[#E5EEFF] p-8 shadow-xs space-y-6">
                <h3 className="font-black text-xl text-[#0B1C30]">Learning Outcomes & High-Yield Blueprint</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Complete mastery of DHA, HAAD, MOH & SMLE blueprint guidelines.',
                    'Clinical scenario case questions with diagnostic reasoning rationales.',
                    'High-yield recall questions from 2024 to 2026 examination cycles.',
                    'Evidence-based pharmacological management and drug dosing pearls.',
                    'Strategy and speed tactics for computer-based testing (CBT).',
                    'Direct access to downloadable PDF summary handouts and cheat-sheets.'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-[#0B1C30] font-semibold">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: FAQs */}
            {activeTab === 'faqs' && (
              <div className="bg-white rounded-3xl border border-[#E5EEFF] p-8 shadow-xs space-y-4">
                <h3 className="font-black text-xl text-[#0B1C30] mb-6">Frequently Asked Questions</h3>
                {[
                  {
                    q: 'How long do I have access to the video lectures and notes?',
                    a: 'Enrollment grants you 12 months of unlimited access, including any updated video lessons or recall questions added during your access window.'
                  },
                  {
                    q: 'Are the mock tests included with this course?',
                    a: 'Yes! All candidates enrolled in our full preparation course receive full access to our authentic Prometric CBT Mock Exam Simulators.'
                  },
                  {
                    q: 'Can I study on mobile devices?',
                    a: 'Yes, our LMS player and mock simulators are fully responsive and work seamlessly on mobile phones, tablets, and laptops.'
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF]">
                    <h5 className="font-extrabold text-xs text-[#0B1C30] mb-1.5">{faq.q}</h5>
                    <p className="text-xs text-gray-500 leading-relaxed font-normal">{faq.a}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
