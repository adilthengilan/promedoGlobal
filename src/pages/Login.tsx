import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { recordCandidateLogin } from '../lib/userLogins';
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowLeft, 
  Award,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = location.state?.from || '/dashboard';
  const rawCustomMessage = location.state?.message;
  const customMessage = rawCustomMessage
    ? rawCustomMessage.replace(/enroll in GP Prometric courses/gi, 'enroll our courses')
    : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (authErr: any) {
        const msg = (authErr?.message || String(authErr)).toLowerCase();
        if (msg.includes('disk') || msg.includes('indexeddb') || msg.includes('internal-error') || msg.includes('file_error_no_space') || msg.includes('quota')) {
          console.warn('[Auth] Storage quota issue encountered, retrying with inMemoryPersistence...');
          await setPersistence(auth, inMemoryPersistence);
          userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        } else {
          throw authErr;
        }
      }

      let candidatePhone = '';
      let candidateName = email.split('@')[0];
      let candidateExam = 'DHA (Dubai Health Authority)';

      if (userCred.user) {
        const uDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          if (uData?.phone) candidatePhone = uData.phone;
          if (uData?.name && uData.name !== 'Doctor') candidateName = uData.name;
          if (uData?.examPreparingFor) candidateExam = uData.examPreparingFor;
        } else {
          const isBootstrapAdmin = userCred.user.email?.toLowerCase() === 'live.rafick@gmail.com';
          const localPhone = typeof window !== 'undefined' ? (localStorage.getItem('promedo_user_phone') || '') : '';
          candidatePhone = localPhone;
          await setDoc(doc(db, 'users', userCred.user.uid), {
            name: email.split('@')[0],
            email: email.trim(),
            role: isBootstrapAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
            mockTestsTaken: 0,
            questionsAttempted: 0,
            averageScore: 0,
            bestScore: 0,
            ...(localPhone ? { phone: localPhone } : {})
          });
        }
      }

      if (!candidatePhone && typeof window !== 'undefined') {
        candidatePhone = localStorage.getItem('promedo_user_phone') || '';
      }
      if (candidatePhone && typeof window !== 'undefined') {
        try {
          localStorage.setItem('promedo_user_phone', candidatePhone);
        } catch (_) {}
      }

      recordCandidateLogin({
        name: candidateName,
        phone: candidatePhone,
        email: email.trim(),
        examPreparingFor: candidateExam,
        source: 'Portal Account Login'
      });
      navigate(redirectTarget);
    } catch (err: any) {
      const errMsg = (err?.message || String(err)).toLowerCase();
      if (!errMsg.includes('disk') && !errMsg.includes('indexeddb') && !errMsg.includes('file_error_no_space')) {
        console.error('Sign-in error:', err);
      } else {
        console.warn('Sign-in storage constraint:', err);
      }
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. If you have not created an email/password account yet, please sign up or click "Forgot Password" to set a password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMessage('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (gErr: any) {
        const gMsg = (gErr?.message || String(gErr)).toLowerCase();
        if (gMsg.includes('disk') || gMsg.includes('indexeddb') || gMsg.includes('internal-error') || gMsg.includes('quota')) {
          console.warn('[Auth] Google sign-in storage quota issue caught, retrying with inMemoryPersistence...');
          await setPersistence(auth, inMemoryPersistence);
          result = await signInWithPopup(auth, provider);
        } else {
          throw gErr;
        }
      }
      const user = result.user;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        let gPhone = user.phoneNumber || '';
        let gName = user.displayName || user.email?.split('@')[0] || 'Doctor';
        let gExam = 'DHA (Dubai Health Authority)';
        
        if (!userSnap.exists()) {
          const isBootstrapAdmin = user.email?.toLowerCase() === 'live.rafick@gmail.com';
          const localPhone = typeof window !== 'undefined' ? (localStorage.getItem('promedo_user_phone') || '') : '';
          if (localPhone && !gPhone) gPhone = localPhone;
          await setDoc(userDocRef, {
            name: user.displayName || 'Doctor',
            email: user.email || '',
            role: isBootstrapAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL || '',
            mockTestsTaken: 0,
            questionsAttempted: 0,
            averageScore: 0,
            bestScore: 0,
            ...(gPhone ? { phone: gPhone } : {})
          });
        } else {
          const uData = userSnap.data();
          if (uData?.phone) gPhone = uData.phone;
          if (uData?.name && uData.name !== 'Doctor') gName = uData.name;
          if (uData?.examPreparingFor) gExam = uData.examPreparingFor;
        }

        if (!gPhone && typeof window !== 'undefined') {
          gPhone = localStorage.getItem('promedo_user_phone') || '';
        }

        recordCandidateLogin({
          name: gName,
          phone: gPhone,
          email: user.email || '',
          examPreparingFor: gExam,
          source: 'Google Auth Login'
        });
      }

      navigate(redirectTarget);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        console.warn('Firebase domain authorization required for Google Auth. Hostname:', window.location.hostname);
        setUnauthorizedDomain(window.location.hostname);
        setError('');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site or use email/password.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Previous sign-in attempt was interrupted. Please try again.');
      } else {
        console.error('Google Auth error:', err);
        setError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Please enter your email address to reset password.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setInfoMessage(`Password reset link sent to ${resetEmail.trim()}. Please check your inbox.`);
      setResetModalOpen(false);
      setResetEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else {
        setError(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page-root min-h-screen bg-slate-50 flex flex-col items-center justify-center w-full relative">
      {/* Subtle Background Glows */}
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

      {/* Main Authentication Card */}
      <main className="w-full max-w-md px-4 sm:px-0 z-10 my-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/80">
          {/* Card Header */}
          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display mb-1.5">
              Login Here
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Welcome back! Please sign in to access your courses, mock tests, and analytics.
            </p>
          </div>

          {/* Contextual Course Message */}
          {customMessage && (
            <div className="bg-blue-50 text-brand-blue p-3.5 rounded-2xl text-xs font-semibold mb-5 flex items-center gap-2.5 border border-blue-100">
              <Sparkles size={16} className="shrink-0 text-brand-blue" />
              <span>{customMessage}</span>
            </div>
          )}

          {/* Information / Success Message */}
          {infoMessage && (
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold mb-5 flex items-start gap-2.5 border border-emerald-200">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold mb-5 flex items-start gap-2.5 border border-red-200">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Firebase Domain Authorization Guidance Banner */}
          {unauthorizedDomain && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-left text-xs">
              <div className="flex items-start gap-2.5 mb-2.5">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Firebase Domain Authorization Required</h4>
                  <p className="text-amber-700 mt-1 leading-relaxed">
                    Google OAuth popups require this container domain to be added to Authorized Domains in your Firebase Console project (<span className="font-mono font-bold text-amber-900 bg-amber-100/80 px-1 py-0.5 rounded">promedo-5ff5b</span>).
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-amber-200 flex items-center justify-between gap-2 mt-2 shadow-2xs">
                <code className="text-[11px] font-mono font-bold text-gray-800 truncate select-all">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setDomainCopied(true);
                    setTimeout(() => setDomainCopied(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                >
                  {domainCopied ? (
                    <>
                      <Check size={12} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-200/70 text-amber-800 space-y-1 text-[11px]">
                <p className="font-bold text-amber-900">How to authorize in 3 steps:</p>
                <ol className="list-decimal list-inside space-y-1 pl-0.5 text-amber-900/90">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.firebase.google.com/project/promedo-5ff5b/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-brand-blue hover:text-blue-700 inline-flex items-center gap-0.5"
                    >
                      Firebase Console Settings <ExternalLink size={10} />
                    </a>
                  </li>
                  <li>Scroll to <strong>Authorized domains</strong> and click <strong>Add domain</strong></li>
                  <li>Paste the copied domain above and save</li>
                </ol>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-200/70 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-amber-800">Need immediate access?</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('live.rafick@gmail.com');
                    const passInput = document.getElementById('login-password') as HTMLInputElement;
                    passInput?.focus();
                  }}
                  className="text-[11px] font-bold text-brand-blue hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer shadow-2xs transition-colors"
                >
                  Sign in with live.rafick@gmail.com
                </button>
              </div>
            </div>
          )}

          {/* Google Authentication via Firebase (1-Click) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="auth-action-btn w-full py-3.5 px-4 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 transition-all flex items-center justify-center gap-3 shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-70"
          >
            {googleLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center my-6 gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Or with email
            </span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input 
                id="login-email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input-element w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                placeholder="doctor@example.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setResetEmail(email);
                    setResetModalOpen(true);
                  }}
                  className="text-xs font-bold text-brand-blue hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input-element w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
                  placeholder="••••••••••••"
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

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-blue border-gray-300 focus:ring-brand-blue cursor-pointer"
                />
                <span className="text-xs text-gray-600 font-medium">Remember my login</span>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || googleLoading}
              className="auth-action-btn w-full py-3.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-brand-blue/25 active:scale-[0.99] cursor-pointer mt-3 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Log In to Promedo</span>
              )}
            </button>
          </form>

          {/* Link to Signup */}
          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-600 font-medium">
              Don't have an account yet?{' '}
              <Link 
                to="/signup" 
                state={{ from: redirectTarget, message: customMessage }} 
                className="text-brand-blue font-bold hover:underline"
              >
                Sign up for Promedo
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Medical Authorities Accreditation */}
      <footer className="w-full max-w-2xl px-4 py-6 text-center z-10">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
          <Award size={13} className="text-amber-500" />
          <span>Accredited GCC Medical Licensing Authorities</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] font-bold text-gray-600">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            DHA (Dubai)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            HAAD / DOH (Abu Dhabi)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            SMLE (Saudi Arabia)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            OMSB (Oman)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            NHRA (Bahrain)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 shadow-2xs">
            MOH (UAE)
          </span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <h3 className="text-lg font-extrabold text-gray-900 font-display mb-1.5">
              Reset Password
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Enter your registered email address and we'll send you a link to reset your account password.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="auth-input-element w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  placeholder="doctor@example.com"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 px-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Send Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
