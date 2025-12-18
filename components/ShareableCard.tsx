import React, { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { StackLayerData } from '../types';
import { generateShareableImage } from './canvasGenerator';

interface ShareableCardProps {
    layer: StackLayerData;
    originalQuery?: string;
}

export const ShareableCard: React.FC<ShareableCardProps> = ({ layer, originalQuery }) => {
    const [isCopying, setIsCopying] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Verdict Logic for Display (React Render matches Canvas logic visually)
    const titleLower = layer.title.toLowerCase();
    let themeColor = '#3b82f6'; // Blue default
    let verdictText = "VERIFIED";
    let bgImage = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop";

    if (titleLower.includes('false') || titleLower.includes('debunk') || titleLower.includes('fake')) {
        themeColor = '#ef4444'; // Red
        verdictText = "DEBUNKED";
        bgImage = "https://images.unsplash.com/photo-1590059390240-7815dcecce89?q=80&w=2070&auto=format&fit=crop";
    } else if (titleLower.includes('true') || titleLower.includes('accurate')) {
        themeColor = '#22c55e'; // Green
        verdictText = "CONFIRMED";
    } else if (titleLower.includes('investig')) {
        themeColor = '#f59e0b'; // Amber
        verdictText = "INSIGHT";
    }

    const handleCopyImage = async () => {
        setIsCopying(true);
        try {
            // Use the Robust Manual Canvas Generator
            const blob = await generateShareableImage(layer, originalQuery);

            if (!blob) throw new Error("Canvas generation failed");

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);

        } catch (err) {
            console.error('Image generation failed:', err);
            alert('Failed to generate image. Please try again.');
        } finally {
            setIsCopying(false);
        }
    };

    const points = layer.content.split(/<\/?point>/).filter(p => p.trim().length > 0).slice(0, 3);

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto my-8">

            {/* 
          PREVIEW CARD (React HTML)
          This looks identical to what the Canvas generates, but is just for display.
      */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '600px',
                    aspectRatio: '16/9',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    fontFamily: "'Inter', sans-serif",
                    background: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url('${bgImage}')`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    opacity: 0.4, filter: 'grayscale(50%) contrast(120%)'
                }} />

                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(135deg, ${themeColor}cc 0%, #000000dd 60%, #000000 100%)`,
                    opacity: 0.9
                }} />

                <div style={{ position: 'relative', zIndex: 10, padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${themeColor}44`, paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: themeColor, padding: '4px', borderRadius: '4px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                            </div>
                            <span style={{ color: '#fff', fontWeight: '800', fontSize: '12px', letterSpacing: '0.1em' }}>TRUTH STACK</span>
                        </div>
                        <div style={{ color: '#ffffff88', fontSize: '10px', fontFamily: 'monospace' }}>AI FORENSIC ANALYSIS</div>
                    </div>

                    {/* Stamp */}
                    <div style={{
                        position: 'absolute', top: '60px', right: '20px',
                        border: `4px solid ${themeColor}`, color: '#fff',
                        padding: '4px 16px', fontSize: '28px', fontWeight: '900',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        transform: 'rotate(-5deg)', boxShadow: `0 4px 20px ${themeColor}66`,
                        textShadow: `0 2px 4px ${themeColor}`
                    }}>
                        {verdictText}
                    </div>

                    {/* Claim */}
                    <div style={{ marginTop: '20px', maxWidth: '80%' }}>
                        <span style={{ display: 'inline-block', background: `${themeColor}22`, color: themeColor, border: `1px solid ${themeColor}44`, fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', marginBottom: '8px', borderRadius: '4px' }}>
                            CLAIM INVESTIGATION
                        </span>
                        <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '500', lineHeight: '1.4', fontStyle: 'italic', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            "{originalQuery || layer.title.replace(/^Result:\s*/i, '').replace(/^The claim:\s*/i, '')}"
                        </h2>
                    </div>
                    {/* Evidence */}
                    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                        {points.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                                <span style={{ color: themeColor, fontWeight: 'bold', fontSize: '14px' }}>›</span>
                                <p style={{ color: '#e0e0e0', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{p.replace(/^\d+\.\s*/, '').trim()}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '12px' }}>
                        <span style={{ fontSize: '10px', color: '#ffffff44' }}>truth-stack-dave-2025.web.app</span>
                    </div>
                </div>
            </div>

            {/* Button */}
            <div className="mt-8 flex gap-4">
                <button
                    onClick={handleCopyImage}
                    disabled={isCopying}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-xl active:scale-95 ${copySuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white text-slate-900 hover:bg-slate-200 shadow-white/10'}`}
                >
                    {isCopying ? <RefreshCw className="w-4 h-4 animate-spin" /> : copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopying ? 'Generating...' : copySuccess ? 'Copied!' : 'Copy Graphic'}
                </button>
            </div>

        </div>
    );
};
