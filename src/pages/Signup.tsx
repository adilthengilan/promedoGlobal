import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { recordCandidateLogin, EXAM_OPTIONS } from '../lib/userLogins';
import { CountryCodeSelect } from '../components/CountryCodeSelect';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedExam, setSelectedExam] = useState('DHA (Dubai Health Authority)');
  const [otherExamText, setOtherExamText] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = location.state?.from || '/dashboard';
  const customMessage = location.state?.message;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPhone = phoneNumber.trim();
    const finalExam =
      selectedExam === 'Other'
        ? otherExamText.trim()
          ? `Other: ${otherExamText.trim()}`
          : 'Other'
        : selectedExam;

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!trimmedPhone) {
      setError('Please enter your mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!finalExam) {
      setError('Please select the exam you are preparing for.');
      return;
    }

    const fullPhone = `${countryCode} ${trimmedPhone}`;

    setError('');
    setLoading(true);

    try {
      localStorage.setItem('promedo_user_phone', fullPhone);
      localStorage.setItem('promedo_user_name', trimmedName);
      localStorage.setItem('promedo_user_exam', finalExam);
    } catch (_) {}

    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } catch (authErr: any) {
        const msg = (authErr?.message || String(authErr)).toLowerCase();
        if (
          msg.includes('disk') ||
          msg.includes('indexeddb') ||
          msg.includes('internal-error') ||
          msg.includes('file_error_no_space') ||
          msg.includes('quota')
        ) {
          console.warn('[Auth] Registration storage quota issue caught, retrying with inMemoryPersistence...');
          await setPersistence(auth, inMemoryPersistence);
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        } else {
          throw authErr;
        }
      }

      const isBootstrapAdmin = normalizedEmail === 'live.rafick@gmail.com';
      const role = isBootstrapAdmin ? 'admin' : 'student';
      const now = new Date().toISOString();

      try {
        await updateProfile(userCredential.user, {
          displayName: trimmedName
        });
      } catch (profileErr) {
        console.warn('Could not set displayName on auth user:', profileErr);
      }

      const userPayload = {
        uid: userCredential.user.uid,
        name: trimmedName,
        email: normalizedEmail,
        phone: fullPhone,
        examPreparingFor: finalExam,
        role,
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
        console.error('Firestore error saving user document:', firestoreErr);
        handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${userCredential.user.uid}`);
      }

      try {
        await recordCandidateLogin({
          name: trimmedName,
          phone: fullPhone,
          email: normalizedEmail,
          examPreparingFor: finalExam,
          source: 'Candidate Student Portal Registration'
        });
      } catch (logErr) {
        console.warn('Could not record candidate registration entry:', logErr);
      }

      navigate(redirectTarget);
    } catch (err: any) {
      const errMsg = (err?.message || String(err)).toLowerCase();
      if (!errMsg.includes('disk') && !errMsg.includes('indexeddb') && !errMsg.includes('file_error_no_space')) {
        console.error('Signup error:', err);
      }
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root min-h-screen bg-slate-50 flex flex-col items-center justify-center w-full relative pb-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-blue-100/50 via-slate-50/0 to-transparent pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-md sm:max-w-xl md:max-w-2xl px-4 py-4 sm:py-6 flex items-center justify-between z-10">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/promedo-logo.png"
            alt="Promedo"
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="text-2xl font-display font-extrabold tracking-tight text-gray-900">Promedo</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand-blue bg-white hover:bg-gray-100 px-3.5 py-1.5 rounded-full transition-colors border border-gray-200 shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Registration Card */}
      <main className="w-full max-w-md px-4 sm:px-0 z-10 my-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/80">
          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display mb-1.5">
              Student Registration
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Create your Promedo student account in seconds.
            </p>
          </div>

          {customMessage && (
            <div className="bg-blue-50 text-brand-blue p-3.5 rounded-2xl text-xs font-semibold mb-5 flex items-center gap-2.5 border border-blue-100">
              <Sparkles size={16} className="shrink-0 text-brand-blue" />
              <span>{customMessage}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold mb-5 flex items-start gap-2.5 border border-red-200">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input-element w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                placeholder="Dr. John Smith"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input-element w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                placeholder="doctor@example.com"
                required
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="signup-mobile" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <CountryCodeSelect
                  id="signup-country-code"
                  value={countryCode}
                  onChange={setCountryCode}
                  className="shrink-0 w-[122px] sm:w-[132px]"
                />
                <input
                  id="signup-mobile"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="auth-input-element flex-1 h-[50px] px-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                  placeholder="50 123 4567"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input-element w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Select Exam */}
            <div>
              <label htmlFor="signup-exam" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Exam <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="signup-exam"
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="auth-input-element w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all appearance-none cursor-pointer"
                  required
                >
                  {EXAM_OPTIONS.map((opt) => (
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
                <div className="pt-2">
                  <input
                    id="signup-other-exam"
                    type="text"
                    value={otherExamText}
                    onChange={(e) => setOtherExamText(e.target.value)}
                    placeholder="Please specify your exam"
                    className="auth-input-element w-full px-4 py-2.5 bg-blue-50/40 border border-blue-200 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                    required
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="auth-action-btn w-full py-3.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-brand-blue/25 active:scale-[0.99] cursor-pointer mt-3 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register Student Account</span>
              )}
            </button>
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
      </main>
    </div>
  );
};

export default Signup;
