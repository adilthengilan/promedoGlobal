import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  RotateCcw, 
  LogIn, 
  BookOpen, 
  Award, 
  CalendarCheck, 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  BarChart3,
  Layers,
  ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface ActivityItem {
  id: string;
  type: 'login' | 'practice_quiz' | 'mock_test' | 'appointment' | 'bookmark';
  candidateName: string;
  candidateEmail?: string;
  description: string;
  subjectOrExam?: string;
  scorePercent?: number;
  timeAgo: string;
  timestamp: string;
  statusBadge?: string;
}

export default function AdminUserActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'login' | 'practice_quiz' | 'mock_test' | 'appointment'>('ALL');

  // Load real activity stream from Firestore collections & Local Storage
  const loadActivitiesStream = async () => {
    setLoading(true);
    const items: ActivityItem[] = [];

    // 1. Fetch Appointments
    try {
      const apptSnap = await getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(15)));
      apptSnap.docs.forEach(d => {
        const data = d.data();
        items.push({
          id: `appt_${d.id}`,
          type: 'appointment',
          candidateName: data.fullName || 'Candidate',
          candidateEmail: data.email || '',
          description: `Booked consultation appointment for ${data.examPreparingFor || 'GCC Licensing'}`,
          subjectOrExam: data.examPreparingFor || 'Prometric',
          timeAgo: data.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          timestamp: data.createdAt || new Date().toISOString(),
          statusBadge: data.status || 'Pending'
        });
      });
    } catch (_) {}

    // 2. Fetch User Logins
    try {
      const loginSnap = await getDocs(query(collection(db, 'userLogins'), limit(15)));
      loginSnap.docs.forEach(d => {
        const data = d.data();
        items.push({
          id: `login_${d.id}`,
          type: 'login',
          candidateName: data.name || 'Candidate',
          candidateEmail: data.email || '',
          description: `Logged in to student portal & registered for ${data.examPreparingFor || 'DHA Dubai'}`,
          subjectOrExam: data.examPreparingFor || 'DHA Dubai',
          timeAgo: data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          timestamp: data.lastLoginAt || data.createdAt || new Date().toISOString(),
          statusBadge: 'Authenticated'
        });
      });
    } catch (_) {}

    // 3. Fetch Subject Practice Attempts
    try {
      const attemptsSnap = await getDocs(query(collection(db, 'subjectPracticeAttempts'), limit(15)));
      attemptsSnap.docs.forEach(d => {
        const data = d.data();
        items.push({
          id: `prac_${d.id}`,
          type: 'practice_quiz',
          candidateName: data.userId ? `Candidate (${data.userId.slice(0, 6)})` : 'Learner',
          description: `Completed ${data.totalQuestions || 0}-question practice quiz in ${data.subjectName || 'Subject'}`,
          subjectOrExam: data.subjectName || 'Subject Practice',
          scorePercent: data.scorePercent || 0,
          timeAgo: data.completedAt ? new Date(data.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          timestamp: data.completedAt || new Date().toISOString(),
          statusBadge: `${data.scorePercent || 0}% Score`
        });
      });
    } catch (_) {}



    // Sort by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(items);
    setLoading(false);
  };

  useEffect(() => {
    loadActivitiesStream();
  }, []);

  const filteredActivities = activities.filter(act => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      act.candidateName.toLowerCase().includes(q) ||
      (act.candidateEmail && act.candidateEmail.toLowerCase().includes(q)) ||
      act.description.toLowerCase().includes(q) ||
      (act.subjectOrExam && act.subjectOrExam.toLowerCase().includes(q));

    const matchesType = typeFilter === 'ALL' || act.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login': return <LogIn size={16} className="text-blue-600" />;
      case 'practice_quiz': return <BookOpen size={16} className="text-emerald-600" />;
      case 'mock_test': return <Award size={16} className="text-purple-600" />;
      case 'appointment': return <CalendarCheck size={16} className="text-amber-600" />;
      default: return <Activity size={16} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Actions</span>
            <Activity size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{activities.length}</p>
          <span className="text-[10px] font-semibold text-slate-400">Recorded student interactions</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Practice Drills</span>
            <BookOpen size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {activities.filter(a => a.type === 'practice_quiz').length}
          </p>
          <span className="text-[10px] font-semibold text-slate-400">Subject practice quizzes</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Mock Simulators</span>
            <Award size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600">
            {activities.filter(a => a.type === 'mock_test').length}
          </p>
          <span className="text-[10px] font-semibold text-slate-400">Full exam attempts</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Bookings</span>
            <CalendarCheck size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">
            {activities.filter(a => a.type === 'appointment').length}
          </p>
          <span className="text-[10px] font-semibold text-slate-400">Consultation requests</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search candidate or activity description..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'login', label: 'Logins' },
              { id: 'practice_quiz', label: 'Practice' },
              { id: 'mock_test', label: 'Mock Tests' },
              { id: 'appointment', label: 'Bookings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  typeFilter === tab.id ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadActivitiesStream}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer shrink-0"
            title="Refresh Activities"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Activity size={18} className="text-blue-600" />
            <span>Live Candidate Activity Audit Stream</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold">{filteredActivities.length} Events</span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Syncing live student activity logs...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-16 text-center space-y-2 border-dashed">
            <Activity size={36} className="text-slate-300 mx-auto" />
            <p className="font-extrabold text-slate-800 text-sm">No Activities Logged</p>
            <p className="text-xs text-slate-400">Activities automatically register when learners take practice quizzes or log in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {getActivityIcon(act.type)}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">{act.candidateName}</span>
                      {act.candidateEmail && (
                        <span className="text-[11px] text-slate-400 font-medium">({act.candidateEmail})</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{act.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  {act.statusBadge && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      act.scorePercent !== undefined
                        ? act.scorePercent >= 70 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {act.statusBadge}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={12} /> {act.timeAgo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
