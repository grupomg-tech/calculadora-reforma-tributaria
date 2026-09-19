import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, useEffect } from "react";
import type { ReactNode } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ROUTER_BASENAME } from "@/lib/config";
import { applyDocumentLocale, messagesFor, resolveLocale } from "@/i18n";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      const t = messagesFor(resolveLocale());
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center space-y-4">
            <h2 className="text-xl font-bold text-red-600">{t.errors.appTitle}</h2>
            <p className="text-muted-foreground">{this.state.error}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              className="px-4 py-2 bg-[#4e6ae9] text-white rounded-md hover:bg-[#3d59d8]"
            >
              {t.errors.reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const UnhandledRejectionHandler = () => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return null;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const DocumentLocale = () => {
  useEffect(() => { applyDocumentLocale(); }, []);
  return null;
};

const App = () => (
  <ErrorBoundary>
    <DocumentLocale />
    <UnhandledRejectionHandler />
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppRoutes />
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
