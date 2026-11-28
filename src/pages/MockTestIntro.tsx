import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, ClipboardCheck, Clock, Award, ShieldAlert, ArrowLeft, Loader2, User, Mail, Phone, GraduationCap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShimmerPageDetail } from '../components/ShimmerLoader';

const MockTestIntro = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, phone, exam, email, testId, selectedExam } = location.state || {};
  
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(!!testId);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!testId) {
        // Fallback for default test if no ID
        setTestData({
          title: "GP Prometric Mock Demo",
          questions: { length: 25 },
          timeLimit: 30,
          passingScore: 60,
          passScore: 60,
          exam: exam || 'General'
        });
        return;
      }

      try {
        const docRef = doc(db, 'mocktests', testId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTestData({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching test details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [testId, exam]);

  if (loading) {
    return <ShimmerPageDetail title="Preparing your exam dashboard..." />;
  }

  const displayExam = testData?.exam || selectedExam || exam;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-brand-gray/30">
      <div className="max-w-[1500px] mx-auto px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-brand-blue font-bold mb-8 hover:underline transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={18} />
          Change Exam
        </button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-brand-dark/5 border border-gray-100 overflow-hidden max-w-[1500px] mx-auto"
        >
          {/* Header Banner */}
          <div className="bg-brand-dark p-8 md:p-12 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue text-white text-[10px] font-bold rounded-full uppercase tracking-widest mb-4">
                    {displayExam} Licensing Exam
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-2">{testData?.title || 'Exam Prep Center'}</h1>
                  <p className="text-gray-400 text-lg">Candidate: <span className="text-white font-medium">{name || 'Guest User'}</span></p>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mb-1">Pass Score</p>
                    <p className="text-2xl font-bold bg-white/10 px-4 py-2 rounded-2xl">{testData?.passingScore ?? testData?.passScore ?? 60}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <ClipboardCheck className="text-brand-blue mb-3" size={24} />
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Questions</p>
                <p className="text-xl font-bold">{Array.isArray(testData?.questions) ? testData.questions.length : (typeof testData?.questions === 'number' ? testData.questions : 150)}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <Clock className="text-orange-500 mb-3" size={24} />
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Duration</p>
                <p className="text-xl font-bold">{testData?.timeLimit} Min</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <Award className="text-green-500 mb-3" size={24} />
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Level</p>
                <p className="text-xl font-bold">Standard</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <ShieldAlert className="text-brand-blue mb-3" size={24} />
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Mode</p>
                <p className="text-xl font-bold">Mock</p>
              </div>
            </div>

            {/* Candidate Verification & Guidelines */}
            <div className="grid md:grid-cols-3 gap-6 bg-brand-gray/30 p-8 rounded-[32px] border border-brand-gray">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                  <User size={14} /> Profile
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-dark shadow-sm">
                      <GraduationCap size={14} />
                    </div>
                    <p className="font-bold text-sm truncate">{name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-dark shadow-sm">
                      <Phone size={14} />
                    </div>
                    <p className="text-gray-500 text-sm">{phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-dark shadow-sm">
                      <Mail size={14} />
                    </div>
                    <p className="text-gray-500 text-sm truncate">{email}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Exam Guidelines</h3>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0"></div>
                    <p className="text-gray-600">Ensure a stable internet connection throughout.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0"></div>
                    <p className="text-gray-600">The timer cannot be paused once started.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0"></div>
                    <p className="text-gray-600">Pass score required: {testData?.passingScore ?? testData?.passScore ?? 60}%.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0"></div>
                    <p className="text-gray-600">Answers are saved as you navigate.</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              to={testId ? `/mock-test/${testId}` : "/mock-test"}
              state={{ autoStart: true }}
              className="w-full py-8 bg-brand-blue text-white rounded-[32px] font-bold text-xl hover:shadow-2xl hover:shadow-brand-blue/30 transition-all flex items-center justify-center gap-3 group shadow-lg shadow-brand-blue/20"
            >
              <Play size={28} fill="white" />
              START EXAM NOW
            </Link>
            
            <p className="text-center text-gray-400 text-sm italic">
              Ready to challenge yourself? Click start to begin.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MockTestIntro;
