import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  MessageSquare, 
  PhoneCall, 
  Lock, 
  GraduationCap, 
  ArrowLeft,
  Mail,
  Award,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PremiumUpgradeScreenProps {
  moduleName?: string;
  onBack?: () => void;
  inline?: boolean;
}

export const PremiumUpgradeScreen: React.FC<PremiumUpgradeScreenProps> = ({
  moduleName = 'Learning Modules',
  onBack,
  inline = false
}) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    // Direct students to existing contact / consultation support flow
    navigate('/contact', {
      state: {
        message: `I would like to upgrade to Promedo Global Pro to unlock full access to ${moduleName}.`,
        subject: 'Promedo Global Pro Upgrade Request'
      }
    });
  };

  return (
    <div className={`w-full flex items-center justify-center ${inline ? 'py-8' : 'min-h-[calc(100vh-6rem)] py-12 px-4'}`}>
      <div className="w-full max-w-2xl bg-white rounded-[36px] border border-blue-100 shadow-xl overflow-hidden relative">
        
        {/* Subtle Ambient Glow Blobs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#3853A4]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Card Banner */}
        <div className="bg-gradient-to-br from-[#1B2234] via-[#212E4A] to-[#3853A4] text-white p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-blue-100 text-xs font-black tracking-wider uppercase mb-5 backdrop-blur-sm">
            <Lock size={14} className="text-amber-300" />
            <span>Premium Module Protected</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white mb-3">
            Always Make It Pro
          </h2>

          <p className="text-sm sm:text-base text-blue-100/90 font-medium max-w-lg mx-auto leading-relaxed">
            Unlock your full learning experience with Promedo Global Pro.
          </p>

          {/* Authority Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 text-[10px] font-black uppercase border border-white/10">
              DHA Dubai
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 text-[10px] font-black uppercase border border-white/10">
              HAAD Abu Dhabi
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 text-[10px] font-black uppercase border border-white/10">
              SMLE Saudi
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 text-[10px] font-black uppercase border border-white/10">
              OMSB Oman
            </span>
          </div>
        </div>

        {/* Benefits & Access List */}
        <div className="p-8 sm:p-10 space-y-6 relative z-10">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#3853A4] mb-3">
              Get unlimited access to:
            </p>

            <div className="space-y-3.5">
              {[
                { label: 'Complete Courses', desc: 'Full syllabus, clinical video lectures, and faculty notes' },
                { label: 'Mock Tests', desc: 'Timed CBT simulators matching Prometric & Pearson VUE criteria' },
                { label: 'Practice Sessions', desc: 'Interactive untimed learning mode with instant clinical rationale' },
                { label: 'Subject-wise Question Bank', desc: 'High-yield recall questions, verified answers, and bookmarks' },
                { label: 'Learning and performance tracking', desc: 'Detailed score trend analytics and readiness reports' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-blue-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{item.label}</h4>
                    <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-3 space-y-3">
            <button
              onClick={handleUpgradeClick}
              className="w-full py-4 bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-sm rounded-2xl shadow-lg shadow-[#3853A4]/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer group"
            >
              <Sparkles size={18} className="text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Upgrade to Pro</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-xs font-medium text-slate-500 text-center">
              Contact administration to activate your premium access.
            </p>
          </div>

          {/* Direct Support Quick Connect */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-bold">
              <ShieldCheck size={16} className="text-[#3853A4]" />
              <span>Official Promedo Global License</span>
            </div>

            <div className="flex items-center gap-3">
              <a 
                href="https://wa.me/971500000000" 
                target="_blank" 
                rel="noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <MessageSquare size={13} />
                <span>WhatsApp Admin</span>
              </a>

              <span className="text-slate-300">•</span>

              <button
                onClick={() => onBack ? onBack() : navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PremiumUpgradeScreen;
