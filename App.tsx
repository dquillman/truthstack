import React, { useState, useEffect, useRef } from 'react';
import { Layers, ArrowRight, X, Sparkles, AlertTriangle } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';
import { analyzeClaim } from './services/gemini';
import { StackLayer } from './components/StackLayer';
import { SourceList } from './components/SourceList';
import { AnalysisResult, LayerType } from './types';
import AdminApp from './src/admin/AdminApp';

// ------------------------------------------------------------------
// Firebase Vertex AI Managed
// ------------------------------------------------------------------

const LOADING_MESSAGES = [
  "Scanning the global knowledge base...",
  "Cross-referencing credible sources...",
  "Identifying logical fallacies...",
  "Synthesizing the investigation...",
  "Formulating the final verdict..."
];

const Home: React.FC = () => {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      }, 2000); // Change message every 2s
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Update the loading layer title dynamically
  useEffect(() => {
    if (isAnalyzing && result) {
      setResult(prev => {
        if (!prev) return null;
        const newLayers = prev.layers.map(layer => {
          if (layer.isLoading) {
            return { ...layer, title: LOADING_MESSAGES[loadingMsgIndex] };
          }
          return layer;
        });
        return { ...prev, layers: newLayers };
      });
    }
  }, [loadingMsgIndex, isAnalyzing]);

  const performAnalysis = async (claimText: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setInput(claimText);

    // Initial temporary state
    setResult({
      layers: [
        {
          id: 'claim',
          type: LayerType.CLAIM,
          title: 'The Claim',
          content: claimText,
          isLoading: false
        },
        {
          id: 'loading-1',
          type: LayerType.INVESTIGATION,
          title: LOADING_MESSAGES[0],
          content: '',
          isLoading: true
        }
      ],
      sources: []
    });

    try {
      // Pass the pasted image (base64 string) if present
      const data = await analyzeClaim(claimText, pastedImage || undefined);
      setResult(data);
    } catch (err: any) {
      console.error("Error analyzing claim:", err);
      // Create an error layer to show the actual API message
      setResult({
        layers: [{
          id: 'error',
          type: LayerType.CLAIM, // Using claim type for simple text
          title: 'Analysis Failed',
          content: `Error details: ${err.message || JSON.stringify(err)}`,
          isLoading: false
        }],
        sources: [],
        suggestedQuestions: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Allow if either text or image is present
    if (!input.trim() && !pastedImage) return;

    // Use default prompt if text is empty but image exists
    const finalClaim = input.trim() || "Analyze the validity and bias of this image.";

    await performAnalysis(finalClaim);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAnalyze();
    }
  };

  // State for image input
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
          e.preventDefault(); // Prevent pasting the binary code as text
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
    <div className="min-h-screen relative text-slate-100 pb-32 selection:bg-blue-500/30">

      {/* Background Image & Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2072&auto=format&fit=crop')` // Dark starry/cloudy sky
        }}
      ></div>
      <div className="fixed inset-0 z-0 bg-slate-950/70 backdrop-blur-[2px]"></div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-950/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={clearStack}>
            <div className="bg-white/10 text-blue-300 p-1.5 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Layers size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-200 transition-colors">TruthStack</span>
            <span className="text-[10px] font-mono text-slate-500 border border-slate-700/50 px-1.5 py-0.5 rounded opacity-60 ml-1">v{__APP_VERSION__}</span>
          </div>

          <div className="flex items-center gap-4">
            {result && (
              <button
                onClick={clearStack}
                className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                New Analysis <X size={14} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-4 mt-12">
        {/* Input Section - Only show if no result yet */}
        {!result && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] transition-all duration-500">
            <div className="text-center mb-6 md:mb-10 max-w-lg px-4">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 md:mb-4 tracking-tight drop-shadow-sm">
                Verify reality. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Stack the truth.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-300 font-light leading-relaxed">
                Enter any claim, rumor, or question. We'll decompose it into evidence, skepticism, and a final verdict using AI & live search.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="w-full max-w-2xl relative group">
              <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* Image Preview */}
              {pastedImage && (
                <div className="absolute top-4 left-4 z-20 w-16 h-16 bg-slate-900 border border-blue-500/30 rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in duration-200 group-hover:border-blue-500/60">
                  <img src={pastedImage} alt="Pasted" className="w-full h-full object-cover opacity-90" />
                  <button
                    type="button"
                    onClick={() => setPastedImage(null)}
                    className="absolute top-0 right-0 bg-black/60 text-white p-0.5 hover:bg-red-500/80 transition-colors"
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
                placeholder="e.g., 'Drinking 8 glasses of water a day is essential...'"
                className={`w-full ${pastedImage ? 'pl-24' : 'pl-6'} pr-14 py-5 text-lg rounded-2xl bg-white/10 border border-white/10 shadow-2xl backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all placeholder:text-slate-400`}
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !pastedImage) || isAnalyzing}
                className="absolute right-3 top-3 bottom-3 aspect-square bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25"
                title="Analyze (Ctrl + Enter)"
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </form>

            <div className="mt-8 flex gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Gemini 2.5 Flash</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Google Search</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Real-time Analysis</span>
            </div>
          </div>
        )}

        {/* Results Section */}
        {error && (
          <div className="p-4 bg-red-950/40 text-red-200 border border-red-500/20 rounded-lg text-center mt-10 backdrop-blur-sm flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {result && (
          <div className="py-10">
            {/* The Stack */}
            <div className="flex flex-col">
              {result.layers.map((layer, idx) => (
                <StackLayer
                  key={layer.id}
                  data={layer}
                  index={idx}
                  total={result.layers.length}
                  originalQuery={input} // Pass the original user input
                />
              ))}
            </div>

            {/* Sources */}
            {!result.layers.some(l => l.isLoading) && (
              <div className="animate-[fadeIn_0.5s_ease-out_1s_forwards] opacity-0">
                <SourceList sources={result.sources} />
              </div>
            )}

            {/* Suggested Questions (The Rabbit Hole) */}
            {!result.layers.some(l => l.isLoading) && result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
              <div className="w-full max-w-3xl mx-auto mt-12 animate-[fadeIn_0.5s_ease-out_1.1s_forwards] opacity-0">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <Sparkles size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Dig Deeper</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {result.suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => performAnalysis(q)}
                      className="text-left text-sm bg-slate-800/50 hover:bg-slate-700 hover:text-blue-300 border border-slate-700/50 px-4 py-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer & Footer Info */}
            {!isAnalyzing && !result.layers.some(l => l.isLoading) && (
              <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-slate-800/50 animate-[fadeIn_0.5s_ease-out_1.2s_forwards] opacity-0 text-center">
                <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800 text-xs text-slate-500 leading-relaxed mb-6">
                  <strong>Disclaimer:</strong> This analysis is generated by AI (Gemini 2.5) and grounded in Google Search results. While it strives for accuracy, it may occasionally produce errors or hallucinations. Always verify critical information through primary sources.
                </div>
              </div>
            )}
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