import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Trash2, Save, X, ChevronDown, ListChecks, Target,
  BookOpen, FolderPlus, HelpCircle, CheckCircle2, FileText, Search, Loader2, Info, Edit2, Upload, Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { uploadQuestionImage, validateQuestionImage } from '../lib/cloudinaryService';
import QuestionImage from '../components/QuestionImage';

interface Subject {
  id: string; // Document ID (typically the subject name or slugified)
  name: string;
  details: string;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt?: string;
}

export default function AdminSubjectQuestions() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'add-questions'>('list');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for new Subject
  const [newSubject, setNewSubject] = useState({
    name: '',
    details: ''
  });

  // Form states for new Question
  const [questionForm, setQuestionForm] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 0, // 0 = A, 1 = B, 2 = C, 3 = D
    explanation: '',
    imageUrl: '',
    imagePublicId: ''
  });

  // Additional CRUD States
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showEditSubject, setShowEditSubject] = useState(false);
  const [editSubjectForm, setEditSubjectForm] = useState({
    id: '',
    name: '',
    details: ''
  });

  // Confirmation state for deleting subjects/questions without using the blocked native iframe confirm
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<{ id: string, text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File upload handler for Question Image via Cloudinary
  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateQuestionImage(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadQuestionImage(file);
      setQuestionForm(prev => ({
        ...prev,
        imageUrl: result.imageUrl,
        imagePublicId: result.publicId
      }));
      setSuccessMessage("Image uploaded successfully to Cloudinary!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      setErrorMessage(err.message || 'Image upload failed. Please try again.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Fetch all subjects on mount with LocalStorage failover
  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    let list: Subject[] = [];
    let firestoreSuccess = false;
    
    // 1. Try pulling from Firestore
    try {
      const querySnapshot = await getDocs(query(collection(db, 'questionBank'), orderBy('createdAt', 'desc')));
      list = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Subject[];
      firestoreSuccess = true;
    } catch (err) {
      console.warn("Failed fetching subjects from Firestore, falling back to LocalStorage:", err);
    }

    // 2. Read local catalog storage
    const savedLocal = localStorage.getItem('local_subjects');
    let localList: Subject[] = [];
    if (savedLocal) {
      try {
        localList = JSON.parse(savedLocal);
      } catch (e) {
        console.error("Error parsing local_subjects:", e);
      }
    }

    // 2.5 Purge automated default subjects
    const defaultKeys = ['cardiology', 'neurology', 'ophthalmology', 'pediatrics', 'obstetrics', 'obstetrics-gynecology', 'obstetrics_gynecology', 'obstetrics-&-gynecology', 'obstetrics-and-gynecology'];
    
    const filteredLocalList = localList.filter(s => !defaultKeys.includes(s.id.toLowerCase()));
    if (filteredLocalList.length !== localList.length) {
      localStorage.setItem('local_subjects', JSON.stringify(filteredLocalList));
      localList = filteredLocalList;
    }

    list = list.filter(s => !defaultKeys.includes(s.id.toLowerCase()));

    // Run persistent background deletion of default keys
    defaultKeys.forEach(async (id) => {
      try {
        await deleteDoc(doc(db, 'questionBank', id));
      } catch (e) {
        // Ignore
      }
    });

    let mergedList: Subject[] = [];
    if (firestoreSuccess) {
      localStorage.setItem('local_subjects', JSON.stringify(list));
      mergedList = list;
    } else {
      mergedList = localList;
    }

    // 4. Start with a clean empty list if fully empty
    if (mergedList.length === 0) {
      localStorage.setItem('local_subjects', JSON.stringify([]));
    }

    setSubjects(mergedList);

    // Set first active if not chosen or if chosen is no longer in list
    if (mergedList.length > 0) {
      if (!selectedSubjectId || !mergedList.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(mergedList[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }

    // 5. Gather question counts for metric tracker
    const counts: Record<string, number> = {};
    await Promise.all(mergedList.map(async (subj) => {
      try {
        const qSnap = await getDocs(collection(db, `questionBank/${subj.id}/questions`));
        let count = qSnap.size;
        
        // Merge with local questions representation
        const localQs = localStorage.getItem(`local_questions_${subj.id}`);
        if (localQs) {
          try {
            const parsed = JSON.parse(localQs);
            count = Math.max(count, parsed.length);
          } catch {}
        }
        counts[subj.id] = count;
      } catch (err) {
        // pure local count
        const localQs = localStorage.getItem(`local_questions_${subj.id}`);
        if (localQs) {
          try {
            counts[subj.id] = JSON.parse(localQs).length;
          } catch {
            counts[subj.id] = 0;
          }
        } else {
          counts[subj.id] = 0;
        }
      }
    }));
    
    setSubjectCounts(counts);
    setLoadingSubjects(false);
  };

  // Fetch questions for currently selected subject with LocalStorage failover
  const fetchQuestionsForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    let list: Question[] = [];
    let firestoreSuccess = false;
    
    // 1. Try Firestore
    try {
      const querySnapshot = await getDocs(collection(db, `questionBank/${subjectId}/questions`));
      list = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Question[];
      firestoreSuccess = true;
    } catch (err) {
      console.warn(`Failed fetching questions for ${subjectId} from Firestore, using LocalStorage:`, err);
    }

    // 2. Fetch local storage
    const savedLocal = localStorage.getItem(`local_questions_${subjectId}`);
    let localList: Question[] = [];
    if (savedLocal) {
      try {
        localList = JSON.parse(savedLocal);
      } catch {}
    }

    let mergedList: Question[] = [];
    if (firestoreSuccess) {
      localStorage.setItem(`local_questions_${subjectId}`, JSON.stringify(list));
      mergedList = list;
    } else {
      mergedList = localList;
    }

    setQuestions(mergedList);
    setLoadingQuestions(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSubjects();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchQuestionsForSubject(selectedSubjectId);
    } else {
      setQuestions([]);
    }
  }, [selectedSubjectId]);

  // Handle access deny
  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-brand-gray/10">
        <div className="text-center bg-white p-12 rounded-[40px] shadow-sm max-w-md border border-gray-100">
          <X className="mx-auto w-16 h-16 text-red-500 mb-6 bg-red-50 p-4 rounded-3xl" />
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mb-8">You do not have administrative permissions to configure subject-specific questions.</p>
          <button onClick={() => navigate('/')} className="btn-primary mx-auto">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Handle adding a new Subject with LocalStorage + Firestore dual saving
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name.trim()) return;

    setSubmittingSubject(true);
    const docId = newSubject.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docName = newSubject.name.trim();
    const detailsVal = newSubject.details.trim();
    const createdAtVal = new Date().toISOString();

    const subjectObj: Subject = {
      id: docId,
      name: docName,
      details: detailsVal,
      createdAt: createdAtVal
    };

    // 1. Write to local storage catalog
    let localSubjects: Subject[] = [];
    try {
      const saved = localStorage.getItem('local_subjects');
      if (saved) {
        localSubjects = JSON.parse(saved);
      }
    } catch {}
    localSubjects = localSubjects.filter(s => s.id !== docId);
    localSubjects.push(subjectObj);
    localStorage.setItem('local_subjects', JSON.stringify(localSubjects));

    // 2. Try saving to cloud Firestore
    try {
      const subjectRef = doc(db, 'questionBank', docId);
      await setDoc(subjectRef, {
        name: docName,
        details: detailsVal,
        createdAt: createdAtVal
      });
      setSuccessMessage(`Subject "${docName}" successfully created and synced to cloud database!`);
    } catch (err) {
      console.warn("Firestore save failed, created subject locally in local storage:", err);
      setSuccessMessage(`Subject "${docName}" created locally inside sandbox.`);
    } finally {
      setNewSubject({ name: '', details: '' });
      setShowAddSubject(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      setSubmittingSubject(false);
      await fetchSubjects();
      setSelectedSubjectId(docId);
    }
  };

  // Process saving a Question (Create or Edit) with LocalStorage fallback
  const handleSaveQuestion = async (keepSubjectActive: boolean = true) => {
    if (!selectedSubjectId) {
      setErrorMessage("Please select a subject first!");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const { text, optionA, optionB, optionC, optionD, correctAnswer, explanation } = questionForm;
    
    if (!text.trim()) {
      setErrorMessage("Please enter the question text.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMessage("Please provide content for all 4 multiple-choice options.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setSubmittingQuestion(true);
    const questionId = editingQuestionId || 'q_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
    const questionData: Question = {
      id: questionId,
      text: text.trim(),
      options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
      correctAnswer: Number(correctAnswer),
      explanation: explanation.trim(),
      imageUrl: questionForm.imageUrl || '',
      imagePublicId: questionForm.imagePublicId || '',
      createdAt: new Date().toISOString()
    };

    // 1. Write locally
    let localQs: Question[] = [];
    try {
      const saved = localStorage.getItem(`local_questions_${selectedSubjectId}`);
      if (saved) {
        localQs = JSON.parse(saved);
      }
    } catch {}
    localQs = localQs.filter(q => q.id !== questionId);
    localQs.push(questionData);
    localStorage.setItem(`local_questions_${selectedSubjectId}`, JSON.stringify(localQs));

    // 2. Try writing to Firestore
    try {
      const questionDocRef = doc(db, `questionBank/${selectedSubjectId}/questions`, questionId);
      await setDoc(questionDocRef, {
        text: questionData.text,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        imageUrl: questionData.imageUrl || '',
        imagePublicId: questionData.imagePublicId || '',
        createdAt: questionData.createdAt
      }, { merge: true });

      setSuccessMessage(editingQuestionId ? "Question updated inside database!" : "Question added successfully!");
    } catch (err) {
      console.warn("Firestore question write failed, progress saved locally:", err);
      setSuccessMessage("Question saved locally in workspace sandbox database!");
    } finally {
      setEditingQuestionId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      setQuestionForm({
        text: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 0,
        explanation: '',
        imageUrl: '',
        imagePublicId: ''
      });

      if (questionInputRef.current) {
        questionInputRef.current.focus();
      }

      setSubmittingQuestion(false);
      // Refresh questions of this subject dynamically
      await fetchQuestionsForSubject(selectedSubjectId);
      
      // Update local counts immediately
      setSubjectCounts(prev => ({
        ...prev,
        [selectedSubjectId]: localQs.length
      }));
    }
  };

  // Start editing a specific question
  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      text: q.text,
      optionA: q.options[0] || '',
      optionB: q.options[1] || '',
      optionC: q.options[2] || '',
      optionD: q.options[3] || '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl || '',
      imagePublicId: q.imagePublicId || ''
    });
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
  };

  // Start editing active subject details
  const handleStartEditSubject = (subjId?: string) => {
    const targetId = subjId || selectedSubjectId;
    const s = subjects.find(sub => sub.id === targetId);
    if (!s) return;
    setEditSubjectForm({
      id: s.id,
      name: s.name,
      details: s.details || ''
    });
    setShowEditSubject(true);
  };

  // Save the modified subject details with LocalStorage fallback
  const handleSaveEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubjectForm.name.trim()) return;

    setSubmittingSubject(true);
    const updatedSubObj: Subject = {
      id: editSubjectForm.id,
      name: editSubjectForm.name.trim(),
      details: editSubjectForm.details.trim(),
      createdAt: subjects.find(sub => sub.id === editSubjectForm.id)?.createdAt || new Date().toISOString()
    };

    // Update locally
    let localSubjects: Subject[] = [];
    try {
      const saved = localStorage.getItem('local_subjects');
      if (saved) {
        localSubjects = JSON.parse(saved);
      }
    } catch {}
    localSubjects = localSubjects.map(s => s.id === editSubjectForm.id ? updatedSubObj : s);
    localStorage.setItem('local_subjects', JSON.stringify(localSubjects));

    // Update in Firestore
    try {
      const subjectDocRef = doc(db, 'questionBank', editSubjectForm.id);
      await setDoc(subjectDocRef, {
        name: updatedSubObj.name,
        details: updatedSubObj.details,
        createdAt: updatedSubObj.createdAt
      }, { merge: true });

      setSuccessMessage(`Subject "${editSubjectForm.name}" updated successfully!`);
    } catch (err) {
      console.warn("Firestore update failed, updated locally:", err);
      setSuccessMessage(`Subject "${editSubjectForm.name}" updated locally.`);
    } finally {
      setShowEditSubject(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      setSubmittingSubject(false);
      await fetchSubjects();
    }
  };

  const confirmDeleteSubject = (subjId: string) => {
    const s = subjects.find(sub => sub.id === subjId);
    if (s) {
      setSubjectToDelete({ id: s.id, name: s.name });
    }
  };

  const confirmDeleteQuestion = (q: Question) => {
    setQuestionToDelete({ id: q.id, text: q.text });
  };

  // Delete the active subject
  const handleDeleteSubject = async (targetId: string) => {
    if (!targetId) return;
    const activeSubjectName = subjects.find(s => s.id === targetId)?.name || 'Subject';

    // Remove from localstorage-subjects
    let localSubjects: Subject[] = [];
    try {
      const saved = localStorage.getItem('local_subjects');
      if (saved) {
        localSubjects = JSON.parse(saved);
      }
    } catch {}
    localSubjects = localSubjects.filter(s => s.id !== targetId);
    localStorage.setItem('local_subjects', JSON.stringify(localSubjects));

    // Remove local questions
    localStorage.removeItem(`local_questions_${targetId}`);

    const remaining = subjects.filter(s => s.id !== targetId);
    setSubjects(remaining);
    
    // Choose next active subject
    if (selectedSubjectId === targetId) {
      if (remaining.length > 0) {
        setSelectedSubjectId(remaining[0].id);
      } else {
        setSelectedSubjectId('');
      }
    }

    setSuccessMessage(`Subject "${activeSubjectName}" deleted successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);

    // Try deleting from cloud Firestore
    try {
      await deleteDoc(doc(db, 'questionBank', targetId));
    } catch (err) {
      console.warn("Firestore subject delete failed, deleted successfully locally:", err);
    }
  };

  // Delete a specific question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedSubjectId) return;
    
    let localQs: Question[] = [];
    try {
      const saved = localStorage.getItem(`local_questions_${selectedSubjectId}`);
      if (saved) {
        localQs = JSON.parse(saved);
      }
    } catch {}
    localQs = localQs.filter(q => q.id !== questionId);
    localStorage.setItem(`local_questions_${selectedSubjectId}`, JSON.stringify(localQs));

    setQuestions(localQs);
    setSubjectCounts(prev => ({
      ...prev,
      [selectedSubjectId]: localQs.length
    }));

    setSuccessMessage("Question removed successfully.");
    setTimeout(() => setSuccessMessage(null), 3000);

    try {
      await deleteDoc(doc(db, `questionBank/${selectedSubjectId}/questions`, questionId));
    } catch (err) {
      console.warn("Firestore question deletion failed, updated locally:", err);
    }
  };

  // Filtered list based on search bar
  const filteredQuestions = questions.filter(q => 
    q.text.toLowerCase().includes(searchText.toLowerCase()) ||
    q.explanation.toLowerCase().includes(searchText.toLowerCase()) ||
    q.options.some(o => o.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-gray-800 antialiased flex flex-col">
      {/* Top Navigation Bar matching Gentelella v4 Header */}
      <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => {
              if (viewMode === 'add-questions') {
                setViewMode('list');
              } else {
                navigate('/adminlandingpage');
              }
            }}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-brand-blue hover:bg-gray-100 transition-colors px-3 py-2 rounded-xl shrink-0 cursor-pointer"
            title={viewMode === 'add-questions' ? 'Back to Subjects List' : 'Return to main dashboard'}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{viewMode === 'add-questions' ? 'Subjects List' : 'Dashboard'}</span>
          </button>
          
          <div className="h-4 w-px bg-gray-200 hidden sm:block shrink-0" />
          
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/promedo-logo.png"
              alt="Promedo"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 truncate">
              <span className="text-gray-900 font-extrabold hidden md:inline">Promedo Global</span>
              <span className="text-gray-300 hidden md:inline">/</span>
              <span className="text-gray-600 hidden sm:inline">Question Bank</span>
              <span className="text-gray-300">/</span>
              <span className="text-brand-blue font-black truncate">
                {viewMode === 'add-questions' 
                  ? `Question Editor: ${subjects.find(s => s.id === selectedSubjectId)?.name || 'Editor'}` 
                  : 'Subject Practice Builder'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {viewMode === 'list' ? (
            <>
              <button 
                onClick={() => setShowAddSubject(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-xs text-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>Create Subject</span>
              </button>

              <button 
                onClick={() => selectedSubjectId && confirmDeleteSubject(selectedSubjectId)}
                disabled={!selectedSubjectId || subjects.length === 0}
                className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl font-bold transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Delete selected subject"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">Delete Subject</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-100 border border-gray-200 transition-all shadow-2xs text-xs cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Back to Subjects</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb & Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                CONTENT MANAGEMENT
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                {subjects.length} Subjects Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] tracking-tight">
              {viewMode === 'add-questions' 
                ? `Questions: ${subjects.find(s => s.id === selectedSubjectId)?.name || 'Subject'}` 
                : 'Subject Questions Builder'}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {viewMode === 'add-questions' 
                ? 'Configure clinical vignettes, 4 multiple choice options, correct answers and rationale.' 
                : 'Build high-yield subject-wise preparation portals for medical and GCC licensing candidates.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-xl border border-gray-200/80 shadow-2xs text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Questions</p>
              <p className="text-lg font-black text-brand-blue leading-none mt-0.5">
                {(Object.values(subjectCounts) as number[]).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-8 flex items-center gap-3 text-green-700"
            >
              <CheckCircle2 size={20} className="shrink-0 text-green-600 animate-bounce" />
              <p className="font-bold text-sm leading-tight">{successMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-8 flex items-center gap-3 text-rose-700 animate-fade-in"
            >
              <X size={20} className="shrink-0 text-rose-600 animate-pulse" />
              <p className="font-bold text-sm leading-tight">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW MODE: LIST */}
        {viewMode === 'list' && (
          <>
            {subjects.length === 0 ? (
              <div className="bg-white rounded-[32px] border border-gray-150 p-12 text-center max-w-2xl mx-auto shadow-sm my-12">
                <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue mx-auto mb-6">
                  <BookOpen size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">My Subjects Catalog is Empty</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                  Create subjects to group practice exercises for your students. Add matching clinical questions inside each subject once created.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold hover:bg-opacity-95 transition-all shadow-md text-sm cursor-pointer"
                  >
                    <Plus size={16} />
                    Create New Subject
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Target size={18} className="text-teal-600" />
                      <span>Active Subjects Catalog</span>
                    </h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Configure clinical question blocks for added study subjects below.</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-teal-50 text-xs font-bold text-teal-700 border border-teal-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span>Database: {(Object.values(subjectCounts) as number[]).reduce((a, b) => a + b, 0)} Total Questions</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {subjects.map(s => {
                    const count = subjectCounts[s.id] || 0;
                    const isSelected = selectedSubjectId === s.id;
                    
                    return (
                      <div 
                        key={s.id}
                        onClick={() => setSelectedSubjectId(s.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer select-none relative group flex flex-col justify-between ${
                          isSelected 
                          ? 'bg-teal-50/20 border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                          : 'bg-white border-gray-200/90 hover:border-gray-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="text-base font-extrabold text-gray-900 group-hover:text-teal-600 transition-colors truncate block max-w-[170px]" title={s.name}>
                              {s.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-teal-50 text-xs font-bold text-teal-800 border border-teal-200/80">
                              <span className="font-black text-teal-900">{count}</span>
                              <span className="text-[11px] font-semibold text-teal-700">{count === 1 ? 'Question' : 'Questions'}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 line-clamp-3 mb-5 min-h-[44px] leading-relaxed">
                            {s.details || 'No additional description provided.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2.5 pt-3.5 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubjectId(s.id);
                              setViewMode('add-questions');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#151B26] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add Questions</span>
                          </button>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubjectId(s.id);
                                handleStartEditSubject(s.id);
                              }}
                              className="p-2 bg-gray-100 text-gray-600 hover:bg-teal-600 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Edit Subject Info"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubjectId(s.id);
                                confirmDeleteSubject(s.id);
                              }}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all cursor-pointer"
                              title="Delete Subject"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW MODE: ADD QUESTIONS */}
        {viewMode === 'add-questions' && (
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* LEFT SIDE: Subject Info & Question Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs">
                
                {/* Header info of active subject */}
                <div className="mb-6 p-4 sm:p-5 bg-slate-50 rounded-xl border border-gray-200/70">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider border border-teal-200/60">
                        ACTIVE SUBJECT
                      </span>
                      <h2 className="text-xl font-black text-gray-900 mt-2">
                        {subjects.find(s => s.id === selectedSubjectId)?.name}
                      </h2>
                      <p className="text-xs text-gray-500 mt-1 italic leading-relaxed">
                        "{subjects.find(s => s.id === selectedSubjectId)?.details || 'No subject description available.'}"
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">QUESTIONS</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-brand-blue">{questions.length}</span>
                        <span className="text-xs text-gray-500 font-bold">{questions.length === 1 ? 'Question' : 'Questions'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3.5 border-t border-gray-200/60">
                    <button
                      onClick={handleStartEditSubject}
                      className="text-xs font-bold text-gray-700 hover:text-teal-700 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit Subject Config</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className="text-xs font-bold text-gray-600 hover:bg-gray-100 bg-white px-3 py-1.5 rounded-lg border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      <span>Change Subject</span>
                    </button>
                  </div>
                </div>

                {/* Create/Edit Question Fields */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Question Vignette / Text</label>
                      <span className="text-[10px] text-gray-400 font-medium">supports clinical scenario formulations</span>
                    </div>
                    <textarea 
                      ref={questionInputRef}
                      required
                      rows={4}
                      value={questionForm.text}
                      onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none font-normal"
                      placeholder="Enter the medical/prometric clinical trial question context here..."
                    />
                  </div>

                  {/* Question Image (Optional) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-teal-600" />
                        <span>Question Image</span>
                        <span className="text-gray-400 font-normal lowercase">(optional)</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-medium">Radiographs, ECG strips, CT scans, pathology</span>
                    </div>

                    <input 
                      type="file" 
                      ref={imageInputRef} 
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" 
                      onChange={handleQuestionImageUpload} 
                      className="hidden" 
                    />

                    {uploadingImage ? (
                      <div className="border-2 border-dashed border-teal-400 bg-teal-50/40 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="animate-spin text-teal-600" size={24} />
                        <span className="text-xs font-bold text-teal-900">Uploading media to Cloudinary CDN...</span>
                        <span className="text-[10px] text-teal-700">Generating secure HTTPS asset URL</span>
                      </div>
                    ) : !questionForm.imageUrl ? (
                      <div 
                        onClick={() => imageInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 hover:border-teal-500 bg-gray-50/50 hover:bg-teal-50/20 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white text-gray-400 group-hover:text-teal-600 flex items-center justify-center border border-gray-200 shadow-2xs transition-colors">
                          <Upload size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">Click to upload clinical media via Cloudinary</span>
                          <span className="text-[10px] text-gray-400">PNG, JPG, WebP up to 8MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-md">
                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-900/5 p-2">
                          <QuestionImage 
                            imageUrl={questionForm.imageUrl} 
                            altText="Question clinical reference visual"
                            className="max-h-52 w-full object-contain"
                          />
                        </div>
                        <div className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-teal-700 font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-teal-600" />
                            <span>Cloudinary Asset Attached</span>
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="text-brand-blue font-bold hover:underline cursor-pointer"
                            >
                              Replace Image
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestionForm(prev => ({ ...prev, imageUrl: '', imagePublicId: '' }))}
                              className="text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Multiple Choice Options</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* A */}
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 font-black flex items-center justify-center text-xs">
                          A
                        </span>
                        <input 
                          type="text" 
                          required
                          value={questionForm.optionA}
                          onChange={e => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                          placeholder="Option A description"
                          className="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                      {/* B */}
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 font-black flex items-center justify-center text-xs">
                          B
                        </span>
                        <input 
                          type="text" 
                          required
                          value={questionForm.optionB}
                          onChange={e => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                          placeholder="Option B description"
                          className="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                      {/* C */}
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 font-black flex items-center justify-center text-xs">
                          C
                        </span>
                        <input 
                          type="text" 
                          required
                          value={questionForm.optionC}
                          onChange={e => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                          placeholder="Option C description"
                          className="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                      {/* D */}
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 font-black flex items-center justify-center text-xs">
                          D
                        </span>
                        <input 
                          type="text" 
                          required
                          value={questionForm.optionD}
                          onChange={e => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                          placeholder="Option D description"
                          className="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Correct Option */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Correct Answer Option</label>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { idx: 0, val: 'A' },
                        { idx: 1, val: 'B' },
                        { idx: 2, val: 'C' },
                        { idx: 3, val: 'D' }
                      ].map(opt => (
                        <button 
                          key={opt.idx}
                          type="button"
                          onClick={() => setQuestionForm({ ...questionForm, correctAnswer: opt.idx })}
                          className={`py-2.5 rounded-xl font-bold transition-all text-xs border flex items-center justify-center gap-1.5 cursor-pointer ${
                            questionForm.correctAnswer === opt.idx 
                              ? 'bg-teal-600 border-teal-600 text-white shadow-2xs' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {questionForm.correctAnswer === opt.idx && <CheckCircle2 size={14} />}
                          <span>Option {opt.val}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Scientific Rationale & Guideline Explanation</label>
                    <textarea 
                      rows={3}
                      value={questionForm.explanation}
                      onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none"
                      placeholder="Enter scientific justification detailing guidelines..."
                    />
                  </div>

                  {/* Actions Grid */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button"
                      disabled={submittingQuestion}
                      onClick={() => handleSaveQuestion(true)}
                      className={`flex-grow ${
                        editingQuestionId 
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs' 
                          : 'bg-[#151B26] hover:bg-slate-800 text-white shadow-2xs'
                      } py-3 rounded-xl justify-center font-bold text-xs transition-all flex items-center gap-2 cursor-pointer`}
                    >
                      {submittingQuestion ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      <span>{editingQuestionId ? 'Update Question' : 'Save Question & Add Next'}</span>
                    </button>
                    {editingQuestionId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(null);
                          setQuestionForm({
                            text: '',
                            optionA: '',
                            optionB: '',
                            optionC: '',
                            optionD: '',
                            correctAnswer: 0,
                            explanation: ''
                          });
                        }}
                        className="px-5 bg-white hover:bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs border border-gray-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT SIDE: Questions List */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-2xs h-full flex flex-col">
                
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Questions in Catalog</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Total: {questions.length} registered</p>
                  </div>
                  <div className="w-8 h-8 bg-teal-50 text-teal-700 border border-teal-200/60 rounded-lg flex items-center justify-center">
                    <ListChecks size={16} />
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search questions by keyword..."
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs outline-none transition-all"
                  />
                  {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex-grow overflow-y-auto max-h-[550px] pr-1 space-y-3 custom-scrollbar">
                  {loadingQuestions ? (
                    <div className="py-16 text-center text-teal-600">
                      <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                      <p className="text-xs font-bold">Retrieving questions...</p>
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 italic text-xs">
                      {searchText ? "No search matches found." : "No questions in this subject catalog yet."}
                    </div>
                  ) : (
                    filteredQuestions.map((q, index) => {
                      const letters = ['A', 'B', 'C', 'D'];
                      return (
                        <div key={q.id} className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/60 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all relative group">
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleStartEditQuestion(q)}
                              className="p-1.5 bg-white text-gray-700 hover:text-teal-700 hover:bg-teal-50 border border-gray-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                              title="Edit Question"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button 
                              onClick={() => confirmDeleteQuestion(q)}
                              className="p-1.5 bg-white text-rose-600 hover:bg-rose-50 border border-gray-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                              title="Delete from Catalog"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          <div className="flex items-start gap-2.5 pr-8">
                            <span className="font-mono text-xs font-bold text-gray-400 bg-white border border-gray-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <div className="space-y-2 flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 line-clamp-3">{q.text}</p>
                              {q.imageUrl && (
                                <div className="max-w-[160px] rounded-lg overflow-hidden border border-gray-200">
                                  <QuestionImage 
                                    imageUrl={q.imageUrl} 
                                    altText={q.text} 
                                    className="max-h-24 w-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <span className="text-[9px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded uppercase">
                                  Choice: {letters[q.correctAnswer]}
                                </span>
                                {q.explanation && (
                                  <span className="text-[9px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded truncate max-w-[200px]">
                                    {q.explanation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW SUBJECT */}
      <AnimatePresence>
        {showAddSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submittingSubject && setShowAddSubject(false)}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm"
            />

            {/* Form Modal */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl z-10 border border-gray-200"
            >
              <button 
                onClick={() => setShowAddSubject(false)}
                className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                disabled={submittingSubject}
              >
                <X size={18} />
              </button>

              <div className="flex gap-3 items-center mb-5 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl flex items-center justify-center shrink-0">
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Subject</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Add a new clinical group for student practice</p>
                </div>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Subject Name</label>
                  <input 
                    type="text"
                    required
                    value={newSubject.name}
                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g. Cardiology, Ophthalmology, Neurology"
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-semibold text-gray-800"
                    disabled={submittingSubject}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Description & Scope</label>
                  <textarea 
                    rows={3}
                    value={newSubject.details}
                    onChange={e => setNewSubject({ ...newSubject, details: e.target.value })}
                    placeholder="Detailed explanation of clinical scope covered..."
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none text-gray-700 font-normal"
                    disabled={submittingSubject}
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setShowAddSubject(false)}
                    className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingSubject}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submittingSubject ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Save Subject</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT ACTIVE SUBJECT */}
      <AnimatePresence>
        {showEditSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submittingSubject && setShowEditSubject(false)}
              className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-xs"
            />

            {/* Form Modal */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl z-10 border border-gray-200"
            >
              <button 
                onClick={() => setShowEditSubject(false)}
                className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                disabled={submittingSubject}
              >
                <X size={18} />
              </button>

              <div className="flex gap-3 items-center mb-5 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl flex items-center justify-center shrink-0">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Subject Details</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Update subject information</p>
                </div>
              </div>

              <form onSubmit={handleSaveEditSubject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Subject Name</label>
                  <input 
                    type="text"
                    required
                    value={editSubjectForm.name}
                    onChange={e => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                    placeholder="e.g. Cardiology"
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-semibold text-gray-800"
                    disabled={submittingSubject}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Subject Scope Description</label>
                  <textarea 
                    rows={3}
                    value={editSubjectForm.details}
                    onChange={e => setEditSubjectForm({ ...editSubjectForm, details: e.target.value })}
                    placeholder="Detailed description of coverage..."
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none text-gray-700 font-normal"
                    disabled={submittingSubject}
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setShowEditSubject(false)}
                    className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingSubject}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submittingSubject ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Update Subject</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE SUBJECT CONFIRMATION */}
      <AnimatePresence>
        {subjectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubjectToDelete(null)}
              className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 border border-gray-200"
            >
              <button 
                onClick={() => setSubjectToDelete(null)}
                className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Subject?</h3>
                  <p className="text-[11px] text-gray-400 font-medium">This operation cannot be undone</p>
                </div>
              </div>

              <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100 text-xs text-rose-800 mb-5 leading-relaxed">
                Are you sure you want to delete <span className="font-bold">"{subjectToDelete.name}"</span>? All questions associated with this subject will be removed.
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setSubjectToDelete(null)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors border border-gray-300 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteSubject(subjectToDelete.id);
                    setSubjectToDelete(null);
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Confirm</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE QUESTION CONFIRMATION */}
      <AnimatePresence>
        {questionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuestionToDelete(null)}
              className="absolute inset-0 bg-[#0B1C30]/50 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 border border-gray-200"
            >
              <button 
                onClick={() => setQuestionToDelete(null)}
                className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex gap-3 items-start mb-4">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Question?</h3>
                  <p className="text-[11px] text-gray-400 font-medium">This operation cannot be undone</p>
                </div>
              </div>

              <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100 text-xs text-rose-800 mb-5 leading-relaxed max-h-[120px] overflow-y-auto">
                Are you sure you want to permanently delete this clinical question?
                <p className="mt-1.5 text-gray-600 italic bg-white p-2 rounded-lg border border-rose-100 font-normal">
                  "{questionToDelete.text}"
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuestionToDelete(null)}
                  className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors border border-gray-300 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteQuestion(questionToDelete.id);
                    setQuestionToDelete(null);
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Confirm</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
