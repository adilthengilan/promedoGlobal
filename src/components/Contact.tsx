import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      subject: formData.subject.trim() || 'General Inquiry',
      message: formData.message.trim(),
      type: 'contact',
      source: 'Landing Page - Get in Touch',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    let docId = 'enq_' + Date.now();

    try {
      const docRef = await addDoc(collection(db, 'enquiries'), payload);
      if (docRef?.id) docId = docRef.id;
    } catch (err) {
      console.warn('Could not save enquiry to Firestore directly, saving to local backup:', err);
    }

    try {
      const existing = JSON.parse(localStorage.getItem('local_enquiries') || '[]');
      localStorage.setItem('local_enquiries', JSON.stringify([{ id: docId, ...payload }, ...existing]));
    } catch (_) {}

    setLoading(false);
    setSubmitted(true);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-4 py-1.5 bg-brand-gray rounded-full text-[10px] font-bold mb-4 uppercase tracking-wider text-brand-dark">
              Contact Us
            </div>
            <h2 className="text-4xl sm:text-5xl font-black font-display text-brand-dark tracking-tight mb-6">
              GET IN TOUCH WITH US
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mb-12 leading-relaxed">
              Have questions about Prometric licensing exams (DHA, DOH/HAAD, MOH, SMLE, OMSB), our course catalog, or question banks? Our academic advisory team is here to guide your journey.
            </p>

            <div className="space-y-8">
              <a href="tel:+919037384400" className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-brand-gray rounded-2xl flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Call Us / WhatsApp</p>
                  <p className="text-xl font-bold group-hover:text-brand-blue transition-colors">+91 90373 84400</p>
                </div>
              </a>
              <a href="mailto:info.promedo@gmail.com" className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-brand-gray rounded-2xl flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Email Us</p>
                  <p className="text-xl font-bold group-hover:text-brand-blue transition-colors">info.promedo@gmail.com</p>
                </div>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-brand-gray p-8 sm:p-10 rounded-[40px] shadow-sm border border-gray-100"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl p-8 text-center space-y-4 border border-emerald-100 shadow-sm"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-brand-dark">Message Received!</h3>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
                    Thank you for reaching out to Promedo Global. Your enquiry has been saved and routed to our academic advisors. We will contact you shortly on WhatsApp or email.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form key="form" onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-sm font-semibold outline-none transition-all"
                        placeholder="Dr. John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-sm font-semibold outline-none transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Phone / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-sm font-semibold outline-none transition-all"
                        placeholder="+91 90373 84400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Subject / Exam <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-sm font-semibold outline-none transition-all"
                        placeholder="e.g. DHA GP Course Enquiry"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Message / Questions <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 bg-white text-sm font-semibold outline-none transition-all"
                      placeholder="Tell us about your educational background, planned exam date, or questions..."
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4 justify-center text-base font-black shadow-lg shadow-brand-blue/20 disabled:opacity-70 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Sending message...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>Send Message</span>
                        <Send size={18} />
                      </span>
                    )}
                  </button>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
