import React from 'react';

const EXAMPLES = [
    "Does drinking coffee really stunt your growth?",
    "The Great Wall of China is the only man-made structure visible from space.",
    "Is 'Blue No. 1' food dye linked to ADHD in children?",
    "Nuclear energy is safer than solar power per terawatt-hour.",
    "Did the Viking missions to Mars actually find life in 1976?",
    "Are sharks immune to cancer?"
];

interface ExampleChipsProps {
    onSelect: (claim: string) => void;
}

export const ExampleChips: React.FC<ExampleChipsProps> = ({ onSelect }) => {
    return (
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl mx-auto px-4">
            {EXAMPLES.map((example, idx) => (
                <button
                    key={idx}
                    onClick={() => onSelect(example)}
                    className="px-4 py-2 text-xs md:text-sm bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-full text-slate-300 hover:text-blue-200 transition-all duration-200 shadow-sm"
                >
                    {example}
                </button>
            ))}
        </div>
    );
};
