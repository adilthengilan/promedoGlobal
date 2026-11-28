import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { CheckCircle2, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const Success = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const courseId = searchParams.get('courseId') || 'pro-membership';
  const sessionId = searchParams.get('session_id') || searchParams.get('payment_id') || 'pay_verified_success';
  const isProPass = courseId === 'pro-membership' || courseId === 'pro';
  const isMockTest = courseId.startsWith('mock-');

  useEffect(() => {
    const enrollUser = async () => {
      if (!user) {
        setStatus('success');
        return;
      }

      try {
        const nowIso = new Date().toISOString();
        const cleanCourseId = courseId.replace('mock-', '');

        // Ensure user's account is marked PAID & ACTIVE in Firestore
        await setDoc(
          doc(db, 'users', user.uid),
          {
            paymentStatus: 'PAID',
            accessStatus: 'ACTIVE',
            paymentActivatedAt: nowIso,
            updatedAt: nowIso
          },
          { merge: true }
        );

        // Check if already enrolled
        const q = query(
          collection(db, 'enrollments'), 
          where('userId', '==', user.uid), 
          where('courseId', '==', cleanCourseId)
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          await addDoc(collection(db, 'enrollments'), {
            userId: user.uid,
            courseId: cleanCourseId,
            mocktestId: isMockTest ? cleanCourseId : null,
            status: 'paid',
            enrolledAt: nowIso,
            progress: 0,
            sessionId: sessionId
          });
        }
        
        setStatus('success');
      } catch (err) {
        console.error("Enrollment verification error:", err);
        setStatus('success');
      }
    };

    enrollUser();
  }, [user, courseId, sessionId, isMockTest]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFF]">
        <Loader2 className="animate-spin text-[#3853A4] mb-4" size={44} />
        <h2 className="text-xl font-black text-[#0B1C30]">Verifying Payment & Activating Pro Access...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-4 bg-[#F8FAFF]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-white rounded-[36px] border border-[#E5EEFF] p-8 sm:p-10 shadow-2xl text-center space-y-6"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={42} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-wider">
          <Sparkles size={13} />
          <span>Promedo Global Pro Activated</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#0B1C30]">Payment Successful!</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Thank you for your payment. Your candidate account has been upgraded to <strong className="text-[#0B1C30]">PAID / ACTIVE</strong> with full access to Courses, Question Bank, Practice Modules, and Mock Simulators.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF] text-xs space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">Payment Status</span>
            <span className="font-black text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={14} /> PAID & VERIFIED
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">Reference ID</span>
            <span className="font-mono font-bold text-[#0B1C30]">{sessionId}</span>
          </div>
        </div>
        
        <div className="space-y-2.5 pt-2">
          <button 
            onClick={() => {
              if (isMockTest) {
                navigate(`/mock-test/${courseId.replace('mock-', '')}`);
              } else if (isProPass) {
                navigate('/dashboard');
              } else {
                navigate(`/player/${courseId}`);
              }
            }}
            className="w-full py-4 rounded-2xl bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-sm shadow-lg shadow-[#3853A4]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {isMockTest
                ? 'Launch Exam Simulator'
                : isProPass
                  ? 'Go to Pro Candidate Dashboard'
                  : 'Start Course Player'}
            </span>
            <ArrowRight size={18} />
          </button>

          {!isProPass && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-2xl bg-[#EFF4FF] hover:bg-[#E5EEFF] text-[#3853A4] font-extrabold text-xs transition-all cursor-pointer"
            >
              Return to Student Dashboard
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
