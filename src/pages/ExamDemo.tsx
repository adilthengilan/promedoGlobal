import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ClipboardCheck, ArrowRight, Star, X, User, Phone, Mail, GraduationCap, Loader2, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { COUNTRY_CODES, parsePhoneWithCountryCode } from '../data/countryCodes';
import { CountryCodeSelect } from '../components/CountryCodeSelect';
import { recordCandidateLogin, EXAM_OPTIONS } from '../lib/userLogins';
import { ShimmerCardGrid } from '../components/ShimmerLoader';

const ExamDemo = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [freeTests, setFreeTests] = useState<any[]>([]);
  const [paidTests, setPaidTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+971');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otherExamText, setOtherExamText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    exam: 'DHA (Dubai Health Authority)',
    email: '',
    testId: '',
    selectedExam: ''
  });

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'mocktests'));
        const allTests = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data()
        })) as any[];
        setFreeTests(allTests.filter(t => !t.isPaid));
        setPaidTests(allTests.filter(t => t.isPaid));
      } catch (err) {
        console.error("Error fetching mocktests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = phoneNumber.trim() ? `${selectedCountryCode} ${phoneNumber.trim()}` : '';
    const finalExam = formData.exam === 'Other'
      ? (otherExamText.trim() ? `Other: ${otherExamText.trim()}` : 'Other')
      : formData.exam;

    // Record login for User Management -> Most Logins tracking
    recordCandidateLogin({
      name: formData.name,
      phone: fullPhone,
      email: formData.email,
      examPreparingFor: finalExam,
      source: 'Exam Demo Simulator',
      testTitle: 'GP Prometric Practice Demo'
    });

    try {
      localStorage.setItem('promedo_candidate_registration', JSON.stringify({
        name: formData.name,
        phone: fullPhone,
        email: formData.email,
        exam: finalExam
      }));
    } catch (_) {}

    navigate('/mock-test-intro', { 
      state: { 
        ...formData,
        exam: finalExam,
        phone: fullPhone
      } 
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-blue font-bold mb-8 hover:underline">
          <ArrowLeft size={20} />
          Back to Home
        </Link>
        
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-bold mb-4 uppercase tracking-widest">
            Exam Preparation portal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">GP Prometric Mock Tests</h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg text-balance">
            Practice with our time-based mock tests designed to simulate the real exam environment. 
            Select from our free demos or unlock full premium tests.
          </p>
        </div>

        {/* Free Mock Test Section - Simplified to Single Container */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-grow bg-gray-200"></div>
            <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Star size={20} className="text-brand-blue" />
              Free Demo Test
            </h2>
            <div className="h-px flex-grow bg-gray-200"></div>
          </div>

          <div className="max-w-4xl mx-auto">
            {loading ? (
              <ShimmerCardGrid count={2} columns={2} variant="mocktest" />
            ) : freeTests.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-6">
                {freeTests.map((test) => (
                  <motion.div
                    key={test.id}
                    whileHover={{ y: -5 }}
                    className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col w-full sm:w-[380px] shrink-0"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-500 group-hover:text-white">
                        <Star size={24} />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2 py-1 rounded">Free Trial</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1 group-hover:text-brand-blue transition-colors">{test.title}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">{test.exam} Division</p>
                    
                    <div className="flex items-center gap-4 mb-8 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <ClipboardCheck size={14} className="text-brand-blue" />
                        {Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : 150)} Questions
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{test.timeLimit} Minutes</span>
                    </div>

                    <button 
                      onClick={() => {
                        // We store the testId to navigate to it after form submit
                        setFormData(prev => ({ ...prev, testId: test.id, selectedExam: test.exam }));
                        setShowModal(true);
                      }}
                      className="mt-auto w-full py-4 bg-brand-blue text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      Start Free Prep
                      <ArrowRight size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-100 rounded-[32px] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 italic">No free practice tests available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Premium Mock Tests Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-grow bg-gray-200"></div>
            <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
              Premium Full Tests
            </h2>
            <div className="h-px border-t flex-grow border-gray-200 border-dashed"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {loading ? (
              <div className="w-full">
                <ShimmerCardGrid count={3} variant="mocktest" />
              </div>
            ) : paidTests.length > 0 ? (
              paidTests.map((test) => (
                <motion.div
                  key={test.id}
                  whileHover={{ y: -5 }}
                  className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden w-full sm:w-[380px] shrink-0"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 transition-colors group-hover:bg-yellow-500 group-hover:text-white">
                      <ClipboardCheck size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand-blue">{test.price || '$49'}</p>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Full Access</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 group-hover:text-brand-blue transition-colors">{test.title}</h3>
                  <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">{test.exam} Licensing</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Questions</p>
                      <p className="text-sm font-bold">{Array.isArray(test.questions) ? test.questions.length : (typeof test.questions === 'number' ? test.questions : 150)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Duration</p>
                      <p className="text-sm font-bold">{test.timeLimit} Min</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/checkout/mock-${test.id}`)}
                    className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    Unlock & Start Simulator ({test.price || '$49'})
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-gray-100 rounded-[32px] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 italic">No premium tests available at the moment.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Why Choose Section */}
        <section className="mt-32 pt-20 border-t border-gray-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why prepare with our tests?</h2>
            <p className="text-gray-500">Industry-leading study materials for medical professionals</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                title: "Real Exam Simulation", 
                desc: "Timer-based tests that replicate the actual Prometric exam interface and pressure.",
                icon: "⏱️"
              },
              { 
                title: "Updated Recall Base", 
                desc: "Questions sourced from historical recalls, updated monthly for the 2025 pattern.",
                icon: "📚"
              },
              { 
                title: "Detailed Analytics", 
                desc: "Get subject-wise performance breakdown to identify your weak medical domains.",
                icon: "📊"
              }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-brand-dark hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>

              <div className="mb-6 text-center md:text-left">
                <h2 className="text-2xl font-bold">Registration</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-brand-blue" />
                    Candidate Name
                  </label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Dr. John Doe"
                    className="w-full px-5 py-3.5 bg-brand-gray/50 rounded-2xl focus:ring-2 focus:ring-brand-blue border-none transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={12} className="text-brand-blue" />
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-2.5">
                    <CountryCodeSelect
                      id="select-country-code-demo"
                      value={selectedCountryCode}
                      onChange={setSelectedCountryCode}
                      className="shrink-0 w-[125px] sm:w-[138px]"
                    />

                    <input 
                      id="input-mobile-number-demo"
                      required
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="50 123 4567"
                      className="flex-1 h-[50px] px-4 bg-brand-gray/50 rounded-2xl focus:ring-2 focus:ring-brand-blue border-none transition-all outline-none text-sm text-gray-800 font-medium placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap size={12} className="text-brand-blue" />
                    Select Exam You Are Preparing For
                  </label>
                  <div className="relative">
                    <select 
                      required
                      value={formData.exam}
                      onChange={e => setFormData({...formData, exam: e.target.value})}
                      className="w-full px-5 py-3.5 bg-brand-gray/50 rounded-2xl focus:ring-2 focus:ring-brand-blue border-none transition-all outline-none appearance-none pr-10 cursor-pointer text-sm text-gray-800 font-medium"
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

                  {formData.exam === 'Other' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        required
                        value={otherExamText}
                        onChange={e => setOtherExamText(e.target.value)}
                        placeholder="Please specify your licensing exam (e.g. AMC, USMLE, PLAB, etc.)"
                        className="w-full px-4 py-3 bg-blue-50/50 rounded-xl focus:ring-2 focus:ring-brand-blue border border-blue-200 outline-none text-xs text-gray-800 font-medium placeholder:text-gray-400"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} className="text-brand-blue" />
                    Email Address
                  </label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-5 py-3.5 bg-brand-gray/50 rounded-2xl focus:ring-2 focus:ring-brand-blue border-none transition-all outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-brand-blue text-white rounded-[20px] font-bold text-base hover:shadow-xl hover:shadow-brand-blue/30 transition-all flex items-center justify-center gap-2 group mt-2"
                >
                  Submit and Start
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamDemo;
