import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookmarkedQuestions from '../components/BookmarkedQuestions';

export default function Bookmarks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 mb-6 font-bold text-sm"><ArrowLeft /> Back to Dashboard</button>
      <h1 className="text-2xl font-black mb-8">Bookmarked Questions</h1>
      <BookmarkedQuestions />
    </div>
  );
}
