import React, { useState, useEffect } from 'react';
import { Layers, Folder, Database, Plus, Edit3, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { 
  QuestionBankSubject, 
  QuestionBankPortion, 
  subscribeToSubjects, 
  createSubject, 
  updateSubject, 
  deleteSubject, 
  subscribeToPortions, 
  createPortion, 
  updatePortion, 
  deletePortion 
} from '../lib/questionBankService';

export default function SimplifiedQuestionBankManager() {
  const [subjects, setSubjects] = useState<QuestionBankSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<QuestionBankSubject | null>(null);
  const [portions, setPortions] = useState<QuestionBankPortion[]>([]);

  useEffect(() => {
    return subscribeToSubjects((list) => setSubjects(list));
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      return subscribeToPortions(selectedSubject.id, (list) => setPortions(list));
    }
  }, [selectedSubject]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-black">Question Management</h2>
      
      {!selectedSubject ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.map(s => (
            <div key={s.id} className="p-4 bg-white border rounded-2xl cursor-pointer" onClick={() => setSelectedSubject(s)}>
              <h3 className="font-bold">{s.name}</h3>
              <p className="text-xs text-gray-500">{s.description}</p>
            </div>
          ))}
          <button className="p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2">
            <Plus size={20} /> Create Subject
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-1 text-sm font-bold">
            <ArrowLeft size={16} /> Back to Subjects
          </button>
          <h3 className="text-lg font-bold">Portions in {selectedSubject.name}</h3>
          <div className="space-y-2">
            {portions.map(p => (
              <div key={p.id} className="p-4 bg-white border rounded-xl flex justify-between">
                <span>{p.name}</span>
                <span className="text-xs text-gray-500">{p.questionCount} Questions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
