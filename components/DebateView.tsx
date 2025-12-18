import React, { useState, useEffect, useRef } from 'react';
import { User, ShieldAlert, Volume2, StopCircle, Play } from 'lucide-react';
import { DebateTurn } from '../types';

interface DebateViewProps {
    turns: DebateTurn[];
}

export const DebateView: React.FC<DebateViewProps> = ({ turns }) => {
    const [visibleTurns, setVisibleTurns] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const vs = window.speechSynthesis.getVoices();
            console.log("Loaded voices:", vs.length);
            setVoices(vs);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Staggered reveal effect (Visual only)
    useEffect(() => {
        if (visibleTurns < turns.length && !isPlaying) {
            const timer = setTimeout(() => {
                setVisibleTurns(prev => prev + 1);
            }, 1000); // Faster initial reveal
            return () => clearTimeout(timer);
        } else if (isPlaying) {
            setVisibleTurns(turns.length);
        }
    }, [visibleTurns, turns.length, isPlaying]);

    // Clean up speech on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const stopAudio = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setSpeakingIndex(null);
    };

    const handlePlay = () => {
        // Cancel any current speech
        window.speechSynthesis.cancel();
        setIsPlaying(true);
        setSpeakingIndex(null);

        // Select voices
        // Prefer "Google US English" or explicit male/female if available
        // Fallback to first available en-US voice
        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        const defaultVoice = enVoices.find(v => v.default) || enVoices[0] || voices[0];

        // Try to find distinct voices
        const maleVoice = enVoices.find(v => v.name.toLowerCase().includes('male')) || defaultVoice;
        const femaleVoice = enVoices.find(v => v.name.toLowerCase().includes('female')) || enVoices.find(v => v !== maleVoice) || defaultVoice;

        console.log("Using voices:", { pro: maleVoice?.name, con: femaleVoice?.name });

        // Queue all turns at once (Mobile friendly)
        let hasStarted = false;

        turns.forEach((turn, index) => {
            const isPro = turn.speaker === 'Pro';
            const text = turn.text;

            const utterance = new SpeechSynthesisUtterance(text);

            // Assign Voice
            // Pro = Male/Default, Con = Female/Alt
            utterance.voice = isPro ? maleVoice : femaleVoice;

            // Pitch/Rate tweaks
            utterance.rate = 1.1;
            utterance.pitch = isPro ? 1.0 : 0.95; // Subtle difference

            // Events
            utterance.onstart = () => {
                console.log(`Starting turn ${index}`);
                setSpeakingIndex(index);
                // Ensure UI is synced if it drifted
                if (!hasStarted) {
                    hasStarted = true;
                    // setIsPlaying(true); // Already set
                }
            };

            utterance.onend = () => {
                console.log(`Ended turn ${index}`);
                if (index === turns.length - 1) {
                    setIsPlaying(false);
                    setSpeakingIndex(null);
                }
            };

            utterance.onerror = (e) => {
                console.error("Speech error", e);
                // If critical error, stop
                if (index === turns.length - 1) {
                    setIsPlaying(false);
                    setSpeakingIndex(null);
                }
            };

            window.speechSynthesis.speak(utterance);
        });
    };

    return (
        <div className="bg-slate-900/50 rounded-xl p-4 md:p-6 border border-slate-700 mt-6 space-y-4 max-h-[500px] md:max-h-[600px] overflow-y-auto custom-scrollbar relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live Debate Feed
                </h3>
                <button
                    onClick={isPlaying ? stopAudio : handlePlay}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isPlaying
                        ? 'bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                >
                    {isPlaying ? <StopCircle size={14} /> : <Play size={14} />}
                    {isPlaying ? 'Stop Audio' : '🔊 Listen to Debate'}
                </button>
            </div>

            {turns.slice(0, visibleTurns).map((turn, idx) => {
                const isPro = turn.speaker === 'Pro';
                const isActive = idx === speakingIndex;

                return (
                    <div
                        key={idx}
                        className={`flex gap-3 transition-opacity duration-300 ${isPro ? 'flex-row' : 'flex-row-reverse'} ${isPlaying && speakingIndex !== null && !isActive ? 'opacity-40' : 'opacity-100'
                            }`}
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isActive ? 'scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''
                            } ${isPro ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isPro ? <User size={14} /> : <ShieldAlert size={14} />}
                        </div>

                        {/* Bubble */}
                        <div className={`
              max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed transition-all duration-300
              ${isPro
                                ? 'bg-blue-500/10 text-blue-100 rounded-tl-none border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-100 rounded-tr-none border border-amber-500/20'
                            }
              ${isActive ? 'ring-2 ring-white/20 bg-opacity-30' : ''}
            `}>
                            <span className="block text-xs font-bold opacity-50 mb-1 flex items-center gap-1">
                                {isPro ? 'Advocate' : 'Skeptic'}
                                {isActive && <Volume2 size={10} className="animate-pulse" />}
                            </span>
                            {turn.text}
                        </div>
                    </div>
                );
            })}

            {visibleTurns < turns.length && !isPlaying && (
                <div className="text-center">
                    <span className="inline-block w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-0"></span>
                    <span className="inline-block w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-75 mx-1"></span>
                    <span className="inline-block w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-150"></span>
                </div>
            )}
        </div>
    );
};
