import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'student';
export type PaymentStatus = 'PAID' | 'UNPAID';
export type AccessStatus = 'ACTIVE' | 'LOCKED';

interface AuthContextType {
  user: User | null;
  userName: string;
  userPhone: string;
  role: UserRole;
  isStudent: boolean;
  loading: boolean;
  isAdmin: boolean;
  isPaid: boolean;
  paymentStatus: PaymentStatus;
  accessStatus: AccessStatus;
  paymentActivatedAt?: string;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userName: '',
  userPhone: '',
  role: 'user',
  isStudent: false,
  loading: true, 
  isAdmin: false,
  isPaid: false,
  paymentStatus: 'UNPAID',
  accessStatus: 'LOCKED',
  paymentActivatedAt: undefined,
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [role, setRole] = useState<UserRole>('user');
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('LOCKED');
  const [paymentActivatedAt, setPaymentActivatedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        setIsStudent(false);
        setRole('user');
        setUserName('');
        setUserPhone('');
        setIsPaid(false);
        setPaymentStatus('UNPAID');
        setAccessStatus('LOCKED');
        setPaymentActivatedAt(undefined);
        setLoading(false);
        return;
      }

      const isBootstrapAdmin = currentUser.email?.toLowerCase() === 'live.rafick@gmail.com';
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Real-time snapshot listener on the user's Firestore document
      unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const resolvedRole: UserRole = isBootstrapAdmin || userData?.role === 'admin'
              ? 'admin'
              : userData?.role === 'student'
                ? 'student'
                : 'user';

            setRole(resolvedRole);
            setIsAdmin(resolvedRole === 'admin');
            setIsStudent(resolvedRole === 'student' || resolvedRole === 'admin');

            // Resolve Payment & Access Status
            const isUserAdmin = isBootstrapAdmin || resolvedRole === 'admin';
            const isStudentPaid = isUserAdmin || userData?.paymentStatus === 'PAID';
            setIsPaid(isStudentPaid);
            setPaymentStatus(isStudentPaid ? 'PAID' : 'UNPAID');
            setAccessStatus(isStudentPaid ? 'ACTIVE' : 'LOCKED');
            setPaymentActivatedAt(userData?.paymentActivatedAt || undefined);

            // Resolve candidate display name
            const storedName = userData?.name;
            const authName = currentUser.displayName;
            const emailPrefix = currentUser.email ? currentUser.email.split('@')[0] : '';
            const resolvedName = (storedName && storedName !== 'Doctor') 
              ? storedName 
              : (authName || storedName || emailPrefix || 'Candidate');
            setUserName(resolvedName);

            // Resolve phone number
            const resolvedPhone = userData?.phone || userData?.phoneNumber || userData?.mobile || userData?.whatsapp || userData?.contactNumber || currentUser.phoneNumber || '';
            if (resolvedPhone) {
              setUserPhone(resolvedPhone);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('promedo_user_phone', resolvedPhone);
                } catch (_) {}
              }
            } else if (typeof window !== 'undefined') {
              const localPhone = localStorage.getItem('promedo_user_phone') || '';
              if (localPhone) {
                setUserPhone(localPhone);
                // Backfill to Firestore
                setDoc(userDocRef, { phone: localPhone }, { merge: true }).catch(() => {});
              }
            }
          } else {
            // First time login: create user doc in Firestore with default 'user' role
            const initialRole: UserRole = isBootstrapAdmin ? 'admin' : 'user';
            setRole(initialRole);
            setIsAdmin(initialRole === 'admin');
            setIsStudent(initialRole === 'admin');
            const initialPaid = isBootstrapAdmin;
            setIsPaid(initialPaid);
            setPaymentStatus(initialPaid ? 'PAID' : 'UNPAID');
            setAccessStatus(initialPaid ? 'ACTIVE' : 'LOCKED');

            const defaultName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Candidate');
            setUserName(defaultName);

            try {
              const localPhone = typeof window !== 'undefined' ? (localStorage.getItem('promedo_user_phone') || '') : '';
              const localExam = typeof window !== 'undefined' ? (localStorage.getItem('promedo_user_exam') || '') : '';
              if (localPhone) setUserPhone(localPhone);
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                name: defaultName,
                email: currentUser.email || '',
                role: initialRole,
                paymentStatus: initialPaid ? 'PAID' : 'UNPAID',
                accessStatus: initialPaid ? 'ACTIVE' : 'LOCKED',
                createdAt: new Date().toISOString(),
                photoURL: currentUser.photoURL || '',
                mockTestsTaken: 0,
                questionsAttempted: 0,
                averageScore: 0,
                bestScore: 0,
                ...(localPhone ? { phone: localPhone } : {}),
                ...(localExam ? { examPreparingFor: localExam } : {})
              }, { merge: true });
            } catch (err) {
              console.warn("Could not create initial user record in Firestore:", err);
            }
          }
        } catch (error) {
          console.error("Auth snapshot processing error:", error);
        } finally {
          setLoading(false);
        }
      }, (snapshotErr) => {
        console.warn("User doc listener error:", snapshotErr);
        // Fallback
        const fallbackRole: UserRole = isBootstrapAdmin ? 'admin' : 'user';
        setRole(fallbackRole);
        setIsAdmin(fallbackRole === 'admin');
        setIsStudent(fallbackRole === 'admin');
        setIsPaid(isBootstrapAdmin);
        setPaymentStatus(isBootstrapAdmin ? 'PAID' : 'UNPAID');
        setAccessStatus(isBootstrapAdmin ? 'ACTIVE' : 'LOCKED');
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      unsubscribeAuth();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userName, 
      userPhone, 
      role, 
      isStudent, 
      loading, 
      isAdmin, 
      isPaid, 
      paymentStatus, 
      accessStatus, 
      paymentActivatedAt, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
