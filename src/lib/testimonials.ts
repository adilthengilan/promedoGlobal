import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FEMALE_AVATAR, MALE_AVATAR } from '../components/AvatarPicker';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  avatar?: string;
  rating?: number; // 1 to 5
  studentId?: string;
  status: 'approved' | 'pending' | 'rejected';
  submittedBy?: 'user' | 'admin';
  createdAt: string;
  verifiedAt?: string;
  exam?: string;
  score?: string;
  type?: string;
  savedToFirestore?: boolean;
}

const LOCAL_STORAGE_KEY = 'promedo_testimonials_v3';
const DELETED_STORAGE_KEY = 'promedo_deleted_testimonials_v3';
const PENDING_SYNC_KEY = 'promedo_pending_testimonials_sync_v3';

// Real verified candidate success stories (loaded from Firestore)
export const DEFAULT_TESTIMONIALS: Testimonial[] = [];

export function isDummyTestimonial(t: { id?: string; name?: string; text?: string }): boolean {
  if (!t) return true;
  if (!t.name || !t.text) return true;
  if (t.name.trim().length === 0 || t.text.trim().length === 0) return true;
  if (t.name === 'Test Doc' && t.text === 'Test review content') return true;
  return false;
}

export function notifyTestimonialsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promedo_testimonials_updated'));
  }
}

export function markTestimonialDeleted(id: string) {
  if (!id || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    const set = new Set(raw ? JSON.parse(raw) : []);
    set.add(id);
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export function isTestimonialDeleted(id: string): boolean {
  if (!id || typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    if (!raw) return false;
    const set = new Set(JSON.parse(raw));
    return set.has(id);
  } catch (_) {
    return false;
  }
}

export function getLocalTestimonials(): Testimonial[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: Testimonial[] = JSON.parse(raw);
    return list.filter(t => !isDummyTestimonial(t) && !isTestimonialDeleted(t.id));
  } catch (e) {
    return [];
  }
}

export function saveLocalTestimonials(list: Testimonial[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleaned = list.filter(t => !isDummyTestimonial(t) && !isTestimonialDeleted(t.id));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.warn("Failed to save testimonials to localStorage:", e);
  }
}

/**
 * Background sync queue: Syncs any pending testimonials directly to Firestore 'testimonials' collection
 */
export async function syncPendingTestimonialsToFirestore() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    const pendingList: Testimonial[] = JSON.parse(raw);
    if (!Array.isArray(pendingList) || pendingList.length === 0) return;

    const remaining: Testimonial[] = [];
    for (const item of pendingList) {
      if (isTestimonialDeleted(item.id)) continue;
      try {
        const payload = {
          name: item.name,
          role: item.role,
          title: item.role,
          studentId: item.studentId || '',
          text: item.text,
          rating: item.rating || 5,
          avatar: item.avatar || FEMALE_AVATAR.url,
          posterUrl: item.avatar || FEMALE_AVATAR.url,
          status: item.status,
          submittedBy: item.submittedBy || 'admin',
          createdAt: item.createdAt,
          verifiedAt: item.verifiedAt || item.createdAt,
          type: 'testimonial'
        };
        await setDoc(doc(db, 'testimonials', item.id), payload, { merge: true });
        console.log(`[Firestore] Synced queued testimonial "${item.name}" -> Doc ID: ${item.id}`);
      } catch (_) {
        remaining.push(item);
      }
    }
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
  } catch (_) {}
}

export interface FirestoreSyncResult {
  success: boolean;
  count: number;
  total: number;
  error?: string;
  errorCode?: string;
}

/**
 * Pushes all current testimonials (including curated default ones) directly into Firestore 'testimonials' and 'reviews' collections.
 */
export async function pushAllTestimonialsToFirestore(): Promise<FirestoreSyncResult> {
  const currentList = await fetchAllTestimonials();
  const listToSync = currentList.filter(t => !isTestimonialDeleted(t.id) && !isDummyTestimonial(t));

  if (listToSync.length === 0) {
    return { success: true, count: 0, total: 0 };
  }

  let successCount = 0;
  let lastError: any = null;

  for (const item of listToSync) {
    const payload = {
      name: item.name.trim(),
      role: item.role.trim(),
      title: item.role.trim(),
      studentId: (item.studentId || '').trim(),
      text: item.text.trim(),
      rating: Number(item.rating) || 5,
      avatar: item.avatar || FEMALE_AVATAR.url,
      posterUrl: item.avatar || FEMALE_AVATAR.url,
      status: item.status || 'approved',
      submittedBy: item.submittedBy || 'admin',
      createdAt: item.createdAt || new Date().toISOString(),
      verifiedAt: item.verifiedAt || item.createdAt || new Date().toISOString(),
      exam: item.exam || item.role,
      type: 'testimonial'
    };

    try {
      await setDoc(doc(db, 'testimonials', item.id), payload, { merge: true });
      successCount++;
      console.log(`[Firestore] Successfully saved "${item.name}" to 'testimonials' collection.`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Firestore] Notice saving "${item.name}" to 'testimonials':`, err?.message || err);
    }

    try {
      await setDoc(doc(db, 'reviews', item.id), payload, { merge: true });
    } catch (_) {}
  }

  if (successCount > 0) {
    const local = getLocalTestimonials();
    const updated = local.map(t => ({ ...t, savedToFirestore: true }));
    saveLocalTestimonials(updated);
    notifyTestimonialsUpdated();
    return { success: true, count: successCount, total: listToSync.length };
  }

  return {
    success: false,
    count: 0,
    total: listToSync.length,
    error: lastError?.message || 'Permission denied: Missing or insufficient permissions.',
    errorCode: lastError?.code || 'permission-denied'
  };
}

/**
 * Fetch ALL testimonials for Admin (approved, pending, rejected)
 * Reads Firestore 'testimonials' collection as primary source of truth,
 * with graceful fallback to ensure the website is always active.
 */
export async function fetchAllTestimonials(): Promise<Testimonial[]> {
  const map = new Map<string, Testimonial>();

  // 1. Seed with Default Verified Testimonials (filtered for deleted items)
  DEFAULT_TESTIMONIALS.forEach(item => {
    if (!isTestimonialDeleted(item.id)) {
      map.set(item.id, item);
    }
  });

  // 2. Read from LocalStorage (persisted admin creations & edits)
  const localList = getLocalTestimonials();
  localList.forEach(t => {
    if (!isTestimonialDeleted(t.id) && !isDummyTestimonial(t)) {
      map.set(t.id, t);
    }
  });

  // 3. Fetch from Firestore 'testimonials' collection (primary store)
  try {
    const testimsSnap = await getDocs(collection(db, 'testimonials'));
    testimsSnap.forEach(docSnap => {
      const id = docSnap.id;
      if (isTestimonialDeleted(id)) return;
      const data = docSnap.data();

      const itemText = (data.text || data.review || data.description || '').trim();
      const item: Testimonial = {
        id,
        name: data.name || 'Candidate Doctor',
        role: data.role || data.title || data.exam || 'DHA Exam Candidate',
        text: itemText,
        avatar: data.avatar || data.posterUrl || FEMALE_AVATAR.url,
        rating: typeof data.rating === 'number' ? data.rating : 5,
        studentId: data.studentId || '',
        status: (data.status as any) || 'approved',
        submittedBy: data.submittedBy || 'admin',
        createdAt: data.createdAt || new Date().toISOString(),
        verifiedAt: data.verifiedAt,
        type: 'testimonial',
        savedToFirestore: true
      };

      if (!isDummyTestimonial(item)) {
        map.set(id, item);
      }
    });
  } catch (err: any) {
    console.warn("Firestore 'testimonials' read notice:", err?.code || err);
  }

  // 4. Fetch from Firestore 'reviews' collection (fallback store)
  try {
    const reviewsSnap = await getDocs(collection(db, 'reviews'));
    reviewsSnap.forEach(docSnap => {
      const id = docSnap.id;
      if (isTestimonialDeleted(id) || map.has(id)) return;
      const data = docSnap.data();

      const itemText = (data.text || data.review || data.description || '').trim();
      if (!itemText && !data.name) return;

      const item: Testimonial = {
        id,
        name: data.name || 'Candidate Doctor',
        role: data.role || data.title || data.exam || 'DHA Exam Candidate',
        text: itemText,
        avatar: data.avatar || data.posterUrl || FEMALE_AVATAR.url,
        rating: typeof data.rating === 'number' ? data.rating : 5,
        studentId: data.studentId || '',
        status: (data.status as any) || 'approved',
        submittedBy: data.submittedBy || 'admin',
        createdAt: data.createdAt || new Date().toISOString(),
        verifiedAt: data.verifiedAt,
        type: 'testimonial',
        savedToFirestore: true
      };

      if (!isDummyTestimonial(item)) {
        map.set(id, item);
      }
    });
  } catch (err: any) {
    console.warn("Firestore 'reviews' read notice:", err?.code || err);
  }

  // Convert map to array, filter out deleted entries, and sort newest first
  const allItems = Array.from(map.values())
    .filter(t => !isTestimonialDeleted(t.id) && !isDummyTestimonial(t))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Keep local storage synchronized
  saveLocalTestimonials(allItems);

  // Background attempt to sync any pending items to Firestore
  syncPendingTestimonialsToFirestore().catch(() => {});

  return allItems;
}

/**
 * Fetch all APPROVED testimonials for public website / Home page
 */
export async function fetchApprovedTestimonials(): Promise<Testimonial[]> {
  const all = await fetchAllTestimonials();
  return all.filter(t => t.status === 'approved' && t.text && t.text.trim().length > 0);
}

/**
 * Admin creates a testimonial directly from Admin Panel.
 * SAVES DIRECTLY TO FIRESTORE 'testimonials' collection.
 */
export async function addAdminTestimonial(payload: {
  name: string;
  role: string;
  text: string;
  studentId?: string;
  rating?: number;
  avatar?: string;
  status?: 'approved' | 'pending';
}): Promise<Testimonial> {
  const createdAt = new Date().toISOString();
  const status = payload.status || 'approved';
  const name = payload.name.trim();
  const avatar = payload.avatar?.trim() || FEMALE_AVATAR.url;

  const newDocData: Record<string, any> = {
    name,
    role: payload.role.trim(),
    title: payload.role.trim(),
    studentId: payload.studentId?.trim() || '',
    text: payload.text.trim(),
    rating: Number(payload.rating) || 5,
    avatar,
    posterUrl: avatar,
    status,
    submittedBy: 'admin',
    createdAt,
    type: 'testimonial'
  };

  if (status === 'approved') {
    newDocData.verifiedAt = createdAt;
  }

  let finalId = `testim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let firestoreSaved = false;

  // 1. Direct write to Firestore 'testimonials' collection
  try {
    const docRef = await addDoc(collection(db, 'testimonials'), newDocData);
    finalId = docRef.id;
    firestoreSaved = true;
    console.log("[Firestore] Testimonial successfully written to 'testimonials' collection, docId:", finalId);
  } catch (err: any) {
    console.warn("[Firestore] Notice on direct write to 'testimonials':", err?.message || err);
  }

  // 2. Also mirror write to 'reviews' collection if saved
  if (firestoreSaved) {
    try {
      await setDoc(doc(db, 'reviews', finalId), newDocData);
    } catch (_) {}
  }

  const newTestimonial: Testimonial = {
    id: finalId,
    name: newDocData.name,
    role: newDocData.role,
    studentId: newDocData.studentId,
    text: newDocData.text,
    rating: newDocData.rating,
    avatar: newDocData.avatar,
    status: newDocData.status as 'approved' | 'pending',
    submittedBy: 'admin',
    createdAt: newDocData.createdAt,
    verifiedAt: newDocData.verifiedAt,
    type: 'testimonial',
    savedToFirestore: firestoreSaved
  };

  // 3. Always save to local cache for instant resilience
  const localList = getLocalTestimonials();
  const filtered = localList.filter(t => t.id !== finalId);
  filtered.unshift(newTestimonial);
  saveLocalTestimonials(filtered);

  // If Firestore direct write was queued, record in pending sync queue
  if (!firestoreSaved) {
    try {
      const raw = localStorage.getItem(PENDING_SYNC_KEY);
      const pending = raw ? JSON.parse(raw) : [];
      pending.push(newTestimonial);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    } catch (_) {}
  }

  notifyTestimonialsUpdated();
  return newTestimonial;
}

/**
 * Public candidate submission (submitted as pending verification)
 */
export async function submitUserTestimonial(payload: {
  name: string;
  role: string;
  studentId: string;
  text: string;
  rating?: number;
  avatar?: string;
}): Promise<Testimonial> {
  const trimmedId = payload.studentId.trim();
  const avatar = payload.avatar?.trim() || FEMALE_AVATAR.url;
  const createdAt = new Date().toISOString();

  const newDocData: Record<string, any> = {
    name: payload.name.trim() || 'Medical Candidate',
    role: payload.role.trim() || 'DHA / Prometric Candidate',
    studentId: trimmedId,
    text: payload.text.trim(),
    rating: Number(payload.rating) || 5,
    avatar,
    posterUrl: avatar,
    status: 'pending',
    submittedBy: 'user',
    createdAt,
    type: 'testimonial'
  };

  const finalId = `cand_testim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newTestimonial: Testimonial = {
    id: finalId,
    name: newDocData.name,
    role: newDocData.role,
    studentId: newDocData.studentId,
    text: newDocData.text,
    rating: newDocData.rating,
    avatar: newDocData.avatar,
    status: 'pending',
    submittedBy: 'user',
    createdAt,
    type: 'testimonial',
    savedToFirestore: false
  };

  const localList = getLocalTestimonials();
  const filtered = localList.filter(t => t.id !== finalId);
  filtered.unshift(newTestimonial);
  saveLocalTestimonials(filtered);

  notifyTestimonialsUpdated();
  return newTestimonial;
}

/**
 * Admin updates / edits an existing testimonial in Firestore ('testimonials')
 */
export async function updateTestimonial(id: string, updates: Partial<Testimonial>): Promise<Testimonial | null> {
  const localList = getLocalTestimonials();
  let updatedItem: Testimonial | null = null;

  const idx = localList.findIndex(t => t.id === id);
  if (idx !== -1) {
    updatedItem = { ...localList[idx], ...updates };
    localList[idx] = updatedItem;
  } else {
    updatedItem = {
      id,
      name: updates.name || 'Candidate Doctor',
      role: updates.role || 'DHA Exam Candidate',
      text: updates.text || '',
      rating: updates.rating || 5,
      studentId: updates.studentId || '',
      avatar: updates.avatar || FEMALE_AVATAR.url,
      status: updates.status || 'approved',
      submittedBy: updates.submittedBy || 'admin',
      createdAt: updates.createdAt || new Date().toISOString(),
      verifiedAt: updates.verifiedAt,
      ...updates
    };
    localList.unshift(updatedItem);
  }
  saveLocalTestimonials(localList);

  // Prepare Firestore updates
  const firestoreUpdates: Record<string, any> = {};
  if (updates.name !== undefined) firestoreUpdates.name = updates.name.trim();
  if (updates.role !== undefined) {
    firestoreUpdates.role = updates.role.trim();
    firestoreUpdates.title = updates.role.trim();
  }
  if (updates.studentId !== undefined) firestoreUpdates.studentId = updates.studentId.trim();
  if (updates.text !== undefined) firestoreUpdates.text = updates.text.trim();
  if (updates.rating !== undefined) firestoreUpdates.rating = Number(updates.rating);
  if (updates.avatar !== undefined) {
    firestoreUpdates.avatar = updates.avatar;
    firestoreUpdates.posterUrl = updates.avatar;
  }
  if (updates.status !== undefined) {
    firestoreUpdates.status = updates.status;
    if (updates.status === 'approved' && !updates.verifiedAt) {
      firestoreUpdates.verifiedAt = new Date().toISOString();
    }
  }
  if (updates.verifiedAt !== undefined) firestoreUpdates.verifiedAt = updates.verifiedAt;
  firestoreUpdates.updatedAt = new Date().toISOString();

  // Save/Merge to Firestore 'testimonials' collection
  try {
    await setDoc(doc(db, 'testimonials', id), firestoreUpdates, { merge: true });
    console.log("[Firestore] Testimonial updated in 'testimonials' collection, docId:", id);
  } catch (err: any) {
    console.warn("[Firestore] Notice updating 'testimonials':", err?.message || err);
  }

  // Also mirror update to 'reviews' collection
  try {
    await setDoc(doc(db, 'reviews', id), firestoreUpdates, { merge: true });
  } catch (_) {}

  notifyTestimonialsUpdated();
  return updatedItem;
}

/**
 * Admin verifies and approves a candidate submission.
 * Saves directly to Firestore 'testimonials' collection!
 */
export async function verifyAndApproveTestimonial(id: string): Promise<void> {
  const verifiedAt = new Date().toISOString();
  await updateTestimonial(id, {
    status: 'approved',
    verifiedAt
  });
}

/**
 * Admin changes status of a testimonial ('approved' | 'pending' | 'rejected')
 */
export async function setTestimonialStatus(id: string, status: 'approved' | 'pending' | 'rejected'): Promise<void> {
  const verifiedAt = status === 'approved' ? new Date().toISOString() : undefined;
  await updateTestimonial(id, {
    status,
    verifiedAt
  });
}

/**
 * Admin deletes a testimonial from Firestore ('testimonials' & 'reviews') and localStorage
 */
export async function deleteTestimonial(id: string): Promise<void> {
  // 1. Mark permanently deleted locally to prevent resurrection
  markTestimonialDeleted(id);

  // 2. Delete from Firestore 'testimonials' collection
  try {
    await deleteDoc(doc(db, 'testimonials', id));
    console.log("[Firestore] Testimonial deleted from 'testimonials' collection, docId:", id);
  } catch (err: any) {
    console.warn("[Firestore] Notice on delete from 'testimonials':", err?.message || err);
  }

  // 3. Delete from Firestore 'reviews' collection
  try {
    await deleteDoc(doc(db, 'reviews', id));
  } catch (_) {}

  // 4. Update local storage
  const localList = getLocalTestimonials();
  const filtered = localList.filter(t => t.id !== id);
  saveLocalTestimonials(filtered);

  notifyTestimonialsUpdated();
}
