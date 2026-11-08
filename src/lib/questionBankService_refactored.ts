import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

// NEW HIERARCHY: SUBJECT -> PORTION -> QUESTIONS
export interface QuestionBankSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  order: number;
  isListed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionAssignment {
  questionId: string;
  builderSubjectId: string;
  assignedAt: string;
}

export interface QuestionBankPortion {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  description: string;
  order: number;
  isListed: boolean;
  assignedQuestions: QuestionAssignment[];
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ... rest of the service will need to be refactored to remove Bank concept ...
// This requires rewriting most of the file. I will proceed with this.
