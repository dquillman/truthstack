import React from 'react';
import { History, Clock, Trash2 } from 'lucide-react';

interface HistoryItem {
    id: string;
    claim: string;
    verdict: string;
    timestamp: number;
}

interface HistorySidebarProps {
    history: HistoryItem[];
    onSelect: (claim: string) => void;
    onClear: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) return null;

    return (
        <div className="mt-12 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={16} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Recent Analyses</h3>
                </div>
                <button
                    onClick={onClear}
                    className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                    title="Clear History"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.claim)}
                        className="group text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.verdict === 'TRUE' ? 'bg-emerald-500/20 text-emerald-400' :
                                    item.verdict === 'FALSE' ? 'bg-red-500/20 text-red-400' :
                                        'bg-slate-500/20 text-slate-400'
                                }`}>
                                {item.verdict}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                <Clock size={10} />
                                {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-1 group-hover:text-blue-100 transition-colors">
                            {item.claim}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};
