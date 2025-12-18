import React from 'react';
import { Source } from '../types.ts';
import { Link2, ExternalLink } from 'lucide-react';

interface SourceListProps {
    sources: Source[];
}

export const SourceList: React.FC<SourceListProps> = ({ sources }) => {
    if (sources.length === 0) return null;

    return (
        <>
            <div className="mt-6 w-full max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Link2 size={16} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Source Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sources.map((source, idx) => {
                        let hostname = 'External Source';
                        try {
                            if (source.uri) {
                                hostname = new URL(source.uri).hostname.replace(/^www\./, '');
                            }
                        } catch (e) {
                            // Fallback if invalid URL
                        }

                        return (
                            <a
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-400/50 hover:shadow-md transition-all group backdrop-blur-sm"
                            >
                                <div className="flex flex-col gap-1 overflow-hidden pr-2 w-full">
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="text-sm text-slate-300 font-medium truncate group-hover:text-white transition-colors flex-1">{source.title}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 truncate">{hostname}</span>
                                </div>
                                <ExternalLink size={14} className="text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors mt-0.5" />
                            </a>
                        );
                    })}
                </div>
            </div>
        </>
    );
};