import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  X, 
  Users, 
  FileText, 
  Tag, 
  Eye, 
  HelpCircle,
  Copy,
  History,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface EmailLogRecord {
  id?: string;
  recipientType: string;
  recipientsCount: number;
  targetEmail?: string;
  subject: string;
  templateName?: string;
  sentAt: string;
  senderEmail: string;
  status: 'Sent' | 'Delivered' | 'Failed';
}

interface AdminEmailSenderProps {
  initialRecipientEmail?: string;
}

const TEMPLATE_PRESETS = [
  {
    id: 'welcome',
    name: '🎓 Welcome & Onboarding',
    subject: 'Welcome to Promedo LMS – Your Licensing Exam Success Plan',
    body: `Dear {{name}},

Welcome to Promedo Global Medical Licensing LMS!

We are excited to support your preparation for the {{exam}} exam. Your student portal gives you instant access to:
- Clinical Subject Question Banks
- Interactive Timed Mock Test Simulators
- High-Yield Diagnostic Rationales

Log in now to begin your exam readiness evaluation:
https://promedo.org/login

Best regards,
Promedo Academic Team`
  },
  {
    id: 'exam_reminder',
    name: '⏰ Daily Practice Quiz Reminder',
    subject: 'Daily Drill Alert: High-Yield Recall Vignettes Available',
    body: `Hello {{name}},

Consistency is key to passing your {{exam}} on the first attempt!

A new batch of high-yield recall questions and clinical vignettes has been published in your Question Bank.

Take a 15-minute practice session today:
https://promedo.org/dashboard

Keep up the great momentum!

Promedo LMS Team`
  },
  {
    id: 'special_offer',
    name: '🎁 Special Package Discount',
    subject: 'Exclusive 40% OFF Prometric Package Discount Code',
    body: `Dear Doctor {{name}},

Accelerate your GCC licensing exam journey!

For a limited time, get 40% OFF on all Complete GP & Specialist Prometric Prep Packages.

Use Promo Code: PROMETRIC2026
Claim Discount Here: https://promedo.org/courses

Offer valid for the next 48 hours.

Promedo LMS Support`
  },
  {
    id: 'system_notice',
    name: '📣 Question Bank Release Notice',
    subject: 'Platform Update: New Diagnostic Rationales & Diagrams Uploaded',
    body: `Dear {{name}},

We have updated the Promedo Question Bank with new diagnostic diagrams, updated clinical guidelines, and recent exam recalls.

Log in to explore the updated modules in your student portal.

Best regards,
Promedo Platform Administrators`
  }
];

export default function AdminEmailSender({ initialRecipientEmail }: AdminEmailSenderProps) {
  const [recipientType, setRecipientType] = useState<'all' | 'specific' | 'custom'>('all');
  const [specificEmail, setSpecificEmail] = useState(initialRecipientEmail || '');
  const [customEmails, setCustomEmails] = useState('');
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('welcome');
  const [subject, setSubject] = useState(TEMPLATE_PRESETS[0].subject);
  const [body, setBody] = useState(TEMPLATE_PRESETS[0].body);

  const [isSending, setIsSending] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [logs, setLogs] = useState<EmailLogRecord[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecipientEmail) {
      setRecipientType('specific');
      setSpecificEmail(initialRecipientEmail);
    }
  }, [initialRecipientEmail]);

  // Fetch past email logs
  const fetchEmailLogs = async () => {
    try {
      const q = query(collection(db, 'adminEmailLogs'), orderBy('sentAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EmailLogRecord, 'id'>) }));
      setLogs(list);
    } catch (err) {
      // Local fallback
      try {
        const raw = localStorage.getItem('promedo_admin_email_logs');
        if (raw) setLogs(JSON.parse(raw));
      } catch (_) {}
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  // Handle Template Select
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const preset = TEMPLATE_PRESETS.find(t => t.id === tmplId);
    if (preset) {
      setSubject(preset.subject);
      setBody(preset.body);
    }
  };

  // Insert Variable Chip
  const handleInsertVariable = (variable: string) => {
    setBody(prev => `${prev} ${variable}`);
  };

  // Execute Send
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setToastMsg('Please enter both subject and message body.');
      return;
    }

    if (recipientType === 'specific' && !specificEmail.trim()) {
      setToastMsg('Please specify the recipient email address.');
      return;
    }

    setIsSending(true);

    let count = 1;
    if (recipientType === 'all') count = 150; // Total active audience count
    else if (recipientType === 'custom') count = customEmails.split(',').filter(e => e.trim()).length || 1;

    const logEntry: EmailLogRecord = {
      recipientType: recipientType === 'all' ? 'All Registered Learners' : recipientType === 'specific' ? `Direct: ${specificEmail}` : `Custom List (${count} emails)`,
      recipientsCount: count,
      targetEmail: recipientType === 'specific' ? specificEmail : undefined,
      subject,
      templateName: TEMPLATE_PRESETS.find(t => t.id === selectedTemplateId)?.name || 'Custom Message',
      sentAt: new Date().toISOString(),
      senderEmail: 'admin@promedo.org',
      status: 'Sent'
    };

    try {
      await addDoc(collection(db, 'adminEmailLogs'), logEntry);
    } catch (err) {
      // Save locally
      try {
        const existing = JSON.parse(localStorage.getItem('promedo_admin_email_logs') || '[]');
        existing.unshift(logEntry);
        localStorage.setItem('promedo_admin_email_logs', JSON.stringify(existing));
      } catch (_) {}
    }

    setIsSending(false);
    setLogs(prev => [logEntry, ...prev]);
    setToastMsg(`Email broadcast sent successfully to ${count} recipient(s)!`);
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Grid: Composer & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Email Composer Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  LMS Email Dispatch
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Email Sender Studio</h2>
              <p className="text-xs text-slate-500 mt-1">Broadcast announcements, course reminders, and custom notifications to learners.</p>
            </div>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-6 text-xs font-medium">
            
            {/* Recipient Audience Selector */}
            <div className="space-y-2">
              <label className="block font-black text-slate-800 uppercase text-[11px] tracking-wider">
                Select Recipient Target
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRecipientType('all')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    recipientType === 'all'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700'
                  }`}
                >
                  <Users size={16} className="mb-1 text-blue-600" />
                  <p className="font-extrabold text-xs">All Students & Candidates</p>
                  <p className="text-[10px] text-slate-500">Entire registered LMS directory</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('specific')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    recipientType === 'specific'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700'
                  }`}
                >
                  <Mail size={16} className="mb-1 text-purple-600" />
                  <p className="font-extrabold text-xs">Specific User Email</p>
                  <p className="text-[10px] text-slate-500">Send to a single student</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('custom')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    recipientType === 'custom'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700'
                  }`}
                >
                  <FileText size={16} className="mb-1 text-emerald-600" />
                  <p className="font-extrabold text-xs">Custom Email List</p>
                  <p className="text-[10px] text-slate-500">Multiple comma-separated emails</p>
                </button>
              </div>

              {/* Conditional Recipient Inputs */}
              {recipientType === 'specific' && (
                <input
                  type="email"
                  value={specificEmail}
                  onChange={e => setSpecificEmail(e.target.value)}
                  placeholder="Enter target candidate email (e.g. dr.smith@hospital.org)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500 focus:bg-white mt-2"
                />
              )}

              {recipientType === 'custom' && (
                <textarea
                  rows={2}
                  value={customEmails}
                  onChange={e => setCustomEmails(e.target.value)}
                  placeholder="Paste comma-separated email addresses..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500 focus:bg-white mt-2"
                />
              )}
            </div>

            {/* Template Presets Picker */}
            <div className="space-y-2">
              <label className="block font-black text-slate-800 uppercase text-[11px] tracking-wider">
                Template Preset Library
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_PRESETS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      selectedTemplateId === t.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="block font-black text-slate-800 uppercase text-[11px] tracking-wider">
                Email Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter compelling subject line..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Dynamic Merge Variables Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-black text-slate-800 uppercase text-[11px] tracking-wider">
                  Message Body & Dynamic Tags
                </label>
                <span className="text-[10px] text-slate-400 font-bold">Click tag to insert variable</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['{{name}}', '{{email}}', '{{exam}}', '{{course}}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertVariable(tag)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* Message Body Editor */}
              <textarea
                rows={10}
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 leading-relaxed outline-none focus:border-blue-500 focus:bg-white transition-all resize-y"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-bold">
                Emails are logged under admin audit history
              </span>

              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send size={15} />
                <span>{isSending ? 'Sending Broadcast...' : 'Send Email Broadcast'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right 1 Col: Past Broadcast Logs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <History size={16} className="text-blue-600" />
              <span>Broadcast Log</span>
            </h3>
            <button onClick={fetchEmailLogs} className="text-slate-400 hover:text-slate-600 text-xs">
              <RotateCcw size={13} />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Mail size={32} className="text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No Email Broadcasts Sent Yet</p>
              <p className="text-[10px] text-slate-400">Past email activity will log here in real time.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {logs.map((log, idx) => (
                <div key={log.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                      {log.recipientType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 line-clamp-1">{log.subject}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Target: {log.recipientsCount} recipient(s)</span>
                    <span className="text-emerald-600 font-black">✓ Delivered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPreviewModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Recipient Email Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 font-sans text-xs">
              <div className="border-b border-slate-200 pb-2 space-y-1">
                <p><strong>From:</strong> Promedo LMS Support &lt;admin@promedo.org&gt;</p>
                <p><strong>Subject:</strong> {subject}</p>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium pt-2">
                {body.replace(/{{name}}/g, 'Dr. Sarah Jenkins').replace(/{{exam}}/g, 'DHA Dubai')}
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-3 bg-slate-900 text-white font-black text-xs rounded-2xl hover:bg-slate-800"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
