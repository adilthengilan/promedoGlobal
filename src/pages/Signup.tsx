import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { recordCandidateLogin } from '../lib/userLogins';
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  GraduationCap, 
  Award,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Lock,
  User,
  Building2,
  MapPin,
  Camera,
  Upload,
  Calendar,
  BookOpen
} from 'lucide-react';
import { saveUserProfile } from '../lib/userProfileService';

const QUALIFICATION_OPTIONS = [
  'MBBS (Bachelor of Medicine, Bachelor of Surgery)',
  'BDS (Bachelor of Dental Surgery)',
  'BSc Nursing / Post Basic Nursing',
  'Diploma in General Nursing & Midwifery (GNM)',
  'PharmD / Bachelor of Pharmacy (B.Pharm)',
  'Bachelor of Physiotherapy (BPT / DPT)',
  'Radiology & Medical Imaging Technology',
  'Medical Laboratory Technology (MLT / MLSc)',
  'MD / MS / DNB (Postgraduate Specialist)',
  'Other Healthcare Degree'
];

const YEAR_SEMESTER_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year / Final Year',
  'Clinical Internship / Housemanship',
  'Postgraduate / Resident Doctor',
  'Graduated & Practicing Specialist',
  'Other'
];

const GCC_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Oman',
  'Qatar',
  'Bahrain',
  'Kuwait',
  'India',
  'Pakistan',
  'Philippines',
  'Egypt',
  'Jordan',
  'United Kingdom',
  'United States',
  'Canada',
  'Other'
];

const Signup: React.FC = () => {
  // Navigation / Step
  const [formStep, setFormStep] = useState<'personal' | 'academic' | 'location' | 'account'>('personal');

  // Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [photoURL, setPhotoURL] = useState('');

  // Academic Info
  const [institution, setInstitution] = useState('');
  const [qualification, setQualification] = useState(QUALIFICATION_OPTIONS[0]);
  const [course, setCourse] = useState('Medicine & Surgery');
  const [currentYear, setCurrentYear] = useState(YEAR_SEMESTER_OPTIONS[4]);
  const [studentId, setStudentId] = useState('');
  const [examPreparingFor, setExamPreparingFor] = useState('DHA (Dubai Health Authority)');

  // Location Info
  const [country, setCountry] = useState('United Arab Emirates');
  const [state, setState] = useState('Dubai');
  const [city, setCity] = useState('Dubai');
  const [address, setAddress] = useState('');

  // Security Credentials
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  // UI state
  const [error, setError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = location.state?.from || '/dashboard';
  const customMessage = location.state?.message;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPhotoURL(event.target.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms & Conditions to create an account.');
      setFormStep('account');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full name.');
      setFormStep('personal');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      setFormStep('personal');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      setFormStep('personal');
      return;
    }
    if (!institution.trim()) {
      setError('Please enter your Institution / School / College Name.');
      setFormStep('academic');
      return;
    }
    if (!country.trim() || !state.trim() || !city.trim()) {
      setError('Please enter your Country, State/Emirate, and City.');
      setFormStep('location');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      setFormStep('account');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter passwords.');
      setFormStep('account');
      return;
    }

    setError('');
    setLoading(true);

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const selectedExam = examPreparingFor.trim() || 'DHA (Dubai Health Authority)';

    try {
      localStorage.setItem('promedo_user_phone', normalizedPhone);
      localStorage.setItem('promedo_user_name', trimmedName || 'Doctor');
      localStorage.setItem('promedo_user_exam', selectedExam);
    } catch (_) {}

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const isBootstrapAdmin = normalizedEmail === 'live.rafick@gmail.com';
      const role = isBootstrapAdmin ? 'admin' : 'student';
      const now = new Date().toISOString();

      if (trimmedName) {
        try {
          await updateProfile(userCredential.user, {
            displayName: trimmedName,
            photoURL: photoURL || ''
          });
        } catch (profileErr) {
          console.warn('Could not set displayName on auth user:', profileErr);
        }
      }
      
      const userPayload = {
        uid: userCredential.user.uid,
        name: trimmedName || 'Doctor',
        email: normalizedEmail,
        phone: normalizedPhone,
        photoURL,
        dateOfBirth,
        gender,
        institution: institution.trim(),
        qualification,
        course: course.trim(),
        currentYear,
        studentId: studentId.trim(),
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        address: address.trim(),
        examPreparingFor: selectedExam,
        role,
        termsAgreed: true,
        termsAgreedAt: now,
        authProvider: 'email_password',
        createdAt: now,
        updatedAt: now,
        mockTestsTaken: 0,
        questionsAttempted: 0,
        averageScore: 0,
        bestScore: 0
      };

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userPayload, { merge: true });
      } catch (firestoreErr) {
        console.error("Firestore error saving user document:", firestoreErr);
        handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${userCredential.user.uid}`);
      }

      try {
        await recordCandidateLogin({
          name: trimmedName || 'Candidate Doctor',
          phone: normalizedPhone,
          email: normalizedEmail,
          examPreparingFor: selectedExam,
          source: 'Candidate Student Portal Registration'
        });
      } catch (logErr) {
        console.warn('Could not record candidate registration entry:', logErr);
      }

      navigate(redirectTarget);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const now = new Date().toISOString();
        const isBootstrapAdmin = user.email?.toLowerCase() === 'live.rafick@gmail.com';
        const role = isBootstrapAdmin ? 'admin' : 'student';
        const trimmedName = (user.displayName || name.trim() || 'Doctor');
        const userEmail = (user.email || email.trim()).toLowerCase();
        const userPhone = user.phoneNumber || phone.trim() || '';
        const selectedExam = examPreparingFor.trim() || 'DHA (Dubai Health Authority)';
        
        if (!userSnap.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            name: trimmedName,
            email: userEmail,
            phone: userPhone,
            examPreparingFor: selectedExam,
            role,
            termsAgreed: true,
            termsAgreedAt: now,
            authProvider: 'google',
            createdAt: now,
            updatedAt: now,
            photoURL: user.photoURL || '',
            mockTestsTaken: 0,
            questionsAttempted: 0,
            averageScore: 0,
            bestScore: 0
          }, { merge: true });
        }

        try {
          await recordCandidateLogin({
            name: trimmedName,
            phone: userPhone,
            email: userEmail,
            examPreparingFor: selectedExam,
            source: 'Google Auth Registration'
          });
        } catch (logErr) {
          console.warn('Could not record google candidate registration entry:', logErr);
        }
      }

      navigate(redirectTarget);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
        setError('');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.');
      } else {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page-root min-h-screen bg-slate-50 flex flex-col lg:flex-row items-stretch justify-center w-full">
      {/* Left Visual Branding Pane */}
      <div className="auth-desktop-hero auth-hero-banner bg-gradient-to-br from-[#1b2b65] via-[#243b82] to-[#3853a4] text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-8 sm:mb-12">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/promedo-logo.png"
                alt="Promedo"
                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-2xl font-display font-extrabold tracking-tight text-white">Promedo</span>
            </Link>

            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full transition-colors backdrop-blur-sm"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold tracking-wide uppercase mb-4 backdrop-blur-sm">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Student Registration</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] font-extrabold tracking-tight text-white leading-tight mb-4 font-display">
              Create Your Student Profile
            </h1>

            <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              Register your official student credentials for GCC medical licensing & mentorship.
            </p>

            <div className="hidden sm:flex flex-col gap-3 my-6">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/95">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <span>Full Personal & Academic Record Integration</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/95">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <span>One-to-One Mentorship & DataFlow Verification</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/95">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <span>Instant Access to Question Bank & Mock Simulators</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 mt-6 border-t border-white/15">
          <p className="text-blue-200/90 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award size={14} className="text-amber-300" />
            <span>GCC Licensing Bodies</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
            <span className="px-3 py-1 rounded-xl bg-white/15 text-white border border-white/20">DHA</span>
            <span className="px-3 py-1 rounded-xl bg-white/15 text-white border border-white/20">HAAD</span>
            <span className="px-3 py-1 rounded-xl bg-white/15 text-white border border-white/20">SMLE</span>
            <span className="px-3 py-1 rounded-xl bg-white/15 text-white border border-white/20">OMSB</span>
            <span className="px-3 py-1 rounded-xl bg-white/15 text-white border border-white/20">MOH</span>
          </div>
        </div>
      </div>

      {/* Right Side Registration Form Pane */}
      <div className="auth-desktop-form flex-1 bg-white flex flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto">
          
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display mb-1">
              Student Registration
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Fill in your student details to register your Promedo account.
            </p>
          </div>

          {customMessage && (
            <div className="bg-blue-50 text-brand-blue p-3.5 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2.5 border border-blue-100">
              <Sparkles size={16} className="shrink-0 text-brand-blue" />
              <span>{customMessage}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold mb-6 flex items-start gap-2.5 border border-red-200">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Google Sign up */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-3 cursor-pointer mb-6"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Quick Register with Google</span>
          </button>

          {/* Registration Step Tabs */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-6 gap-1">
            {[
              { id: 'personal', label: '1. Personal', icon: User },
              { id: 'academic', label: '2. Academic', icon: GraduationCap },
              { id: 'location', label: '3. Location', icon: MapPin },
              { id: 'account', label: '4. Security', icon: Lock }
            ].map(step => {
              const IconComp = step.icon;
              const isActive = formStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setFormStep(step.id as any)}
                  className={`pb-2.5 px-2 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#3853A4] text-[#3853A4]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <IconComp size={14} />
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* STEP 1: PERSONAL INFORMATION */}
            {formStep === 'personal' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-[#3853A4]/20 flex items-center justify-center">
                      {photoURL ? (
                        <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-[#3853A4]" />
                      )}
                    </div>
                    <label 
                      htmlFor="signup-photo-upload" 
                      className="absolute -bottom-1 -right-1 p-1.5 bg-[#3853A4] text-white rounded-md shadow-md cursor-pointer hover:bg-[#2F4487]"
                    >
                      <Camera size={11} />
                      <input 
                        id="signup-photo-upload" 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Profile Photo <span className="text-slate-400 font-normal">(Optional)</span></h4>
                    <p className="text-[11px] text-slate-500">Upload a headshot for student identification card</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="Dr. John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="doctor@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Phone Number (With Country Code) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="+971 50 123 4567"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Date of Birth <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="date" 
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Gender <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!name || !email || !phone) {
                      setError('Please fill in required personal fields (Name, Email, Phone)');
                      return;
                    }
                    setError('');
                    setFormStep('academic');
                  }}
                  className="w-full py-3 bg-[#3853A4] text-white font-bold text-xs rounded-2xl hover:bg-[#2F4487] transition-all cursor-pointer shadow-md mt-2"
                >
                  Continue to Academic Info &rarr;
                </button>
              </div>
            )}

            {/* STEP 2: ACADEMIC INFORMATION */}
            {formStep === 'academic' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Institution / School / College Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="e.g. Dubai Medical College / King Edward Medical University"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Qualification / Education Level <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 cursor-pointer"
                  >
                    {QUALIFICATION_OPTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Course / Program <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      placeholder="e.g. General Medicine"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Current Year / Semester <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={currentYear}
                      onChange={(e) => setCurrentYear(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 cursor-pointer"
                    >
                      {YEAR_SEMESTER_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Target GCC Licensing Exam <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={examPreparingFor}
                    onChange={(e) => setExamPreparingFor(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 cursor-pointer"
                  >
                    <option value="DHA (Dubai Health Authority)">DHA - Dubai Health Authority</option>
                    <option value="HAAD / DOH (Abu Dhabi Health Authority)">HAAD / DOH - Abu Dhabi Department of Health</option>
                    <option value="MOHAP (UAE Ministry of Health)">MOHAP - UAE Ministry of Health & Prevention</option>
                    <option value="SMLE (Saudi Medical Licensing Exam)">SMLE - Saudi Commission (SCFHS)</option>
                    <option value="OMSB (Oman Medical Specialty Board)">OMSB - Oman Medical Specialty Board</option>
                    <option value="QCHP (Qatar Prometric Exam)">QCHP / DHP - Qatar Council</option>
                    <option value="NHRA (Bahrain Health Regulatory Authority)">NHRA - Bahrain Regulatory Authority</option>
                    <option value="GP Prometric (General Practice)">GP Prometric (General Practice)</option>
                    <option value="Nursing Prometric">Nursing Prometric Licensure</option>
                    <option value="Dental Prometric">Dental Prometric</option>
                    <option value="Other">Other Medical Licensing Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Student ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="e.g. STU-2026-901"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormStep('personal')}
                    className="px-4 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!institution) {
                        setError('Please enter your Institution name.');
                        return;
                      }
                      setError('');
                      setFormStep('location');
                    }}
                    className="flex-1 py-2.5 bg-[#3853A4] text-white font-bold text-xs rounded-2xl hover:bg-[#2F4487] transition-all cursor-pointer shadow-md"
                  >
                    Continue to Location Info &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LOCATION INFORMATION */}
            {formStep === 'location' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 cursor-pointer"
                    >
                      {GCC_COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      State / Emirate <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      placeholder="e.g. Dubai"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      placeholder="e.g. Dubai"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Residential Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    placeholder="Street name, Building number..."
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormStep('academic')}
                    className="px-4 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!country || !state || !city) {
                        setError('Please enter Country, State, and City.');
                        return;
                      }
                      setError('');
                      setFormStep('account');
                    }}
                    className="flex-1 py-2.5 bg-[#3853A4] text-white font-bold text-xs rounded-2xl hover:bg-[#2F4487] transition-all cursor-pointer shadow-md"
                  >
                    Continue to Password Security &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SECURITY & FINISH */}
            {formStep === 'account' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Lock size={13} className="text-gray-500" />
                    Account Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Lock size={13} className="text-gray-500" />
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      placeholder="Re-enter password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="terms-signup"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-brand-blue border-gray-300 cursor-pointer"
                  />
                  <label htmlFor="terms-signup" className="text-xs text-gray-600 font-medium cursor-pointer select-none">
                    I agree to the <span className="font-bold text-brand-blue underline">Terms of Service</span> and <span className="font-bold text-brand-blue underline">Privacy Policy</span>.
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormStep('location')}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || googleLoading}
                    className="flex-1 py-3.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl text-xs transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Registering Student Account...</span>
                      </>
                    ) : (
                      <span>Complete Student Registration</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-600 font-medium">
              Already have a student account?{' '}
              <Link 
                to="/login" 
                state={{ from: redirectTarget, message: customMessage }} 
                className="text-brand-blue font-bold hover:underline"
              >
                Log in here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Signup;
