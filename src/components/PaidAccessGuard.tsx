import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumUpgradeScreen from './PremiumUpgradeScreen';
import { ShimmerPageDetail } from './ShimmerLoader';

export type ProtectedModule = 'Courses' | 'Mock Tests' | 'Practice' | 'Question Bank';

interface PaidAccessGuardProps {
  moduleName: ProtectedModule;
  children: React.ReactNode;
}

export function usePaidAccess() {
  const { user, isAdmin, isPaid, paymentStatus, accessStatus, loading } = useAuth();
  const hasAccess = isAdmin || isPaid;
  return {
    user,
    isAdmin,
    isPaid,
    hasAccess,
    paymentStatus,
    accessStatus,
    loading
  };
}

export const PaidAccessGuard: React.FC<PaidAccessGuardProps> = ({ moduleName, children }) => {
  const { user, loading, isAdmin, isPaid } = useAuth();
  const location = useLocation();

  if (loading) {
    return <ShimmerPageDetail title="Checking premium access..." />;
  }

  // Not logged in -> redirect to login with state
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname, message: `Please log in to access ${moduleName}.` }} replace />;
  }

  // Admin always has full access, paid students have full access
  if (isAdmin || isPaid) {
    return <>{children}</>;
  }

  // Unpaid student -> display Always Make It Pro upgrade screen
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
      <PremiumUpgradeScreen moduleName={moduleName} />
    </div>
  );
};

export default PaidAccessGuard;
