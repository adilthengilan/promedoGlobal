import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    if (
      name === 'aborterror' ||
      msg.includes('signal is aborted') ||
      msg.includes('aborterror') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror')
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = (error?.message || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    if (
      name === 'aborterror' ||
      msg.includes('signal is aborted') ||
      msg.includes('aborterror') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror')
    ) {
      console.warn('Suppressed transient network error in ErrorBoundary:', error.message);
      return;
    }
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      
      try {
        // Check if the error is a FirestoreErrorInfo JSON string
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Database Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path || 'unknown path'}.`;
          
          if (parsedError.error.includes('Missing or insufficient permissions')) {
            errorMessage = "You don't have permission to perform this action. Please make sure you are logged in with the correct account.";
          }
        }
      } catch (e) {
        // Not a JSON error, use the original message if available
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-3xl mb-4">Something went wrong</h2>
            <p className="text-gray-500 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full btn-primary py-4 justify-center"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
