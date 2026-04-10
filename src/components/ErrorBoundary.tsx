import React from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let isFirebaseError = false;
      let displayMessage = "Something went wrong. Please try again.";

      try {
        if (this.state.errorInfo) {
          const parsed = JSON.parse(this.state.errorInfo);
          if (parsed.operationType && parsed.error) {
            isFirebaseError = true;
            if (parsed.error.includes('permission-denied') || parsed.error.includes('insufficient permissions')) {
              displayMessage = "You don't have permission to perform this action. Please check if you are logged in correctly.";
            } else if (parsed.error.includes('offline')) {
              displayMessage = "You appear to be offline. Please check your internet connection.";
            } else if (parsed.error.includes('quota-exceeded')) {
              displayMessage = "Daily limit reached. Please try again tomorrow.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error string, use default
      }

      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-[#fff0f0] rounded-[32px] flex items-center justify-center mb-6 border-2 border-[#ff4b4b] shadow-[0_4px_0_#ff4b4b]">
            <AlertCircle className="w-10 h-10 text-[#ff4b4b]" />
          </div>
          
          <h1 className="text-2xl font-black text-[#4b4b4b] mb-2">Oops! Something happened</h1>
          <p className="text-[#afafaf] text-sm font-black uppercase tracking-widest mb-8 max-w-xs">
            {displayMessage}
          </p>

          <div className="w-full max-w-xs space-y-4">
            <button
              onClick={this.handleRetry}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Try Again
            </button>
            
            <button
              onClick={this.handleGoHome}
              className="w-full flex items-center justify-center gap-2 py-4 text-[#afafaf] font-black uppercase tracking-widest text-xs hover:text-[#4b4b4b] transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-12 p-4 bg-[#f7f7f7] rounded-2xl border-2 border-[#e5e5e5] text-left overflow-auto max-w-full">
              <p className="text-[10px] font-mono text-[#afafaf] break-all">
                {this.state.error?.stack}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
