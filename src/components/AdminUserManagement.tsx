import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  CheckCircle2, 
  X, 
  Edit2, 
  Plus, 
  ChevronRight, 
  BookOpen, 
  BarChart3, 
  Lock, 
  Unlock, 
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, query, orderBy } from 'firebase/firestore';

export interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'student' | 'admin' | 'user' | string;
  status?: 'active' | 'suspended';
  paymentStatus?: 'PAID' | 'UNPAID';
  accessStatus?: 'ACTIVE' | 'LOCKED';
  paymentActivatedAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
  examPreparingFor?: string;
  enrolledCoursesCount?: number;
  totalPracticeAttempts?: number;
}

interface AdminUserManagementProps {
  onOpenEmailSender?: (email: string) => void;
}

export default function AdminUserManagement({ onOpenEmailSender }: AdminUserManagementProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'student' | 'admin' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  
  // Selected user for Detail Modal
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New User Creation Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'student' | 'admin' | 'user'>('student');
  const [newUserExam, setNewUserExam] = useState('DHA Dubai');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Action Feedback Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch users from Firestore & Local Storage
  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const firestoreUsers: UserRecord[] = snap.docs.map(d => {
        const raw = d.data();
        const role = raw.role || 'student';
        const isAdminUser = role === 'admin' || raw.email?.toLowerCase() === 'live.rafick@gmail.com';
        const paymentStatus: 'PAID' | 'UNPAID' = isAdminUser || raw.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
        const accessStatus: 'ACTIVE' | 'LOCKED' = paymentStatus === 'PAID' ? 'ACTIVE' : 'LOCKED';

        return {
          id: d.id,
          status: raw.status || 'active',
          paymentStatus,
          accessStatus,
          paymentActivatedAt: raw.paymentActivatedAt,
          ...(raw as Omit<UserRecord, 'id'>)
        };
      });

      // Also incorporate userLogins
      let logins: any[] = [];
      try {
        const loginsSnap = await getDocs(collection(db, 'userLogins'));
        logins = loginsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        try {
          const raw = localStorage.getItem('promedo_user_logins');
          if (raw) logins = JSON.parse(raw);
        } catch (_) {}
      }

      // Merge user logins into user records if missing
      const userMap = new Map<string, UserRecord>();
      firestoreUsers.forEach(u => {
        if (u.email) userMap.set(u.email.toLowerCase(), u);
      });

      logins.forEach((l: any) => {
        const key = (l.email || l.id).toLowerCase();
        if (!userMap.has(key)) {
          const lPaid: 'PAID' | 'UNPAID' = l.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
          userMap.set(key, {
            id: l.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: l.name || 'Candidate',
            email: l.email || '',
            phone: l.phone || '',
            role: 'student',
            status: 'active',
            paymentStatus: lPaid,
            accessStatus: lPaid === 'PAID' ? 'ACTIVE' : 'LOCKED',
            paymentActivatedAt: l.paymentActivatedAt,
            createdAt: l.createdAt || l.lastLoginAt || new Date().toISOString(),
            lastLoginAt: l.lastLoginAt,
            examPreparingFor: l.examPreparingFor || 'DHA Dubai'
          });
        } else {
          const existing = userMap.get(key)!;
          if (!existing.phone && l.phone) existing.phone = l.phone;
          if (!existing.examPreparingFor && l.examPreparingFor) existing.examPreparingFor = l.examPreparingFor;
          if (!existing.lastLoginAt && l.lastLoginAt) existing.lastLoginAt = l.lastLoginAt;
          if (!existing.paymentStatus && l.paymentStatus) existing.paymentStatus = l.paymentStatus;
          if (!existing.paymentActivatedAt && l.paymentActivatedAt) existing.paymentActivatedAt = l.paymentActivatedAt;
        }
      });

      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  // Admin Payment Access Management: Toggle student between PAID and UNPAID
  const handleTogglePaymentStatus = async (userId: string, targetStatus: 'PAID' | 'UNPAID') => {
    const newAccessStatus = targetStatus === 'PAID' ? 'ACTIVE' : 'LOCKED';
    const now = new Date().toISOString();
    const activationDate = targetStatus === 'PAID' ? now : null;

    try {
      await setDoc(doc(db, 'users', userId), {
        paymentStatus: targetStatus,
        accessStatus: newAccessStatus,
        paymentActivatedAt: activationDate,
        updatedAt: now
      }, { merge: true });

      // Also sync to userLogins document if present
      const target = users.find(u => u.id === userId);
      if (target?.email) {
        const safeKey = target.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        try {
          await setDoc(doc(db, 'userLogins', safeKey), {
            paymentStatus: targetStatus,
            accessStatus: newAccessStatus,
            paymentActivatedAt: activationDate
          }, { merge: true });
        } catch (_) {}
      }

      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        paymentStatus: targetStatus,
        accessStatus: newAccessStatus,
        paymentActivatedAt: activationDate || undefined
      } : u));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          paymentStatus: targetStatus,
          accessStatus: newAccessStatus,
          paymentActivatedAt: activationDate || undefined
        } : null);
      }

      showToast(`Student payment changed to ${targetStatus} (${targetStatus === 'PAID' ? 'Premium Access Granted' : 'Premium Access Revoked'})`);
    } catch (err: any) {
      console.error("Error updating payment status in Firestore:", err);
      showToast('Failed to update student payment status', 'error');
    }
  };

  // Toggle Role
  const handleUpdateRole = async (userId: string, newRole: 'student' | 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
      showToast(`User role updated to ${newRole.toUpperCase()}`);
    } catch (err) {
      // If doc doesn't exist yet, setDoc merge
      try {
        const target = users.find(u => u.id === userId);
        if (target) {
          await setDoc(doc(db, 'users', userId), {
            name: target.name || 'User',
            email: target.email || '',
            role: newRole,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
          showToast(`User role set to ${newRole.toUpperCase()}`);
        }
      } catch (e: any) {
        showToast('Failed to update role in database', 'error');
      }
    }
  };

  // Toggle Account Status (Active vs Suspended)
  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await setDoc(doc(db, 'users', userId), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: nextStatus } : null);
      }
      showToast(`User account status changed to ${nextStatus.toUpperCase()}`);
    } catch (err) {
      showToast('Failed to change account status', 'error');
    }
  };

  // Create New User / Student
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('Please provide Name and Email', 'error');
      return;
    }

    setSubmittingUser(true);
    try {
      const newUserRecord: UserRecord = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        phone: newUserPhone.trim(),
        role: newUserRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        examPreparingFor: newUserExam
      };

      await setDoc(doc(db, 'users', newUserRecord.id), newUserRecord);
      setUsers(prev => [newUserRecord, ...prev]);

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setIsAddUserModalOpen(false);
      showToast(`User ${newUserRecord.name} created successfully!`);
    } catch (err: any) {
      showToast('Failed to create user record', 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.examPreparingFor && u.examPreparingFor.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || (u.role || 'student').toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || (u.status || 'active').toLowerCase() === statusFilter.toLowerCase();
    const isPaidUser = u.role === 'admin' || u.paymentStatus === 'PAID';
    const matchesPayment = paymentFilter === 'ALL' || 
      (paymentFilter === 'PAID' && isPaidUser) || 
      (paymentFilter === 'UNPAID' && !isPaidUser);

    return matchesSearch && matchesRole && matchesStatus && matchesPayment;
  });

  const totalStudents = users.filter(u => (u.role || 'student').toLowerCase() === 'student').length;
  const totalPaid = users.filter(u => u.paymentStatus === 'PAID' || u.role === 'admin').length;
  const totalUnpaid = users.filter(u => u.role !== 'admin' && u.paymentStatus !== 'PAID').length;
  const totalAdmins = users.filter(u => (u.role || '').toLowerCase() === 'admin').length;
  const totalSuspended = users.filter(u => u.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in ${
          toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={toastMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'} />
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-gray-500 hover:text-gray-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Users</span>
            <Users size={16} className="text-[#3853A4]" />
          </div>
          <p className="text-2xl font-black text-slate-900">{users.length}</p>
          <span className="text-[10px] font-semibold text-slate-400">All registered candidates</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">PAID (Full Access)</span>
            <Award size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{totalPaid}</p>
          <span className="text-[10px] font-semibold text-emerald-700">Premium unlocked</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">UNPAID (Locked)</span>
            <Lock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{totalUnpaid}</p>
          <span className="text-[10px] font-semibold text-amber-700">Awaiting upgrade</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Admins</span>
            <ShieldCheck size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600">{totalAdmins}</p>
          <span className="text-[10px] font-semibold text-slate-400">System admin controls</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Suspended</span>
            <UserX size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600">{totalSuspended}</p>
          <span className="text-[10px] font-semibold text-slate-400">Restricted login access</span>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add User */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {(['ALL', 'student', 'admin'] as const).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  roleFilter === role ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {(['ALL', 'PAID', 'UNPAID'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPaymentFilter(p)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  paymentFilter === p 
                    ? p === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : p === 'UNPAID' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-white text-blue-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'ALL' ? 'All Access' : p === 'PAID' ? 'PAID (Pro)' : 'UNPAID'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {(['ALL', 'active', 'suspended'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-[#3853A4] text-white rounded-2xl text-xs font-black transition-all shadow-2xs flex items-center gap-2 cursor-pointer shrink-0 ml-auto md:ml-0"
          >
            <Plus size={15} />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#3853A4] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading candidate directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-dashed">
            <Users size={36} className="text-slate-300 mx-auto" />
            <p className="font-extrabold text-slate-800 text-sm">No Candidate Accounts Found</p>
            <p className="text-xs text-slate-400">Try loosening your search query or payment filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[#0B1C30] uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-6">Student Name & Email</th>
                  <th className="py-4 px-4">Registration Date</th>
                  <th className="py-4 px-4">Payment Status</th>
                  <th className="py-4 px-4">Access Status</th>
                  <th className="py-4 px-4">Activation Date</th>
                  <th className="py-4 px-6 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u) => {
                  const role = u.role || 'student';
                  const isSuspended = u.status === 'suspended';
                  const isAdminUser = role === 'admin' || u.email?.toLowerCase() === 'live.rafick@gmail.com';
                  const isPaid = isAdminUser || u.paymentStatus === 'PAID';
                  const accessStatus = isPaid ? 'ACTIVE' : 'LOCKED';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isAdminUser 
                              ? 'bg-purple-100 text-purple-700' 
                              : isPaid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(u.name || 'User').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-900 text-sm leading-tight">{u.name || 'Candidate'}</p>
                              {isAdminUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[9px] font-black uppercase">Admin</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">{u.email || 'No email provided'}</p>
                            {u.phone && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone size={10} className="text-slate-400" /> {u.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-800 font-bold text-[11px]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          {isAdminUser ? (
                            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <ShieldCheck size={12} />
                              ADMIN (FREE)
                            </span>
                          ) : (
                            <select
                              value={u.paymentStatus || 'UNPAID'}
                              onChange={(e) => handleTogglePaymentStatus(u.id, e.target.value as 'PAID' | 'UNPAID')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none border cursor-pointer transition-all ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              <option value="PAID">PAID (Full Access)</option>
                              <option value="UNPAID">UNPAID (Locked)</option>
                            </select>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          accessStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${accessStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {accessStatus === 'ACTIVE' ? 'ACTIVE' : 'LOCKED'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {u.paymentActivatedAt ? (
                          <div className="space-y-0.5">
                            <span className="text-slate-800 font-bold text-[11px] block">
                              {new Date(u.paymentActivatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(u.paymentActivatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : isPaid ? (
                          <span className="text-emerald-700 text-[11px] font-bold">Admin Granted</span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Not Activated</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Payment Quick Toggle Button */}
                          {!isAdminUser && (
                            <button
                              onClick={() => handleTogglePaymentStatus(u.id, isPaid ? 'UNPAID' : 'PAID')}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                                isPaid
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title={isPaid ? "Revoke Premium Access" : "Activate Premium Access"}
                            >
                              {isPaid ? <Lock size={12} /> : <Unlock size={12} />}
                              <span>{isPaid ? 'Revoke Pro' : 'Make Pro'}</span>
                            </button>
                          )}

                          {/* Send Direct Email */}
                          <button
                            onClick={() => onOpenEmailSender && u.email && onOpenEmailSender(u.email)}
                            className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
                            title="Send Direct Email"
                          >
                            <Mail size={14} />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isSuspended 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                            title={isSuspended ? "Re-activate Account" : "Suspend Account"}
                          >
                            {isSuspended ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>

                          {/* Inspect Profile Details */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-2 bg-slate-900 text-white hover:bg-[#3853A4] rounded-xl transition-all cursor-pointer"
                            title="Inspect Candidate Profile & Payment"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* USER PROFILE DETAIL MODAL */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsDetailModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3853A4] font-black text-lg flex items-center justify-center">
                  {(selectedUser.name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Payment & Access Status Highlight Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedUser.paymentStatus === 'PAID' || selectedUser.role === 'admin'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider block">Student Payment Status</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">
                      {selectedUser.paymentStatus === 'PAID' || selectedUser.role === 'admin' ? 'PAID (Full Access Enabled)' : 'UNPAID (Premium Locked)'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedUser.paymentStatus === 'PAID' || selectedUser.role === 'admin'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      {selectedUser.paymentStatus === 'PAID' || selectedUser.role === 'admin' ? 'ACTIVE' : 'LOCKED'}
                    </span>
                  </div>
                  {selectedUser.paymentActivatedAt && (
                    <p className="text-[10px] text-slate-500">
                      Activated on: {new Date(selectedUser.paymentActivatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {selectedUser.role !== 'admin' && (
                  <button
                    onClick={() => handleTogglePaymentStatus(
                      selectedUser.id, 
                      selectedUser.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID'
                    )}
                    className={`px-3 py-2 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all ${
                      selectedUser.paymentStatus === 'PAID'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {selectedUser.paymentStatus === 'PAID' ? 'Revoke Access (UNPAID)' : 'Activate Access (PAID)'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-semibold">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Role</span>
                  <span className="text-slate-900 font-extrabold uppercase">{selectedUser.role || 'Student'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Target Exam</span>
                  <span className="text-slate-900 font-extrabold">{selectedUser.examPreparingFor || 'DHA Dubai'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Mobile</span>
                  <span className="text-slate-900 font-extrabold">{selectedUser.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Account Status</span>
                  <span className={`font-extrabold ${selectedUser.status === 'suspended' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {(selectedUser.status || 'active').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Registration Date</span>
                  <span className="text-slate-900 font-extrabold">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Payment Activated</span>
                  <span className="text-slate-900 font-extrabold">
                    {selectedUser.paymentActivatedAt ? new Date(selectedUser.paymentActivatedAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="font-extrabold text-slate-800">Quick Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      if (onOpenEmailSender && selectedUser.email) onOpenEmailSender(selectedUser.email);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail size={15} />
                    <span>Send Email Notification</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                    className={`px-4 py-3 rounded-2xl font-bold text-xs cursor-pointer ${
                      selectedUser.status === 'suspended'
                        ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-900 hover:bg-red-200'
                    }`}
                  >
                    {selectedUser.status === 'suspended' ? 'Re-activate' : 'Suspend Access'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CANDIDATE MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAddUserModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-lg">Add New Candidate / User</h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Dr. Alexander Smith"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="alexander@hospital.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Mobile Phone (WhatsApp)</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase mb-1">Assign Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 uppercase mb-1">Target Exam</label>
                  <select
                    value={newUserExam}
                    onChange={e => setNewUserExam(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none cursor-pointer"
                  >
                    <option value="DHA Dubai">DHA Dubai</option>
                    <option value="HAAD / DOH">HAAD / DOH</option>
                    <option value="MOHAP UAE">MOHAP UAE</option>
                    <option value="SMLE Saudi">SMLE Saudi</option>
                    <option value="OMSB Oman">OMSB Oman</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingUser}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xs disabled:opacity-50"
                >
                  {submittingUser ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
