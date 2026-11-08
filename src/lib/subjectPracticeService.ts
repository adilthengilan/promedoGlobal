import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  getQuestionFolders, 
  subscribeToQuestionFolders, 
  QuestionFolder, 
  QuestionItem 
} from './questionFolders';

export interface PracticeSubject {
  id: string;
  name: string;
  code?: string;
  description: string;
  details?: string;
  questionCount: number;
  isListed: boolean;
  createdAt?: string;
  updatedAt?: string;
  questions?: SubjectQuestion[];
}

export interface SubjectQuestion {
  id: string;
  subjectId: string;
  subjectName?: string;
  text: string;
  options: string[];
  correctAnswer: number; // 0-indexed integer corresponding to options array
  explanation: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface ShuffledPracticeQuestion {
  id: string;
  subjectId: string;
  subjectName?: string;
  text: string;
  options: string[]; // Shuffled options array
  correctAnswer: number; // Index of the correct option inside shuffled options
  explanation: string;
  imageUrl?: string;
  originalQuestionId: string;
}

export interface PracticeAttemptRecord {
  id?: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  completedAt?: string; // ISO string
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scorePercent: number; // 0 - 100
  timeTakenSeconds: number;
  questionReviews?: Array<{
    questionId: string;
    text: string;
    options: string[];
    selectedAnswerIndex: number | null; // null if unanswered
    correctAnswerIndex: number;
    isCorrect: boolean;
    explanation: string;
    imageUrl?: string;
  }>;
}

export interface SubjectPerformanceStats {
  totalAttempts: number;
  bestScore: number;
  latestScore: number;
  averageScore: number;
  totalQuestionsAnswered: number;
  lastAttemptAt?: string;
}

const ATTEMPTS_STORAGE_PREFIX = 'promedo_subject_practice_attempts_';

/**
 * Map a QuestionFolder from Admin side App Pages -> Question Bank to a PracticeSubject.
 */
function mapFolderToSubject(folder: QuestionFolder): PracticeSubject {
  const qs: SubjectQuestion[] = (folder.selectedQuestions || []).map(q => ({
    id: q.id,
    subjectId: folder.id,
    subjectName: folder.name,
    text: q.text,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    explanation: q.explanation || '',
    imageUrl: q.imageUrl
  }));

  return {
    id: folder.id,
    name: folder.name,
    code: folder.code,
    description: folder.description || '',
    details: folder.description || '',
    questionCount: qs.length || (folder.selectedQuestionIds || []).length,
    isListed: folder.isActive !== false,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    questions: qs
  };
}

/**
 * Fetch all listed subjects strictly from Admin side App Pages -> Question Bank (questionFolders).
 */
export async function fetchListedSubjects(isAdmin: boolean = false): Promise<PracticeSubject[]> {
  const folders = getQuestionFolders();
  let subjects = folders.map(mapFolderToSubject);

  if (!isAdmin) {
    subjects = subjects.filter(s => s.isListed);
  }

  return subjects;
}

/**
 * Real-time listener for App Pages Question Bank folders in the Student Portal.
 */
export function subscribeToListedSubjects(
  onData: (subjects: PracticeSubject[]) => void,
  isAdmin: boolean = false,
  onError?: (err: Error) => void
): Unsubscribe {
  return subscribeToQuestionFolders((folders) => {
    let subjects = folders.map(mapFolderToSubject);
    if (!isAdmin) {
      subjects = subjects.filter(s => s.isListed);
    }
    onData(subjects);
  });
}

/**
 * Fetch questions for a specific Question Bank folder created in Admin App Pages.
 */
export async function fetchQuestionsForSubject(
  subjectId: string,
  subjectName?: string
): Promise<SubjectQuestion[]> {
  if (!subjectId) return [];

  const folders = getQuestionFolders();
  const matchedFolder = folders.find(f => 
    f.id === subjectId || 
    f.code?.toLowerCase() === subjectId.toLowerCase() || 
    f.name.toLowerCase() === subjectId.toLowerCase()
  );

  if (matchedFolder) {
    return (matchedFolder.selectedQuestions || []).map(q => ({
      id: q.id,
      subjectId: matchedFolder.id,
      subjectName: matchedFolder.name,
      text: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl
    }));
  }

  return [];
}

/**
 * Shuffles question order and option choices for an interactive practice attempt.
 * Preserves the exact mapping to the correct answer.
 */
export function prepareShuffledQuestions(
  questions: SubjectQuestion[]
): ShuffledPracticeQuestion[] {
  // 1. Fisher-Yates shuffle on questions array
  const shuffledQuestionsList = [...questions];
  for (let i = shuffledQuestionsList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestionsList[i], shuffledQuestionsList[j]] = [shuffledQuestionsList[j], shuffledQuestionsList[i]];
  }

  // 2. For each question, shuffle options while maintaining correct answer mapping
  return shuffledQuestionsList.map((q) => {
    // Create array with original index tracking
    const indexedOptions = q.options.map((text, idx) => ({ text, originalIdx: idx }));

    // Fisher-Yates shuffle options
    for (let i = indexedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
    }

    const shuffledOptions = indexedOptions.map(o => o.text);
    const newCorrectIndex = indexedOptions.findIndex(o => o.originalIdx === q.correctAnswer);

    return {
      id: `shuffled_${q.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      originalQuestionId: q.id,
      subjectId: q.subjectId,
      subjectName: q.subjectName,
      text: q.text,
      options: shuffledOptions,
      correctAnswer: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      explanation: q.explanation,
      imageUrl: q.imageUrl
    };
  });
}

/**
 * Saves a completed practice attempt in Firestore & LocalStorage.
 */
export async function savePracticeAttempt(
  userId: string,
  record: Omit<PracticeAttemptRecord, 'completedAt'>
): Promise<PracticeAttemptRecord> {
  const completedRecord: PracticeAttemptRecord = {
    ...record,
    completedAt: new Date().toISOString()
  };

  // 1. Save locally for instant availability
  const storageKey = `${ATTEMPTS_STORAGE_PREFIX}${userId}`;
  let attempts: PracticeAttemptRecord[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) attempts = JSON.parse(raw);
  } catch (e) {}

  attempts.unshift(completedRecord); // Newest first
  try {
    localStorage.setItem(storageKey, JSON.stringify(attempts));
  } catch (e) {}

  // 2. Save to Firestore
  try {
    // Top-level collection for admin reporting
    const docRef = await addDoc(collection(db, 'subjectPracticeAttempts'), completedRecord);
    completedRecord.id = docRef.id;

    // Subcollection under user document
    await setDoc(doc(db, `users/${userId}/subjectPracticeAttempts`, docRef.id), completedRecord, { merge: true });
  } catch (err) {
    console.warn('Notice: Practice attempt saved locally, Firestore sync notice:', err);
  }

  // 3. Dispatch event for UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promedo:subject_attempt_saved', { detail: completedRecord }));
  }

  return completedRecord;
}

/**
 * Get practice attempts for a user (optionally filtered by subject).
 */
export async function getUserPracticeAttempts(
  userId: string,
  subjectId?: string
): Promise<PracticeAttemptRecord[]> {
  if (!userId) return [];

  const storageKey = `${ATTEMPTS_STORAGE_PREFIX}${userId}`;
  let localAttempts: PracticeAttemptRecord[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) localAttempts = JSON.parse(raw);
  } catch (e) {}

  let firestoreAttempts: PracticeAttemptRecord[] = [];
  try {
    const q = query(
      collection(db, `users/${userId}/subjectPracticeAttempts`),
      orderBy('completedAt', 'desc')
    );
    const snap = await getDocs(q);
    firestoreAttempts = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<PracticeAttemptRecord, 'id'>)
    }));
  } catch (err) {
    try {
      const q = query(
        collection(db, 'subjectPracticeAttempts'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      firestoreAttempts = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PracticeAttemptRecord, 'id'>)
      }));
    } catch (_) {}
  }

  // Merge Firestore and Local
  const combinedMap = new Map<string, PracticeAttemptRecord>();
  firestoreAttempts.forEach(a => {
    if (a.completedAt) combinedMap.set(`${a.subjectId}_${a.completedAt}`, a);
  });
  localAttempts.forEach(a => {
    if (a.completedAt && !combinedMap.has(`${a.subjectId}_${a.completedAt}`)) {
      combinedMap.set(`${a.subjectId}_${a.completedAt}`, a);
    }
  });

  let result = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  );

  if (subjectId) {
    result = result.filter(a => a.subjectId === subjectId);
  }

  return result;
}

/**
 * Calculates aggregate subject-wise performance statistics from practice attempts history.
 */
export function calculateSubjectPerformanceStats(
  attempts: PracticeAttemptRecord[],
  subjectId: string
): SubjectPerformanceStats {
  const subjectAttempts = attempts.filter(a => a.subjectId === subjectId);

  if (subjectAttempts.length === 0) {
    return {
      totalAttempts: 0,
      bestScore: 0,
      latestScore: 0,
      averageScore: 0,
      totalQuestionsAnswered: 0
    };
  }

  const totalAttempts = subjectAttempts.length;
  const bestScore = subjectAttempts.reduce((max, a) => Math.max(max, a.scorePercent || 0), 0);
  const latestScore = subjectAttempts[0]?.scorePercent || 0;
  const totalScoreSum = subjectAttempts.reduce((sum, a) => sum + (a.scorePercent || 0), 0);
  const averageScore = Math.round(totalScoreSum / totalAttempts);
  const totalQuestionsAnswered = subjectAttempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
  const lastAttemptAt = subjectAttempts[0]?.completedAt;

  return {
    totalAttempts,
    bestScore,
    latestScore,
    averageScore,
    totalQuestionsAnswered,
    lastAttemptAt
  };
}
