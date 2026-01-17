import React, { useState, useEffect, useRef } from 'react';
import { Layers, ArrowRight, X, Sparkles, AlertTriangle, Check, LogOut, User as UserIcon } from 'lucide-react';
import { Routes, Route, Link } from 'react-router-dom';
import { db, auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { analyzeClaim } from './services/gemini';
import { StackLayer } from './components/StackLayer';
import { SourceList } from './components/SourceList';
import { AnalysisResult, LayerType } from './types';
import { ExampleChips } from './components/ExampleChips';
import { LayeredResults } from './components/LayeredResults';
import { HistorySidebar } from './components/HistorySidebar';
import { ActivityTracker } from './components/ActivityTracker';
import AdminApp from './src/admin/AdminApp';

// ------------------------------------------------------------------
// Firebase Vertex AI Managed
// ------------------------------------------------------------------

const LOADING_MESSAGES = [
  "Searching sources...",
  "Crossing-referencing evidence...",
  "Applying critical filters...",
  "Identifying framing bias...",
  "Drafting final verdict..."
];

const WHAT_YOU_GET = [
  "Layered analysis from query to verdict",
  "Confidence scoring based on source quality",
  "Bias detection and framing breakdown"
];

const Home: React.FC = () => {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check for admin role
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        setIsAdmin(userDoc.exists() && userDoc.data()?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleLogout = () => {
    auth.signOut();
  };

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('truth_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (claim: string, verdict: string) => {
    const newItem = {
      id: Math.random().toString(36).substring(7),
      claim,
      verdict,
      timestamp: Date.now()
    };
    const updated = [newItem, ...history.filter(h => h.claim !== claim)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('truth_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('truth_history');
  };

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cycle loading messages
  useEffect(() => {
    let interval: number;
    if (isAnalyzing) {
      setLoadingMsgIndex(0);
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const performAnalysis = async (claimText: string) => {
    if (!claimText.trim()) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setInput(claimText);

    try {
      const data = await analyzeClaim(claimText, pastedImage || undefined);
      setResult(data);

      // Extract status from verdict content for history
      const verdictLayer = data.layers.find(l => l.type === LayerType.VERDICT);
      const status = verdictLayer?.content.split('\n')[0].replace(/\*\*/g, '') || "UNKNOWN";
      saveToHistory(claimText, status);

    } catch (err: any) {
      console.error("Error analyzing claim:", err);
      // Handle "missing API key" or failed request gracefully
      const isApiKeyMissing = err.message?.includes('API_KEY') || err.message?.includes('invalid key');
      setError(isApiKeyMissing
        ? "Google Gemini API key is missing or invalid. Please check your environment variables."
        : `Analysis failed: ${err.message || "Please check your connection and try again."}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !pastedImage) return;
    const finalClaim = input.trim() || "Analyze the validity and bias of this image.";
    await performAnalysis(finalClaim);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              setPastedImage(event.target.result);
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
        }
      }
    }
  };

  const clearStack = () => {
    setResult(null);
    setInput('');
    setPastedImage(null);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <ActivityTracker>
      <div className="min-h-screen relative text-slate-100 pb-32 selection:bg-blue-500/30 font-sans">

        {/* Background Layer */}
        <div className="fixed inset-0 z-0 bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-slate-950 to-slate-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-blue-500/5 blur-[120px] rounded-full"></div>
        </div>

        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-slate-950/40 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={clearStack}>
              <div className="bg-blue-600/20 text-blue-400 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <Layers size={20} />
              </div>
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-200 transition-colors">TruthStack</span>
              <span className="text-[10px] font-mono text-slate-500 border border-slate-700/50 px-1.5 py-0.5 rounded opacity-60 ml-1">v{__APP_VERSION__}</span>
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-xs font-semibold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Admin
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Authorized</span>
                    <span className="text-xs font-medium text-slate-300 max-w-[120px] truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors pl-4 border-l border-white/10"
                >
                  <UserIcon size={14} /> Sign In
                </button>
              )}

              {result && (
                <button
                  onClick={clearStack}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/5"
                >
                  Reset <X size={14} />
                </button>
              )}
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-4xl mx-auto px-4 mt-8">
          {/* Landing View */}
          {!result && !isAnalyzing && (
            <div className="flex flex-col items-center py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="text-center mb-12 max-w-2xl">
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
                  Layered Truth. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Clearer Reality.</span>
                </h1>
                <p className="text-lg text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                  Decompose any claim into evidence, bias, and a final verdict using multiple layers of verification.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="w-full max-w-2xl relative group mb-8">
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>

                {pastedImage && (
                  <div className="absolute top-4 left-4 z-20 w-16 h-16 bg-slate-900 border border-blue-500/40 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                    <img src={pastedImage} alt="Pasted" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPastedImage(null)}
                      className="absolute top-0 right-0 bg-black/60 text-white p-1 hover:bg-red-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="What claim would you like to verify?"
                  className={`w-full ${pastedImage ? 'pl-24' : 'pl-7'} pr-16 py-6 text-xl rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all placeholder:text-slate-500 font-medium`}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !pastedImage)}
                  className="absolute right-3 top-3 bottom-3 aspect-square bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-30 disabled:grayscale shadow-lg active:scale-95"
                >
                  <ArrowRight size={24} />
                </button>
              </form>

              <ExampleChips onSelect={performAnalysis} />

              <div className="mt-20 border-t border-white/5 pt-12 w-full max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {WHAT_YOU_GET.map((text, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Check size={16} strokeWidth={3} />
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-snug">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <HistorySidebar
                history={history}
                onSelect={performAnalysis}
                onClear={clearHistory}
              />
            </div>
          )}

          {/* Loading View */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                <Layers className="absolute inset-0 m-auto text-blue-400/50 animate-pulse" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{LOADING_MESSAGES[loadingMsgIndex]}</h2>
              <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">Cross-referencing Global Knowledge</p>
            </div>
          )}

          {/* Error View */}
          {error && (
            <div className="p-6 bg-red-950/20 text-red-100 border border-red-500/30 rounded-2xl mt-10 backdrop-blur-md flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg mb-1">Analysis Error</h3>
                <p className="text-red-200/70 text-sm max-w-md">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 rounded-xl text-sm font-bold transition-colors"
              >
                Back to Safety
              </button>
            </div>
          )}

          {/* Results View */}
          {result && !isAnalyzing && (
            <div className="py-8">
              <LayeredResults result={result} />

              {/* Suggested Questions */}
              {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
                <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
                  <div className="flex items-center gap-2 mb-4 text-slate-400 px-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Dig Deeper</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {result.suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => performAnalysis(q)}
                        className="text-left text-sm bg-white/5 hover:bg-white/10 border border-white/5 px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Disclaimer */}
              <div className="mt-20 pt-8 border-t border-white/5 text-center px-4 animate-in fade-in duration-1000">
                <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  <strong>TruthStack Alpha:</strong> Analyses are AI-generated (Gemini 2.0) and should be used as a guide. Always verify critical information through primary expert sources.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <footer className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-slate-600 text-xs font-medium inline-block bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800/50 backdrop-blur-sm">
            Created by <a href="https://qcode-9a2dc.web.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors underline decoration-slate-700 hover:decoration-blue-400 underline-offset-2">Code Q</a>
          </p>
        </footer>

        <style>{`
        @keyframes fadeIn {
            to { opacity: 1; }
        }
      `}</style>
      </div>
    </ActivityTracker>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminApp />} />
    </Routes>
  );
}

export default App;