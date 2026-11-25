import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, GraduationCap, ShieldCheck } from 'lucide-react';
import ConsultationModal from './ConsultationModal';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`fixed top-4 inset-x-0 z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
      scrolled ? 'scale-[0.99] top-3' : 'scale-100'
    }`}>
      <div className={`flex justify-between items-center h-14 text-white rounded-full px-6 transition-all duration-500 ${
        scrolled 
          ? 'bg-brand-blue/85 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl shadow-brand-blue/40 border border-white/40 ring-1 ring-white/20' 
          : 'bg-brand-blue/90 backdrop-blur-xl shadow-xl shadow-brand-blue/25 border border-white/30'
      }`}>
          
          {/* Logo */}
         <Link to="/" className="flex items-center gap-2.5 group">
             <img
              src="/promedo-logo.png"
              alt="Promedo"
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
            />
        </Link>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wide">
            <Link 
              to="/" 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                isActive('/') ? 'bg-white text-brand-blue font-bold shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              {isActive('/') && <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />}
              Home
            </Link>

            <Link 
              to="/about" 
              className={`hover:text-white transition-colors ${
                isActive('/about') ? 'text-white font-bold' : 'text-white/80'
              }`}
            >
              About
            </Link>

            {/* Courses Link */}
            <Link 
              to="/courses" 
              className={`hover:text-white transition-colors ${
                isActive('/courses') || location.pathname.startsWith('/course/') ? 'text-white font-bold' : 'text-white/80'
              }`}
            >
              Courses
            </Link>

            {/* Mock Test Link */}
            <Link 
              to="/mocktests" 
              className={`hover:text-white transition-colors ${
                isActive('/mocktests') || isActive('/mock-tests') || isActive('/mock-test') ? 'text-white font-bold' : 'text-white/80'
              }`}
            >
              Mock Tests
            </Link>

            <Link 
              to="/contact" 
              className={`hover:text-white transition-colors ${
                isActive('/contact') || isActive('/support') ? 'text-white font-bold' : 'text-white/80'
              }`}
            >
              Contact Support
            </Link>
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    to="/adminlandingpage"
                    className="bg-amber-400 text-slate-950 px-3.5 py-2 rounded-full text-xs font-black hover:bg-amber-300 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <ShieldCheck size={15} />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Link>
                )}
                <Link 
                  to="/dashboard" 
                  className="bg-white text-brand-blue px-4 py-2 rounded-full text-xs font-black hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5"
                >
                  <GraduationCap size={16} className="text-brand-blue" />
                  <span>Candidate Portal</span>
                </Link>
                <button 
                  onClick={() => logout()}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                state={{ message: "Please sign in or create an account to access mock test simulators." }}
                className="bg-white text-brand-blue hover:bg-white/95 px-5 py-2 rounded-full text-xs font-black transition-all shadow-md flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
              >
                <GraduationCap size={16} className="text-brand-blue" />
                <span>Get Started</span>
              </Link>
            )}
          </div>

        </div>

      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
