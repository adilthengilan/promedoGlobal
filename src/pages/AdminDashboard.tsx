import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Users, BookOpen, Plus, Trash2, Edit2, LayoutDashboard, DollarSign, X, Upload, LogOut, ClipboardList, AlertTriangle, Trophy, Award, Check, CheckCircle, Megaphone, Sparkles, CalendarCheck, Phone, Mail, Globe, MessageSquare, Bell, BellRing, Volume2, VolumeX, CheckCheck, Radio, Play, CalendarDays, List, LogIn, Flame, RefreshCw, Download, Search, Filter, ArrowUpDown, Crown, Medal, ExternalLink, Copy, UserCheck, Star, ShieldCheck, MessageSquarePlus, Database, CloudUpload, GraduationCap, HelpCircle, Image as ImageIcon, FileText, BarChart3, ArrowRight, Menu, Moon, Sun, ChevronDown, ChevronRight, Minus, TrendingUp, TrendingDown, Layers, LayoutGrid, SlidersHorizontal, Settings, Activity, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ExamGeneratorModal } from '../components/ExamGeneratorModal';
import { AppointmentCalendar } from '../components/AppointmentCalendar';
import { CandidateLoginRecord, fetchUserLogins, clearAllUserLogins, EXAM_OPTIONS } from '../lib/userLogins';
import { Testimonial, fetchAllTestimonials, addAdminTestimonial, verifyAndApproveTestimonial, deleteTestimonial, updateTestimonial, setTestimonialStatus, pushAllTestimonialsToFirestore } from '../lib/testimonials';
import { AvatarPicker, FEMALE_AVATAR, MALE_AVATAR, FEMALE_CARTOON_AVATARS, MALE_CARTOON_AVATARS } from '../components/AvatarPicker';
import { EditTestimonialModal } from '../components/EditTestimonialModal';
import StudentsPortalManager from '../components/StudentsPortalManager';
import AdminQuestionBankManager from '../components/AdminQuestionBankManager';
import AdminOverviewDashboard from '../components/AdminOverviewDashboard';
import AdminSubjectQuestions from './AdminSubjectQuestions';
import AdminUserManagement from '../components/AdminUserManagement';
import AdminEmailSender from '../components/AdminEmailSender';
import AdminUserActivities from '../components/AdminUserActivities';

interface AppointmentNotification {
  id: string;
  fullName: string;
  examPreparingFor: string;
  whatsapp: string;
  country?: string;
  otherDetails?: string;
  timestamp: string;
  read: boolean;
}

const AdminDashboard = () => {
  const { isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [mocktests, setMocktests] = useState<any[]>([]);
  const [mockAttempts, setMockAttempts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hallOfFamePosters, setHallOfFamePosters] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentViewMode, setAppointmentViewMode] = useState<'calendar' | 'list'>('calendar');

  // Real-time notification system state
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppointmentNotification | null>(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isInitialLoadRef = useRef(true);
  const knownApptIdsRef = useRef<Set<string>>(new Set());
  const [newAd, setNewAd] = useState({
    title: '',
    subtitle: '',
    code: '',
    badge: 'Promotional Offer',
    ctaText: 'Claim Discount',
    link: '/mocktests',
    imageUrl: ''
  });
  const [directPosterUrl, setDirectPosterUrl] = useState('');
  const [directDoctorName, setDirectDoctorName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [directEmailTarget, setDirectEmailTarget] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardsSubmenuOpen, setDashboardsSubmenuOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  // User Management Sub-Tab ('user-login' | 'all-users')
  const [userManagementSubTab, setUserManagementSubTab] = useState<'user-login' | 'all-users'>('user-login');
  const [userLogins, setUserLogins] = useState<CandidateLoginRecord[]>([]);
  const [userLoginSearch, setUserLoginSearch] = useState('');
  const [userLoginExamFilter, setUserLoginExamFilter] = useState('ALL');
  const [userLoginSort, setUserLoginSort] = useState<'recent' | 'name' | 'exam'>('recent');
  const [isRefreshingLogins, setIsRefreshingLogins] = useState(false);
  const [copiedLoginId, setCopiedLoginId] = useState<string | null>(null);
  const [isConfirmingClearLogins, setIsConfirmingClearLogins] = useState(false);
  const [clearSuccessToast, setClearSuccessToast] = useState(false);
  const [roleMenuUserId, setRoleMenuUserId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Testimonials state
  const [testimonialsList, setTestimonialsList] = useState<Testimonial[]>([]);
  const [testimonialSubTab, setTestimonialSubTab] = useState<'testimonials' | 'posters'>('testimonials');
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isEditTestimonialModalOpen, setIsEditTestimonialModalOpen] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    role: 'DHA Exam Candidate',
    studentId: '',
    text: '',
    rating: 5,
    avatar: FEMALE_CARTOON_AVATARS[0].url
  });
  const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);
  const [isSyncingToFirestore, setIsSyncingToFirestore] = useState(false);
  const [firestoreRuleModalOpen, setFirestoreRuleModalOpen] = useState(false);
  const [firestoreRuleCopied, setFirestoreRuleCopied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'course' | 'mocktest' | 'testimonial' | 'appointment' | 'ad' | 'poster' | null;
    id: string | null;
    title: string | null;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => {
      setActionFeedback(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Web Audio chime generator for real-time notification sound
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1: E5 (659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.18, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Note 2: B5 (987.77Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Chime audio playback prevented or unallowed:", e);
    }
  };

  const triggerTestNotification = () => {
    const testNotif: AppointmentNotification = {
      id: 'test_' + Date.now(),
      fullName: 'Dr. Sarah Ahmed (Test Candidate)',
      examPreparingFor: 'DHA - Dubai Healthcare Authority',
      whatsapp: '+971501234567',
      country: 'United Arab Emirates',
      otherDetails: 'Looking for fast-track licensing guidance.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setNotifications(prev => [testNotif, ...prev]);
    setActiveToast(testNotif);
    if (soundEnabled) {
      playNotificationChime();
    }
  };

  const markAllNotifsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markNotifAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Attach real-time Firestore onSnapshot listener for appointment alerts
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let firestoreList: any[] = [];
      snapshot.forEach(docSnap => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() });
      });

      let localList: any[] = [];
      try {
        localList = JSON.parse(localStorage.getItem('local_appointments') || '[]');
      } catch (e) {}

      const combinedMap = new Map<string, any>();
      firestoreList.forEach(item => combinedMap.set(item.id, item));
      localList.forEach(item => {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });

      const mergedList = Array.from(combinedMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      if (!isInitialLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const docId = change.doc.id;

            if (!knownApptIdsRef.current.has(docId)) {
              knownApptIdsRef.current.add(docId);

              const newNotif: AppointmentNotification = {
                id: docId,
                fullName: data.fullName || 'New Candidate',
                examPreparingFor: data.examPreparingFor || 'Consultation Request',
                whatsapp: data.whatsapp || '',
                country: data.country || '',
                otherDetails: data.otherDetails || '',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
              };

              setNotifications(prev => [newNotif, ...prev]);
              setActiveToast(newNotif);

              if (soundEnabled) {
                playNotificationChime();
              }
            }
          }
        });
      } else {
        snapshot.docs.forEach(d => knownApptIdsRef.current.add(d.id));
        isInitialLoadRef.current = false;
      }

      setAppointments(mergedList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'appointments');
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin, soundEnabled]);
  const [newCourse, setNewCourse] = useState({
    title: '',
    image: '',
    description: '',
    price: '',
    documentUrl: '',
    category: 'GP Prometric',
    videos: 0,
    rating: 5.0,
    reviews: '0',
    examImage: '',
    examDetails: '',
    examPoints: '',
    faqs: '',
    examVideoUrl: '',
    galleryImages: ''
  });

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    
    // Auto-verify if bootstrap admin has role: 'admin' in Firestore
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === 'live.rafick@gmail.com') {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
          console.log("Setting role to admin for bootstrap user...");
          await setDoc(userDocRef, {
            name: currentUser.displayName || 'Admin',
            email: currentUser.email,
            role: 'admin',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Could not automatically update user role to admin:", e);
      }
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const coursesSnapshot = await getDocs(query(collection(db, 'courses'), orderBy('updatedAt', 'desc')));
      setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const mocktestsSnapshot = await getDocs(query(collection(db, 'mocktests'), orderBy('updatedAt', 'desc')));
      setMocktests(mocktestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const salesSnapshot = await getDocs(query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc')));
      setSales(salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      try {
        const attemptsSnapshot = await getDocs(collection(db, 'mockAttempts'));
        setMockAttempts(attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Could not fetch mockAttempts from Firestore:", e);
      }

      try {
        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Could not fetch reviews collection:", e);
      }

      try {
        const allTestims = await fetchAllTestimonials();
        setTestimonialsList(allTestims);
      } catch (e) {
        console.warn("Could not fetch testimonials:", e);
      }

      try {
        const hofSnapshot = await getDocs(collection(db, 'halloffame'));
        setHallOfFamePosters(hofSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Could not fetch halloffame:", e);
      }

      try {
        const adsSnapshot = await getDocs(collection(db, 'ads'));
        setAds(adsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Could not fetch ads:", e);
      }

      try {
        let appts: any[] = [];
        try {
          const apptsSnapshot = await getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc')));
          appts = apptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
          console.warn("Could not fetch appointments from Firestore:", e);
        }

        try {
          const local = JSON.parse(localStorage.getItem('local_appointments') || '[]');
          const existingIds = new Set(appts.map(a => a.id));
          for (const item of local) {
            if (!existingIds.has(item.id)) {
              appts.push(item);
            }
          }
        } catch (e) {
          console.error("Local appointments parse error:", e);
        }

        setAppointments(appts);
      } catch (e) {
        console.warn("Appointments error:", e);
      }

      // Fetch user logins & test candidates for "Most Logins" section
      try {
        const logins = await fetchUserLogins();
        setUserLogins(logins);
      } catch (e) {
        console.warn("Could not fetch user logins:", e);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'multiple collections');
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for user login events dispatched across tabs/components
  useEffect(() => {
    const handleLoginUpdate = async () => {
      try {
        const updated = await fetchUserLogins();
        setUserLogins(updated);
      } catch (_) {}
    };

    const handleTestimonialUpdate = async () => {
      try {
        const allTestims = await fetchAllTestimonials();
        setTestimonialsList(allTestims);
      } catch (_) {}
    };

    window.addEventListener('promedo_user_login_updated', handleLoginUpdate);
    window.addEventListener('promedo_testimonials_updated', handleTestimonialUpdate);
    return () => {
      window.removeEventListener('promedo_user_login_updated', handleLoginUpdate);
      window.removeEventListener('promedo_testimonials_updated', handleTestimonialUpdate);
    };
  }, []);

  // Attempt auto-sync of testimonials to Firestore when authenticated admin opens dashboard
  useEffect(() => {
    if (isAdmin) {
      pushAllTestimonialsToFirestore().then(res => {
        if (res.success && res.count > 0) {
          console.log(`[Admin Firestore Sync] Auto-synced ${res.count} testimonials to Firestore.`);
        }
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleRefreshLogins = async () => {
    setIsRefreshingLogins(true);
    try {
      const logins = await fetchUserLogins();
      setUserLogins(logins);
    } catch (e) {
      console.warn("Error refreshing logins:", e);
    } finally {
      setTimeout(() => setIsRefreshingLogins(false), 500);
    }
  };

  const handleExportLoginsCSV = () => {
    if (userLogins.length === 0) {
      return;
    }

    const headers = ['#', 'Candidate Name', 'Mobile Number', 'Email Address', 'Exam Preparing For', 'Registration Date', 'Source'];
    const rows = userLogins.map((item, index) => [
      index + 1,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.phone || '').replace(/"/g, '""')}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.examPreparingFor || '').replace(/"/g, '""')}"`,
      `"${item.createdAt || item.lastLoginAt ? new Date(item.createdAt || item.lastLoginAt).toLocaleString() : ''}"`,
      `"${(item.source || 'Mock Test Simulator').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Promedo_Candidate_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearUserLogins = async () => {
    try {
      await clearAllUserLogins();
      setUserLogins([]);
      setIsConfirmingClearLogins(false);
      setClearSuccessToast(true);
      setTimeout(() => setClearSuccessToast(false), 4000);
    } catch (e) {
      console.error("Error clearing user logins:", e);
      setIsConfirmingClearLogins(false);
    }
  };

  const handleCopyPhone = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedLoginId(id);
    setTimeout(() => setCopiedLoginId(null), 2500);
  };

  const getExamBadgeStyle = (exam: string) => {
    const ex = (exam || '').toLowerCase();
    if (ex.includes('dha')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (ex.includes('haad') || ex.includes('doh')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (ex.includes('smle') || ex.includes('saudi') || ex.includes('scfhs')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (ex.includes('mohap')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (ex.includes('omsb') || ex.includes('oman')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (ex.includes('qchp') || ex.includes('qatar')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (ex.includes('nhra') || ex.includes('bahrain')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (ex.includes('nurs')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (ex.includes('dent')) return 'bg-pink-50 text-pink-700 border-pink-200';
    if (ex.includes('other')) return 'bg-violet-50 text-violet-700 border-violet-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredUserLogins = userLogins.filter(item => {
    const q = userLoginSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      (item.name || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      (item.examPreparingFor || '').toLowerCase().includes(q);

    const matchesExam = userLoginExamFilter === 'ALL' || (item.examPreparingFor || '').toLowerCase().includes(userLoginExamFilter.toLowerCase());

    return matchesSearch && matchesExam;
  }).sort((a, b) => {
    if (userLoginSort === 'recent') {
      const timeA = new Date(a.lastLoginAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastLoginAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }
    if (userLoginSort === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (userLoginSort === 'exam') {
      return (a.examPreparingFor || '').localeCompare(b.examPreparingFor || '');
    }
    return 0;
  });

  const totalCandidateRecords = userLogins.length;
  const examCounts = userLogins.reduce((acc: Record<string, number>, curr) => {
    const ex = curr.examPreparingFor || 'DHA';
    acc[ex] = (acc[ex] || 0) + 1;
    return acc;
  }, {});
  const topExamName = Object.entries(examCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'DHA (Dubai Health Authority)';

  const handleDeleteAppointment = (id: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'appointment',
      id,
      title: name || 'this booked appointment'
    });
  };

  const handleToggleAppointmentStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Contacted' ? 'Completed' : currentStatus === 'Completed' ? 'Pending' : 'Contacted';
    try {
      try {
        await updateDoc(doc(db, 'appointments', id), { status: nextStatus });
      } catch (e) {
        console.warn("Firestore update status error:", e);
      }

      try {
        const local = JSON.parse(localStorage.getItem('local_appointments') || '[]');
        const updated = local.map((a: any) => a.id === id ? { ...a, status: nextStatus } : a);
        localStorage.setItem('local_appointments', JSON.stringify(updated));
      } catch (e) {}

      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
      showFeedback(`Appointment status updated to ${nextStatus}.`, "success");
    } catch (err) {
      console.error("Error updating appointment status:", err);
      showFeedback("Failed to update appointment status.", "error");
    }
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title) return;
    try {
      await addDoc(collection(db, 'ads'), {
        ...newAd,
        createdAt: new Date().toISOString()
      });
      showFeedback("New promotional advertisement published to platform!", "success");
      setNewAd({
        title: '',
        subtitle: '',
        code: '',
        badge: 'Promotional Offer',
        ctaText: 'Claim Discount',
        link: '/courses',
        imageUrl: ''
      });
      fetchData();
    } catch (err) {
      console.error("Error creating ad:", err);
      showFeedback("Failed to publish advertisement.", "error");
    }
  };

  const handleDeleteAd = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'ad',
      id,
      title: title || 'this advertisement banner'
    });
  };

  const handleApproveReview = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { status: 'approved' });
      showFeedback("Review & poster approved for Hall of Fame!", "success");
      fetchData();
    } catch (err) {
      console.error("Error approving review:", err);
      showFeedback("Failed to approve review.", "error");
    }
  };

  const handleDeleteReview = (id: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'testimonial',
      id,
      title: name || 'this review/poster submission'
    });
  };

  const handleAddAdminTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.name.trim() || !newTestimonial.text.trim()) {
      showFeedback("Please provide Doctor/Candidate Name and Review text.", "error");
      return;
    }
    setIsSubmittingTestimonial(true);
    try {
      const created = await addAdminTestimonial({
        name: newTestimonial.name,
        role: newTestimonial.role,
        studentId: newTestimonial.studentId,
        text: newTestimonial.text,
        rating: newTestimonial.rating,
        avatar: newTestimonial.avatar,
        status: 'approved'
      });
      // Immediately reflect newly created review in state so it appears in the admin panel instantly
      setTestimonialsList(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      setNewTestimonial({
        name: '',
        role: 'DHA Exam Candidate',
        studentId: '',
        text: '',
        rating: 5,
        avatar: FEMALE_AVATAR.url
      });
      if (created.savedToFirestore) {
        showFeedback(`Testimonial for "${created.name}" saved to Firestore & published live!`, "success");
      } else {
        showFeedback(`Testimonial for "${created.name}" published live to website!`, "success");
      }
      const updatedList = await fetchAllTestimonials();
      setTestimonialsList(updatedList);
    } catch (err: any) {
      console.error("Error saving testimonial:", err);
      showFeedback("Failed to save testimonial: " + (err?.message || String(err)), "error");
    } finally {
      setIsSubmittingTestimonial(false);
    }
  };

  const handleApproveTestimonialItem = async (id: string) => {
    try {
      await verifyAndApproveTestimonial(id);
      setTestimonialsList(prev => prev.map(t => t.id === id ? { ...t, status: 'approved', verifiedAt: new Date().toISOString() } : t));
      showFeedback("Review verified and published live to homepage!", "success");
      const updatedList = await fetchAllTestimonials();
      setTestimonialsList(updatedList);
    } catch (err) {
      console.error("Error verifying review:", err);
      showFeedback("Failed to approve review.", "error");
    }
  };

  const handleRejectTestimonialItem = async (id: string) => {
    try {
      await setTestimonialStatus(id, 'rejected');
      setTestimonialsList(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' } : t));
      showFeedback("Review marked as hidden/rejected.", "success");
      const updatedList = await fetchAllTestimonials();
      setTestimonialsList(updatedList);
    } catch (err) {
      console.error("Error rejecting review:", err);
      showFeedback("Failed to reject review.", "error");
    }
  };

  const handleSetTestimonialStatusItem = async (id: string, status: 'approved' | 'pending' | 'rejected') => {
    try {
      await setTestimonialStatus(id, status);
      const label = status === 'approved' ? 'published live on website' : status === 'pending' ? 'moved to pending review' : 'hidden/rejected';
      setTestimonialsList(prev => prev.map(t => t.id === id ? { ...t, status, verifiedAt: status === 'approved' ? new Date().toISOString() : t.verifiedAt } : t));
      showFeedback(`Review has been ${label}.`, "success");
      const updatedList = await fetchAllTestimonials();
      setTestimonialsList(updatedList);
    } catch (err) {
      console.error("Error changing review status:", err);
      showFeedback("Failed to update status.", "error");
    }
  };

  const handleDeleteTestimonialItem = (id: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'testimonial',
      id,
      title: name ? `Review by ${name}` : 'this review'
    });
  };

  const handleOpenEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsEditTestimonialModalOpen(true);
  };

  const handleSaveTestimonialEdit = async (updated: Partial<Testimonial>) => {
    if (!editingTestimonial) return;
    try {
      const updatedItem = await updateTestimonial(editingTestimonial.id, updated);
      if (updatedItem) {
        setTestimonialsList(prev => prev.map(t => t.id === editingTestimonial.id ? { ...t, ...updatedItem } : t));
      }
      showFeedback("Review updated successfully!", "success");
      setIsEditTestimonialModalOpen(false);
      setEditingTestimonial(null);
      const updatedList = await fetchAllTestimonials();
      setTestimonialsList(updatedList);
    } catch (err) {
      console.error("Error updating review:", err);
      showFeedback("Failed to update review.", "error");
      throw err;
    }
  };

  const handleSyncAllTestimonialsToFirestore = async () => {
    setIsSyncingToFirestore(true);
    try {
      const res = await pushAllTestimonialsToFirestore();
      if (res.success && res.count > 0) {
        showFeedback(`Successfully saved ${res.count} of ${res.total} testimonials directly to Firestore!`, "success");
        const updatedList = await fetchAllTestimonials();
        setTestimonialsList(updatedList);
      } else {
        showFeedback(`Firestore Notice: ${res.error || 'Permission denied'}. Check rule helper.`, "error");
        setFirestoreRuleModalOpen(true);
      }
    } catch (err: any) {
      console.error("Error pushing testimonials to Firestore:", err);
      showFeedback("Failed to save to Firestore: " + (err?.message || err), "error");
      setFirestoreRuleModalOpen(true);
    } finally {
      setIsSyncingToFirestore(false);
    }
  };

  const handleDeleteHofPoster = (id: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'poster',
      id,
      title: name || 'this Hall of Fame poster'
    });
  };

  const handleAddDirectPoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPosterUrl) return;
    try {
      await addDoc(collection(db, 'halloffame'), {
        posterUrl: directPosterUrl,
        name: directDoctorName || 'Achiever Doctor',
        createdAt: new Date().toISOString()
      });
      showFeedback("New poster added to Hall of Fame!", "success");
      setDirectPosterUrl('');
      setDirectDoctorName('');
      fetchData();
    } catch (err) {
      console.error("Error adding poster:", err);
      showFeedback("Failed to add poster.", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const courseData = {
        ...newCourse,
        price: parseFloat(newCourse.price),
        originalPrice: parseFloat(newCourse.price) * 2,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        try {
          await updateDoc(doc(db, 'courses', editingId), courseData);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `courses/${editingId}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'courses'), {
            ...courseData,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'courses');
        }
      }

      setIsModalOpen(false);
      setEditingId(null);
      setNewCourse({
        title: '',
        image: '',
        description: '',
        price: '',
        documentUrl: '',
        category: 'GP Prometric',
        videos: 0,
        rating: 5.0,
        reviews: '0',
        examImage: '',
        examDetails: '',
        examPoints: '',
        faqs: '',
        examVideoUrl: '',
        galleryImages: ''
      });
      fetchData();
    } catch (err) {
      console.error("Error saving course:", err);
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingId(course.id);
    setNewCourse({
      title: course.title || '',
      image: course.image || '',
      description: course.description || '',
      price: course.price?.toString() || '',
      documentUrl: course.documentUrl || '',
      category: course.category || 'GP Prometric',
      videos: course.videos || 0,
      rating: course.rating || 5.0,
      reviews: course.reviews || '0',
      examImage: course.examImage || '',
      examDetails: course.examDetails || '',
      examPoints: course.examPoints || '',
      faqs: course.faqs || '',
      examVideoUrl: course.examVideoUrl || '',
      galleryImages: course.galleryImages || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteCourse = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'course',
      id,
      title: title || 'this course'
    });
  };

  const handleDeleteMocktest = (id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'mocktest',
      id,
      title: title || 'this mocktest'
    });
  };

  const executeDeletion = async () => {
    if (!deleteConfirm.type || !deleteConfirm.id) return;
    setIsDeleting(true);
    const { type, id } = deleteConfirm;
    console.log(`Attempting to delete ${type} with ID:`, id);
    try {
      if (type === 'course') {
        await deleteDoc(doc(db, 'courses', id));
        console.log("Successfully deleted course:", id);
        showFeedback("Course deleted successfully!", "success");
        await fetchData();
      } else if (type === 'mocktest') {
        await deleteDoc(doc(db, 'mocktests', id));
        console.log("Successfully deleted mocktest:", id);
        showFeedback("Mock test deleted successfully!", "success");
        await fetchData();
      } else if (type === 'testimonial') {
        await deleteTestimonial(id);
        setTestimonialsList(prev => prev.filter(t => t.id !== id));
        showFeedback("Testimonial review deleted successfully.", "success");
        const updatedList = await fetchAllTestimonials();
        setTestimonialsList(updatedList);
      } else if (type === 'appointment') {
        try {
          await deleteDoc(doc(db, 'appointments', id));
        } catch (e) {
          console.warn("Firestore delete appointment error:", e);
        }
        try {
          const local = JSON.parse(localStorage.getItem('local_appointments') || '[]');
          const filtered = local.filter((a: any) => a.id !== id);
          localStorage.setItem('local_appointments', JSON.stringify(filtered));
        } catch (e) {}
        setAppointments(prev => prev.filter(a => a.id !== id));
        showFeedback("Appointment booking removed successfully!", "success");
      } else if (type === 'ad') {
        await deleteDoc(doc(db, 'ads', id));
        showFeedback("Advertisement removed successfully!", "success");
        await fetchData();
      } else if (type === 'poster') {
        await deleteDoc(doc(db, 'halloffame', id));
        showFeedback("Poster removed from Hall of Fame!", "success");
        await fetchData();
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: null });
    } catch (err: any) {
      console.error(`Failed to delete ${type}:`, id, err);
      showFeedback(`Failed to delete ${type}: ` + (err?.message || String(err)), "error");
      handleFirestoreError(err, OperationType.DELETE, `${type}s/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user' | 'student') => {
    setUpdatingRoleId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { 
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setRoleMenuUserId(null);
      showFeedback(`User role changed to ${newRole.toUpperCase()} and updated in Firestore!`, "success");
      fetchData();
    } catch (err: any) {
      console.error("Error setting user role in Firestore:", err);
      showFeedback(`Failed to update role in Firestore: ${err?.message || err}`, "error");
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'user' ? 'student' : currentRole === 'student' ? 'admin' : 'user';
    await handleUpdateUserRole(userId, nextRole);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Dynamic Recent Activities feed from actual appointments, user logins, and reviews
  const dynamicRecentActivities = [
    ...appointments.slice(0, 3).map((a, i) => ({
      id: `appt-${a.id || i}`,
      initials: (a.fullName || 'Candidate').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'CA',
      name: a.fullName || 'Candidate',
      action: `booked consultation for ${a.examPreparingFor || 'Prometric'} (${a.status || 'Pending'})`,
      timeAgo: a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${(i + 1) * 7} min ago`,
      color: i % 2 === 0 ? 'bg-emerald-600' : 'bg-blue-600'
    })),
    ...userLogins.slice(0, 3).map((u, i) => ({
      id: `login-${u.id || i}`,
      initials: (u.name || 'User').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'US',
      name: u.name || 'Candidate',
      action: `registered for ${u.examPreparingFor || 'GCC Licensing'} Mock Simulator`,
      timeAgo: u.createdAt ? new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${(i + 2) * 12} min ago`,
      color: 'bg-teal-600'
    })),
    ...testimonialsList.slice(0, 2).map((t, i) => ({
      id: `rev-${t.id || i}`,
      initials: (t.name || 'Doctor').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR',
      name: t.name || 'Doctor',
      action: `reviewed: "${(t.text || '').slice(0, 45)}..."`,
      timeAgo: `${(i + 1)} hour ago`,
      color: 'bg-amber-500'
    }))
  ].slice(0, 5);

  return (
    <div className={`min-h-screen flex bg-[#F8FAFC] ${darkMode ? 'dark bg-slate-900 text-slate-100' : ''} text-gray-800 antialiased`}>
      {/* 1. Promedo Global Admin Obsidian Slate Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} shrink-0 bg-[#1B2234] text-slate-300 transition-all duration-200 flex flex-col justify-between border-r border-[#273148] sticky top-0 h-screen z-40 select-none`}>
        {/* Top: Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between">
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Promedo Shield Gradient Badge */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3853A4] to-[#2B3F7E] text-white font-black flex items-center justify-center text-lg shadow-md shadow-[#3853A4]/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-black text-white text-lg tracking-tight leading-none">PROMEDO</span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-[#3853A4]/30 mt-1">GLOBAL ADMIN</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              title="Collapse"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-5 text-xs scrollbar-thin">
          {/* MENU SECTION */}
          <div className="space-y-1">
            {sidebarOpen && (
              <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-2">
                Main Menu
              </p>
            )}

            {/* Dashboards */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid size={17} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Dashboards</span>}
              </div>
              {sidebarOpen && (
                <ChevronDown size={14} className="text-slate-400" />
              )}
            </button>

            {/* Question Builder (Authoring Suite) */}
            <button
              onClick={() => setActiveTab('question-builder')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'question-builder' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Question Builder - Author questions, 4 options, rationales & diagrams"
            >
              <div className="flex items-center gap-3">
                <FileText size={17} className={activeTab === 'question-builder' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Question Builder</span>}
              </div>
              {sidebarOpen && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#3853A4]/30 text-blue-200 border border-[#3853A4]/40">
                  Builder
                </span>
              )}
            </button>

            {/* Question Bank (Students Portal / App Pages) */}
            <button
              onClick={() => setActiveTab('students-portal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'students-portal' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Question Bank - Subject folders, custom modules, image bank & simulators"
            >
              <div className="flex items-center gap-3">
                <Layers size={17} className={activeTab === 'students-portal' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Question Bank</span>}
              </div>
            </button>

            {/* Mock Test Page */}
            <button
              onClick={() => setActiveTab('mocktests')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'mocktests' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage Mock Test Catalog, Simulators & Import Questions"
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={17} className={activeTab === 'mocktests' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Mock Test Page</span>}
              </div>
              {sidebarOpen && (
                <span className="text-[10px] text-slate-400 font-semibold">{mocktests.length}</span>
              )}
            </button>

            {/* Course */}
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'courses' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage Course Packages"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={17} className={activeTab === 'courses' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Course Packages</span>}
              </div>
              {sidebarOpen && (
                <span className="text-[10px] text-slate-400 font-semibold">{courses.length}</span>
              )}
            </button>

            {/* User Management */}
            <button
              onClick={() => setActiveTab('user-management')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'user-management' || activeTab === 'users'
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage LMS Candidates, Students, Roles & Permissions"
            >
              <div className="flex items-center gap-3">
                <Users size={17} className={activeTab === 'user-management' || activeTab === 'users' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>User Management</span>}
              </div>
            </button>

            {/* Email Sender */}
            <button
              onClick={() => setActiveTab('email-sender')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'email-sender' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Compose & Send Broadcast Emails to Learners"
            >
              <div className="flex items-center gap-3">
                <Mail size={17} className={activeTab === 'email-sender' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Email Sender</span>}
              </div>
            </button>

            {/* User Activities */}
            <button
              onClick={() => setActiveTab('user-activities')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'user-activities' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Real-Time Student Activity Stream, Quiz & Exam Audit Logs"
            >
              <div className="flex items-center gap-3">
                <Activity size={17} className={activeTab === 'user-activities' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>User Activities</span>}
              </div>
            </button>

            {/* Chat / Appointments */}
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'appointments' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage Consultation Requests"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={17} className={activeTab === 'appointments' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Appointments</span>}
              </div>
              {sidebarOpen && appointments.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#3853A4] text-white text-[10px] font-black flex items-center justify-center">
                  {appointments.length}
                </span>
              )}
            </button>

            {/* Transaction / Sales */}
            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'sales' 
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' 
                  : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="View Transactions and Enrollments"
            >
              <div className="flex items-center gap-3">
                <DollarSign size={17} className={activeTab === 'sales' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Transaction</span>}
              </div>
            </button>
          </div>

          {/* HELP & MARKETING SECTION */}
          <div className="space-y-1 pt-2">
            {sidebarOpen && (
              <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-2">
                Promotions & Reviews
              </p>
            )}

            <button
              onClick={() => setActiveTab('ads')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'ads' ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage Platform Ads & Promotional Offers"
            >
              <div className="flex items-center gap-3">
                <Megaphone size={17} className={activeTab === 'ads' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Ads List</span>}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('halloffame')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'halloffame' ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black' : 'text-slate-300 hover:text-white hover:bg-[#222C42]'
              }`}
              title="Manage Candidate Reviews & Testimonials"
            >
              <div className="flex items-center gap-3">
                <Star size={17} className={activeTab === 'halloffame' ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>Testimonials</span>}
              </div>
            </button>
          </div>

          {/* Bottom Promo Card */}
          {sidebarOpen && (
            <div className="bg-[#222C42] border border-white/10 rounded-2xl p-4 text-white relative shadow-lg">
              <button 
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
              <p className="text-xs font-black text-white mb-0.5">PROMEDO Updates</p>
              <p className="text-[10px] text-slate-300 leading-tight mb-3">
                New Question Bank & Custom Modules active for GCC licensing candidates.
              </p>

              {/* Video Thumbnail with Play Button */}
              <div className="relative rounded-xl overflow-hidden mb-3 aspect-video bg-blue-950 border border-white/15">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&auto=format&fit=crop&q=80" 
                  alt="Promedo Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/90 text-[#3853A4] flex items-center justify-center shadow-md">
                    <Play size={14} className="fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer">
                  Dismiss
                </button>
                <button 
                  onClick={() => setActiveTab('students-portal')}
                  className="px-3 py-1 bg-[#3853A4] hover:bg-[#2D4284] text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Explore Bank
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-3.5 border-t border-[#273148] bg-[#141A28] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full ring-2 ring-blue-400/80 p-0.5 overflow-hidden shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80" 
                  alt="Promedo Administrator" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#141A28]" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate">
                  {user?.displayName || 'Promedo Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'admin@promedoglobal.com'}
                </p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Canvas Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar matching Promedo Global LMS */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-5 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          {/* Left: Search Box */}
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer md:hidden"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-9 py-2 bg-[#F8FAFD] hover:bg-white focus:bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#3853A4]/20 transition-all"
              />
              <SlidersHorizontal size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Action: Question Builder */}
            <button
              onClick={() => setActiveTab('question-builder')}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'question-builder'
                  ? 'bg-[#3853A4] text-white shadow-md shadow-[#3853A4]/30 font-black'
                  : 'bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#3853A4] border border-blue-200/60'
              }`}
              title="Open Question Builder Studio"
            >
              <FileText size={15} />
              <span>Question Builder</span>
            </button>

            {/* Chime sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Notification sound enabled" : "Notification sound muted"}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-[#EEF2FF] text-[#3853A4] hover:bg-[#E0E7FF]' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#3853A4] hover:bg-[#E0E7FF] flex items-center justify-center transition-all cursor-pointer relative"
                title="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                  {notifications.filter(n => !n.read).length > 0 ? notifications.filter(n => !n.read).length : 2}
                </span>
              </button>

              {/* Popover Dropdown Menu */}
              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 text-left"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell size={17} className="text-[#3853A4]" />
                        <h3 className="font-extrabold text-sm text-gray-900">
                          Appointment Alerts
                        </h3>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {notifications.filter(n => !n.read).length} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={markAllNotifsAsRead}
                            className="text-[11px] font-bold text-[#3853A4] hover:underline flex items-center gap-1"
                          >
                            <CheckCheck size={12} />
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifMenu(false)}
                          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                          <Radio size={24} className="mx-auto mb-2 text-gray-300 animate-pulse" />
                          <p className="text-xs font-bold">Listening for new bookings...</p>
                          <p className="text-[10px] text-gray-400 mt-1">Alerts pop up instantly when candidates submit the booking form.</p>
                          <button
                            onClick={triggerTestNotification}
                            className="mt-3 px-3 py-1.5 bg-[#3853A4]/10 text-[#3853A4] rounded-xl text-xs font-extrabold hover:bg-[#3853A4]/20 transition-all inline-flex items-center gap-1.5"
                          >
                            <Play size={12} />
                            Test Chime
                          </button>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotifAsRead(n.id);
                              setActiveTab('appointments');
                              setShowNotifMenu(false);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer hover:bg-gray-50 flex items-start gap-3 ${
                              n.read ? 'bg-white border-gray-100 opacity-75' : 'bg-blue-50/60 border-blue-200'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#3853A4]/10 text-[#3853A4] flex items-center justify-center shrink-0 mt-0.5">
                              <CalendarCheck size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <h4 className="text-xs font-extrabold text-gray-900 truncate">
                                  {n.fullName}
                                </h4>
                                <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                  {n.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-[#3853A4] truncate">
                                {n.examPreparingFor}
                              </p>
                              {n.whatsapp && (
                                <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                  <Phone size={10} />
                                  <span>{n.whatsapp}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between text-[11px]">
                      <button
                        onClick={triggerTestNotification}
                        className="text-gray-500 hover:text-[#3853A4] font-bold flex items-center gap-1"
                      >
                        <Play size={12} className="text-[#3853A4]" />
                        Simulate Alert
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('appointments');
                          setShowNotifMenu(false);
                        }}
                        className="text-[#3853A4] font-extrabold hover:underline"
                      >
                        View All ({appointments.length})
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Message Bubble */}
            <button
              onClick={() => setActiveTab('halloffame')}
              className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#3853A4] hover:bg-[#E0E7FF] flex items-center justify-center transition-all cursor-pointer relative"
              title="Reviews & Chat"
            >
              <MessageSquare size={18} />
              {testimonialsList.filter(t => t.status === 'pending').length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>

            {/* Settings Gear */}
            <button
              onClick={() => setActiveTab('ads')}
              className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#3853A4] hover:bg-[#E0E7FF] flex items-center justify-center transition-all cursor-pointer"
              title="Settings & Banners"
            >
              <Settings size={18} />
            </button>

            {/* User Profile Avatar */}
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 pl-1.5 cursor-pointer group"
              title="Profile & Dashboard"
            >
              <div className="w-10 h-10 rounded-full ring-2 ring-amber-400/80 p-0.5 overflow-hidden shadow-2xs">
                <img 
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80" 
                  alt="Admin" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'dashboard' ? (
            <AdminOverviewDashboard
              userCount={users.length}
              userLoginsCount={userLogins.length}
              coursesCount={courses.length}
              mocktestsCount={mocktests.length}
              appointmentsCount={appointments.length}
              pendingAppointmentsCount={appointments.filter(a => a.status === 'Pending').length}
              testimonialsCount={testimonialsList.length}
              salesCount={sales.length}
              courses={courses}
              mocktests={mocktests}
              sales={sales}
              users={users}
              userLogins={userLogins}
              mockAttempts={mockAttempts}
              appointments={appointments}
              adminName={user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin')}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenExamGenerator={() => setIsGeneratorOpen(true)}
              recentActivities={dynamicRecentActivities}
            />
          ) : activeTab === 'question-builder' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3853A4] flex items-center justify-center font-bold shadow-2xs">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-gray-950">Question Builder Studio</h2>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#3853A4]/10 text-[#3853A4] border border-[#3853A4]/20">
                        Authoring Suite
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      Create, edit & manage clinical questions with 4 choices, rationales, and medical diagram uploads.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('students-portal')}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#3853A4] text-xs font-bold rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database size={14} />
                    <span>Question Bank Hierarchy</span>
                  </button>
                  <button
                    onClick={() => navigate('/adminlandingpage/subjects')}
                    className="px-3.5 py-2 bg-[#3853A4] hover:bg-[#2D4284] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Open Fullscreen</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                <AdminSubjectQuestions />
              </div>
            </div>
          ) : activeTab === 'qbank-management' ? (
            <AdminQuestionBankManager />
          ) : activeTab === 'students-portal' ? (
            <StudentsPortalManager />
          ) : (activeTab === 'user-management' || activeTab === 'users') ? (
            <AdminUserManagement
              onOpenEmailSender={(email) => {
                setDirectEmailTarget(email);
                setActiveTab('email-sender');
              }}
            />
          ) : activeTab === 'email-sender' ? (
            <AdminEmailSender initialRecipientEmail={directEmailTarget} />
          ) : activeTab === 'user-activities' ? (
            <AdminUserActivities />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-7 shadow-2xs">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                {activeTab === 'users' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">Users Management</h2>
                        <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md text-xs font-black">
                          {userManagementSubTab === 'user-login' ? `${userLogins.length} Active Candidates` : `${users.length} Registered Accounts`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 font-medium">
                        {userManagementSubTab === 'user-login' 
                          ? 'Review candidate user registrations, contact details, and target exam preparations.' 
                          : 'Manage candidate user accounts, permissions, and roles.'}
                      </p>
                    </div>

                    <div className="flex items-center bg-gray-100/90 p-1 rounded-xl gap-1 shrink-0">
                      <button
                        onClick={() => setUserManagementSubTab('user-login')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          userManagementSubTab === 'user-login'
                            ? 'bg-[#151B26] text-white shadow-2xs font-extrabold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <LogIn size={13} />
                        <span>User Login</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${userManagementSubTab === 'user-login' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {userLogins.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setUserManagementSubTab('all-users')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          userManagementSubTab === 'all-users'
                            ? 'bg-[#151B26] text-white shadow-2xs font-extrabold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <Users size={13} />
                        <span>All Registered Users</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-xl font-bold capitalize text-gray-900">
                    {activeTab === 'sales' ? 'Recent Sales' : activeTab === 'mocktests' ? 'Mocktest Catalog' : activeTab === 'appointments' ? `Booked Appointments (${appointments.length})` : activeTab === 'halloffame' ? 'Testimonials & Reviews Management' : `${activeTab} List`}
                  </h2>
                )}
                {activeTab === 'courses' && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary py-2 px-6 text-sm"
                  >
                    <Plus size={18} />
                    Add New Course
                  </button>
                )}
                {activeTab === 'mocktests' && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={() => setIsGeneratorOpen(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer border border-amber-400/30"
                    >
                      <Sparkles size={16} className="text-amber-200" />
                      Import Questions & Create Exam
                    </button>
                    <button 
                      onClick={() => navigate('/adminlandingpage/mocktest/create')}
                      className="btn-primary py-2 px-6 text-sm"
                    >
                      <Plus size={18} />
                      Add New Mocktest
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto min-h-[400px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-brand-blue">
                    <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold">Fetching Data...</p>
                  </div>
                ) : activeTab === 'halloffame' ? (
                  <div className="space-y-8">
                    {/* Sub-tab Navigation */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTestimonialSubTab('testimonials')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            testimonialSubTab === 'testimonials'
                              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                              : 'text-gray-600 hover:text-brand-blue hover:bg-white'
                          }`}
                        >
                          <MessageSquare size={16} />
                          <span>Testimonials Management</span>
                          {testimonialsList.filter(t => t.status === 'pending').length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-brand-dark animate-pulse">
                              {testimonialsList.filter(t => t.status === 'pending').length} Pending
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTestimonialSubTab('posters')}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            testimonialSubTab === 'posters'
                              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                              : 'text-gray-600 hover:text-brand-blue hover:bg-white'
                          }`}
                        >
                          <Trophy size={16} />
                          <span>Hall of Fame Posters ({hallOfFamePosters.length})</span>
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 font-semibold px-2">
                        {testimonialSubTab === 'testimonials' ? (
                          <span>{testimonialsList.filter(t => t.status === 'approved').length} Live on Website</span>
                        ) : (
                          <span>{hallOfFamePosters.length} Active Banners</span>
                        )}
                      </div>
                    </div>

                    {testimonialSubTab === 'testimonials' ? (
                      <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              Total Testimonials
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-brand-dark">
                              {testimonialsList.length}
                            </span>
                          </div>

                          <div className={`p-4 sm:p-5 rounded-2xl border shadow-2xs ${
                            testimonialsList.filter(t => t.status === 'pending').length > 0
                              ? 'bg-amber-50/80 border-amber-200'
                              : 'bg-white border-gray-100'
                          }`}>
                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                              Pending Verification
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xl sm:text-2xl font-black text-amber-900">
                                {testimonialsList.filter(t => t.status === 'pending').length}
                              </span>
                              {testimonialsList.filter(t => t.status === 'pending').length > 0 && (
                                <span className="text-[9px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
                            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                              Live on Homepage
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-brand-dark">
                              {testimonialsList.filter(t => t.status === 'approved').length}
                            </span>
                          </div>

                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
                            <span className="text-[10px] sm:text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                              Rejected / Hidden
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-brand-dark">
                              {testimonialsList.filter(t => t.status === 'rejected').length}
                            </span>
                          </div>

                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs col-span-2 sm:col-span-1">
                            <span className="text-[10px] sm:text-[11px] font-bold text-brand-blue uppercase tracking-wider block mb-1">
                              Average Rating
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-brand-dark flex items-center gap-1">
                              {testimonialsList.filter(t => t.status === 'approved').length > 0
                                ? (
                                    testimonialsList
                                      .filter(t => t.status === 'approved')
                                      .reduce((acc, t) => acc + (t.rating || 5), 0) /
                                    testimonialsList.filter(t => t.status === 'approved').length
                                  ).toFixed(1)
                                : '0.0'}{' '}
                              <Star size={18} className="text-amber-400 fill-amber-400" />
                            </span>
                          </div>
                        </div>

                        {/* PENDING SUBMISSIONS ALERT (Only shown if candidates have pending submissions) */}
                        {testimonialsList.some(t => t.status === 'pending') && (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                              <ShieldCheck size={22} className="text-amber-600 shrink-0" />
                              <div>
                                <span className="font-extrabold text-xs text-amber-900 block">
                                  {testimonialsList.filter(t => t.status === 'pending').length} Candidate Submissions Awaiting Verification
                                </span>
                                <span className="text-[11px] text-amber-700">
                                  Review and approve candidate submissions before they are published live on the Home page.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTestimonialFilter('pending')}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            >
                              View Pending ({testimonialsList.filter(t => t.status === 'pending').length})
                            </button>
                          </div>
                        )}

                        {/* ADD TESTIMONIAL (Admin Direct Addition) */}
                        <div className="p-6 bg-brand-gray/30 rounded-3xl border border-gray-100 shadow-2xs">
                          <div className="mb-4">
                            <h3 className="text-lg font-black text-brand-dark flex items-center gap-2">
                              <Plus size={18} className="text-brand-blue" />
                              <span>Add Testimonial</span>
                            </h3>
                            <p className="text-xs text-gray-500">
                              Add candidate or doctor reviews to publish live on the website.
                            </p>
                          </div>

                          <form onSubmit={handleAddAdminTestimonial} className="space-y-4">
                            <div className="grid sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[11px] font-extrabold text-brand-dark uppercase tracking-wider mb-1.5">
                                  Doctor / Candidate Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newTestimonial.name}
                                  onChange={e => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                                  placeholder="Dr. Sarah Jenkins"
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-extrabold text-brand-dark uppercase tracking-wider mb-1.5">
                                  Role / Target Exam <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newTestimonial.role}
                                  onChange={e => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
                                  placeholder="e.g. DHA Exam Candidate"
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-extrabold text-brand-dark uppercase tracking-wider mb-1.5">
                                  Student ID (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={newTestimonial.studentId}
                                  onChange={e => setNewTestimonial({ ...newTestimonial, studentId: e.target.value })}
                                  placeholder="e.g. PRO-2025-104"
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                                />
                              </div>
                            </div>

                            {/* Rating (Stars) */}
                            <div>
                              <label className="block text-[11px] font-extrabold text-brand-dark uppercase tracking-wider mb-1.5">
                                Rating (Stars)
                              </label>
                              <div className="inline-flex items-center gap-1.5 py-2 px-3 bg-white border border-gray-200 rounded-xl">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                                    className="p-0.5 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                                  >
                                    <Star
                                      size={20}
                                      fill={star <= newTestimonial.rating ? 'currentColor' : 'none'}
                                      className={star <= newTestimonial.rating ? 'text-amber-400' : 'text-gray-300'}
                                    />
                                  </button>
                                ))}
                                <span className="text-xs font-bold text-gray-500 ml-2">
                                  {newTestimonial.rating} / 5 Stars
                                </span>
                              </div>
                            </div>

                            {/* Avatar Selection: Male or Female */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200">
                              <AvatarPicker
                                value={newTestimonial.avatar}
                                onChange={avatar => setNewTestimonial({ ...newTestimonial, avatar })}
                                label="Select Doctor Avatar"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-extrabold text-brand-dark uppercase tracking-wider mb-1.5">
                                Testimonial Review Quote <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                rows={3}
                                required
                                value={newTestimonial.text}
                                onChange={e => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                                placeholder="Describe the candidate's journey and exam preparation outcome with Promedo..."
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue resize-none leading-relaxed"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmittingTestimonial}
                              className="px-6 py-3.5 bg-brand-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-brand-blue/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                            >
                              <Plus size={16} />
                              <span>{isSubmittingTestimonial ? 'Saving...' : 'Publish Testimonial'}</span>
                            </button>
                          </form>
                        </div>

                        {/* TESTIMONIALS DIRECTORY & CRUD MANAGER */}
                        <div>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-xl font-black text-brand-dark">All Testimonials & Verification Directory</h3>
                                <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-brand-blue rounded-full font-bold">
                                  {testimonialsList.length} Total
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Manage, edit, verify, or remove all candidate and admin testimonials in the system.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={handleSyncAllTestimonialsToFirestore}
                                disabled={isSyncingToFirestore}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all border border-emerald-200 shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Save and persist all verified testimonials into Firestore collection"
                              >
                                <CloudUpload size={14} className={isSyncingToFirestore ? 'animate-bounce text-emerald-600' : 'text-emerald-600'} />
                                <span>{isSyncingToFirestore ? 'Saving to Firestore...' : 'Save All to Firestore'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Search and Filters Toolbar */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 p-3 bg-gray-50/70 rounded-2xl border border-gray-100">
                            {/* Search bar */}
                            <div className="relative flex-1 max-w-md">
                              <Search size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                              <input
                                type="text"
                                value={testimonialSearch}
                                onChange={e => setTestimonialSearch(e.target.value)}
                                placeholder="Search name, student ID, quote..."
                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                              />
                              {testimonialSearch && (
                                <button
                                  type="button"
                                  onClick={() => setTestimonialSearch('')}
                                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs overflow-x-auto">
                              {(
                                [
                                  { key: 'all', label: `All (${testimonialsList.length})` },
                                  { key: 'pending', label: `Pending (${testimonialsList.filter(t => t.status === 'pending').length})` },
                                  { key: 'approved', label: `Approved (${testimonialsList.filter(t => t.status === 'approved').length})` },
                                  { key: 'rejected', label: `Rejected (${testimonialsList.filter(t => t.status === 'rejected').length})` }
                                ] as const
                              ).map(tab => (
                                <button
                                  key={tab.key}
                                  type="button"
                                  onClick={() => setTestimonialFilter(tab.key)}
                                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                                    testimonialFilter === tab.key
                                      ? 'bg-brand-blue text-white shadow-2xs'
                                      : 'text-gray-500 hover:text-brand-dark'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Testimonial Cards Grid */}
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {testimonialsList
                              .filter(t => {
                                if (testimonialFilter === 'approved') return t.status === 'approved';
                                if (testimonialFilter === 'pending') return t.status === 'pending';
                                if (testimonialFilter === 'rejected') return t.status === 'rejected';
                                return true;
                              })
                              .filter(t => {
                                if (!testimonialSearch.trim()) return true;
                                const q = testimonialSearch.toLowerCase();
                                return (
                                  (t.name || '').toLowerCase().includes(q) ||
                                  (t.studentId || '').toLowerCase().includes(q) ||
                                  (t.role || '').toLowerCase().includes(q) ||
                                  (t.text || '').toLowerCase().includes(q)
                                );
                              }).length === 0 ? (
                                <div className="sm:col-span-2 lg:col-span-3 py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                                  <MessageSquare size={28} className="mx-auto text-gray-300 mb-2" />
                                  <p className="text-xs font-bold text-gray-700">No Testimonials Found</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {testimonialSearch
                                      ? `No testimonials match "${testimonialSearch}". Try a different keyword.`
                                      : 'No testimonials currently match the selected filter.'}
                                  </p>
                                </div>
                              ) : (
                                testimonialsList
                                  .filter(t => {
                                    if (testimonialFilter === 'approved') return t.status === 'approved';
                                    if (testimonialFilter === 'pending') return t.status === 'pending';
                                    if (testimonialFilter === 'rejected') return t.status === 'rejected';
                                    return true;
                                  })
                                  .filter(t => {
                                    if (!testimonialSearch.trim()) return true;
                                    const q = testimonialSearch.toLowerCase();
                                    return (
                                      (t.name || '').toLowerCase().includes(q) ||
                                      (t.studentId || '').toLowerCase().includes(q) ||
                                      (t.role || '').toLowerCase().includes(q) ||
                                      (t.text || '').toLowerCase().includes(q)
                                    );
                                  })
                                  .map((item, idx) => (
                                    <div
                                      key={item.id || idx}
                                      className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                                        item.status === 'approved'
                                          ? 'bg-white border-gray-100 hover:shadow-md'
                                          : item.status === 'pending'
                                          ? 'bg-amber-50/40 border-amber-200'
                                          : 'bg-red-50/30 border-red-200'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                              <img
                                                src={item.avatar || `https://picsum.photos/seed/${item.id}/100/100`}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <div>
                                              <h4 className="font-bold text-xs text-brand-dark">{item.name}</h4>
                                              <p className="text-[10px] text-gray-400 font-medium">{item.role}</p>
                                            </div>
                                          </div>

                                          <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                              item.status === 'approved'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : item.status === 'pending'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {item.status}
                                            </span>
                                            {item.studentId && (
                                              <span className="text-[9px] font-extrabold text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-0.5">
                                                <ShieldCheck size={10} />
                                                ID: {item.studentId}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Quote Text */}
                                        <p className="text-xs text-gray-600 italic bg-gray-50/80 p-3 rounded-xl mb-3 leading-relaxed">
                                          "{item.text}"
                                        </p>
                                      </div>

                                      <div className="space-y-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-0.5 text-amber-400">
                                            {[1, 2, 3, 4, 5].map(s => (
                                              <Star
                                                key={s}
                                                size={12}
                                                fill={s <= (item.rating || 5) ? 'currentColor' : 'none'}
                                                className={s <= (item.rating || 5) ? 'text-amber-400' : 'text-gray-300'}
                                              />
                                            ))}
                                            <span className="text-[10px] font-bold text-gray-400 ml-1">
                                              ({item.rating || 5}★)
                                            </span>
                                          </div>

                                          <span className="text-[10px] text-gray-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>

                                        {/* Standard CRUD Action Buttons */}
                                        <div className="flex items-center justify-between gap-1 pt-1">
                                          <div className="flex items-center gap-1">
                                            {item.status !== 'approved' ? (
                                              <button
                                                type="button"
                                                onClick={() => handleSetTestimonialStatusItem(item.id, 'approved')}
                                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                                title="Approve & Publish to Homepage"
                                              >
                                                <CheckCircle size={12} />
                                                <span>Approve</span>
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handleSetTestimonialStatusItem(item.id, 'pending')}
                                                className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                                title="Withdraw to Pending Review"
                                              >
                                                <ShieldCheck size={12} />
                                                <span>To Pending</span>
                                              </button>
                                            )}

                                            {item.status !== 'rejected' && (
                                              <button
                                                type="button"
                                                onClick={() => handleSetTestimonialStatusItem(item.id, 'rejected')}
                                                className="px-2 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                                title="Mark as Rejected"
                                              >
                                                Reject
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            {/* Edit Button */}
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditTestimonial(item)}
                                              className="px-2.5 py-1.5 bg-blue-50 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                              title="Edit Testimonial Details"
                                            >
                                              <Edit2 size={13} />
                                              <span>Edit</span>
                                            </button>

                                            {/* Remove Button */}
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteTestimonialItem(item.id, item.name)}
                                              className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                              title="Remove Testimonial from Firestore & Website"
                                            >
                                              <Trash2 size={13} />
                                              <span>Remove</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                              )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* POSTERS SUB-TAB */
                      <div className="space-y-10">
                        {/* Add Poster Form */}
                        <div className="p-6 bg-brand-gray/30 rounded-3xl border border-gray-100">
                          <h3 className="text-lg font-bold text-brand-dark mb-2 flex items-center gap-2">
                            <Plus size={18} className="text-brand-blue" />
                            Add Poster Image directly to Hall of Fame
                          </h3>
                          <p className="text-xs text-gray-500 mb-4">Paste an image URL for a success poster to instantly add it to the scrolling marquee.</p>
                          
                          <form onSubmit={handleAddDirectPoster} className="grid sm:grid-cols-3 gap-4">
                            <input
                              type="text"
                              value={directDoctorName}
                              onChange={e => setDirectDoctorName(e.target.value)}
                              placeholder="Doctor Name / Exam (Optional)"
                              className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                            />
                            <input
                              type="url"
                              required
                              value={directPosterUrl}
                              onChange={e => setDirectPosterUrl(e.target.value)}
                              placeholder="https://images.unsplash.com/... (Poster Image URL)"
                              className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-blue"
                            />
                            <button
                              type="submit"
                              className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
                            >
                              Add Poster
                            </button>
                          </form>
                        </div>

                        {/* Direct Admin Hall of Fame Posters */}
                        {hallOfFamePosters.length > 0 && (
                          <div>
                            <h3 className="text-xl font-bold text-brand-dark mb-4">
                              Directly Added Hall of Fame Posters ({hallOfFamePosters.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {hallOfFamePosters.map(poster => (
                                <div key={poster.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                                  <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-3">
                                    <img src={poster.posterUrl || poster.image} alt="Poster" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]">
                                      {poster.name || 'Poster'}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteHofPoster(poster.id)}
                                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                      title="Remove Poster"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'ads' ? (
                  <div className="space-y-8">
                    {/* Create Ad Form */}
                    <div className="p-6 bg-brand-gray/30 rounded-3xl border border-gray-100">
                      <h3 className="text-lg font-bold text-brand-dark mb-2 flex items-center gap-2">
                        <Megaphone size={20} className="text-brand-blue" />
                        Create Promotional Ad Banner
                      </h3>
                      <p className="text-xs text-gray-500 mb-6">Published ads immediately display at the top of the Mock Tests listing pages.</p>

                      <form onSubmit={handleAddAd} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Ad Headline Title</label>
                            <input 
                              type="text"
                              required
                              value={newAd.title}
                              onChange={e => setNewAd({ ...newAd, title: e.target.value })}
                              placeholder="e.g. 🔥 2026 DHA & HAAD Pass Guarantee"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Badge Tag</label>
                            <input 
                              type="text"
                              value={newAd.badge}
                              onChange={e => setNewAd({ ...newAd, badge: e.target.value })}
                              placeholder="e.g. 40% OFF Offer"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Subtitle / Description</label>
                          <input 
                            type="text"
                            required
                            value={newAd.subtitle}
                            onChange={e => setNewAd({ ...newAd, subtitle: e.target.value })}
                            placeholder="e.g. Get 40% OFF on All Complete GP Packages + Free 150-Question Simulator Access!"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                          />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Promo Code (Optional)</label>
                            <input 
                              type="text"
                              value={newAd.code}
                              onChange={e => setNewAd({ ...newAd, code: e.target.value })}
                              placeholder="e.g. PROMETRIC2026"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">CTA Button Text</label>
                            <input 
                              type="text"
                              value={newAd.ctaText}
                              onChange={e => setNewAd({ ...newAd, ctaText: e.target.value })}
                              placeholder="Claim Discount"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Target Page Link</label>
                            <input 
                              type="text"
                              value={newAd.link}
                              onChange={e => setNewAd({ ...newAd, link: e.target.value })}
                              placeholder="/mocktests or /mock-test-intro"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-3.5 bg-brand-blue text-white rounded-xl font-extrabold text-xs hover:bg-blue-700 transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
                        >
                          Publish Ad Banner
                        </button>
                      </form>
                    </div>

                    {/* Active Ads List */}
                    <div>
                      <h3 className="text-xl font-bold text-brand-dark mb-4">
                        Published Platform Advertisements ({ads.length})
                      </h3>

                      {ads.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                          No custom ads published yet. Default promo banners are currently showing.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {ads.map(ad => (
                            <div key={ad.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-md">
                                    {ad.badge || 'Ad Banner'}
                                  </span>
                                  {ad.code && <span className="text-[10px] font-mono text-gray-500">Code: {ad.code}</span>}
                                </div>
                                <h4 className="font-extrabold text-brand-dark text-sm">{ad.title}</h4>
                                <p className="text-xs text-gray-500 font-medium">{ad.subtitle}</p>
                              </div>

                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'appointments' ? (
                  <div className="space-y-6">
                    {/* Live Stream Header Control Bar */}
                    <div className="p-5 bg-gradient-to-r from-blue-950 via-brand-dark to-slate-900 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-900/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Radio size={20} className="animate-pulse text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-white">Live Appointment Stream</h3>
                            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              Active Listener
                            </span>
                          </div>
                          <p className="text-xs text-blue-200/80 mt-0.5">
                            New candidate requests appear here in real-time with visual popups & audio chime alerts ({appointments.length} total).
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* View Switcher Toggle Buttons */}
                        <div className="bg-white/10 p-1 rounded-2xl border border-white/15 flex items-center gap-1">
                          <button
                            onClick={() => setAppointmentViewMode('calendar')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              appointmentViewMode === 'calendar'
                                ? 'bg-white text-brand-dark shadow-xs'
                                : 'text-blue-100 hover:text-white'
                            }`}
                          >
                            <CalendarDays size={14} />
                            <span>Calendar</span>
                          </button>

                          <button
                            onClick={() => setAppointmentViewMode('list')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              appointmentViewMode === 'list'
                                ? 'bg-white text-brand-dark shadow-xs'
                                : 'text-blue-100 hover:text-white'
                            }`}
                          >
                            <List size={14} />
                            <span>List</span>
                          </button>
                        </div>

                        <button
                          onClick={triggerTestNotification}
                          className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Play size={12} className="text-emerald-400" />
                          Test Alert
                        </button>
                      </div>
                    </div>

                    {appointmentViewMode === 'calendar' ? (
                      <AppointmentCalendar
                        appointments={appointments}
                        onToggleStatus={handleToggleAppointmentStatus}
                        onDelete={handleDeleteAppointment}
                      />
                    ) : appointments.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 font-medium">
                        <CalendarCheck size={48} className="mx-auto mb-3 text-brand-blue/40" />
                        <p className="text-base font-bold text-gray-600">No appointments booked yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Booked consultations from candidates will appear here in real-time.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {appointments.map((appt) => {
                          const isOthers = appt.examPreparingFor === 'OTHERS' || appt.examPreparingFor === 'Other';
                          return (
                            <div 
                              key={appt.id} 
                              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                            >
                              <div className="space-y-3 flex-1">
                                {/* Candidate Name & Status Badge */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-lg font-black text-brand-dark">
                                    {appt.fullName || 'Anonymous Candidate'}
                                  </h3>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    appt.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                    appt.status === 'Contacted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    'bg-amber-100 text-amber-700 border border-amber-200'
                                  }`}>
                                    {appt.status || 'Pending'}
                                  </span>
                                  {appt.createdAt && (
                                    <span className="text-[11px] text-gray-400 font-medium ml-auto lg:ml-0">
                                      Booked: {new Date(appt.createdAt).toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                {/* Exam Selected / Requirement */}
                                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Exam / Service:</span>
                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${isOthers ? 'bg-purple-100 text-purple-700' : 'bg-brand-blue/10 text-brand-blue'}`}>
                                      {appt.examPreparingFor || 'Not Specified'}
                                    </span>
                                  </div>

                                  {/* Show "What they are looking for" if OTHERS selected */}
                                  {isOthers && appt.otherDetails && (
                                    <div className="mt-2.5 bg-purple-50/90 p-3.5 rounded-xl border border-purple-200/80">
                                      <p className="text-[11px] font-black text-purple-900 flex items-center gap-1.5 mb-1">
                                        <MessageSquare size={14} className="text-purple-600 shrink-0" />
                                        <span>Looking For (Custom Requirement):</span>
                                      </p>
                                      <p className="text-xs font-medium text-purple-950 leading-relaxed italic bg-white/60 p-2.5 rounded-lg border border-purple-100">
                                        "{appt.otherDetails}"
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Candidate Contact & Qualification Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-600 pt-1">
                                  <div>
                                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase">WhatsApp</span>
                                    <a 
                                      href={`https://wa.me/${(appt.whatsapp || '').replace(/[^0-9]/g, '')}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="font-extrabold text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                      <Phone size={12} />
                                      <span>{appt.whatsapp || 'N/A'}</span>
                                    </a>
                                  </div>

                                  <div>
                                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase">Email</span>
                                    <span className="font-bold text-gray-800 truncate block mt-0.5" title={appt.email}>
                                      {appt.email || 'N/A'}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase">Qualification</span>
                                    <span className="font-bold text-gray-800 mt-0.5 block">
                                      {appt.qualification || 'N/A'} {appt.graduationYear ? `(${appt.graduationYear})` : ''}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase">Country / Exam Month</span>
                                    <span className="font-bold text-gray-800 mt-0.5 block">
                                      {appt.country || 'N/A'} {appt.plannedExamDate ? `• ${appt.plannedExamDate}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                                <button
                                  onClick={() => handleToggleAppointmentStatus(appt.id, appt.status || 'Pending')}
                                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  Status: {appt.status === 'Contacted' ? 'Set Completed' : appt.status === 'Completed' ? 'Set Pending' : 'Set Contacted'}
                                </button>
                                <button
                                  onClick={() => handleDeleteAppointment(appt.id)}
                                  className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors cursor-pointer"
                                  title="Delete Appointment"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (activeTab === 'users' && userManagementSubTab === 'user-login') ? (
                  /* ==============================================================
                     SECTION: User Login
                     ============================================================== */
                  <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-500/10 via-brand-blue/5 to-transparent rounded-3xl border border-blue-200/60">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-lg shadow-brand-blue/25 shrink-0">
                          <UserCheck size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">User Login</h3>
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-brand-blue text-white shadow-xs uppercase tracking-wider">
                              Candidate Directory
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Live candidate registration details, contact numbers, and target exam preparations.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={handleRefreshLogins}
                          disabled={isRefreshingLogins}
                          className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-gray-200 shadow-2xs cursor-pointer"
                          title="Refresh live logins"
                        >
                          <RefreshCw size={14} className={isRefreshingLogins ? 'animate-spin text-brand-blue' : 'text-gray-500'} />
                          <span>{isRefreshingLogins ? 'Syncing...' : 'Refresh'}</span>
                        </button>

                        <button
                          onClick={handleExportLoginsCSV}
                          disabled={userLogins.length === 0}
                          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                            userLogins.length === 0
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                              : 'bg-brand-blue hover:bg-[#2b4083] text-white shadow-brand-blue/20'
                          }`}
                        >
                          <Download size={14} />
                          <span>Export CSV</span>
                        </button>

                        {isConfirmingClearLogins ? (
                          <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                            <span className="text-[11px] font-bold text-red-700 px-2">Clear data?</span>
                            <button
                              onClick={handleClearUserLogins}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Yes, Clear
                            </button>
                            <button
                              onClick={() => setIsConfirmingClearLogins(false)}
                              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          userLogins.length > 0 && (
                            <button
                              onClick={() => setIsConfirmingClearLogins(true)}
                              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-red-200 cursor-pointer"
                              title="Clear user login records (Does NOT delete All Registered Users)"
                            >
                              <Trash2 size={14} />
                              <span>Clear Data</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {clearSuccessToast && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span>Data cleared successfully. Only new candidate entries will appear here. All Registered Users accounts are untouched.</span>
                      </div>
                    )}

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Candidates Registered</span>
                          <Users size={16} className="text-brand-blue" />
                        </div>
                        <p className="text-2xl font-black text-gray-900">{totalCandidateRecords}</p>
                        <span className="text-[10px] text-gray-500 mt-1 font-semibold">Genuine mock test & login records</span>
                      </div>

                      <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">Top Exam Target</span>
                          <Award size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-base font-black text-gray-900 truncate" title={topExamName}>{topExamName.split('(')[0]}</p>
                        <span className="text-[10px] text-emerald-600 mt-1 font-semibold">Highest candidate interest</span>
                      </div>

                      <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-400 mb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">WhatsApp Reachable</span>
                          <MessageSquare size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-gray-900">{userLogins.filter(u => u.phone).length}</p>
                        <span className="text-[10px] text-gray-500 mt-1 font-semibold">Candidates with mobile number</span>
                      </div>
                    </div>

                    {/* Search, Filter & Sort Bar */}
                    <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
                      <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={userLoginSearch}
                          onChange={e => setUserLoginSearch(e.target.value)}
                          placeholder="Search name, mobile, email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-blue"
                        />
                        {userLoginSearch && (
                          <button
                            onClick={() => setUserLoginSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                        {/* Exam Filter */}
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                          <Filter size={13} className="text-gray-400" />
                          <select
                            value={userLoginExamFilter}
                            onChange={e => setUserLoginExamFilter(e.target.value)}
                            className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
                          >
                            <option value="ALL">All Exam Boards</option>
                            <option value="DHA">DHA Dubai</option>
                            <option value="HAAD">HAAD / DOH Abu Dhabi</option>
                            <option value="MOHAP">MOHAP UAE</option>
                            <option value="SMLE">SMLE Saudi</option>
                            <option value="OMSB">OMSB Oman</option>
                            <option value="QCHP">QCHP Qatar</option>
                            <option value="NHRA">NHRA Bahrain</option>
                            <option value="GP Prometric">GP Prometric</option>
                            <option value="Nursing">Nursing</option>
                            <option value="Dental">Dental</option>
                            <option value="Other">Other Exams</option>
                          </select>
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                          <ArrowUpDown size={13} className="text-gray-400" />
                          <select
                            value={userLoginSort}
                            onChange={e => setUserLoginSort(e.target.value as any)}
                            className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
                          >
                            <option value="recent">Recently Registered</option>
                            <option value="name">Candidate Name (A-Z)</option>
                            <option value="exam">Exam Board</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                            <th className="py-3.5 px-4 w-12 text-center">#</th>
                            <th className="py-3.5 px-4">Candidate Details</th>
                            <th className="py-3.5 px-4">Mobile Number</th>
                            <th className="py-3.5 px-4">Email Address</th>
                            <th className="py-3.5 px-4">Exam Preparing For</th>
                            <th className="py-3.5 px-4 text-right">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {userLogins.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-20 text-center text-gray-400">
                                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-4 shadow-xs">
                                  <LogIn size={28} />
                                </div>
                                <h4 className="font-extrabold text-base text-gray-800">No Candidate Data Recorded Yet</h4>
                                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                                  From now on, only genuine data entered by candidates when registering for a mock test (Name, Mobile, Email, and Exam chosen) or signing into their account will appear here.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-[11px] font-bold border border-emerald-200/60">
                                  <Check size={14} className="text-emerald-600" />
                                  <span>All Registered Users section remains completely intact and untouched</span>
                                </div>
                              </td>
                            </tr>
                          ) : filteredUserLogins.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-16 text-center text-gray-400">
                                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="font-bold text-sm text-gray-600">No candidate records match your filter</p>
                                <p className="text-xs text-gray-400 mt-0.5">Try clearing your search query or exam filter.</p>
                                <button
                                  onClick={() => {
                                    setUserLoginSearch('');
                                    setUserLoginExamFilter('ALL');
                                  }}
                                  className="mt-3 px-4 py-1.5 bg-blue-50 text-brand-blue font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  Reset Filters
                                </button>
                              </td>
                            </tr>
                          ) : (
                            filteredUserLogins.map((item, index) => {
                              const rank = index + 1;
                              const cleanDigitsPhone = (item.phone || '').replace(/[^0-9]/g, '');

                              return (
                                <tr key={item.id || index} className="hover:bg-blue-50/30 transition-colors group">
                                  {/* # Index */}
                                  <td className="py-4 px-4 text-center font-bold text-gray-400 text-xs">
                                    {rank}
                                  </td>

                                  {/* Candidate */}
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 bg-blue-50 text-brand-blue border border-blue-100">
                                        {item.name?.charAt(0) || 'D'}
                                      </div>
                                      <div>
                                        <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors">
                                          {item.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-gray-400 font-medium">
                                            {item.source || 'Mock Test Simulator'}
                                          </span>
                                          <span className="text-gray-300 text-[10px]">•</span>
                                          <span className="text-[10px] text-gray-500 font-semibold">
                                            {formatTimeAgo(item.lastLoginAt || item.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Mobile Number */}
                                  <td className="py-4 px-4 whitespace-nowrap">
                                    {item.phone ? (
                                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                                        <span>{item.phone}</span>
                                        <button
                                          onClick={() => handleCopyPhone(item.id, item.phone)}
                                          className="text-gray-400 hover:text-brand-blue transition-colors p-1 cursor-pointer"
                                          title="Copy Phone Number"
                                        >
                                          {copiedLoginId === item.id ? (
                                            <Check size={12} className="text-green-600 font-black" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic">None</span>
                                    )}
                                  </td>

                                  {/* Email Address */}
                                  <td className="py-4 px-4 font-medium text-gray-600">
                                    <a 
                                      href={`mailto:${item.email}`}
                                      className="hover:text-brand-blue hover:underline"
                                    >
                                      {item.email}
                                    </a>
                                  </td>

                                  {/* Exam Preparing For */}
                                  <td className="py-4 px-4">
                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black border ${getExamBadgeStyle(item.examPreparingFor)}`}>
                                      {item.examPreparingFor}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-4 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {cleanDigitsPhone && (
                                        <a
                                          href={`https://wa.me/${cleanDigitsPhone}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors inline-flex items-center justify-center border border-emerald-200"
                                          title="Chat on WhatsApp"
                                        >
                                          <MessageSquare size={13} />
                                        </a>
                                      )}
                                      <a
                                        href={`mailto:${item.email}?subject=Promedo%20Licensing%20Exam%20Prep&body=Hello%20${encodeURIComponent(item.name)},`}
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-lg transition-colors inline-flex items-center justify-center border border-blue-200"
                                        title="Send Email"
                                      >
                                        <Mail size={13} />
                                      </a>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Details</th>
                        <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">
                          {activeTab === 'users' ? 'Role' : activeTab === 'courses' ? 'Price' : activeTab === 'mocktests' ? 'Questions/Time' : 'Purchase Date'}
                        </th>
                        <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {activeTab === 'users' && users.length === 0 && (
                        <tr><td colSpan={3} className="py-20 text-center text-gray-400">No users found.</td></tr>
                      )}
                      {activeTab === 'users' && users.map(user => {
                        const currentRole = user.role || 'user';
                        const isMenuOpen = roleMenuUserId === user.id;
                        return (
                          <tr key={user.id} className="group hover:bg-gray-50/60 transition-colors">
                            <td className="py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-brand-gray flex items-center justify-center font-bold text-brand-blue">
                                  {user.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{user.name || 'Candidate'}</p>
                                  <p className="text-xs text-gray-400">{user.email}</p>
                                  {user.phone && (
                                    <p className="text-[11px] font-semibold text-brand-blue flex items-center gap-1 mt-0.5">
                                      <span>📞 {user.phone}</span>
                                      {user.examPreparingFor && <span className="text-gray-400 font-normal">• {user.examPreparingFor}</span>}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-6">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                currentRole === 'admin'
                                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : currentRole === 'student'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {currentRole === 'admin' ? (
                                  <>
                                    <Crown size={12} className="text-purple-600" />
                                    <span>Admin</span>
                                  </>
                                ) : currentRole === 'student' ? (
                                  <>
                                    <Award size={12} className="text-emerald-700" />
                                    <span>Student</span>
                                  </>
                                ) : (
                                  <>
                                    <Users size={12} className="text-gray-500" />
                                    <span>User</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-6">
                              <div className="relative inline-block text-left">
                                <button 
                                  onClick={() => setRoleMenuUserId(isMenuOpen ? null : user.id)}
                                  disabled={updatingRoleId === user.id}
                                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold cursor-pointer ${
                                    isMenuOpen
                                      ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20'
                                      : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-brand-blue border-gray-200 shadow-2xs'
                                  }`}
                                  title="Change User Role (user, student, admin)"
                                >
                                  <Edit2 size={15} />
                                  <span>{updatingRoleId === user.id ? 'Saving...' : 'Change Role'}</span>
                                </button>

                                {/* Popover Role Options Menu */}
                                {isMenuOpen && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setRoleMenuUserId(null)}
                                    />
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 text-left animate-in fade-in zoom-in-95">
                                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Select Role</p>
                                        <p className="text-xs font-bold text-gray-900 truncate">{user.name || user.email}</p>
                                      </div>

                                      {/* Option 1: User */}
                                      <button
                                        onClick={() => handleUpdateUserRole(user.id, 'user')}
                                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                          currentRole === 'user' 
                                            ? 'bg-gray-100 text-gray-900 font-extrabold border border-gray-200' 
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5 text-gray-700">
                                          <Users size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold">User</span>
                                            {currentRole === 'user' && <Check size={14} className="text-gray-900 font-black" />}
                                          </div>
                                          <p className="text-[10px] text-gray-500 font-normal leading-tight mt-0.5">
                                            Default role for registered users. Standard platform access.
                                          </p>
                                        </div>
                                      </button>

                                      {/* Option 2: Student */}
                                      <button
                                        onClick={() => handleUpdateUserRole(user.id, 'student')}
                                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer mt-1 ${
                                          currentRole === 'student' 
                                            ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200' 
                                            : 'hover:bg-emerald-50/60 text-gray-700'
                                        }`}
                                      >
                                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-emerald-700">
                                          <Award size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-emerald-900">Student</span>
                                            {currentRole === 'student' && <Check size={14} className="text-emerald-700 font-black" />}
                                          </div>
                                          <p className="text-[10px] text-emerald-700/80 font-normal leading-tight mt-0.5">
                                            Purchased course candidate. Unlocks exclusive Subject Q-Banks.
                                          </p>
                                        </div>
                                      </button>

                                      {/* Option 3: Admin */}
                                      <button
                                        onClick={() => handleUpdateUserRole(user.id, 'admin')}
                                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer mt-1 ${
                                          currentRole === 'admin' 
                                            ? 'bg-purple-50 text-purple-900 font-extrabold border border-purple-200' 
                                            : 'hover:bg-purple-50/60 text-gray-700'
                                        }`}
                                      >
                                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5 text-purple-700">
                                          <Crown size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-purple-900">Admin</span>
                                            {currentRole === 'admin' && <Check size={14} className="text-purple-700 font-black" />}
                                          </div>
                                          <p className="text-[10px] text-purple-700/80 font-normal leading-tight mt-0.5">
                                            Full administrative privileges and management tools.
                                          </p>
                                        </div>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {activeTab === 'courses' && courses.length === 0 && (
                        <tr><td colSpan={3} className="py-20 text-center text-gray-400">No courses found.</td></tr>
                      )}
                      {activeTab === 'courses' && courses.map(course => (
                        <tr key={course.id} className="group">
                          <td className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-brand-gray overflow-hidden">
                                <img src={course.image} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="font-bold">{course.title}</p>
                                <p className="text-xs text-gray-400">{course.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 font-bold text-brand-blue">
                            ${course.price}
                          </td>
                          <td className="py-6">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditCourse(course)}
                                className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-brand-blue transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCourse(course.id, course.title)}
                                className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'mocktests' && mocktests.length === 0 && (
                        <tr><td colSpan={3} className="py-20 text-center text-gray-400">No mock tests found.</td></tr>
                      )}
                      {activeTab === 'mocktests' && mocktests.map(test => (
                        <tr key={test.id} className="group">
                          <td className="py-6">
                            <div>
                              <p className="font-bold">{test.title}</p>
                              <p className="text-xs text-gray-400 uppercase">{test.exam} Exam</p>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="space-y-1">
                              <p className="font-bold text-brand-blue">{Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : (test.questions?.length || 0))} Qs / {test.timeLimit} Min</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${test.isPaid ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {test.isPaid ? `Paid (${test.price || '$49'})` : 'Free'}
                              </span>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => navigate(`/adminlandingpage/mocktest/edit/${test.id}`)}
                                className="p-2 rounded-lg bg-blue-50 text-brand-blue hover:bg-brand-blue hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                                title="Edit Test & Questions"
                              >
                                <Edit2 size={16} />
                                Edit Test & Questions
                              </button>
                              <button 
                                onClick={() => handleDeleteMocktest(test.id, test.title)}
                                className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'sales' && sales.length === 0 && (
                        <tr><td colSpan={3} className="py-20 text-center text-gray-400">No sales records found.</td></tr>
                      )}
                      {activeTab === 'sales' && sales.map(sale => (
                        <tr key={sale.id} className="group">
                          <td className="py-6">
                            <div>
                              <p className="font-bold">{sale.title}</p>
                              <p className="text-xs text-gray-400">User ID: {sale.userId}</p>
                            </div>
                          </td>
                          <td className="py-6 text-xs text-gray-500">
                            {new Date(sale.enrolledAt).toLocaleDateString()}
                          </td>
                          <td className="py-6">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-bold uppercase">
                              Paid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-brand-gray rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl mb-8">{editingId ? 'Edit Course' : 'Add New Course'}</h2>
              
              <form onSubmit={handleAddCourse} className="space-y-6">
                <div className="space-y-6">
                  <h3 className="text-xl mb-4">Home Page Details</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Title</label>
                      <input 
                        required
                        type="text"
                        value={newCourse.title}
                        onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                        placeholder="e.g. DHA Exam Preparation"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Category</label>
                      <select 
                        value={newCourse.category}
                        onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                      >
                        <option value="General Practitioners">General Practitioners</option>
                        <option value="Specialist Prometric">Specialist Prometric</option>
                        <option value="Nursing Prometric">Nursing Prometric</option>
                        <option value="Dental Prometric">Dental Prometric</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Description</label>
                    <textarea 
                      required
                      rows={3}
                      value={newCourse.description}
                      onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                      className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                      placeholder="General course description..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hero Image URL</label>
                      <input 
                        required
                        type="url"
                        value={newCourse.image}
                        onChange={e => setNewCourse({...newCourse, image: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price ($)</label>
                      <input 
                        required
                        type="number"
                        value={newCourse.price}
                        onChange={e => setNewCourse({...newCourse, price: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                        placeholder="99.99"
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <h3 className="text-xl mb-4">Course About Section</h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About the Exam Image URL</label>
                        <input 
                          type="url"
                          value={newCourse.examImage}
                          onChange={e => setNewCourse({...newCourse, examImage: e.target.value})}
                          className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About the Exam Content</label>
                        <textarea 
                          rows={3}
                          value={newCourse.examDetails}
                          onChange={e => setNewCourse({...newCourse, examDetails: e.target.value})}
                          className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                          placeholder="Detailed information about the exam..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About the Exam Video Link</label>
                        <input 
                          type="url"
                          value={newCourse.examVideoUrl}
                          onChange={e => setNewCourse({...newCourse, examVideoUrl: e.target.value})}
                          className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                          placeholder="YouTube or Video URL"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Exam Features (One per line)</label>
                        <textarea 
                          rows={4}
                          value={newCourse.examPoints}
                          onChange={e => setNewCourse({...newCourse, examPoints: e.target.value})}
                          className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                          placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">FAQ (Question | Answer per line)</label>
                        <textarea 
                          rows={4}
                          value={newCourse.faqs}
                          onChange={e => setNewCourse({...newCourse, faqs: e.target.value})}
                          className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                          placeholder="What is the exam? | The exam is...&#10;How to apply? | You can apply by..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-xl mb-4">Exam Specific Content</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Exam Image URL</label>
                      <input 
                        type="url"
                        value={newCourse.examImage}
                        onChange={e => setNewCourse({...newCourse, examImage: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                        placeholder="Image for 'About the Exam' section"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Exam Video URL (YouTube/Direct Link)</label>
                      <input 
                        type="url"
                        value={newCourse.examVideoUrl}
                        onChange={e => setNewCourse({...newCourse, examVideoUrl: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Exam Content Points (One per line)</label>
                      <textarea 
                        rows={4}
                        value={newCourse.examPoints}
                        onChange={e => setNewCourse({...newCourse, examPoints: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                        placeholder="Comprehensive Syllabus Coverage&#10;Latest Exam Pattern & Recalls&#10;Expert Faculty Guidance"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gallery Images (Collage) - Comma separated URLs</label>
                      <textarea 
                        rows={3}
                        value={newCourse.galleryImages}
                        onChange={e => setNewCourse({...newCourse, galleryImages: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                        placeholder="https://image1.jpg, https://image2.jpg, ..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">FAQs (Format: Question|Answer - One per line)</label>
                      <textarea 
                        rows={6}
                        value={newCourse.faqs}
                        onChange={e => setNewCourse({...newCourse, faqs: e.target.value})}
                        className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all resize-none"
                        placeholder="What is DHA?|DHA is the Dubai Health Authority licensing exam.&#10;How long is the validity?|The license is valid for one year."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Document (PDF/Material URL)</label>
                  <div className="relative">
                    <input 
                      type="url"
                      value={newCourse.documentUrl}
                      onChange={e => setNewCourse({...newCourse, documentUrl: e.target.value})}
                      className="w-full px-6 py-4 bg-brand-gray/50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue transition-all pl-14"
                      placeholder="https://drive.google.com/..."
                    />
                    <Upload className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary py-4 justify-center text-lg">
                  {editingId ? 'Update Course' : 'Create Course'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteConfirm({ isOpen: false, type: null, id: null, title: null })}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              id="delete-modal-backdrop"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl overflow-hidden z-10 text-center border border-gray-100"
              id="delete-modal-card"
            >
              {/* Decorative Warning Sign */}
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6" id="delete-modal-warning-icon">
                <AlertTriangle size={32} />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2" id="delete-modal-title">
                Delete {deleteConfirm.type === 'course' ? 'Course' : deleteConfirm.type === 'mocktest' ? 'Mock Test' : deleteConfirm.type === 'appointment' ? 'Appointment' : deleteConfirm.type === 'ad' ? 'Advertisement' : deleteConfirm.type === 'poster' ? 'Hall of Fame Poster' : 'Testimonial Review'}?
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-500 mb-8 leading-relaxed" id="delete-modal-message">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.title}"</span>? 
                {deleteConfirm.type === 'course' 
                  ? ' This action is permanent and cannot be undone.'
                  : deleteConfirm.type === 'mocktest'
                  ? ' This will permanently remove the test and ALL its questions.'
                  : deleteConfirm.type === 'appointment'
                  ? ' This will remove the booked appointment from your schedule.'
                  : deleteConfirm.type === 'ad'
                  ? ' This will remove the promotional banner from the candidate portal.'
                  : deleteConfirm.type === 'poster'
                  ? ' This will remove the achiever poster from the Hall of Fame.'
                  : ' This will remove the review from both the Admin Panel and the public website.'}
              </p>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  id="delete-modal-cancel-btn"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, title: null })}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="delete-modal-confirm-btn"
                  disabled={isDeleting}
                  onClick={executeDeletion}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Real-Time Appointment Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-3xl shadow-2xl border-2 border-brand-blue p-5 text-left overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-brand-blue to-purple-600 animate-pulse" />

            <div className="flex items-start justify-between gap-3 mb-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      New Booking
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold">{activeToast.timestamp}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 my-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <h4 className="font-black text-brand-dark text-sm leading-tight">
                {activeToast.fullName}
              </h4>
              <p className="text-xs font-bold text-brand-blue flex items-center gap-1">
                <span>Exam:</span>
                <span className="text-gray-800">{activeToast.examPreparingFor}</span>
              </p>
              {activeToast.otherDetails && (
                <p className="text-[11px] text-purple-900 bg-purple-50 p-2 rounded-lg italic font-medium mt-1">
                  "{activeToast.otherDetails}"
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  markNotifAsRead(activeToast.id);
                  setActiveTab('appointments');
                  setActiveToast(null);
                }}
                className="flex-1 py-2.5 bg-brand-blue text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 transition-all text-center shadow-xs cursor-pointer"
              >
                View Appointment
              </button>
              {activeToast.whatsapp && (
                <a
                  href={`https://wa.me/${activeToast.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center shrink-0"
                  title="Contact via WhatsApp"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditTestimonialModal
        isOpen={isEditTestimonialModalOpen}
        testimonial={editingTestimonial}
        onClose={() => {
          setIsEditTestimonialModalOpen(false);
          setEditingTestimonial(null);
        }}
        onSave={handleSaveTestimonialEdit}
      />

      {/* Firestore Security Rules Helper Modal */}
      <AnimatePresence>
        {firestoreRuleModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFirestoreRuleModalOpen(false)}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setFirestoreRuleModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-dark">Firestore Permission Notice</h3>
                  <p className="text-xs text-gray-500">Firebase project: promedo-5ff5b</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Your remote Firebase database rules currently restrict unauthenticated or unauthorized writes to the <code className="text-brand-blue font-bold">testimonials</code> collection.
                To allow testimonials to be saved into Firestore, add this rule in your Firebase Console:
              </p>

              <div className="bg-gray-900 text-gray-100 rounded-2xl p-4 font-mono text-xs mb-4 relative overflow-x-auto border border-gray-800">
                <pre className="text-[11px] leading-relaxed select-all">
{`match /testimonials/{testimonialId} {
  allow read: if true;
  allow write: if true;
}`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`match /testimonials/{testimonialId} {\n  allow read: if true;\n  allow write: if true;\n}`);
                    setFirestoreRuleCopied(true);
                    setTimeout(() => setFirestoreRuleCopied(false), 3000);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                >
                  {firestoreRuleCopied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Rule</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <a
                  href="https://console.firebase.google.com/project/promedo-5ff5b/firestore/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-brand-blue/20"
                >
                  <span>Open Firebase Rules Console</span>
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => setFirestoreRuleModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Feedback Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed bottom-6 right-6 z-[160] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-bold ${
              actionFeedback.type === 'success'
                ? 'bg-brand-dark text-white border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-red-900 text-white border-red-500/40 shadow-red-950/20'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="text-emerald-400 shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-rose-400 shrink-0" size={18} />
            )}
            <span className="leading-snug">{actionFeedback.message}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="ml-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ExamGeneratorModal 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)} 
        onSuccess={() => fetchData()} 
      />
    </div>
  );
};

export default AdminDashboard;
