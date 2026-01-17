import React, { useState } from 'react';
import { AnalysisResult, LayerType } from '../types';
import { StackLayer } from './StackLayer';
import { ChevronDown, ChevronUp, ShieldCheck, Search, FileText, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { SourceList } from './SourceList';
import ReactMarkdown from 'react-markdown';

interface LayeredResultsProps {
    result: AnalysisResult;
}

export const LayeredResults: React.FC<LayeredResultsProps> = ({ result }) => {
    const [openLayer, setOpenLayer] = useState<string | null>('layer-verdict');
    const [copied, setCopied] = useState(false);

    const toggleLayer = (id: string) => {
        setOpenLayer(openLayer === id ? null : id);
    };

    const copyCitations = () => {
        const text = result.sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.uri}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Verdict Layer (Primary Information) */}
            <div className={`overflow-hidden border rounded-2xl bg-slate-900/50 backdrop-blur-md transition-all ${openLayer === 'layer-verdict' ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/10'}`}>
                <button
                    onClick={() => toggleLayer('layer-verdict')}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">The Verdict</h3>
                            <p className="text-sm text-slate-400">Final determination and confidence</p>
                        </div>
                    </div>
                    {openLayer === 'layer-verdict' ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                </button>

                {openLayer === 'layer-verdict' && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-black tracking-tight text-white uppercase italic">
                                        {result.layers.find(l => l.type === LayerType.VERDICT)?.content.split('\n')[0].replace(/\*\*/g, '')}
                                    </div>
                                    <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${result.confidenceScore && result.confidenceScore > 0.7 ? 'bg-emerald-500' : result.confidenceScore && result.confidenceScore > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${(result.confidenceScore || 0) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">{Math.round((result.confidenceScore || 0) * 100)}% Confidence</span>
                                </div>
                            </div>
                            <div className="text-slate-200 leading-relaxed prose prose-invert max-w-none">
                                <ReactMarkdown>
                                    {result.layers.find(l => l.type === LayerType.VERDICT)?.content.split('\n').slice(1).join('\n').trim() || ""}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {result.keyReasons && result.keyReasons.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Key Reasons</h4>
                                <ul className="space-y-2">
                                    {result.keyReasons.map((reason, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-300">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.whatWouldChange && (
                            <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-2 text-amber-400">
                                    <AlertCircle size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">What would change this?</span>
                                </div>
                                <p className="text-sm text-amber-100/80 leading-relaxed italic">{result.whatWouldChange}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Investigation Layer */}
            <div className={`overflow-hidden border rounded-2xl bg-slate-900/50 backdrop-blur-md transition-all ${openLayer === 'layer-investigation' ? 'border-indigo-500/50' : 'border-white/10'}`}>
                <button
                    onClick={() => toggleLayer('layer-investigation')}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                            <Search size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Investigation</h3>
                            <p className="text-sm text-slate-400">Deep dive, evidence, and bias analysis</p>
                        </div>
                    </div>
                    {openLayer === 'layer-investigation' ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                </button>

                {openLayer === 'layer-investigation' && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                        <StackLayer
                            data={result.layers.find(l => l.type === LayerType.INVESTIGATION)!}
                            index={1}
                            total={3}
                            originalQuery=""
                        />
                    </div>
                )}
            </div>

            {/* Claim & Assumptions Layer */}
            <div className={`overflow-hidden border rounded-2xl bg-slate-900/50 backdrop-blur-md transition-all ${openLayer === 'layer-claim' ? 'border-slate-500/50' : 'border-white/10'}`}>
                <button
                    onClick={() => toggleLayer('layer-claim')}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-600/20 text-slate-400 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">The Claim</h3>
                            <p className="text-sm text-slate-400">Normalized query and key assumptions</p>
                        </div>
                    </div>
                    {openLayer === 'layer-claim' ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                </button>

                {openLayer === 'layer-claim' && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 prose prose-invert max-w-none">
                            <ReactMarkdown>
                                {result.layers.find(l => l.type === LayerType.CLAIM)?.content || ""}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* Citations & Sources Layer */}
            <div className={`overflow-hidden border rounded-2xl bg-slate-900/50 backdrop-blur-md transition-all ${openLayer === 'layer-sources' ? 'border-emerald-500/50' : 'border-white/10'}`}>
                <button
                    onClick={() => toggleLayer('layer-sources')}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                            <ExternalLink size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Citations</h3>
                            <p className="text-sm text-slate-400">{result.sources.length} verified sources tracked</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); copyCitations(); }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Copy citations"
                        >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                        {openLayer === 'layer-sources' ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                    </div>
                </button>

                {openLayer === 'layer-sources' && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                        <SourceList sources={result.sources} />
                    </div>
                )}
            </div>
        </div>
    );
};
