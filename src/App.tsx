import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminMocktestEditor from './pages/AdminMocktestEditor';
import Success from './pages/Success';
import MockTest from './pages/MockTest';
import Updates from './pages/Updates';
import ExamDemo from './pages/ExamDemo';
import MockTestIntro from './pages/MockTestIntro';
import About from './pages/About';
import ContactSupport from './pages/ContactSupport';
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import AdminSubjectQuestions from './pages/AdminSubjectQuestions';
import SubjectPractice from './pages/SubjectPractice';
import MockTests from './pages/MockTests';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import CoursePlayer from './pages/CoursePlayer';
import Checkout from './pages/Checkout';
import Bookmarks from './pages/Bookmarks';
import PaidAccessGuard from './components/PaidAccessGuard';

import WhatsAppFloatingButton from './components/WhatsAppFloatingButton';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isMockTestActive = location.pathname.startsWith('/mock-test');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isAdminPage = location.pathname.startsWith('/adminlandingpage') || location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      {!isMockTestActive && !isAuthPage && !isAdminPage && <Navbar />}
      <main className={`flex-grow ${!isMockTestActive && !isAuthPage && !isHome && !isAdminPage ? 'pt-20' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/adminlandingpage" element={<AdminDashboard />} />
          <Route path="/adminlandingpage/subjects" element={<AdminSubjectQuestions />} />
          <Route path="/adminlandingpage/mocktest/create" element={<AdminMocktestEditor />} />
          <Route path="/adminlandingpage/mocktest/edit/:id" element={<AdminMocktestEditor />} />
          <Route path="/admin/*" element={<Navigate to="/adminlandingpage" replace />} />
          <Route path="/admin" element={<Navigate to="/adminlandingpage" replace />} />
          
          {/* Module 1: Courses (Requires PAID status) */}
          <Route path="/courses" element={<PaidAccessGuard moduleName="Courses"><Courses /></PaidAccessGuard>} />
          <Route path="/course/:id" element={<PaidAccessGuard moduleName="Courses"><CourseDetail /></PaidAccessGuard>} />
          <Route path="/player/:id" element={<PaidAccessGuard moduleName="Courses"><CoursePlayer /></PaidAccessGuard>} />

          {/* Module 2: Mock Tests (Requires PAID status) */}
          <Route path="/mocktests" element={<PaidAccessGuard moduleName="Mock Tests"><MockTests /></PaidAccessGuard>} />
          <Route path="/mock-tests" element={<PaidAccessGuard moduleName="Mock Tests"><MockTests /></PaidAccessGuard>} />
          <Route path="/mock-tests-list" element={<PaidAccessGuard moduleName="Mock Tests"><MockTests /></PaidAccessGuard>} />
          <Route path="/mock-test/:id?" element={<PaidAccessGuard moduleName="Mock Tests"><MockTest /></PaidAccessGuard>} />
          <Route path="/mock-test-intro" element={<PaidAccessGuard moduleName="Mock Tests"><MockTestIntro /></PaidAccessGuard>} />
          <Route path="/exam-demo" element={<PaidAccessGuard moduleName="Mock Tests"><ExamDemo /></PaidAccessGuard>} />

          {/* Module 3: Practice (Requires PAID status) */}
          <Route path="/student/subject/:subjectId" element={<PaidAccessGuard moduleName="Practice"><SubjectPractice /></PaidAccessGuard>} />
          <Route path="/subject-practice" element={<PaidAccessGuard moduleName="Practice"><SubjectPractice /></PaidAccessGuard>} />

          {/* Module 4: Question Bank & Bookmarks (Requires PAID status) */}
          <Route path="/student/bookmarks" element={<PaidAccessGuard moduleName="Question Bank"><Bookmarks /></PaidAccessGuard>} />

          <Route path="/success" element={<Success />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<ContactSupport />} />
          <Route path="/support" element={<ContactSupport />} />
          <Route path="/contact-support" element={<ContactSupport />} />
          <Route path="/checkout/:courseId" element={<Checkout />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/terms-of-service" element={<TermsConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </main>
      {!isMockTestActive && !isAuthPage && !isAdminPage && <Footer />}
      {!isMockTestActive && !isAdminPage && <WhatsAppFloatingButton />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
