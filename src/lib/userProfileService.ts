import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface UserProfileData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  
  // Personal Information
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: string; // Male | Female | Other | Prefer not to say
  
  // Academic Information
  institution?: string; // Institution / School / College Name
  qualification?: string; // Qualification / Education Level (e.g., MBBS, BDS, Nursing, Pharmacy)
  course?: string; // Course / Program
  currentYear?: string; // Current Year / Semester
  studentId?: string; // Optional Student ID
  
  // Location Information
  country?: string;
  state?: string; // State / Emirate
  city?: string;
  address?: string; // Optional Full Address
  
  // Account Information
  examPreparingFor?: string;
  role: 'user' | 'student' | 'admin';
  createdAt?: string;
  updatedAt?: string;
  termsAgreed?: boolean;
  termsAgreedAt?: string;
  authProvider?: string;
  
  // Statistics
  mockTestsTaken?: number;
  questionsAttempted?: number;
  averageScore?: number;
  bestScore?: number;
}

export const REQUIRED_PROFILE_FIELDS = [
  'name',
  'email',
  'phone',
  'dateOfBirth',
  'gender',
  'institution',
  'qualification',
  'course',
  'currentYear',
  'country',
  'state',
  'city'
];

/**
 * Fetch profile data for a given user UID from Firestore users collection
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return { uid, ...snap.data() } as UserProfileData;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user profile for ${uid}:`, error);
    return null;
  }
}

/**
 * Save / Update user profile details defensively merging into Firestore users/{uid}
 */
export async function saveUserProfile(uid: string, profileData: Partial<UserProfileData>): Promise<void> {
  if (!uid) throw new Error('User UID is required to save profile');
  
  const now = new Date().toISOString();
  
  // Exclude forbidden fields from being overwritten
  const { uid: _u, role: _r, createdAt: _c, ...safeData } = profileData;
  
  const payloadToSave: Record<string, any> = {
    ...safeData,
    updatedAt: now
  };
  
  // Remove undefined properties
  Object.keys(payloadToSave).forEach(key => {
    if (payloadToSave[key] === undefined) {
      delete payloadToSave[key];
    }
  });

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, payloadToSave, { merge: true });
    
    // Also update local storage cache
    if (typeof window !== 'undefined') {
      try {
        if (safeData.phone) localStorage.setItem('promedo_user_phone', safeData.phone);
        if (safeData.name) localStorage.setItem('promedo_user_name', safeData.name);
        if (safeData.examPreparingFor) localStorage.setItem('promedo_user_exam', safeData.examPreparingFor);
        localStorage.setItem(`promedo_profile_${uid}`, JSON.stringify(payloadToSave));
      } catch (_) {}
    }
  } catch (err) {
    console.error("Failed to save user profile:", err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Calculates profile completion percentage (0-100%)
 */
export function calculateProfileCompletion(profile: Partial<UserProfileData> | null): number {
  if (!profile) return 0;
  
  const trackFields = [
    'name',
    'email',
    'phone',
    'photoURL',
    'dateOfBirth',
    'gender',
    'institution',
    'qualification',
    'course',
    'currentYear',
    'country',
    'state',
    'city'
  ];

  let filled = 0;
  trackFields.forEach(field => {
    const val = (profile as any)[field];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      filled += 1;
    }
  });

  return Math.round((filled / trackFields.length) * 100);
}

/**
 * Checks if profile is incomplete (missing required personal, academic, or location fields)
 */
export function isProfileIncomplete(profile: Partial<UserProfileData> | null): boolean {
  if (!profile) return true;
  
  const keyFields: (keyof UserProfileData)[] = [
    'dateOfBirth',
    'gender',
    'institution',
    'qualification',
    'course',
    'currentYear',
    'country',
    'state',
    'city'
  ];

  for (const field of keyFields) {
    const val = profile[field];
    if (!val || typeof val !== 'string' || !val.trim()) {
      return true;
    }
  }

  return false;
}
