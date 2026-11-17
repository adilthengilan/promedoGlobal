import { 
  getQuestionFolders, 
  QuestionFolder, 
  QuestionItem, 
  getBookmarkedQuestionIds 
} from './questionFolders';
import { SubjectQuestion, PracticeSubject } from './subjectPracticeService';
import { db } from './firebase';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';

export interface CustomPracticeModule {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  subjectCounts?: Record<string, number>; // Exact count requested per subject ID
  filterSource: 'all' | 'bookmarked';
  questionCount: number;
  timeDurationMinutes: number; // 0 for untimed/unlimited
  timeDurationSeconds?: number; // exact duration in seconds (e.g. 30 for 30 sec)
  isUnlimitedTime?: boolean;
  mode: 'learn' | 'practice';
  createdAt: string;
  updatedAt?: string;
  questions?: SubjectQuestion[];
}

const CUSTOM_MODULES_STORAGE_KEY = 'promedo_user_custom_modules_';

/**
 * Get all available subjects with question counts for the custom practice builder.
 */
export function getAvailableBuilderSubjects(
  sourceSubjects?: PracticeSubject[]
): { id: string; name: string; questionCount: number; questions: QuestionItem[] }[] {
  if (sourceSubjects && sourceSubjects.length > 0) {
    return sourceSubjects.map(s => ({
      id: s.id,
      name: s.name,
      questionCount: s.questions?.length ?? s.questionCount ?? 0,
      questions: (s.questions || []).map(q => ({
        id: q.id,
        subjectId: s.id,
        subjectName: s.name,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        createdAt: q.createdAt
      }))
    }));
  }

  const folders = getQuestionFolders().filter(f => f.isActive !== false);
  return folders.map(f => ({
    id: f.id,
    name: f.name,
    questionCount: (f.selectedQuestions || []).length || (f.selectedQuestionIds || []).length,
    questions: f.selectedQuestions || []
  }));
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a pool of questions matching custom module filter criteria.
 * Supports per-subject counts via `subjectCounts`, or a global `targetQuestionCount`.
 */
export function buildCustomQuestionPool(
  selectedSubjectIds: string[],
  filterSource: 'all' | 'bookmarked' = 'all',
  targetQuestionCount: number = 20,
  sourceSubjects?: PracticeSubject[],
  subjectCounts?: Record<string, number>,
  extraBookmarkedIds?: Set<string>
): SubjectQuestion[] {
  const bookmarkedIds = new Set(getBookmarkedQuestionIds());
  if (extraBookmarkedIds) {
    extraBookmarkedIds.forEach(id => bookmarkedIds.add(id));
  }

  // Group available matching questions by subjectId
  const questionsBySubject = new Map<string, SubjectQuestion[]>();

  if (sourceSubjects && sourceSubjects.length > 0) {
    const targetSubjects = selectedSubjectIds.length > 0
      ? sourceSubjects.filter(s => selectedSubjectIds.includes(s.id))
      : sourceSubjects;

    targetSubjects.forEach(subj => {
      const list: SubjectQuestion[] = [];
      (subj.questions || []).forEach(q => {
        if (filterSource === 'bookmarked' && !bookmarkedIds.has(q.id)) {
          return;
        }
        list.push({
          id: q.id,
          subjectId: subj.id,
          subjectName: subj.name,
          text: q.text,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || '',
          imageUrl: q.imageUrl
        });
      });
      questionsBySubject.set(subj.id, list);
    });
  } else {
    const folders = getQuestionFolders().filter(f => f.isActive !== false);
    const targetFolders = selectedSubjectIds.length > 0
      ? folders.filter(f => selectedSubjectIds.includes(f.id))
      : folders;

    targetFolders.forEach(folder => {
      const list: SubjectQuestion[] = [];
      (folder.selectedQuestions || []).forEach(q => {
        if (filterSource === 'bookmarked' && !bookmarkedIds.has(q.id)) {
          return;
        }
        list.push({
          id: q.id,
          subjectId: folder.id,
          subjectName: folder.name,
          text: q.text,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || '',
          imageUrl: q.imageUrl
        });
      });
      questionsBySubject.set(folder.id, list);
    });
  }

  // Per-subject count sampling when subjectCounts map is supplied
  if (subjectCounts && Object.keys(subjectCounts).length > 0) {
    const combined: SubjectQuestion[] = [];
    selectedSubjectIds.forEach(subjId => {
      const requested = Math.max(0, Math.floor(subjectCounts[subjId] || 0));
      if (requested <= 0) return;
      const subjPool = shuffleArray(questionsBySubject.get(subjId) || []);
      combined.push(...subjPool.slice(0, requested));
    });
    return shuffleArray(combined);
  }

  // Fallback: single global count across all selected subjects
  const allPool: SubjectQuestion[] = [];
  questionsBySubject.forEach(list => allPool.push(...list));
  const shuffled = shuffleArray(allPool);

  if (targetQuestionCount > 0 && targetQuestionCount < shuffled.length) {
    return shuffled.slice(0, targetQuestionCount);
  }

  return shuffled;
}

/**
 * Save a custom practice module preset.
 */
export async function saveCustomModule(
  userId: string,
  moduleData: Omit<CustomPracticeModule, 'id' | 'createdAt'>
): Promise<CustomPracticeModule> {
  const newModule: CustomPracticeModule = {
    ...moduleData,
    id: `cmod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    createdAt: new Date().toISOString()
  };

  // 1. Local Storage save
  const key = `${CUSTOM_MODULES_STORAGE_KEY}${userId || 'guest'}`;
  let localModules: CustomPracticeModule[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) localModules = JSON.parse(raw);
  } catch (_) {}

  localModules.unshift(newModule);
  try {
    localStorage.setItem(key, JSON.stringify(localModules));
  } catch (_) {}

  // 2. Firestore save if user logged in
  if (userId) {
    try {
      await setDoc(doc(db, `users/${userId}/customModules`, newModule.id), newModule);
    } catch (err) {
      console.warn('Notice: Custom module saved locally:', err);
    }
  }

  return newModule;
}

/**
 * Fetch saved custom practice modules for a candidate.
 */
export async function getUserCustomModules(userId: string): Promise<CustomPracticeModule[]> {
  const key = `${CUSTOM_MODULES_STORAGE_KEY}${userId || 'guest'}`;
  let localModules: CustomPracticeModule[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) localModules = JSON.parse(raw);
  } catch (_) {}

  let firestoreModules: CustomPracticeModule[] = [];
  if (userId) {
    try {
      const snap = await getDocs(collection(db, `users/${userId}/customModules`));
      firestoreModules = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CustomPracticeModule, 'id'>) }));
    } catch (_) {}
  }

  const map = new Map<string, CustomPracticeModule>();
  firestoreModules.forEach(m => map.set(m.id, m));
  localModules.forEach(m => {
    if (!map.has(m.id)) map.set(m.id, m);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Delete a saved custom practice module.
 */
export async function deleteCustomModule(userId: string, moduleId: string): Promise<void> {
  const key = `${CUSTOM_MODULES_STORAGE_KEY}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const filtered = JSON.parse(raw).filter((m: CustomPracticeModule) => m.id !== moduleId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch (_) {}

  if (userId) {
    try {
      await deleteDoc(doc(db, `users/${userId}/customModules`, moduleId));
    } catch (_) {}
  }
}

/**
 * Update an existing custom practice module.
 */
export async function updateCustomModule(
  userId: string,
  moduleData: CustomPracticeModule
): Promise<CustomPracticeModule> {
  const updatedModule: CustomPracticeModule = {
    ...moduleData,
    updatedAt: new Date().toISOString()
  };

  const key = `${CUSTOM_MODULES_STORAGE_KEY}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: CustomPracticeModule[] = JSON.parse(raw);
      const idx = list.findIndex(m => m.id === updatedModule.id);
      if (idx >= 0) list[idx] = updatedModule;
      else list.unshift(updatedModule);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (_) {}

  if (userId) {
    try {
      await setDoc(doc(db, `users/${userId}/customModules`, updatedModule.id), updatedModule);
    } catch (err) {
      console.warn('Notice: Custom module updated locally:', err);
    }
  }

  return updatedModule;
}
