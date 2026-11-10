import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MessageCircle, Instagram, Send, CheckCircle2, Clock, HelpCircle, ChevronDown, Sparkles, ShieldCheck, Headphones } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const FAQ_ITEMS = [
  {
    q: "How do I start preparing for DHA, MOH, DOH/HAAD, or SMLE Prometric exams?",
    a: "We recommend starting by practicing our high-yield Prometric Mock Test simulators. You can choose specific medical subjects or take full length simulated timed exams with detailed rationales."
  },
  {
    q: "Are the question banks and study materials updated for 2025/2026?",
    a: "Yes! All our practice questions, mock tests, and upcoming video lectures strictly adhere to the latest 2025/2026 Prometric and Gulf Health Authority syllabus blueprints."
  },
  {
    q: "How can I access the Mock Test Simulator?",
    a: "You can click on 'Mock Tests' or 'Practice' from the LMS portal dashboard after creating your free account. Instant results and rationales are provided for every question."
  },
  {
    q: "Can Promedo assist me with document verification or eligibility guidance?",
    a: "Yes, our team provides guidance regarding DataFlow verification, eligibility criteria, and exam registration procedures for doctors and medical professionals."
  },
  {
    q: "How can I get in touch for urgent technical or billing support?",
    a: "You can connect with us instantly on WhatsApp at +91 90373 84400 or email us at info.promedo@gmail.com. Our support team typically responds within a few hours."
  }
];

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'Prometric Exam Guidance',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      fullName: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      subject: formData.inquiryType,
      message: formData.message.trim(),
      type: 'support',
      source: 'Contact Support Page',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    let docId = 'enq_sup_' + Date.now();

    try {
      const docRef = await addDoc(collection(db, 'enquiries'), payload);
      if (docRef?.id) docId = docRef.id;
    } catch (err) {
      console.warn("Could not save support enquiry directly to Firestore, saving locally:", err);
    }

    try {
      const existing = JSON.parse(localStorage.getItem('local_enquiries') || '[]');
      localStorage.setItem('local_enquiries', JSON.stringify([{ id: docId, ...payload }, ...existing]));
    } catch (_) {}

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] pt-8 pb-24">
      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-periwinkle text-brand-blue text-xs font-black rounded-full mb-4"
        >
          <Headphones size={15} />
          <span>Promedo Support Center</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black font-display text-brand-dark tracking-tight mb-4"
        >
          How Can We <span className="text-brand-blue">Help You?</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-gray-600 text-base sm:text-lg leading-relaxed"
        >
          Have questions about GP Prometric exams, LMS course materials, or licensing guidance? Our dedicated support team is here to assist you.
        </motion.p>
      </div>

      {/* Direct Contact Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* WhatsApp Direct */}
          <motion.a 
            href="https://wa.me/919037384400"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle size={24} />
              </div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Instant Chat</p>
              <h3 className="text-lg font-black text-brand-dark mb-1">WhatsApp Support</h3>
              <p className="text-xs text-gray-500 mb-4">+91 90373 84400</p>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 group-hover:underline flex items-center gap-1">
              Start Chat &rarr;
            </span>
          </motion.a>

          {/* Call Us */}
          <motion.a 
            href="tel:+919037384400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-blue/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-brand-periwinkle text-brand-blue rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Phone size={24} />
              </div>
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-1">Direct Call</p>
              <h3 className="text-lg font-black text-brand-dark mb-1">Call Us</h3>
              <p className="text-xs text-gray-500 mb-4">+91 90373 84400</p>
            </div>
            <span className="text-xs font-extrabold text-brand-blue group-hover:underline flex items-center gap-1">
              Call Now &rarr;
            </span>
          </motion.a>

          {/* Email Us */}
          <motion.a 
            href="mailto:info.promedo@gmail.com"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-blue/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-1">Official Email</p>
              <h3 className="text-lg font-black text-brand-dark mb-1">Email Support</h3>
              <p className="text-xs text-gray-500 mb-4">info.promedo@gmail.com</p>
            </div>
            <span className="text-xs font-extrabold text-brand-blue group-hover:underline flex items-center gap-1">
              Send Email &rarr;
            </span>
          </motion.a>

          {/* Instagram */}
          <motion.a 
            href="https://www.instagram.com/promedo_global?igsh=Y3JncDc5eGFieTdz&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Instagram size={24} />
              </div>
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-1">Social Media</p>
              <h3 className="text-lg font-black text-brand-dark mb-1">Instagram</h3>
              <p className="text-xs text-gray-500 mb-4">@promedo_global</p>
            </div>
            <span className="text-xs font-extrabold text-pink-600 group-hover:underline flex items-center gap-1">
              Visit Instagram &rarr;
            </span>
          </motion.a>
        </div>
      </div>

      {/* Main Support Form & Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Info & Hours */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black text-brand-dark mb-4">Support Hours & Assistance</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Our medical advisory team and support staff are available to help you navigate DHA, DOH, MOH, and SMLE exam preparations.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50">
                  <Clock className="text-brand-blue shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Working Hours</h4>
                    <p className="text-xs text-gray-500">Monday - Saturday: 9:00 AM - 8:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50">
                  <ShieldCheck className="text-brand-blue shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Guaranteed Response</h4>
                    <p className="text-xs text-gray-500">All queries answered within 2-4 business hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50">
                  <Sparkles className="text-brand-blue shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Prometric Licensing Guidance</h4>
                    <p className="text-xs text-gray-500">Personalized consultation for DHA, DOH, MOH, SMLE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick banner card */}
            <div className="bg-gradient-to-br from-brand-blue to-blue-700 p-8 rounded-3xl text-white shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Fast Track
              </span>
              <h4 className="text-xl font-extrabold mt-3 mb-2">Need Immediate Guidance?</h4>
              <p className="text-xs text-white/80 leading-relaxed mb-6">
                Chat directly with our Prometric coordinator on WhatsApp for quick advice on eligibility and study plans.
              </p>
              <a 
                href="https://wa.me/919037384400"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-brand-blue px-5 py-3 rounded-2xl text-xs font-black hover:bg-gray-100 transition-all shadow-md"
              >
                <MessageCircle size={16} />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Column: Support Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-lg">
              <h3 className="text-2xl sm:text-3xl font-black text-brand-dark mb-2">Send Us a Message</h3>
              <p className="text-gray-500 text-xs sm:text-sm mb-8">
                Fill out the form below and our medical education team will reach back to you shortly.
              </p>

              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center my-6"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-2xl font-black text-emerald-900 mb-2">Thank You!</h4>
                  <p className="text-emerald-700 text-sm max-w-md mx-auto mb-6">
                    Your inquiry has been received. One of our Promedo support specialists will contact you shortly via email or phone.
                  </p>
                  <button 
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', phone: '', inquiryType: 'Prometric Exam Guidance', message: '' });
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-extrabold text-brand-dark uppercase tracking-wider mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. John Doe"
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-brand-dark uppercase tracking-wider mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="doctor@example.com"
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-extrabold text-brand-dark uppercase tracking-wider mb-2">
                        Phone / WhatsApp
                      </label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 90373 84400"
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-brand-dark uppercase tracking-wider mb-2">
                        Inquiry Topic
                      </label>
                      <select 
                        value={formData.inquiryType}
                        onChange={e => setFormData({ ...formData, inquiryType: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium transition-all outline-none"
                      >
                        <option value="Prometric Exam Guidance">Prometric Exam Guidance</option>
                        <option value="DHA / DOH / MOH / SMLE Licensing">DHA / DOH / MOH / SMLE Licensing</option>
                        <option value="Mock Test & Question Bank">Mock Test & Question Bank</option>
                        <option value="Course Platform & LMS">Course Platform & LMS</option>
                        <option value="Billing & Enrolment">Billing & Enrolment</option>
                        <option value="Other Assistance">Other Assistance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-brand-dark uppercase tracking-wider mb-2">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe how we can assist you with your exam prep or licensing..."
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm font-medium transition-all outline-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white font-extrabold text-sm transition-all shadow-lg shadow-brand-blue/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {loading ? (
                      <span>Sending inquiry...</span>
                    ) : (
                      <>
                        <span>Submit Support Inquiry</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-brand-periwinkle text-brand-blue text-xs font-extrabold rounded-full mb-3">
            <HelpCircle size={14} />
            Got Questions?
          </span>
          <h2 className="text-3xl font-black text-brand-dark tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex justify-between items-center gap-4 text-brand-dark font-extrabold text-sm sm:text-base hover:text-brand-blue transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown 
                  size={18} 
                  className={`text-brand-blue shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} 
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
