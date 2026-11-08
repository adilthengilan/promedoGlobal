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
export function getAvailableBuilderSubjects(): { id: string; name: string; questionCount: number; questions: QuestionItem[] }[] {
  const folders = getQuestionFolders().filter(f => f.isActive !== false);
  return folders.map(f => ({
    id: f.id,
    name: f.name,
    questionCount: (f.selectedQuestions || []).length || (f.selectedQuestionIds || []).length,
    questions: f.selectedQuestions || []
  }));
}

/**
 * Build a pool of questions matching custom module filter criteria.
 */
export function buildCustomQuestionPool(
  selectedSubjectIds: string[],
  filterSource: 'all' | 'bookmarked' = 'all',
  targetQuestionCount: number = 20
): SubjectQuestion[] {
  const folders = getQuestionFolders().filter(f => f.isActive !== false);
  const bookmarkedIds = new Set(getBookmarkedQuestionIds());

  // Filter folders matching selected IDs (or all if empty)
  const targetFolders = selectedSubjectIds.length > 0
    ? folders.filter(f => selectedSubjectIds.includes(f.id))
    : folders;

  let pool: SubjectQuestion[] = [];

  targetFolders.forEach(folder => {
    (folder.selectedQuestions || []).forEach(q => {
      if (filterSource === 'bookmarked' && !bookmarkedIds.has(q.id)) {
        return; // Skip if looking for bookmarked only and not bookmarked
      }

      pool.push({
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
  });

  // Fisher-Yates shuffle pool
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Slice to target question count
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
