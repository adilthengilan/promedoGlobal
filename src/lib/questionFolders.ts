import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface QuestionItem {
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

export interface SubjectItem {
  id: string;
  name: string;
  details: string;
  createdAt: string;
}

export interface QuestionFolder {
  id: string;
  name: string;
  code: string;
  description: string;
  selectedQuestionIds: string[];
  selectedQuestions: QuestionItem[];
  bookmarkedQuestionIds?: string[];
  subjectNames: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const FOLDERS_STORAGE_KEY = 'promedo_question_folders_v1';
const FOLDERS_EVENT = 'promedo:question_folders_updated';
const BOOKMARKS_STORAGE_KEY = 'promedo_bookmarked_questions_v1';
const BOOKMARKS_EVENT = 'promedo:bookmarked_questions_updated';

// Read all bookmarked question IDs
export function getBookmarkedQuestionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// Save all bookmarked question IDs
export function saveBookmarkedQuestionIds(ids: string[]): void {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(ids));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, { detail: ids }));
    }
  } catch (e) {
    console.error('Error saving bookmarked question ids:', e);
  }
}

// Toggle bookmark for a single question
export function toggleQuestionBookmark(questionId: string): string[] {
  const current = getBookmarkedQuestionIds();
  const next = current.includes(questionId)
    ? current.filter(id => id !== questionId)
    : [...current, questionId];
  saveBookmarkedQuestionIds(next);
  return next;
}

export const DEFAULT_QUESTION_FOLDERS: QuestionFolder[] = [];

// Read all question folders
export function getQuestionFolders(): QuestionFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (e) {
    console.error('Error reading question folders:', e);
    return [];
  }
}

// Save all question folders and notify listeners + sync to Firestore
export function saveQuestionFolders(folders: QuestionFolder[]): void {
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FOLDERS_EVENT, { detail: folders }));
    }
    // Sync to Firestore in background
    import('firebase/firestore').then(({ collection, doc, setDoc }) => {
      import('./firebase').then(({ db }) => {
        folders.forEach(f => {
          setDoc(doc(collection(db, 'questionFolders'), f.id), f, { merge: true }).catch(() => {});
        });
      });
    });
  } catch (e) {
    console.error('Error saving question folders:', e);
  }
}

// Real-time listener for question folders from Firestore with localStorage fallback
export function subscribeToQuestionFolders(
  onData: (folders: QuestionFolder[]) => void,
  onError?: (err: Error) => void
): () => void {
  let unsub: (() => void) | undefined;
  import('firebase/firestore').then(({ collection, onSnapshot }) => {
    import('./firebase').then(({ db }) => {
      unsub = onSnapshot(
        collection(db, 'questionFolders'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({
              id: d.id,
              ...(d.data() as Omit<QuestionFolder, 'id'>)
            }));
            localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(list));
            onData(list);
          } else {
            onData(getQuestionFolders());
          }
        },
        (err) => {
          console.warn('Error reading questionFolders from Firestore, using local/default:', err);
          onData(getQuestionFolders());
          if (onError) onError(err);
        }
      );
    });
  });

  const handleEvent = (e: any) => {
    if (e.detail && Array.isArray(e.detail)) {
      onData(e.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(FOLDERS_EVENT, handleEvent);
  }

  return () => {
    if (unsub) unsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener(FOLDERS_EVENT, handleEvent);
    }
  };
}

// Real-time listener for user's bookmarked folders
export function subscribeToUserFolderBookmarks(
  userId: string,
  onData: (folderIds: string[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  let unsub: (() => void) | undefined;
  import('firebase/firestore').then(({ collection, onSnapshot }) => {
    import('./firebase').then(({ db }) => {
      unsub = onSnapshot(
        collection(db, 'users', userId, 'folderBookmarks'),
        (snapshot) => {
          onData(snapshot.docs.map(d => d.id));
        },
        () => {
          onData(getBookmarkedQuestionIds());
        }
      );
    });
  });
  return () => {
    if (unsub) unsub();
  };
}

// Toggle user folder bookmark
export async function toggleUserFolderBookmark(
  userId: string,
  folderId: string,
  isCurrentlyBookmarked: boolean
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'users', userId, 'folderBookmarks', folderId);
    if (isCurrentlyBookmarked) {
      await deleteDoc(docRef);
      return false;
    } else {
      await setDoc(docRef, { folderId, createdAt: new Date().toISOString() }, { merge: true });
      return true;
    }
  } catch (err) {
    console.warn('Could not update folder bookmark in Firestore:', err);
    return !isCurrentlyBookmarked;
  }
}

// Add a new question folder
export function addQuestionFolder(
  data: Omit<QuestionFolder, 'id' | 'createdAt' | 'updatedAt'>
): QuestionFolder {
  const folders = getQuestionFolders();
  const newFolder: QuestionFolder = {
    ...data,
    id: `folder-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const updated = [newFolder, ...folders];
  saveQuestionFolders(updated);
  return newFolder;
}

// Update an existing folder
export function updateQuestionFolder(
  id: string,
  patch: Partial<Omit<QuestionFolder, 'id' | 'createdAt'>>
): QuestionFolder[] {
  const folders = getQuestionFolders();
  const updated = folders.map(f => {
    if (f.id === id) {
      return {
        ...f,
        ...patch,
        updatedAt: new Date().toISOString()
      };
    }
    return f;
  });
  saveQuestionFolders(updated);
  return updated;
}

// Delete a folder
export function deleteQuestionFolder(id: string): QuestionFolder[] {
  const folders = getQuestionFolders();
  const updated = folders.filter(f => f.id !== id);
  saveQuestionFolders(updated);
  // Also delete from Firestore
  import('firebase/firestore').then(({ doc, deleteDoc }) => {
    import('./firebase').then(({ db }) => {
      deleteDoc(doc(db, 'questionFolders', id)).catch(() => {});
    });
  });
  return updated;
}

// Toggle folder active status in candidate portal
export function toggleQuestionFolderActive(id: string): QuestionFolder[] {
  const folders = getQuestionFolders();
  const updated = folders.map(f => {
    if (f.id === id) {
      return {
        ...f,
        isActive: !f.isActive,
        updatedAt: new Date().toISOString()
      };
    }
    return f;
  });
  saveQuestionFolders(updated);
  return updated;
}

// Fetch all subjects and questions from Subject-Wise Question Builder (Firestore + LocalStorage)
export async function fetchAllSubjectBuilderQuestions(): Promise<{
  subjects: SubjectItem[];
  questions: QuestionItem[];
}> {
  let subjects: SubjectItem[] = [];

  // 1. Try pulling subjects from Firestore
  try {
    const qSnap = await getDocs(collection(db, 'questionBank'));
    if (!qSnap.empty) {
      subjects = qSnap.docs.map(docSnap => ({
        id: docSnap.id,
        name: (docSnap.data().name as string) || docSnap.id,
        details: (docSnap.data().details as string) || '',
        createdAt: (docSnap.data().createdAt as string) || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Could not read questionBank from Firestore, checking LocalStorage:', err);
  }

  // 2. Fallback / merge with local_subjects
  try {
    const rawLocal = localStorage.getItem('local_subjects');
    if (rawLocal) {
      const localParsed: SubjectItem[] = JSON.parse(rawLocal);
      const subjectMap = new Map<string, SubjectItem>();
      subjects.forEach(s => subjectMap.set(s.id, s));
      localParsed.forEach(s => {
        if (!subjectMap.has(s.id)) {
          subjectMap.set(s.id, s);
        }
      });
      subjects = Array.from(subjectMap.values());
    }
  } catch (err) {
    console.error('Error reading local_subjects:', err);
  }

  // 3. For each subject, fetch its questions from Firestore subcollection and localStorage
  const allQuestions: QuestionItem[] = [];

  for (const subj of subjects) {
    let subQuestions: QuestionItem[] = [];

    // Try Firestore subcollection
    try {
      const qSnap = await getDocs(collection(db, `questionBank/${subj.id}/questions`));
      if (!qSnap.empty) {
        subQuestions = qSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            subjectId: subj.id,
            subjectName: subj.name,
            text: (data.text as string) || '',
            options: (data.options as string[]) || [],
            correctAnswer: typeof data.correctAnswer === 'number' ? data.correctAnswer : 0,
            explanation: (data.explanation as string) || '',
            imageUrl: data.imageUrl as string | undefined,
            createdAt: data.createdAt as string | undefined
          };
        });
      }
    } catch (e) {
      // Subcollection read error, fallback to local storage
    }

    // Try localStorage fallback
    try {
      const rawLocalQ = localStorage.getItem(`local_questions_${subj.id}`);
      if (rawLocalQ) {
        const localList = JSON.parse(rawLocalQ);
        const qMap = new Map<string, QuestionItem>();
        subQuestions.forEach(q => qMap.set(q.id, q));
        localList.forEach((q: any) => {
          if (!qMap.has(q.id)) {
            qMap.set(q.id, {
              id: q.id,
              subjectId: subj.id,
              subjectName: subj.name,
              text: q.text || '',
              options: q.options || [],
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
              explanation: q.explanation || '',
              imageUrl: q.imageUrl,
              createdAt: q.createdAt
            });
          }
        });
        subQuestions = Array.from(qMap.values());
      }
    } catch (e) {
      console.error(`Error loading local_questions for ${subj.id}:`, e);
    }

    allQuestions.push(...subQuestions);
  }

  return { subjects, questions: allQuestions };
}
