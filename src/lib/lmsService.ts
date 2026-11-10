import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface LmsSubject {
  id: string;
  name: string;
  description?: string;
  exam?: string;
  icon?: string;
  color?: string;
  questionCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface LmsQuestion {
  id: string;
  subjectId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  exam?: string;
  topic?: string;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LmsMockTest {
  id: string;
  title: string;
  description?: string;
  exam: string;
  timeLimit: number;
  passingScore: number;
  questionCount?: number;
  questions?: any[];
  isFree?: boolean;
  isPaid?: boolean;
  isListed?: boolean;
  price?: any;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LmsCourse {
  id: string;
  title: string;
  description?: string;
  price: number;
  exam?: string;
  thumbnail?: string;
  modules?: any[];
  status?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LmsEnrollment {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  enrolledAt?: any;
  progress?: number;
}

/**
 * Normalize a raw Firestore question document into a consistent LmsQuestion shape.
 */
export function normalizeQuestion(id: string, subjectId: string, data: Record<string, any>): LmsQuestion {
  let options: string[] = [];
  if (Array.isArray(data.options)) {
    options = data.options.map((o) => String(o ?? ''));
  } else if (data.options && typeof data.options === 'object') {
    options = Object.values(data.options).map((o) => String(o ?? ''));
  }

  let correctIndex = 0;
  if (typeof data.correctIndex === 'number') {
    correctIndex = data.correctIndex;
  } else if (typeof data.correctAnswer === 'number') {
    correctIndex = data.correctAnswer;
  } else if (typeof data.correctAnswer === 'string') {
    const idx = options.findIndex((o) => o.trim() === data.correctAnswer.trim());
    if (idx >= 0) correctIndex = idx;
  }

  const questionText = String(data.question || data.text || data.title || '');

  return {
    id,
    subjectId,
    question: questionText,
    text: questionText,
    options,
    correctIndex,
    correctAnswer: correctIndex,
    explanation: data.explanation ? String(data.explanation) : '',
    difficulty: data.difficulty || 'Medium',
    exam: data.exam || '',
    topic: data.topic || '',
    imageUrl: data.imageUrl || data.image || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as LmsQuestion;
}

/**
 * Real-time listener for all subjects in `questionBank`.
 */
export function subscribeToSubjects(
  onData: (subjects: LmsSubject[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'questionBank'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LmsSubject[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LmsSubject, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      console.warn('subscribeToSubjects notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for questions in `questionBank/{subjectId}/questions`.
 */
export function subscribeToSubjectQuestions(
  subjectId: string,
  onData: (questions: LmsQuestion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!subjectId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, `questionBank/${subjectId}/questions`);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: LmsQuestion[] = snapshot.docs.map((d) =>
        normalizeQuestion(d.id, subjectId, d.data())
      );
      onData(list);
    },
    (error) => {
      console.warn(`subscribeToSubjectQuestions(${subjectId}) notice:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Create or update a subject in `questionBank`.
 */
export async function saveSubject(subject: Partial<LmsSubject> & { id: string; name: string }): Promise<void> {
  const path = `questionBank/${subject.id}`;
  try {
    await setDoc(
      doc(db, 'questionBank', subject.id),
      {
        ...subject,
        updatedAt: serverTimestamp(),
        createdAt: subject.createdAt || serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a subject and its questions subcollection.
 */
export async function deleteSubjectAndQuestions(subjectId: string): Promise<void> {
  const path = `questionBank/${subjectId}`;
  try {
    const qSnap = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
    const batch = writeBatch(db);
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'questionBank', subjectId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Create or update a question in `questionBank/{subjectId}/questions` and sync subject's `questionCount`.
 */
export async function saveQuestion(
  subjectId: string,
  question: Omit<LmsQuestion, 'subjectId'>
): Promise<void> {
  const path = `questionBank/${subjectId}/questions/${question.id}`;
  try {
    await setDoc(
      doc(db, `questionBank/${subjectId}/questions`, question.id),
      {
        ...question,
        subjectId,
        updatedAt: serverTimestamp(),
        createdAt: question.createdAt || serverTimestamp(),
      },
      { merge: true }
    );
    const snap = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
    await updateDoc(doc(db, 'questionBank', subjectId), {
      questionCount: snap.size,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a question from `questionBank/{subjectId}/questions` and sync subject's `questionCount`.
 */
export async function deleteQuestion(subjectId: string, questionId: string): Promise<void> {
  const path = `questionBank/${subjectId}/questions/${questionId}`;
  try {
    await deleteDoc(doc(db, `questionBank/${subjectId}/questions`, questionId));
    const snap = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
    await updateDoc(doc(db, 'questionBank', subjectId), {
      questionCount: snap.size,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for `mocktests`.
 */
export function subscribeToMockTests(
  onData: (tests: LmsMockTest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'mocktests'),
    (snapshot) => {
      const list: LmsMockTest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LmsMockTest, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      console.warn('subscribeToMockTests notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Update mock test listing status (listed / unlisted).
 */
export async function updateMockTestListing(id: string, isListed: boolean): Promise<void> {
  const path = `mocktests/${id}`;
  try {
    await updateDoc(doc(db, 'mocktests', id), {
      isListed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update mock test pricing status (paid / free).
 */
export async function updateMockTestPricing(id: string, isPaid: boolean, price?: string | number): Promise<void> {
  const path = `mocktests/${id}`;
  try {
    await updateDoc(doc(db, 'mocktests', id), {
      isPaid,
      ...(price !== undefined ? { price } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Real-time listener for `courses`.
 */
export function subscribeToCourses(
  onData: (courses: LmsCourse[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'courses'),
    (snapshot) => {
      const list: LmsCourse[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LmsCourse, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      console.warn('subscribeToCourses notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for a user's `enrollments`.
 */
export function subscribeToUserEnrollments(
  userId: string,
  onData: (enrollments: LmsEnrollment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, 'enrollments'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LmsEnrollment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LmsEnrollment, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      console.warn('subscribeToUserEnrollments notice:', error);
      if (onError) onError(error);
    }
  );
}
