import React, { useState } from 'react';
import { LayerType, StackLayerData, DebateTurn } from '../types.ts';
import { ShieldAlert, ScanSearch, Gavel, Loader2, Quote, Copy, Check, Lightbulb, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShareableCard } from './ShareableCard.tsx';
import { BiasGraph } from './BiasGraph.tsx';
import { DebateView } from './DebateView.tsx';
import { startDebate } from '../services/gemini.ts';


interface StackLayerProps {
  data: StackLayerData;
  index: number;
  total: number;
  originalQuery?: string;
}

export const StackLayer: React.FC<StackLayerProps> = ({ data, index, total, originalQuery }) => {
  const [copied, setCopied] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [debateTurns, setDebateTurns] = useState<DebateTurn[] | null>(null);

  const handleStartDebate = async () => {
    setIsDebating(true);
    try {
      const turns = await startDebate(originalQuery || data.title);
      setDebateTurns(turns);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDebating(false);
    }
  };

  const config = {
    [LayerType.CLAIM]: {
      icon: <ShieldAlert className="w-6 h-6 text-slate-200" />,
      bg: 'bg-slate-800/40 backdrop-blur-md',
      border: 'border-slate-700/50',
      text: 'text-slate-100',
      accent: 'bg-slate-600',
      spine: 'border-slate-600 bg-slate-800'
    },
    [LayerType.INVESTIGATION]: {
      icon: <ScanSearch className="w-6 h-6 text-blue-300" />,
      bg: 'bg-blue-950/30 backdrop-blur-md',
      border: 'border-blue-800/30',
      text: 'text-slate-200',
      accent: 'bg-blue-600',
      spine: 'border-blue-700 bg-blue-900'
    },
    [LayerType.VERDICT]: {
      icon: <Gavel className="w-6 h-6 text-emerald-300" />,
      bg: 'bg-emerald-950/40 backdrop-blur-md',
      border: 'border-emerald-800/50',
      text: 'text-slate-100',
      accent: 'bg-emerald-600',
      spine: 'border-emerald-700 bg-emerald-900'
    },
    [LayerType.REASONING]: {
      icon: <Lightbulb className="w-6 h-6 text-amber-300" />,
      bg: 'bg-amber-950/30 backdrop-blur-md',
      border: 'border-amber-800/30',
      text: 'text-slate-200',
      accent: 'bg-amber-600',
      spine: 'border-amber-700 bg-amber-900'
    },
  };

  console.log('[StackLayer] Rendering:', data.type, data.title); // DEBUG LOG

  const style = config[data.type] || config[LayerType.CLAIM]; // Fallback to avoid crash
  const isLast = index === total - 1;

  const animStyle = {
    animation: `slideUp 0.5s ease-out ${index * 0.15}s forwards`,
    opacity: 0,
    transform: 'translateY(20px)',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${data.title.toUpperCase()}: ${data.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative flex gap-6 w-full max-w-2xl mx-auto"
      style={animStyle}
    >
      {/* Timeline spine (Hidden on very small screens, shown on sm+) */}
      <div className="hidden sm:flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 shadow-lg ${style.spine}`}>
          {data.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : style.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-grow bg-slate-700/50 my-1"></div>
        )}
      </div>

      {/* Content Card */}
      <div className={`flex-1 mb-8 rounded-xl border p-4 md:p-6 shadow-lg relative group ${style.bg} ${style.border}`}>
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white ${style.accent}`}>
              Level {index + 1}
            </span>
            <h3 className="font-bold text-slate-200 uppercase text-sm tracking-wide opacity-90">
              {data.title}
            </h3>
          </div>

          {/* Copy Button for Verdict */}
          {data.type === LayerType.VERDICT && !data.isLoading && (
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-emerald-300 transition-colors"
              title="Copy Verdict"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
        </div>

        <div className={`prose prose-sm prose-invert max-w-none ${style.text}`}>
          {data.isLoading ? (
            <div className="space-y-3 animate-pulse py-2">
              <div className="h-2 bg-white/10 rounded w-3/4"></div>
              <div className="h-2 bg-white/10 rounded w-full"></div>
              <div className="h-2 bg-white/10 rounded w-5/6"></div>
            </div>
          ) : (
            <>
              {/* Standard Markdown Rendering (Not for Reasoning) */}
              {data.type !== LayerType.REASONING && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Headers
                    h1: ({ node, ...props }) => <h3 className="text-xl font-bold text-white mt-6 mb-3 flex items-center gap-2" {...props} />,
                    h2: ({ node, ...props }) => <h4 className="text-lg font-bold text-blue-200 mt-5 mb-2 border-b border-blue-500/20 pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h5 className="text-base font-semibold text-blue-100 mt-4 mb-2" {...props} />,

                    // Bold
                    strong: ({ node, ...props }) => <span className="font-bold text-blue-200" {...props} />,

                    // Lists
                    ul: ({ node, ...props }) => <ul className="space-y-2 my-4 pl-0 list-none" {...props} />,
                    li: ({ node, ...props }) => (
                      <li className="relative pl-6 text-slate-300 leading-relaxed">
                        <span className="absolute left-1.5 top-2 w-1.5 h-1.5 bg-blue-400/60 rounded-full"></span>
                        {props.children}
                      </li>
                    ),

                    // Quotes
                    blockquote: ({ node, ...props }) => (
                      <div className="flex gap-3 my-5 p-4 bg-slate-900/40 rounded-lg border-l-4 border-blue-500/40">
                        <Quote className="w-5 h-5 text-blue-400/50 flex-shrink-0 mt-0.5" />
                        <div className="text-slate-300 italic">{props.children}</div>
                      </div>
                    ),

                    // Links
                    a: ({ node, ...props }) => <a className="text-blue-300 hover:text-blue-200 underline decoration-blue-500/30 underline-offset-2 transition-colors" {...props} />,

                    // TABLES
                    table: ({ node, ...props }) => (
                      <div className="my-6 overflow-x-auto rounded-lg border border-slate-700/50 bg-slate-900/40 shadow-sm">
                        <table className="min-w-full text-left text-sm whitespace-nowrap" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-slate-800/80 text-slate-200 uppercase tracking-wider font-semibold" {...props} />,
                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-700/50" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-slate-800/30 transition-colors" {...props} />,
                    th: ({ node, ...props }) => <th className="px-6 py-4 font-bold text-blue-100" {...props} />,
                    td: ({ node, ...props }) => <td className="px-6 py-4 text-slate-300" {...props} />,
                  }}
                >
                  {data.content}
                </ReactMarkdown>
              )}

              {/* Investigation Layer with Bias Radar */}
              {data.type === LayerType.INVESTIGATION && data.biasData && (
                <BiasGraph data={data.biasData} />
              )}

              {/* Live Debate Section */}
              {data.type === LayerType.INVESTIGATION && (
                <div className="mt-8 border-t border-slate-800 pt-6">
                  {!debateTurns && !isDebating && (
                    <button
                      onClick={handleStartDebate}
                      className="flex items-center gap-2 text-sm font-medium bg-indigo-600/20 text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-600/30 transition-colors border border-indigo-500/30 w-full justify-center"
                    >
                      <MessageSquare size={16} />
                      Start AI Live Debate
                      <span className="text-xs opacity-60 ml-1">(Experimental)</span>
                    </button>
                  )}

                  {isDebating && (
                    <div className="flex items-center justify-center gap-3 text-sm text-indigo-300 py-4">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                      Connecting Pro & Con personas...
                    </div>
                  )}

                  {debateTurns && <DebateView turns={debateTurns} />}
                </div>
              )}

              {/* Level 4: The Why (Infographic Mode) */}
              {data.type === LayerType.REASONING && (
                <ShareableCard layer={data} originalQuery={originalQuery} />
              )}
            </>
          )}


        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};