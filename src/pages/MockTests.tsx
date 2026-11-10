import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Search, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Lock, 
  Award, 
  ArrowRight, 
  Megaphone,
  Bell,
  Check,
  Zap,
  RotateCcw,
  BarChart2,
  FileText,
  Play,
  User,
  Phone,
  Mail,
  X,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COUNTRY_CODES, parsePhoneWithCountryCode } from '../data/countryCodes';
import { CountryCodeSelect } from '../components/CountryCodeSelect';
import { recordCandidateLogin, EXAM_OPTIONS } from '../lib/userLogins';
import { PremiumUpgradeScreen } from '../components/PremiumUpgradeScreen';

const DEFAULT_MOCKTESTS: any[] = [];
const DEFAULT_ADMIN_ADS: any[] = [];

const MockTests = () => {
  const { user, isAdmin, isPaid } = useAuth();
  const navigate = useNavigate();

  const [mocktests, setMocktests] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);

  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedPaidTest, setBlockedPaidTest] = useState<any>(null);
  const [selectedTestForRegistration, setSelectedTestForRegistration] = useState<any>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+971');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedExam, setSelectedExam] = useState('DHA (Dubai Health Authority)');
  const [otherExamText, setOtherExamText] = useState('');
  const [registrationData, setRegistrationData] = useState({
    name: user?.displayName || '',
    phone: '',
    exam: '',
    email: user?.email || ''
  });

  useEffect(() => {
    setLoading(true);
    let unsubMocks: (() => void) | undefined;
    let unsubEnrolls: (() => void) | undefined;

    import('../lib/lmsService').then(({ subscribeToMockTests, subscribeToUserEnrollments }) => {
      unsubMocks = subscribeToMockTests(
        (dbMocktests) => {
          setMocktests(dbMocktests);
          setLoading(false);
        },
        () => {
          setMocktests([]);
          setLoading(false);
        }
      );

      if (user) {
        unsubEnrolls = subscribeToUserEnrollments(user.uid, (enrolls) => {
          const enrollMap: Record<string, boolean> = {};
          enrolls.forEach((data: any) => {
            if (data.courseId) enrollMap[data.courseId] = true;
            if (data.mocktestId) enrollMap[data.mocktestId] = true;
            if (data.id) enrollMap[data.id] = true;
          });
          setUserEnrollments(enrollMap);
        });
      }
    });

    getDocs(collection(db, 'ads'))
      .then((adsSnap) => {
        const dbAds = adsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAds(dbAds);
      })
      .catch(() => {
        setAds([]);
      });

    return () => {
      if (unsubMocks) unsubMocks();
      if (unsubEnrolls) unsubEnrolls();
    };
  }, [user]);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail) return;
    setNotified(true);
    setTimeout(() => {
      setNotified(false);
      setNotifyEmail('');
    }, 4000);
  };

  const handleStartMockClick = (test: any) => {
    // Paid mock tests can only be taken by paid users or admins
    if (test.isPaid && !isAdmin && !isPaid) {
      setBlockedPaidTest(test);
      setShowUpgradeModal(true);
      return;
    }

    setSelectedTestForRegistration(test);
    const auth = (test.authority || test.category || test.exam || test.title || '').toLowerCase();
    let defaultExamOption = 'DHA (Dubai Health Authority)';
    if (auth.includes('dha')) defaultExamOption = 'DHA (Dubai Health Authority)';
    else if (auth.includes('haad') || auth.includes('doh')) defaultExamOption = 'HAAD / DOH (Abu Dhabi Health Authority)';
    else if (auth.includes('smle') || auth.includes('scfhs') || auth.includes('saudi')) defaultExamOption = 'SMLE (Saudi Medical Licensing Exam)';
    else if (auth.includes('omsb') || auth.includes('oman')) defaultExamOption = 'OMSB (Oman Medical Specialty Board)';
    else if (auth.includes('qchp') || auth.includes('qatar')) defaultExamOption = 'QCHP (Qatar Prometric Exam)';
    else if (auth.includes('nhra') || auth.includes('bahrain')) defaultExamOption = 'NHRA (Bahrain Health Regulatory Authority)';
    else if (auth.includes('mohap')) defaultExamOption = 'MOHAP (UAE Ministry of Health)';
    else if (auth.includes('nurs')) defaultExamOption = 'Nursing Prometric';
    else if (auth.includes('dent')) defaultExamOption = 'Dental Prometric';
    else if (auth.includes('gp') || auth.includes('general')) defaultExamOption = 'GP Prometric (General Practice)';

    let savedName = '';
    let savedPhone = '';
    let savedEmail = '';
    let savedExam = '';
    try {
      const saved = localStorage.getItem('promedo_candidate_registration');
      if (saved) {
        const parsed = JSON.parse(saved);
        savedName = parsed.name || '';
        savedPhone = parsed.phone || '';
        savedEmail = parsed.email || '';
        savedExam = parsed.exam || '';
      }
    } catch (_) {}

    const rawPhone = savedPhone || registrationData.phone || '';
    const parsedPhone = parsePhoneWithCountryCode(rawPhone, '+971');
    setSelectedCountryCode(parsedPhone.countryCode);
    setPhoneNumber(parsedPhone.nationalNumber);

    if (savedExam) {
      if (savedExam.startsWith('Other')) {
        setSelectedExam('Other');
        const customText = savedExam.replace(/^Other:\s*/i, '');
        setOtherExamText(customText === 'Other' ? '' : customText);
      } else {
        setSelectedExam(savedExam);
        setOtherExamText('');
      }
    } else {
      setSelectedExam(defaultExamOption);
      setOtherExamText('');
    }

    setRegistrationData(prev => ({
      name: prev.name || savedName || user?.displayName || '',
      phone: rawPhone,
      exam: savedExam || defaultExamOption,
      email: prev.email || savedEmail || user?.email || ''
    }));
    setShowRegistrationModal(true);
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRegistrationModal(false);

    const finalExam = selectedExam === 'Other' 
      ? (otherExamText.trim() ? `Other: ${otherExamText.trim()}` : 'Other')
      : selectedExam;

    const fullPhone = phoneNumber.trim() ? `${selectedCountryCode} ${phoneNumber.trim()}` : '';
    const updatedData = {
      ...registrationData,
      phone: fullPhone,
      exam: finalExam
    };

    try {
      localStorage.setItem('promedo_candidate_registration', JSON.stringify(updatedData));
    } catch (_) {}

    // Record login for User Management -> Most Logins tracking
    recordCandidateLogin({
      name: updatedData.name,
      phone: fullPhone,
      email: updatedData.email,
      examPreparingFor: finalExam,
      source: 'Mock Test Simulator',
      testTitle: selectedTestForRegistration?.title
    });

    const targetTestId = selectedTestForRegistration?.id || 'dha-gp-sim-2026';
    navigate(`/mock-test/${targetTestId}`, {
      state: {
        ...updatedData,
        candidateName: updatedData.name,
        candidatePhone: fullPhone,
        candidateEmail: updatedData.email,
        candidateExam: finalExam,
        testTitle: selectedTestForRegistration?.title
      }
    });
  };

  const filteredMocktests = mocktests.filter(test => {
    // Only listed mock tests show on student side; admins can preview all
    if (!isAdmin && test.isListed === false) return false;

    const matchesSearch = (test.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (test.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (test.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAuthority = selectedAuthority === 'ALL' || 
                             (selectedAuthority === 'FREE' && (!test.isPaid || test.exam === 'free' || (test.category || '').toLowerCase().includes('free') || (test.title || '').toLowerCase().includes('free'))) ||
                             (test.authority || '').toUpperCase().includes(selectedAuthority) ||
                             (test.category || '').toUpperCase().includes(selectedAuthority) ||
                             (test.exam || '').toUpperCase().includes(selectedAuthority);

    return matchesSearch && matchesAuthority;
  });

  const activeAd = ads[0] || null;

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#0B1C30] pb-24">
      
      {/* HEADER HERO */}
      <div className="bg-[#131B2E] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-[#006591]/40 border border-[#006591]/60 text-sky-300 text-[11px] font-extrabold uppercase tracking-wider rounded-xl flex items-center gap-1.5">
              <ClipboardList size={15} />
              Prometric Exam Simulators
            </span>
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider rounded-xl">
              REALISTIC EXAM EXPERIENCE
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-3">
            Prepare Smarter for Your Medical Licensing Exam
          </h1>

          <p className="text-gray-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed mb-8">
            Practice with realistic, exam-style questions designed to assess your knowledge, improve your performance, and build confidence for your licensing exam.
          </p>

          {/* Search Controls */}
          <div className="bg-white/10 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-white/15 max-w-3xl shadow-2xl relative">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mock test by exam (e.g. DHA GP, HAAD 150 Qs, SMLE Grand Simulator)..."
              className="w-full pl-12 pr-4 py-3 bg-white text-[#0B1C30] text-xs font-semibold rounded-2xl outline-none focus:ring-2 focus:ring-[#3853A4] shadow-inner placeholder:text-gray-400"
            />
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* AUTHORITY TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-[#E5EEFF]">
          {[
            { id: 'ALL', label: 'All Exam Simulators' },
            { id: 'FREE', label: '🎁 Free Mock Tests' },
            { id: 'DHA', label: 'DHA Dubai' },
            { id: 'HAAD', label: 'HAAD Abu Dhabi' },
            { id: 'SMLE', label: 'SMLE Saudi Arabia' },
            { id: 'OMSB', label: 'OMSB Oman' },
            { id: 'QCHP', label: 'QCHP Qatar' },
            { id: 'NHRA', label: 'NHRA Bahrain' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedAuthority(tab.id)}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all shrink-0 cursor-pointer ${
                selectedAuthority === tab.id
                  ? 'bg-[#006591] text-white shadow-md shadow-[#006591]/20'
                  : 'bg-white text-[#45464D] hover:bg-gray-100 border border-[#E5EEFF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MOCK TESTS GRID */}
        {filteredMocktests.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMocktests.map(test => {
              const isComingSoon = test.status === 'coming_soon' || test.status === 'unavailable';

              return (
                <div 
                  key={test.id} 
                  className={`bg-white rounded-3xl border transition-all flex flex-col justify-between p-6 ${
                    isComingSoon 
                      ? 'border-amber-200 bg-amber-50/20' 
                      : 'border-[#E5EEFF] hover:border-[#006591]/40 hover:shadow-2xl'
                  }`}
                >
                  <div>
                    {/* Header Tags */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-[#131B2E] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl">
                        {test.authority || 'PROMETRIC'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isAdmin && test.isListed === false && (
                          <span className="px-2.5 py-1 bg-gray-200 text-gray-700 font-extrabold text-[9px] uppercase tracking-wider rounded-xl">
                            Unlisted
                          </span>
                        )}

                        {isComingSoon ? (
                          <span className="px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-sm">
                            <ShieldAlert size={12} />
                            Coming Soon
                          </span>
                        ) : test.isPaid ? (
                          <span className="px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-sm">
                            <Lock size={12} />
                            PRO / Paid Test
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-sm">
                            <Sparkles size={12} />
                            Free Mock Test
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-[#0B1C30] text-base leading-snug mb-3">
                      {test.title}
                    </h3>

                    <p className="text-[#45464D] text-xs font-medium leading-relaxed line-clamp-2 mb-6">
                      {test.description}
                    </p>

                    {/* Stats Pill Box */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8FAFF] rounded-2xl border border-[#E5EEFF] text-center mb-6">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Questions</span>
                        <span className="text-sm font-black text-[#0B1C30] flex items-center justify-center gap-1">
                          <FileText size={12} className="text-[#006591]" />
                          {Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : 150)} Qs
                        </span>
                      </div>
                      <div className="border-x border-gray-200">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Timer</span>
                        <span className="text-sm font-black text-[#0B1C30] flex items-center justify-center gap-1">
                          <Clock size={12} className="text-amber-500" />
                          {test.timeLimit || test.duration || 180}m
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Pass Score</span>
                        <span className="text-sm font-black text-emerald-600 flex items-center justify-center gap-1">
                          <BarChart2 size={12} />
                          {test.passingScore !== undefined ? test.passingScore : (test.passScore !== undefined ? test.passScore : 60)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Access Action */}
                  <div>
                    {isComingSoon ? (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-amber-800 text-xs font-extrabold">
                          <ShieldAlert size={16} />
                          <span>Not Yet Available • 2026 Test Bank Update</span>
                        </div>
                        <button
                          onClick={() => alert(`You will be notified when ${test.title} simulator launches.`)}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Bell size={14} />
                          <span>Request Email Alert</span>
                        </button>
                      </div>
                    ) : test.isPaid && !isAdmin && !isPaid ? (
                      <button
                        id={`btn-launch-mock-${test.id}`}
                        onClick={() => handleStartMockClick(test)}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-xs shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <Lock size={14} />
                        <span>Unlock with Pro (Paid Test)</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-launch-mock-${test.id}`}
                        onClick={() => handleStartMockClick(test)}
                        className="w-full py-3.5 bg-[#3853A4] hover:bg-[#2b4083] text-white rounded-2xl font-black text-xs shadow-md shadow-[#3853A4]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <span>{test.isPaid ? 'Start Pro Mock Test' : 'Start Free Mock Test'}</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE WITH WARNING */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xl"
          >
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShieldAlert size={36} />
            </div>

            <h3 className="text-2xl font-black text-[#0B1C30] mb-2">
              Mock Simulator Coming Soon / Currently Unavailable
            </h3>

            <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed mb-6">
              No practice simulators match "<span className="font-bold text-[#0B1C30]">{searchQuery || selectedAuthority}</span>". Our medical question bank committee is currently auditing 2026 Prometric exam recall items.
            </p>

            <form onSubmit={handleNotifySubmit} className="max-w-md mx-auto space-y-3 mb-6">
              <div className="flex gap-2">
                <input 
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="Enter your doctor email address..."
                  className="flex-1 px-4 py-3 bg-[#EFF4FF] border border-[#E5EEFF] rounded-2xl text-xs font-semibold outline-none focus:border-[#006591]"
                />
                <button 
                  type="submit"
                  className="px-5 py-3 bg-[#006591] text-white font-extrabold text-xs rounded-2xl hover:bg-[#005175] transition-all cursor-pointer shrink-0"
                >
                  Request Access
                </button>
              </div>

              {notified && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                  <Check size={16} />
                  <span>Request saved! We will notify you as soon as this simulator goes live.</span>
                </div>
              )}
            </form>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedAuthority('ALL');
              }}
              className="px-6 py-2.5 bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#0B1C30] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </motion.div>
        )}

      </div>

      {/* REGISTRATION MODAL */}
      <AnimatePresence>
        {showRegistrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegistrationModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-6 md:p-8 shadow-2xl overflow-hidden z-10"
            >
              <button 
                id="btn-close-registration-modal"
                onClick={() => setShowRegistrationModal(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="Close registration modal"
              >
                <X size={20} />
              </button>

              <div className="mb-6 text-center md:text-left">
                <h2 className="text-2xl font-bold text-[#0B1C30]">Registration</h2>
              </div>

              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-[#3853A4]" />
                    CANDIDATE NAME
                  </label>
                  <input 
                    required
                    type="text"
                    value={registrationData.name}
                    onChange={e => setRegistrationData({ ...registrationData, name: e.target.value })}
                    placeholder="Dr. John Doe"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#3853A4] border border-gray-100 focus:border-[#3853A4] transition-all outline-none text-sm text-gray-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={12} className="text-[#3853A4]" />
                    MOBILE NUMBER
                  </label>
                  <div className="flex items-center gap-2.5">
                    <CountryCodeSelect
                      id="select-country-code"
                      value={selectedCountryCode}
                      onChange={setSelectedCountryCode}
                      className="shrink-0 w-[125px] sm:w-[138px]"
                    />

                    <input 
                      id="input-mobile-number"
                      required
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="50 123 4567"
                      className="flex-1 h-[50px] px-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#3853A4] border border-gray-200 focus:border-[#3853A4] transition-all outline-none text-sm text-gray-800 font-medium placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} className="text-[#3853A4]" />
                    EMAIL ADDRESS
                  </label>
                  <input 
                    required
                    type="email"
                    value={registrationData.email}
                    onChange={e => setRegistrationData({ ...registrationData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#3853A4] border border-gray-100 focus:border-[#3853A4] transition-all outline-none text-sm text-gray-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap size={13} className="text-[#3853A4]" />
                    EXAM YOU ARE PREPARING FOR
                  </label>
                  <div className="relative">
                    <select
                      id="select-exam-preparing-for"
                      required
                      value={selectedExam}
                      onChange={e => setSelectedExam(e.target.value)}
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#3853A4] border border-gray-100 focus:border-[#3853A4] transition-all outline-none text-sm text-gray-800 font-medium appearance-none pr-10 cursor-pointer"
                    >
                      {EXAM_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {selectedExam === 'Other' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-2"
                    >
                      <input
                        id="input-other-exam-name"
                        type="text"
                        required
                        value={otherExamText}
                        onChange={e => setOtherExamText(e.target.value)}
                        placeholder="Please specify your licensing exam (e.g. AMC, USMLE, PLAB, etc.)"
                        className="w-full px-4 py-3 bg-blue-50/50 rounded-xl focus:ring-2 focus:ring-[#3853A4] border border-blue-200 focus:border-[#3853A4] transition-all outline-none text-xs text-gray-800 font-medium placeholder:text-gray-400"
                      />
                    </motion.div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[#3853A4] hover:bg-[#2b4083] text-white rounded-[20px] font-bold text-base hover:shadow-xl hover:shadow-[#3853A4]/30 transition-all flex items-center justify-center gap-2 group mt-2 cursor-pointer"
                >
                  <span>Submit and Start</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* UPGRADE MODAL FOR PAID TESTS */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl my-8"
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
              <PremiumUpgradeScreen 
                moduleName={`Mock Test: ${blockedPaidTest?.title || 'Premium Simulator'}`}
                onBack={() => setShowUpgradeModal(false)}
                inline
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockTests;
