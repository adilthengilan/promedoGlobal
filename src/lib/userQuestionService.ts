import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface QuestionReference {
  questionId: string;
  subjectId: string;
  subjectName: string;
  createdAt?: string;
}

export interface ResolvedQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface UserCustomModule {
  id: string;
  name: string;
  questionRefs: QuestionReference[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// BOOKMARKS (users/{userId}/bookmarks/{questionId})
// ============================================================================
// LOCAL STORAGE PERSISTENCE & CACHING HELPERS
// ============================================================================

const BOOKMARKS_STORAGE_PREFIX = 'promedo_user_bookmarks_';
const SUBJECT_BOOKMARKS_STORAGE_PREFIX = 'promedo_user_subject_bookmarks_';
const CUSTOM_MODULES_STORAGE_PREFIX = 'promedo_user_custom_modules_';

function getLocalBookmarks(userId: string): QuestionReference[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${BOOKMARKS_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBookmarks(userId: string, bookmarks: QuestionReference[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${BOOKMARKS_STORAGE_PREFIX}${userId}`, JSON.stringify(bookmarks));
  } catch {}
}

function getLocalSubjectBookmarks(userId: string): string[] {
  const key = `${SUBJECT_BOOKMARKS_STORAGE_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubjectBookmarks(userId: string, ids: string[]): void {
  const key = `${SUBJECT_BOOKMARKS_STORAGE_PREFIX}${userId || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {}
}

function getLocalCustomModules(userId: string): UserCustomModule[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${CUSTOM_MODULES_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomModules(userId: string, modules: UserCustomModule[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${CUSTOM_MODULES_STORAGE_PREFIX}${userId}`, JSON.stringify(modules));
  } catch {}
}

// ============================================================================
// BOOKMARKS (users/{userId}/bookmarks/{questionId})
// ============================================================================

export function subscribeToUserBookmarks(
  userId: string,
  onUpdate: (bookmarks: QuestionReference[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Supply cached local bookmarks immediately for instant responsiveness
  onUpdate(getLocalBookmarks(userId));

  const colRef = collection(db, 'users', userId, 'bookmarks');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: QuestionReference[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          questionId: (data.questionId as string) || d.id,
          subjectId: (data.subjectId as string) || '',
          subjectName: (data.subjectName as string) || 'General',
          createdAt: data.createdAt as string | undefined
        };
      });
      saveLocalBookmarks(userId, list);
      onUpdate(list);
    },
    (error) => {
      console.warn('Notice: Using local user bookmarks fallback (Firestore sync notice):', error?.message || error);
      onUpdate(getLocalBookmarks(userId));
      if (onError) onError(error);
    }
  );
}

export async function addUserBookmark(
  userId: string,
  ref: Omit<QuestionReference, 'createdAt'>
): Promise<void> {
  if (!userId) return;

  // Optimistic local update
  const current = getLocalBookmarks(userId);
  const updated = [
    { ...ref, createdAt: new Date().toISOString() },
    ...current.filter((b) => b.questionId !== ref.questionId)
  ];
  saveLocalBookmarks(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', ref.questionId);
    await setDoc(docRef, {
      questionId: ref.questionId,
      subjectId: ref.subjectId,
      subjectName: ref.subjectName,
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('Notice: Bookmark saved locally, Firestore sync deferred:', err?.message || err);
  }
}

export async function removeUserBookmark(
  userId: string,
  questionId: string
): Promise<void> {
  if (!userId) return;

  // Optimistic local update
  const current = getLocalBookmarks(userId);
  const updated = current.filter((b) => b.questionId !== questionId);
  saveLocalBookmarks(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', questionId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Notice: Bookmark removed locally, Firestore sync deferred:', err?.message || err);
  }
}

export async function toggleUserBookmark(
  userId: string,
  ref: Omit<QuestionReference, 'createdAt'>,
  isCurrentlyBookmarked: boolean
): Promise<boolean> {
  if (isCurrentlyBookmarked) {
    await removeUserBookmark(userId, ref.questionId);
    return false;
  } else {
    await addUserBookmark(userId, ref);
    return true;
  }
}

// ============================================================================
// SUBJECT BOOKMARKS (users/{userId}/subjectBookmarks/{subjectId})
// ============================================================================

export function subscribeToUserSubjectBookmarks(
  userId: string,
  onData: (subjectIds: string[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onData(getLocalSubjectBookmarks('guest'));
    return () => {};
  }

  // Supply cached local subject bookmarks immediately
  onData(getLocalSubjectBookmarks(userId));

  const colRef = collection(db, 'users', userId, 'subjectBookmarks');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const ids = snapshot.docs.map((d) => d.id);
      saveLocalSubjectBookmarks(userId, ids);
      onData(ids);
    },
    (err) => {
      console.warn('Notice: Using local subject bookmarks (Firestore sync notice):', err?.message || err);
      onData(getLocalSubjectBookmarks(userId));
      if (onError) onError(err);
    }
  );
}

export async function toggleUserSubjectBookmark(
  userId: string,
  subjectId: string,
  isCurrentlyBookmarked: boolean
): Promise<boolean> {
  if (!userId) return !isCurrentlyBookmarked;

  // Optimistic local update
  const current = getLocalSubjectBookmarks(userId);
  let updated: string[];
  if (isCurrentlyBookmarked) {
    updated = current.filter((id) => id !== subjectId);
  } else {
    updated = Array.from(new Set([...current, subjectId]));
  }
  saveLocalSubjectBookmarks(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'subjectBookmarks', subjectId);
    if (isCurrentlyBookmarked) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        subjectId,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('Notice: Subject bookmark saved locally, Firestore sync deferred:', err?.message || err);
  }
  return !isCurrentlyBookmarked;
}

// ============================================================================
// CUSTOM MODULES (users/{userId}/customModules/{moduleId})
// ============================================================================

export function subscribeToUserCustomModules(
  userId: string,
  onUpdate: (modules: UserCustomModule[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Supply cached local modules immediately
  onUpdate(getLocalCustomModules(userId));

  const colRef = collection(db, 'users', userId, 'customModules');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserCustomModule[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: (data.name as string) || 'Untitled Module',
          questionRefs: Array.isArray(data.questionRefs) ? data.questionRefs : [],
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          updatedAt: (data.updatedAt as string) || new Date().toISOString()
        };
      });
      saveLocalCustomModules(userId, list);
      onUpdate(list);
    },
    (error) => {
      console.warn('Notice: Using local custom modules (Firestore sync notice):', error?.message || error);
      onUpdate(getLocalCustomModules(userId));
      if (onError) onError(error);
    }
  );
}

export async function createUserCustomModule(
  userId: string,
  name: string,
  questionRefs: QuestionReference[]
): Promise<string> {
  const now = new Date().toISOString();
  const localId = `mod_${Date.now()}`;
  const newModule: UserCustomModule = {
    id: localId,
    name: name.trim(),
    questionRefs: questionRefs.map((r) => ({
      questionId: r.questionId,
      subjectId: r.subjectId,
      subjectName: r.subjectName
    })),
    createdAt: now,
    updatedAt: now
  };

  // Optimistic local update
  const current = getLocalCustomModules(userId);
  saveLocalCustomModules(userId, [newModule, ...current]);

  try {
    const colRef = collection(db, 'users', userId, 'customModules');
    const docRef = await addDoc(colRef, {
      name: name.trim(),
      questionRefs: questionRefs.map((r) => ({
        questionId: r.questionId,
        subjectId: r.subjectId,
        subjectName: r.subjectName
      })),
      createdAt: now,
      updatedAt: now
    });
    // Update local ID to Firestore ID
    const updated = getLocalCustomModules(userId).map(m => m.id === localId ? { ...m, id: docRef.id } : m);
    saveLocalCustomModules(userId, updated);
    return docRef.id;
  } catch (err: any) {
    console.warn('Notice: Custom module saved locally, Firestore sync deferred:', err?.message || err);
    return localId;
  }
}

export async function updateUserCustomModule(
  userId: string,
  moduleId: string,
  name: string,
  questionRefs: QuestionReference[]
): Promise<void> {
  const now = new Date().toISOString();
  // Optimistic local update
  const current = getLocalCustomModules(userId);
  const updated = current.map((m) => {
    if (m.id === moduleId) {
      return {
        ...m,
        name: name.trim(),
        questionRefs: questionRefs.map((r) => ({
          questionId: r.questionId,
          subjectId: r.subjectId,
          subjectName: r.subjectName
        })),
        updatedAt: now
      };
    }
    return m;
  });
  saveLocalCustomModules(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'customModules', moduleId);
    await updateDoc(docRef, {
      name: name.trim(),
      questionRefs: questionRefs.map((r) => ({
        questionId: r.questionId,
        subjectId: r.subjectId,
        subjectName: r.subjectName
      })),
      updatedAt: now
    });
  } catch (err: any) {
    console.warn('Notice: Custom module updated locally, Firestore sync deferred:', err?.message || err);
  }
}

export async function deleteUserCustomModule(
  userId: string,
  moduleId: string
): Promise<void> {
  // Optimistic local update
  const current = getLocalCustomModules(userId);
  const updated = current.filter((m) => m.id !== moduleId);
  saveLocalCustomModules(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'customModules', moduleId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Notice: Custom module deleted locally, Firestore sync deferred:', err?.message || err);
  }
}

// ============================================================================
// QUESTION REFERENCE RESOLUTION
// ============================================================================

export async function resolveQuestionReferences(
  refs: QuestionReference[]
): Promise<ResolvedQuestion[]> {
  if (!refs || refs.length === 0) return [];

  // 1. Build map from local Question Folders (Admin App Pages source)
  const { getQuestionFolders } = await import('./questionFolders');
  const folders = getQuestionFolders();
  const folderQuestionMap = new Map<string, ResolvedQuestion>();

  folders.forEach((f) => {
    (f.selectedQuestions || []).forEach((q) => {
      folderQuestionMap.set(q.id, {
        id: q.id,
        subjectId: f.id,
        subjectName: f.name,
        text: q.text,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        imageUrl: q.imageUrl,
        createdAt: q.createdAt
      });
    });
  });

  // Group remaining references by subjectId for Firestore lookup if missing from folders
  const missingRefs = refs.filter((r) => !folderQuestionMap.has(r.questionId));
  const bySubject = new Map<string, QuestionReference[]>();
  missingRefs.forEach((r) => {
    const list = bySubject.get(r.subjectId) || [];
    list.push(r);
    bySubject.set(r.subjectId, list);
  });

  const resolvedMap = new Map<string, ResolvedQuestion>();

  await Promise.all(
    Array.from(bySubject.entries()).map(async ([subjectId, subjRefs]) => {
      if (!subjectId) return;
      const subjectName = subjRefs[0]?.subjectName || subjectId;
      const subjectQuestions = new Map<string, ResolvedQuestion>();

      try {
        const snap = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
        snap.docs.forEach((d) => {
          const data = d.data();
          subjectQuestions.set(d.id, {
            id: d.id,
            subjectId,
            subjectName,
            text: (data.text as string) || '',
            options: Array.isArray(data.options) ? data.options : [],
            correctAnswer: typeof data.correctAnswer === 'number' ? data.correctAnswer : 0,
            explanation: (data.explanation as string) || '',
            imageUrl: data.imageUrl as string | undefined,
            createdAt: data.createdAt as string | undefined
          });
        });
      } catch (err) {
        try {
          const raw = localStorage.getItem(`local_questions_${subjectId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((q: any) => {
                subjectQuestions.set(q.id, {
                  id: q.id,
                  subjectId,
                  subjectName,
                  text: q.text || '',
                  options: Array.isArray(q.options) ? q.options : [],
                  correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                  explanation: q.explanation || '',
                  imageUrl: q.imageUrl,
                  createdAt: q.createdAt
                });
              });
            }
          }
        } catch (_) {}
      }

      subjRefs.forEach((r) => {
        const found = subjectQuestions.get(r.questionId);
        if (found) {
          resolvedMap.set(r.questionId, found);
        }
      });
    })
  );

  // Preserve original reference order
  return refs
    .map((r) => folderQuestionMap.get(r.questionId) || resolvedMap.get(r.questionId))
    .filter((q): q is ResolvedQuestion => Boolean(q));
}
export async function fetchQuestionsBySubject(subjectId: string): Promise<ResolvedQuestion[]> {
  try {
    const snap = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        subjectId,
        subjectName: '', // Could be fetched separately if needed, but not critical
        text: (data.text as string) || '',
        options: Array.isArray(data.options) ? data.options : [],
        correctAnswer: typeof data.correctAnswer === 'number' ? data.correctAnswer : 0,
        explanation: (data.explanation as string) || '',
        imageUrl: data.imageUrl as string | undefined,
        createdAt: data.createdAt as string | undefined
      };
    });
  } catch (err) {
    console.warn(`Error fetching questions for subject ${subjectId}:`, err);
    return [];
  }
}
