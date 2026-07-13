import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  reportErrorToAdmin?: (error: Error, context: string) => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.reportErrorToAdmin) {
      this.props.reportErrorToAdmin(error, `ErrorBoundary - ${errorInfo.componentStack}`);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-[#39FF14]/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-neutral-400 max-w-md">
              We're sorry for the inconvenience. The issue has been reported and our team will look into it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-[#39FF14] text-black font-bold text-sm hover:bg-[#39FF14]/90 transition-all cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
