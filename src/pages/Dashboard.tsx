import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getUserStats, getUserAttempts, INITIAL_USER_STATS, UserStats, MockAttemptRecord } from '../lib/stats';
import { 
  BookOpen, 
  Award, 
  PlayCircle, 
  LogOut, 
  Search, 
  Sparkles, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Star, 
  Video, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  HelpCircle,
  FileText,
  Lock,
  Flame,
  BarChart3,
  Download,
  BrainCircuit,
  CheckSquare,
  ChevronRight,
  Calendar,
  Activity,
  Check,
  XCircle,
  Plus,
  ShieldAlert,
  User,
  Settings,
  Grid,
  Compass,
  MessageCircle,
  Phone,
  Mail,
  Camera,
  Upload,
  Trash2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Edit2,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import CourseProgressBar from '../components/CourseProgressBar';
import QuestionBankSection from '../components/QuestionBankSection';
import ImageBankSection from '../components/ImageBankSection';
import { DEFAULT_LMS_CATALOG } from './Courses';
import { usePortalSections } from '../lib/portalSections';
import { EditProfileModal } from '../components/EditProfileModal';
import { UserProfileData, isProfileIncomplete, calculateProfileCompletion } from '../lib/userProfileService';
import { PremiumUpgradeScreen } from '../components/PremiumUpgradeScreen';

const DEFAULT_MOCK_TESTS: any[] = [];
const STUDY_MATERIALS: any[] = [];


const Dashboard = () => {
  const { user, userName, userPhone, isAdmin, isStudent, isPaid, role, logout } = useAuth();
  const navigate = useNavigate();
  
  const [candidateName, setCandidateName] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_USER_STATS);
  const [userAttempts, setUserAttempts] = useState<MockAttemptRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'overview' | 'qbank' | 'imagebank' | 'learning' | 'catalog' | 'mocktests' | 'analytics' | 'materials'>('overview');
  const [availableMocktests, setAvailableMocktests] = useState<any[]>([]);
  const { activeSections: activeSimulatorSections } = usePortalSections('mocktests');

  const [selectedPaidTestForUpgrade, setSelectedPaidTestForUpgrade] = useState<any | null>(null);

  const rawMocktests = availableMocktests.length > 0
    ? availableMocktests
    : activeSimulatorSections.map(sec => ({
        id: sec.metadata?.examSlug || sec.id,
        title: sec.name,
        exam: sec.metadata?.authority || sec.name,
        questions: sec.itemCount || 150,
        timeLimit: sec.metadata?.timeLimit || 180,
        passingScore: sec.metadata?.passingScore || 60,
        passScore: sec.metadata?.passingScore || 60,
        category: sec.badgeText || (sec.metadata?.authority?.split(' ')[0] || 'Prometric'),
        difficulty: sec.metadata?.difficulty || 'Exam Grade',
        isPaid: sec.metadata?.isPaid || false,
        isListed: sec.metadata?.isListed !== false
      }));

  const displayedMocktests = rawMocktests.filter(test => {
    // Listed mock tests only show on student side; admins see all
    if (!isAdmin && test.isListed === false) return false;
    return true;
  });
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile management states (Profile photo, Full name, E-mail, Phone number)
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>(userPhone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSavedToast, setPhoneSavedToast] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [fullProfile, setFullProfile] = useState<Partial<UserProfileData>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Keep profilePhone in sync with userPhone from AuthContext
  useEffect(() => {
    if (userPhone && !profilePhone) {
      setProfilePhone(userPhone);
    }
  }, [userPhone]);

  const handleSavePhone = async (phoneToSave: string) => {
    if (!user) return;
    const cleanPhone = phoneToSave.trim();
    if (!cleanPhone) {
      setProfileError('Please enter a valid mobile number.');
      return;
    }
    setSavingPhone(true);
    setProfileError('');
    try {
      // 1. Save to users/{uid} in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        phone: cleanPhone,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Save to userLogins record in Firestore
      const safeKey = (user.email || user.uid).toLowerCase().replace(/[^a-z0-9]/g, '_');
      try {
        await setDoc(doc(db, 'userLogins', safeKey), {
          phone: cleanPhone,
          email: user.email || '',
          name: profileName || candidateName || 'Doctor',
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (logErr) {
        console.warn("Could not sync phone to userLogins:", logErr);
      }

      // 3. Save to localStorage
      try {
        localStorage.setItem('promedo_user_phone', cleanPhone);
        const rawLocal = localStorage.getItem('promedo_user_logins');
        if (rawLocal && user.email) {
          const list: any[] = JSON.parse(rawLocal);
          const idx = list.findIndex(i => i.email && i.email.toLowerCase() === user.email?.toLowerCase());
          if (idx >= 0) {
            list[idx].phone = cleanPhone;
            localStorage.setItem('promedo_user_logins', JSON.stringify(list));
          }
        }
      } catch (_) {}

      setProfilePhone(cleanPhone);
      setIsEditingPhone(false);
      setPhoneSavedToast(true);
      setTimeout(() => setPhoneSavedToast(false), 4000);
    } catch (err: any) {
      console.error("Error saving phone number:", err);
      setProfileError(err?.message || "Failed to save phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Photo size must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof event.target?.result === 'string') {
        const photoDataUrl = event.target.result;
        setProfilePhoto(photoDataUrl);
        setProfileSavedSuccess(false);
        setProfileError('');
        // Automatically save uploaded profile photo to Firestore & Auth
        await handleSaveProfilePhoto(photoDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfilePhoto = async (photoOverride?: string) => {
    if (!user) return;
    const targetPhoto = photoOverride !== undefined ? photoOverride : profilePhoto;
    setSavingProfile(true);
    setProfileError('');
    setProfileSavedSuccess(false);
    try {
      try {
        await updateProfile(user, {
          photoURL: targetPhoto || ''
        });
      } catch (authErr) {
        console.warn("Could not update auth profile photo:", authErr);
      }

      await setDoc(doc(db, 'users', user.uid), {
        photoURL: targetPhoto,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setProfilePhoto(targetPhoto);
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving profile photo:", err);
      setProfileError(err?.message || "Failed to update profile photo.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      // Fetch user mock test stats and attempts
      getUserStats(user.uid).then(stats => {
        setUserStats(stats);
      });

      getUserAttempts(user.uid).then(attempts => {
        setUserAttempts(attempts);
      });

      const handleStatsUpdated = (event: any) => {
        if (event.detail) {
          setUserStats(event.detail);
        }
      };

      const handleAttemptAdded = (event: any) => {
        if (event.detail) {
          setUserAttempts(prev => [event.detail, ...prev]);
        }
      };

      window.addEventListener('promedo:stats_updated', handleStatsUpdated);
      window.addEventListener('promedo:attempt_added', handleAttemptAdded);

      const fetchDashboardData = async () => {
        setLoading(true);
        try {
          // Fetch user profile from Firestore to get name, photo, and phone provided at login
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          let resolvedName = user.displayName || '';
          let resolvedPhone = userPhone || user.phoneNumber || '';
          let resolvedPhoto = user.photoURL || '';

          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            if (uData?.name && uData.name !== 'Doctor') {
              resolvedName = uData.name;
            }
            const firestorePhone = uData?.phone || uData?.phoneNumber || uData?.mobile || uData?.whatsapp || uData?.contactNumber;
            if (firestorePhone) {
              resolvedPhone = firestorePhone;
            }
            if (uData?.photoURL) {
              resolvedPhoto = uData.photoURL;
            }
          }

          // Fallback lookup from userLogins, appointments, and localStorage where details were recorded during login/signup
          if (!resolvedPhone && user.email) {
            try {
              if (typeof window !== 'undefined') {
                const storedPhone = localStorage.getItem('promedo_user_phone') || localStorage.getItem('user_phone') || localStorage.getItem('candidate_phone');
                if (storedPhone) resolvedPhone = storedPhone;
              }
              const rawLocal = localStorage.getItem('promedo_user_logins');
              if (rawLocal && !resolvedPhone) {
                const list: any[] = JSON.parse(rawLocal);
                const match = list.find(item => item.email && item.email.toLowerCase() === user.email?.toLowerCase());
                if (match?.phone) {
                  resolvedPhone = match.phone;
                }
                if (match?.name && (!resolvedName || resolvedName === 'Doctor')) {
                  resolvedName = match.name;
                }
              }
              const safeKey = user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
              const loginDoc = await getDoc(doc(db, 'userLogins', safeKey));
              if (loginDoc.exists()) {
                const lData = loginDoc.data();
                if (lData?.phone && !resolvedPhone) resolvedPhone = lData.phone;
                if (lData?.name && (!resolvedName || resolvedName === 'Doctor')) resolvedName = lData.name;
              } else {
                const legacyDoc = await getDoc(doc(db, 'candidate_logins', safeKey));
                if (legacyDoc.exists()) {
                  const lData = legacyDoc.data();
                  if (lData?.phone && !resolvedPhone) resolvedPhone = lData.phone;
                  if (lData?.name && (!resolvedName || resolvedName === 'Doctor')) resolvedName = lData.name;
                }
              }

              // Check appointments collection for any consultation booked with this candidate's email
              if (!resolvedPhone) {
                try {
                  const apptSnap = await getDocs(query(collection(db, 'appointments'), where('email', '==', user.email.toLowerCase())));
                  if (!apptSnap.empty) {
                    const firstAppt = apptSnap.docs[0].data();
                    if (firstAppt?.whatsapp || firstAppt?.phone) {
                      resolvedPhone = firstAppt.whatsapp || firstAppt.phone;
                    }
                  }
                } catch (_) {}
              }
            } catch (lookupErr) {
              console.warn("Could not load candidate login record:", lookupErr);
            }
          }

          // Automatically persist phone back to Firestore user document if discovered from fallback
          if (resolvedPhone) {
            try {
              await setDoc(doc(db, 'users', user.uid), { phone: resolvedPhone }, { merge: true });
              if (typeof window !== 'undefined') {
                localStorage.setItem('promedo_user_phone', resolvedPhone);
              }
            } catch (_) {}
          }

          const finalName = resolvedName || (user.email ? user.email.split('@')[0] : 'Candidate Doctor');
          setCandidateName(finalName);
          setProfileName(finalName);
          setProfilePhone(resolvedPhone);
          setProfilePhoto(resolvedPhoto);
          setProfileEmail(user.email || '');

          // Real-time listeners for mock tests, courses, and enrollments
          import('../lib/lmsService').then(({ subscribeToMockTests, subscribeToCourses, subscribeToUserEnrollments }) => {
            subscribeToMockTests((fetchedTests) => {
              setAvailableMocktests(fetchedTests);
            });

            let latestCourses: any[] = [];
            let latestEnrolls: any[] = [];

            const syncEnrolled = () => {
              if (latestEnrolls.length > 0) {
                const mapped = latestEnrolls.map((enr: any) => {
                  const matched = latestCourses.find((c: any) => c.id === enr.courseId) || { id: enr.courseId, title: enr.courseTitle || "Enrolled Track" };
                  return {
                    ...matched,
                    enrollmentId: enr.id,
                    progress: enr.progress || 35,
                    completedLessons: enr.completedLessons || 12,
                    enrolledAt: enr.enrolledAt
                  };
                });
                setEnrolledCourses(mapped);
              } else {
                setEnrolledCourses([]);
              }
            };

            subscribeToCourses((fetchedCourses) => {
              latestCourses = fetchedCourses || [];
              setAvailableCourses(latestCourses as any);
              syncEnrolled();
            });

            subscribeToUserEnrollments(user.uid, (userEnrolls) => {
              latestEnrolls = userEnrolls;
              syncEnrolled();
            });
          });
        } catch (err) {
          console.error("Error fetching dashboard data:", err);
          setAvailableMocktests([]);
          setEnrolledCourses([]);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();

      const unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const u = docSnap.data();
          setFullProfile({ uid: user.uid, ...u });
          const p = u.phone || u.phoneNumber || u.mobile || u.whatsapp || u.contactNumber;
          if (p) {
            setProfilePhone(p);
          }
          if (u.name && u.name !== 'Doctor') {
            setProfileName(u.name);
            setCandidateName(u.name);
          }
          if (u.photoURL) {
            setProfilePhoto(u.photoURL);
          }
        }
      }, (err) => {
        console.warn("User doc real-time listener error:", err);
      });

      return () => {
        unsubscribeUserDoc();
        window.removeEventListener('promedo:stats_updated', handleStatsUpdated);
        window.removeEventListener('promedo:attempt_added', handleAttemptAdded);
      };
    }
  }, [user]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#F8FAFF] text-[#0B1C30] flex flex-col lg:flex-row">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="bg-white border-r border-[#E5EEFF] w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] hidden lg:flex flex-col z-20 shadow-xs pt-5">

        {/* Promedo Student Portal Brand Header */}
        <div className="px-5 pb-4 mb-3 border-b border-[#E5EEFF] flex items-center gap-3">
          <img
            src="/promedo-logo.png"
            alt="Promedo"
            className="w-8 h-8 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight text-[#0B1C30]">PROMEDO</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#3853A4]">STUDENT PORTAL</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {/* Option: Profile (Added above Dashboard Overview) */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border ${
                activeTab === 'profile' ? 'border-white/40 bg-white/20' : 'border-[#3853A4]/20 bg-[#EFF4FF]'
              }`}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={13} className={activeTab === 'profile' ? 'text-white' : 'text-[#3853A4]'} />
                )}
              </div>
              <span>Profile</span>
            </div>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
              activeTab === 'profile'
                ? 'bg-white/20 text-white'
                : 'bg-blue-50 text-brand-blue border border-blue-200'
            }`}>
              Account
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <Grid size={18} />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('qbank')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'qbank'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle size={18} />
              <span>Question Bank</span>
            </div>
            {!isAdmin && !isPaid ? (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Lock size={9} /> PRO
              </span>
            ) : (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                activeTab === 'qbank'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                Practice
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('imagebank')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'imagebank'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ImageIcon size={18} />
              <span>Image Bank</span>
            </div>
            {!isAdmin && !isPaid ? (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Lock size={9} /> PRO
              </span>
            ) : (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                activeTab === 'imagebank'
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}>
                Spotters
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('learning')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'learning' || activeTab === 'catalog'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageCircle size={18} />
              <span>Exam Coaching</span>
            </div>
            {!isAdmin && !isPaid && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Lock size={9} /> PRO
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mocktests')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'mocktests'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award size={18} />
              <span>Mock Test Simulators</span>
            </div>
            {!isAdmin && !isPaid && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Lock size={9} /> PRO
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <BarChart3 size={18} />
            <span>Performance Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/20'
                : 'text-[#45464D] hover:bg-[#E5EEFF]/60 hover:text-[#0B1C30]'
            }`}
          >
            <FileText size={18} />
            <span>Handouts & Recall PDFs</span>
          </button>
        </nav>

        {/* Sidebar Call to Action & Admin Link */}
        <div className="px-4 py-4 space-y-2 border-t border-[#E5EEFF]">
          <button 
            onClick={() => navigate('/mock-test-intro')}
            className="w-full bg-[#006591] hover:bg-[#005278] text-white py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlayCircle size={16} />
            <span>Take Prometric Mock</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/adminlandingpage')}
              className="w-full bg-[#131B2E] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck size={16} />
              <span>Admin Control</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-[#BA1A1A] hover:bg-red-50 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT CANVAS */}
      <div className="flex-1 min-w-0 py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        
        {/* Mobile Horizontal Tab Navigation Bar */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-[#E5EEFF] no-scrollbar">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'overview', label: 'Overview', icon: Grid },
            { id: 'qbank', label: 'Question Bank', icon: HelpCircle },
            { id: 'imagebank', label: 'Image Bank', icon: ImageIcon },
            { id: 'learning', label: `My Courses (${enrolledCourses.length})`, icon: BookOpen },
            { id: 'catalog', label: 'Course Catalog', icon: Compass },
            { id: 'mocktests', label: 'Mock Simulators', icon: Award },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'materials', label: 'PDF Notes', icon: FileText }
          ].map(tab => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#3853A4] text-white shadow-md'
                    : 'bg-white text-[#45464D] border border-[#E5EEFF]'
                }`}
              >
                <IconComp size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: PROFILE (Complete Student Registration Details & Editable Profile) */}
        {activeTab === 'profile' && (() => {
          const mergedProfileData: Partial<UserProfileData> = {
            name: profileName || candidateName || 'Doctor',
            email: profileEmail || user?.email || '',
            phone: profilePhone,
            photoURL: profilePhoto,
            ...fullProfile
          };
          const completionPercent = calculateProfileCompletion(mergedProfileData);
          const incomplete = isProfileIncomplete(mergedProfileData);

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">
              {/* Header & Main Edit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display text-[#0B1C30]">Student Profile</h2>
                  <p className="text-[#45464D] text-xs font-medium">Official Promedo candidate registration details, academic background, and location.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2.5 bg-[#3853A4] hover:bg-[#2F4487] text-white font-bold text-xs rounded-2xl shadow-md shadow-[#3853A4]/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Edit2 size={15} />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Incomplete Profile Banner for existing users */}
              {incomplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-amber-900 text-sm">Incomplete Student Profile ({completionPercent}% Complete)</h4>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Some required academic or location fields are incomplete. Complete your profile details to finalize your GCC licensing transcript.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    Complete Profile Now
                  </button>
                </div>
              )}

              {/* Profile Completion Progress Bar */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5EEFF] shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B1C30]">
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#3853A4]" />
                    Profile Completeness Status
                  </span>
                  <span className="text-[#3853A4] font-black">{completionPercent}% Complete</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#3853A4] via-blue-500 to-emerald-500 transition-all duration-500 rounded-full" 
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* Main Profile Card: Header Banner & Personal Photo */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EEFF] shadow-xs space-y-8">
                {profileSavedSuccess && (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Profile photo updated successfully! Changes saved to your account.</span>
                  </div>
                )}

                {/* Profile Photo & Candidate Hero Banner */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#E5EEFF]">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-[#EFF4FF] border-2 border-[#3853A4]/20 shadow-md flex items-center justify-center">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#3853A4]">
                          <User size={40} />
                          <span className="text-[10px] font-black uppercase mt-1">No Photo</span>
                        </div>
                      )}
                    </div>
                    <label 
                      htmlFor="profile-photo-upload" 
                      className="absolute -bottom-2 -right-2 p-2.5 bg-[#3853A4] hover:bg-[#2F4487] text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                      title="Change profile picture"
                    >
                      <Camera size={15} />
                      <input 
                        id="profile-photo-upload" 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                        <h3 className="font-black text-xl text-[#0B1C30]">{mergedProfileData.name}</h3>
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-brand-blue border border-blue-200">
                          {mergedProfileData.examPreparingFor || 'DHA Dubai'} Candidate
                        </span>
                      </div>
                      <p className="text-xs text-[#45464D] mt-1 font-medium">{mergedProfileData.email}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <label 
                        htmlFor="profile-photo-upload" 
                        className="px-3.5 py-2 bg-[#3853A4] hover:bg-[#2F4487] text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-[#3853A4]/20"
                      >
                        <Upload size={13} />
                        <span>Change Photo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>Edit All Details</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: PERSONAL INFORMATION */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#0B1C30] text-sm flex items-center gap-2">
                      <User size={16} className="text-[#3853A4]" />
                      Personal Information
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Full Name</span>
                      <p className="text-sm font-black text-[#0B1C30] truncate">{mergedProfileData.name}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Email Address</span>
                      <p className="text-sm font-black text-[#0B1C30] truncate">{mergedProfileData.email}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Phone Number</span>
                      <p className="text-sm font-black text-[#0B1C30] truncate">{mergedProfileData.phone || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Date of Birth</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.dateOfBirth || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Gender</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.gender || 'Not Provided'}</p>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ACADEMIC INFORMATION */}
                <div className="space-y-4 pt-4 border-t border-[#E5EEFF]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#0B1C30] text-sm flex items-center gap-2">
                      <GraduationCap size={16} className="text-[#3853A4]" />
                      Academic Background
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Institution / College / School</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.institution || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Student ID</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.studentId || 'N/A'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Qualification Level</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.qualification || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Course / Program</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.course || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Current Year / Semester</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.currentYear || 'Not Provided'}</p>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: LOCATION INFORMATION */}
                <div className="space-y-4 pt-4 border-t border-[#E5EEFF]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#0B1C30] text-sm flex items-center gap-2">
                      <MapPin size={16} className="text-[#3853A4]" />
                      Location & Residency
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Country</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.country || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">State / Emirate</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.state || 'Not Provided'}</p>
                    </div>

                    <div className="bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">City</span>
                      <p className="text-sm font-black text-[#0B1C30]">{mergedProfileData.city || 'Not Provided'}</p>
                    </div>

                    {mergedProfileData.address && (
                      <div className="sm:col-span-3 bg-[#EFF4FF]/30 border border-[#E5EEFF] rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-extrabold text-[#45464D] uppercase tracking-wider">Full Address</span>
                        <p className="text-sm font-medium text-[#0B1C30]">{mergedProfileData.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 4: ACCOUNT & LICENSING DETAILS */}
                <div className="p-5 bg-[#EFF4FF] rounded-2xl border border-[#E5EEFF] flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-[#3853A4] shadow-xs">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#0B1C30]">Promedo Account Record</p>
                      <p className="text-[11px] text-gray-500 font-medium">
                        UID: <span className="font-mono">{user?.uid?.substring(0, 12)}...</span> | Role: <span className="uppercase font-bold">{mergedProfileData.role || role}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-4 py-2 bg-[#3853A4] hover:bg-[#2F4487] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Edit Student Profile
                  </button>
                </div>

              </div>
            </motion.div>
          );
        })()}

        {/* TAB 0: DASHBOARD OVERVIEW (BENTO GRID) */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* Bento Grid Row 1: Performance Insights & Upcoming Exams */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CARD 1: PERFORMANCE INSIGHTS (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-[#E5EEFF] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-black text-lg text-[#0B1C30] flex items-center gap-2">
                      <BarChart3 size={20} className="text-[#3853A4]" />
                      Performance Insights & Score Trends
                    </h3>
                    <p className="text-[#45464D] text-xs font-medium">Your progress across timed Prometric simulator tests.</p>
                  </div>

                  <span className="px-3 py-1 bg-[#EFF4FF] border border-[#E5EEFF] rounded-xl text-xs font-bold text-[#006591] self-start sm:self-auto">
                    Last 30 Days
                  </span>
                </div>

                {/* Performance Insights Bar Graph (Real attempts or 0 position) */}
                <div className="relative h-56 pt-8 pb-2 flex flex-col justify-end">
                  {/* Passing threshold line at 60% */}
                  <div 
                    className="absolute left-0 right-0 border-b border-dashed border-[#3853A4]/25 z-0 flex items-center justify-end pr-1 pointer-events-none"
                    style={{ bottom: 'calc(60% + 14px)' }}
                  >
                    <span className="text-[9px] font-bold text-[#3853A4] bg-white/95 px-1.5 py-0.5 rounded border border-[#E5EEFF]">
                      Pass Threshold 60%
                    </span>
                  </div>

                  <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-[#E5EEFF] pb-1 relative z-10">
                    {Array.from({ length: 6 }).map((_, i) => {
                      // Retrieve attempt from chronological history
                      const chronologicalAttempts = [...userAttempts].reverse();
                      const attempt = chronologicalAttempts[i];
                      const taken = !!attempt;
                      const score = attempt?.score || 0;
                      const pass = score >= 60;
                      const isLatest = taken && i === chronologicalAttempts.length - 1;

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#131B2E] text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md z-20 whitespace-nowrap pointer-events-none">
                            {taken ? `${score}% Score • ${pass ? 'Pass' : 'Practice'}` : '0% • Not Taken'}
                          </div>
                          
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              taken
                                ? isLatest 
                                  ? 'bg-gradient-to-t from-[#3853A4] to-[#006591] shadow-sm' 
                                  : pass 
                                    ? 'bg-[#3853A4] hover:bg-[#2F4487]' 
                                    : 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-[#E5EEFF] hover:bg-[#D8E4FF]'
                            }`}
                            style={{ height: taken ? `${Math.max(score, 6)}%` : '4px' }}
                          />
                          <span className="text-[10px] font-extrabold text-[#45464D] mt-2 truncate w-full text-center">
                            Test {i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Readiness Metrics Footer */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-2 text-center">
                  <div className="p-3 bg-[#EFF4FF] rounded-2xl border border-[#E5EEFF]">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#45464D]">Average Score</p>
                    <p className="text-lg font-black text-[#0B1C30]">{userStats.mockTestsTaken > 0 ? `${userStats.averageScore}%` : '0%'}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Exam Pass Status</p>
                    <p className="text-lg font-black text-emerald-700">{userStats.mockTestsTaken > 0 ? (userStats.averageScore >= 60 ? 'HIGH CHANCE' : 'PRACTICE NEEDED') : 'NOT STARTED'}</p>
                  </div>
                  <div className="p-3 bg-[#EFF4FF] rounded-2xl border border-[#E5EEFF]">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#45464D]">Solved Questions</p>
                    <p className="text-lg font-black text-[#0B1C30]">{userStats.questionsAttempted > 0 ? `${userStats.questionsAttempted.toLocaleString()} Qs` : '0 Qs'}</p>
                  </div>
                </div>
              </div>

              {/* CARD 2: AVAILABLE MOCK TESTS (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-[#E5EEFF] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-black text-lg text-[#0B1C30]">Available Mock Tests</h3>
                      <p className="text-[11px] text-[#45464D] font-medium">Full Prometric CBT simulation catalog</p>
                    </div>
                    <span className="px-2.5 py-1 bg-[#EFF4FF] border border-[#E5EEFF] rounded-xl text-[10px] font-black text-[#006591]">
                      {availableMocktests.length} Tests
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {availableMocktests.map((test, idx) => (
                      <div key={test.id || idx} className="p-3.5 bg-[#EFF4FF]/70 border-l-4 border-[#3853A4] rounded-r-2xl space-y-2 hover:bg-[#EFF4FF] transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-[#006591] uppercase tracking-wider block">{test.category}</span>
                            <h4 className="font-extrabold text-xs text-[#0B1C30] leading-snug line-clamp-1">{test.title}</h4>
                          </div>
                          <span className="px-2 py-0.5 bg-[#3853A4]/10 text-[#3853A4] font-black text-[10px] rounded-md shrink-0">
                            {Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : 150)} Qs
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-[#45464D] font-bold flex items-center gap-1 text-[10px]">
                            <Clock size={12} /> {test.timeLimit} mins • {test.passingScore !== undefined ? test.passingScore : (test.passScore !== undefined ? test.passScore : 60)}% Pass
                          </span>
                          <button 
                            onClick={() => navigate('/mock-test-intro', { state: { testId: test.id, selectedExam: test.exam || test.category } })}
                            className="text-[#3853A4] font-black hover:underline flex items-center gap-1 cursor-pointer text-xs"
                          >
                            <span>Launch</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/mocktests')}
                  className="mt-4 w-full py-2.5 text-center text-[#3853A4] font-black text-xs hover:bg-[#EFF4FF] rounded-xl transition-all cursor-pointer border border-[#E5EEFF]"
                >
                  View All Simulators
                </button>
              </div>

            </div>



            {/* Bento Grid Row 4: Mock Tests Taken */}
            <div className="bg-white border border-[#E5EEFF] rounded-3xl p-6 sm:p-8 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-black text-xl text-[#0B1C30]">Mock Tests Taken</h3>
                  <p className="text-[#45464D] text-xs font-medium">History of your completed Prometric CBT simulation attempts and scores.</p>
                </div>
                <button 
                  onClick={() => navigate('/mock-test-intro')}
                  className="px-4 py-2 bg-[#3853A4] hover:bg-[#2F4487] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <PlayCircle size={15} />
                  <span>{userAttempts.length === 0 ? 'Try Your First Mock Test' : 'Take Your Mock Test'}</span>
                </button>
              </div>

              {userAttempts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#F8FAFF] rounded-2xl border border-dashed border-[#E5EEFF]">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-[#E5EEFF] text-[#3853A4] flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#0B1C30] mb-1">No Mock Tests Taken Yet</h4>
                  <p className="text-xs text-[#45464D] max-w-sm mx-auto mb-5 font-medium">
                    Start your first Prometric computer-based exam simulator to track your performance, scores, and question analysis here.
                  </p>
                  <button 
                    onClick={() => navigate('/mock-test-intro')}
                    className="px-5 py-2.5 bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-xs rounded-xl transition-all shadow-md shadow-[#3853A4]/20 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <PlayCircle size={15} />
                    <span>Try Your First Mock Test</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#EFF4FF] border-b border-[#E5EEFF] text-[11px] font-black text-[#45464D] uppercase tracking-wider">
                        <th className="px-6 py-3.5">Mock Test</th>
                        <th className="px-6 py-3.5">Date Taken</th>
                        <th className="px-6 py-3.5 text-center">Questions Attempted</th>
                        <th className="px-6 py-3.5 text-center">Score</th>
                        <th className="px-6 py-3.5 text-center">Status</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EEFF] text-xs font-bold">
                      {userAttempts.map((res, idx) => {
                        const isPass = (res.score || 0) >= 60;
                        const formattedDate = res.completedAt 
                          ? new Date(res.completedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Recent';

                        return (
                          <tr key={res.id || idx} className="hover:bg-[#F8FAFF] transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-black text-[#0B1C30]">{res.testTitle || 'Prometric CBT Mock Test'}</p>
                              <p className="text-[10px] text-[#45464D] font-medium">CBT Exam Simulation</p>
                            </td>
                            <td className="px-6 py-4 text-[#45464D] whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-[#0B1C30]">{res.questionsAttempted}</span>
                              <span className="text-[10px] text-[#45464D] font-medium"> / {res.totalQuestions} Qs</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-[#0B1C30] text-sm">{res.score}%</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isPass ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  PRACTICE NEEDED
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => navigate('/mock-test-intro')}
                                className="text-[#3853A4] hover:underline font-black cursor-pointer"
                              >
                                Retake
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 1: MY ENROLLED COURSES (CLASSROOM) */}
        {activeTab === 'learning' && (
          !isAdmin && !isPaid ? (
            <PremiumUpgradeScreen moduleName="Complete Courses" inline />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display text-[#0B1C30]">My Enrolled Courses</h2>
                  <p className="text-[#45464D] text-xs font-medium">Continue watching your video lectures, review clinical notes, and track your syllabus progress.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2.5 bg-[#3853A4] text-white rounded-xl text-xs font-bold hover:bg-[#2F4487] transition-all self-start sm:self-auto cursor-pointer"
                >
                  Browse More Courses
                </button>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#E5EEFF] text-center space-y-4">
                  <BookOpen size={48} className="mx-auto text-gray-300" />
                  <h3 className="text-lg font-black text-[#0B1C30]">No courses enrolled yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">Explore our high-yield Gulf Prometric courses to start your video lectures and clinical blueprints.</p>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="px-6 py-3 bg-[#3853A4] text-white text-xs font-bold rounded-2xl cursor-pointer"
                  >
                    Explore Course Catalog
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.map((course, idx) => (
                    <div key={idx} className="bg-white rounded-3xl border border-[#E5EEFF] overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between">
                      <div>
                        <div className="relative h-44 w-full bg-gray-100">
                          <img 
                            src={course.image} 
                            alt={course.title} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-3 left-3 bg-[#131B2E]/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wider">
                            {course.authority || 'Prometric'}
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="font-black text-base text-[#0B1C30] line-clamp-2 mb-3">
                            {course.title}
                          </h3>

                          <CourseProgressBar 
                            progress={course.progress || 35}
                            totalLessons={course.lessonsCount || 48}
                            completedLessons={course.completedLessons || 16}
                            compact
                            className="bg-[#F8FAFF] p-3 rounded-2xl border border-[#E5EEFF] mb-4"
                          />
                        </div>
                      </div>

                      <div className="p-6 pt-0 space-y-2">
                        <button
                          onClick={() => navigate(`/player/${course.id}`)}
                          className="w-full py-3.5 bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#3853A4]/20"
                        >
                          <PlayCircle size={16} />
                          <span>Open Video Classroom</span>
                        </button>

                        <button
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="w-full py-2.5 text-center text-[#3853A4] font-bold text-xs hover:underline cursor-pointer"
                        >
                          View Syllabus & Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )
        )}

        {/* TAB 2: COURSE CATALOG */}
        {activeTab === 'catalog' && (
          !isAdmin && !isPaid ? (
            <PremiumUpgradeScreen moduleName="Courses" inline />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display text-[#0B1C30]">Prometric LMS Course Catalog</h2>
                  <p className="text-[#45464D] text-xs font-medium">Comprehensive video lecture programs, recall breakdowns, and clinical exam strategy tracks.</p>
                </div>
                <button 
                  onClick={() => navigate('/courses')}
                  className="text-[#3853A4] text-xs font-black hover:underline cursor-pointer"
                >
                  Open Full Catalog Page →
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-[#E5EEFF] overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="relative h-44 w-full bg-gray-100">
                        <img 
                          src={course.image} 
                          alt={course.title} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-3 left-3 bg-[#131B2E]/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wider">
                          {course.authority || 'Prometric'}
                        </div>
                        <div className="absolute bottom-3 right-3 bg-white/95 px-2.5 py-1 rounded-lg text-xs font-black text-[#0B1C30] shadow-sm">
                          ${course.price || 299}
                        </div>
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-amber-500 font-bold">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>{course.rating || 4.9}</span>
                          <span className="text-gray-400 font-normal">({course.reviewsCount || 340} reviews)</span>
                        </div>

                        <h3 className="font-black text-base text-[#0B1C30] line-clamp-2">
                          {course.title}
                        </h3>

                        <p className="text-xs text-gray-500 line-clamp-2 font-normal">
                          {course.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-bold text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Video size={13} className="text-[#3853A4]" />
                            <span>{course.durationHours || 40}+ Hours</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={13} className="text-[#3853A4]" />
                            <span>{course.lessonsCount || 48} Lessons</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0 space-y-2">
                      <button
                        onClick={() => navigate(`/checkout/${course.id}`)}
                        className="w-full py-3.5 bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#3853A4]/20"
                      >
                        <Sparkles size={15} />
                        <span>Enroll Now • ${course.price || 299}</span>
                      </button>

                      <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="w-full py-2 text-center text-gray-500 font-bold text-xs hover:text-[#0B1C30] cursor-pointer"
                      >
                        View Syllabus Curriculum
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        )}

        {/* TAB: PROMETRIC EXAM SIMULATORS */}
        {activeTab === 'mocktests' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-black font-display text-[#0B1C30]">Prometric Exam Simulators</h2>
              <p className="text-[#45464D] text-xs font-medium">Full-length timed exam simulators strictly matched to DHA, HAAD, and SMLE blueprints.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMocktests.map((test, idx) => {
                const isTestPaid = Boolean(test.isPaid);
                const isLockedForStudent = isTestPaid && !isAdmin && !isPaid;

                return (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-[#E5EEFF] shadow-xs hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold text-[#3853A4] uppercase tracking-wider block">
                          {test.category || 'Prometric'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isAdmin && test.isListed === false && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-black uppercase rounded-lg">
                              Unlisted
                            </span>
                          )}
                          {isTestPaid ? (
                            <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-black uppercase rounded-xl flex items-center gap-1">
                              <Lock size={12} className="text-amber-600" />
                              PRO / PAID
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[10px] font-black uppercase rounded-xl flex items-center gap-1">
                              <Sparkles size={12} className="text-emerald-600" />
                              FREE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#EFF4FF] text-[#3853A4] flex items-center justify-center font-bold shrink-0">
                          <Award size={24} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-[#0B1C30] text-sm leading-snug">{test.title}</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-[#EFF4FF] rounded-2xl mb-6 text-center border border-[#E5EEFF]">
                        <div>
                          <span className="text-[10px] font-bold text-[#45464D] block">Questions</span>
                          <span className="text-xs font-black text-[#0B1C30]">{Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : 150)} Qs</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#45464D] block">Time Limit</span>
                          <span className="text-xs font-black text-[#0B1C30]">{test.timeLimit || 180} mins</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#45464D] block">Pass Score</span>
                          <span className="text-xs font-black text-emerald-700">{test.passingScore !== undefined ? test.passingScore : (test.passScore !== undefined ? test.passScore : 60)}%</span>
                        </div>
                      </div>
                    </div>

                    {isLockedForStudent ? (
                      <button 
                        onClick={() => setSelectedPaidTestForUpgrade(test)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-xs hover:from-amber-600 hover:to-amber-700 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock size={15} />
                        <span>Unlock with Pro (Paid Test)</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate(test.id ? `/mock-test/${test.id}` : `/mock-test-intro`)}
                        className="w-full py-3.5 rounded-2xl bg-[#3853A4] text-white font-extrabold text-xs hover:bg-[#2F4487] transition-all shadow-md shadow-[#3853A4]/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{isTestPaid ? 'Launch Pro Simulator' : 'Launch Free Simulator'}</span>
                        <PlayCircle size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 4: QUESTION BANK (Includes Bookmarked MCQs & Custom Module) */}
        {activeTab === 'qbank' && (
          !isAdmin && !isPaid ? (
            <PremiumUpgradeScreen moduleName="Question Bank" inline />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <QuestionBankSection isStudent={isStudent} isAdmin={isAdmin} />
            </motion.div>
          )
        )}

        {/* TAB: IMAGE BANK (Clinical Visual Spotters, ECGs, Radiology, Dermatology, Ophthalmology) */}
        {activeTab === 'imagebank' && (
          !isAdmin && !isPaid ? (
            <PremiumUpgradeScreen moduleName="Question Bank & Image Spotters" inline />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ImageBankSection isStudent={isStudent} isAdmin={isAdmin} />
            </motion.div>
          )
        )}

        {/* TAB 5: ANALYTICS & READINESS */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-black font-display text-[#0B1C30]">Student Performance & Analytics</h2>
              <p className="text-[#45464D] text-xs font-medium">Track your study accuracy, subject strengths, and licensing exam readiness index.</p>
            </div>

            {userAttempts.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E5EEFF] text-center max-w-2xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-[#EFF4FF] border border-[#E5EEFF] text-[#3853A4] flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={32} />
                </div>
                <h3 className="text-xl font-bold font-display text-[#0B1C30] mb-2">No Performance Records Yet</h3>
                <p className="text-xs text-[#45464D] max-w-md mx-auto mb-6">
                  Complete mock test simulators or practice drills to generate your personalized performance breakdown and exam readiness score.
                </p>
                <button
                  onClick={() => setActiveTab('mocktests')}
                  className="px-6 py-2.5 bg-[#3853A4] hover:bg-[#2F4487] text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all"
                >
                  Start Practice Simulator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-[#E5EEFF] shadow-xs space-y-6">
                  <h3 className="text-lg font-extrabold text-[#0B1C30] flex items-center gap-2">
                    <BarChart3 size={20} className="text-[#3853A4]" />
                    Recent Simulator Attempts
                  </h3>
                  <div className="divide-y divide-[#E5EEFF]">
                    {userAttempts.map((attempt, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#0B1C30] block">{attempt.examTitle || attempt.mocktestTitle || `Attempt #${idx + 1}`}</span>
                          <span className="text-[11px] text-[#45464D]">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : 'Completed'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-black ${(attempt.percentage ?? attempt.score ?? 0) >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {Math.round(attempt.percentage ?? attempt.score ?? 0)}%
                          </span>
                          <span className="block text-[10px] text-gray-400">{(attempt.percentage ?? attempt.score ?? 0) >= 60 ? 'PASS' : 'RETRY'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#E5EEFF] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100">
                      <BrainCircuit size={36} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block mb-1">
                      Overall Simulator Average
                    </span>
                    <h3 className="text-3xl font-black text-[#0B1C30] mb-2">
                      {Math.round(userAttempts.reduce((acc, a) => acc + (a.percentage ?? a.score ?? 0), 0) / userAttempts.length)}%
                    </h3>
                    <p className="text-[#45464D] text-xs font-medium leading-relaxed mb-6">
                      Calculated across your {userAttempts.length} completed simulator session{userAttempts.length > 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 6: HANDOUTS & RECALL MATERIALS */}
        {activeTab === 'materials' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-2xl font-black font-display text-[#0B1C30]">Study Handouts & Recall PDFs</h2>
              <p className="text-[#45464D] text-xs font-medium">Download high-yield recall books, clinical summaries, and official exam syllabus guides.</p>
            </div>

            {STUDY_MATERIALS.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E5EEFF] text-center max-w-2xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-[#EFF4FF] border border-[#E5EEFF] text-[#3853A4] flex items-center justify-center mx-auto mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-xl font-bold font-display text-[#0B1C30] mb-2">No Study Handouts Uploaded</h3>
                <p className="text-xs text-[#45464D] max-w-md mx-auto">
                  There are currently no study recall booklets or PDF handouts uploaded. Check back soon or contact your course coordinator.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {STUDY_MATERIALS.map((mat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-[#E5EEFF] shadow-xs flex items-center justify-between gap-4 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-black text-xs shrink-0 border border-red-100">
                        <FileText size={26} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-[#3853A4] uppercase tracking-wider block mb-0.5">{mat.category}</span>
                        <h4 className="font-extrabold text-[#0B1C30] text-sm mb-1">{mat.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#45464D] font-bold">
                          <span>{mat.pages}</span>
                          <span>•</span>
                          <span>{mat.size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* Contextual Floating Button */}
      <button 
        onClick={() => navigate('/subject-practice')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#3853A4] hover:bg-[#2F4487] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group cursor-pointer"
        title="Quick Practice Session"
      >
        <Plus size={28} />
        <span className="absolute right-full mr-3 bg-[#131B2E] text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Start Practice Q-Bank
        </span>
      </button>

      {/* Edit Profile Modal Dialog */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={{
          uid: user?.uid,
          name: profileName || candidateName || 'Doctor',
          email: profileEmail || user?.email || '',
          phone: profilePhone,
          photoURL: profilePhoto,
          ...fullProfile
        }}
        onProfileUpdated={(updatedData) => {
          setFullProfile(prev => ({ ...prev, ...updatedData }));
          if (updatedData.name) {
            setProfileName(updatedData.name);
            setCandidateName(updatedData.name);
          }
          if (updatedData.phone) setProfilePhone(updatedData.phone);
          if (updatedData.photoURL !== undefined) setProfilePhoto(updatedData.photoURL);
        }}
      />

      {/* Upgrade Modal for Paid Mock Tests */}
      {selectedPaidTestForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl my-8"
          >
            <button
              onClick={() => setSelectedPaidTestForUpgrade(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <PremiumUpgradeScreen 
              moduleName={`Mock Test: ${selectedPaidTestForUpgrade?.title || 'Premium Simulator'}`}
              onBack={() => setSelectedPaidTestForUpgrade(null)}
              inline
            />
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
