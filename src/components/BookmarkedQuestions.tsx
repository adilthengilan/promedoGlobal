import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserBookmarks, resolveQuestionReferences } from '../lib/userQuestionService';
import { ResolvedQuestion } from '../lib/userQuestionService';

export default function BookmarkedQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ResolvedQuestion[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'subject'>('date');

  useEffect(() => {
    if (user?.uid) {
      return subscribeToUserBookmarks(user.uid, async (refs) => {
        const resolved = await resolveQuestionReferences(refs);
        setQuestions(resolved);
      });
    }
  }, [user?.uid]);

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === 'subject') return a.subjectName.localeCompare(b.subjectName);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-4 py-2 rounded-xl border text-sm">
          <option value="date">Sort by Date</option>
          <option value="subject">Sort by Subject</option>
        </select>
      </div>
      <div className="space-y-4">
        {sortedQuestions.map((q) => (
          <div key={q.id} className="p-6 bg-white rounded-2xl border">
            <p className="font-bold text-lg mb-2">{q.text}</p>
            <p className="text-sm text-gray-500">Subject: {q.subjectName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
