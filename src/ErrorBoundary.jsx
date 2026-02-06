import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can log error to monitoring service here
    // console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Une erreur est survenue</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">L'application a rencontré un problème. Vous pouvez rafraîchir la page ou réessayer l'action.</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-xl"
                onClick={() => window.location.reload()}
              >
                Rafraîchir
              </button>
            </div>
            <pre className="text-xs text-left mt-6 text-red-500 break-words">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
