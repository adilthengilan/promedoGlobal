import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Star, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  PlayCircle, 
  Megaphone, 
  Zap,
  Filter,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DEFAULT_LMS_CATALOG: any[] = [];

const Courses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<string[]>([]);
  const [activeAd, setActiveAd] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch courses from Firestore
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const fetchedCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(fetchedCourses);

        // Fetch Ads
        const adsSnap = await getDocs(query(collection(db, 'ads'), where('active', '==', true)));
        if (!adsSnap.empty) {
          setActiveAd({ id: adsSnap.docs[0].id, ...adsSnap.docs[0].data() });
        }

        // Check user enrollments
        if (user) {
          const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('userId', '==', user.uid)));
          setUserEnrollments(enrollSnap.docs.map(doc => doc.data().courseId));
        }
      } catch (err) {
        console.error("Error fetching courses page data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const authorities = ['ALL', 'DHA', 'HAAD', 'MOH', 'SMLE', 'OMSB'];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      (course.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.category?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.description?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAuth = 
      selectedAuthority === 'ALL' || 
      course.authority?.toUpperCase().includes(selectedAuthority) ||
      course.category?.toUpperCase().includes(selectedAuthority);

    return matchesSearch && matchesAuth;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-24">
      {/* Top Hero Banner */}
      <div className="bg-brand-blue text-white pt-12 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Active Promo Ad Banner if available */}
          {activeAd && (
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Megaphone size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-400 text-[#0B1C30] font-black text-[10px] rounded uppercase">
                      {activeAd.badge || 'Offer'}
                    </span>
                    <h4 className="font-extrabold text-sm text-white">{activeAd.title}</h4>
                  </div>
                  <p className="text-xs text-blue-100 font-medium">{activeAd.description}</p>
                </div>
              </div>
              <Link
                to={activeAd.link || '/courses'}
                className="px-5 py-2 bg-white text-brand-dark font-extrabold text-xs rounded-xl hover:bg-brand-periwinkle transition-all shrink-0 cursor-pointer shadow-md"
              >
                {activeAd.ctaText || 'Claim Offer'}
              </Link>
            </div>
          )}

          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md text-white font-extrabold text-xs rounded-full border border-white/20">
              <Sparkles size={14} className="text-amber-300" />
              Comprehensive GCC Prometric Programs
            </span>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight leading-tight">
              Medical Licensing Exam Courses
            </h1>
            <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed max-w-2xl">
              Master high-yield clinical scenarios, guidelines, and authentic recall questions with expert-led video lectures, curated study materials, and mock exam simulations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-[#E5EEFF] mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search courses, authorities, or topics..."
                className="w-full pl-11 pr-4 py-3 bg-[#F8FAFF] border border-[#E5EEFF] rounded-2xl text-xs sm:text-sm font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4] transition-all"
              />
            </div>

            {/* Authority Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
              {authorities.map(auth => (
                <button
                  key={auth}
                  onClick={() => setSelectedAuthority(auth)}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap cursor-pointer ${
                    selectedAuthority === auth
                      ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/25'
                      : 'bg-[#F8FAFF] text-gray-600 hover:bg-[#E5EEFF]/80 border border-[#E5EEFF]'
                  }`}
                >
                  {auth === 'ALL' ? 'All Authorities' : auth}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => {
            const isEnrolled = userEnrollments.includes(course.id);

            return (
              <motion.div
                key={course.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-[#E5EEFF] overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#3853A4]/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Media Banner */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                    <img
                      src={course.image || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <span className="absolute top-4 right-4 px-3 py-1 bg-[#131B2E]/90 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl border border-white/20">
                      {course.tag || 'Prometric'}
                    </span>

                    <div className="absolute bottom-3 left-4 flex items-center gap-3 text-white text-xs font-bold">
                      <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        <Clock size={12} />
                        {course.hours || '35 Hours'}
                      </span>
                      <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        <PlayCircle size={12} />
                        {course.videos || 40} Lessons
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#3853A4] uppercase tracking-wider">
                        {course.category || 'Dubai Health Authority'}
                      </span>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={13} fill="currentColor" />
                        <span className="text-xs font-black text-[#0B1C30]">{course.rating || 4.9}</span>
                        <span className="text-[10px] text-gray-400">({course.reviews || 120})</span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-[#0B1C30] text-base leading-snug line-clamp-2 group-hover:text-[#3853A4] transition-colors">
                      {course.title}
                    </h3>

                    <p className="text-xs text-[#45464D] line-clamp-2 leading-relaxed font-medium">
                      {course.description}
                    </p>

                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                      <span className="px-2 py-1 bg-[#F8FAFF] rounded-lg border border-[#E5EEFF] flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        Recall Question Banks
                      </span>
                      <span className="px-2 py-1 bg-[#F8FAFF] rounded-lg border border-[#E5EEFF] flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        Mock Simulators
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer & Action */}
                <div className="p-6 pt-0 space-y-3">
                  <div className="flex items-end justify-between border-t border-[#E5EEFF] pt-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-0.5">Course Fee</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#0B1C30]">${course.price}</span>
                        {course.originalPrice && (
                          <span className="text-xs text-gray-400 line-through font-bold">${course.originalPrice}</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/course/${course.id}`}
                      className="text-xs font-black text-[#3853A4] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Details & Syllabus <ArrowRight size={13} />
                    </Link>
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => navigate(`/player/${course.id}`)}
                      className="w-full py-3.5 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                      <span>Enrolled • Launch LMS Classroom</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/checkout/${course.id}`)}
                        className="w-full py-3 rounded-2xl bg-[#3853A4] text-white font-black text-xs hover:bg-[#2F4487] transition-all shadow-md shadow-[#3853A4]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Enroll Now</span>
                      </button>
                      <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="w-full py-3 rounded-2xl bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#3853A4] font-black text-xs transition-all border border-[#E5EEFF] cursor-pointer text-center"
                      >
                        View Syllabus
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E5EEFF] p-8">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-black text-[#0B1C30] mb-2">
              {courses.length === 0 ? 'No courses currently published' : 'No courses match your filter'}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              {courses.length === 0 
                ? 'There are currently no active courses published in the catalog. Check back soon or contact administration.' 
                : 'Try searching for a different health authority or medical keyword.'}
            </p>
            {courses.length > 0 && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedAuthority('ALL'); }}
                className="px-6 py-2.5 bg-[#3853A4] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#2F4487] transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
