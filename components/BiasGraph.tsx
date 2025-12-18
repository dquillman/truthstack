import React from 'react';
import { BiasData } from '../types';

interface BiasGraphProps {
  data: BiasData;
}

export const BiasGraph: React.FC<BiasGraphProps> = ({ data }) => {
  // Config
  const size = 300;
  const center = size / 2;
  const radius = 100; // Radius of the chart area
  const axes = [
    { label: 'Political', value: data.politicalScore, angle: 0 },         // Top
    { label: 'Scientific', value: data.scientificDeviation, angle: 90 }, // Right
    { label: 'Emotional', value: data.emotionalCharge, angle: 180 },     // Bottom
    { label: 'Commercial', value: data.commercialInterest, angle: 270 }, // Left
  ];

  // Helper to get coordinates
  const getCoords = (value: number, angleDeg: number) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180); // Subtract 90 to start at top
    // Scale value (0-100) to radius
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angleRad),
      y: center + r * Math.sin(angleRad),
    };
  };

  // Generate Polygon Points for the data
  const points = axes.map(axis => {
    const { x, y } = getCoords(axis.value, axis.angle);
    return `${x},${y}`;
  }).join(' ');

  // Generate Background Grid (Concentric Octagons/Circles)
  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700 p-3 md:p-6 mt-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse ring-2 ring-indigo-500/20" />
        Source Bias Radar
      </h4>

      <div className="relative z-10 w-full max-w-[300px] aspect-square">
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Background Grid */}
          {gridLevels.map((level, i) => {
            const levelPoints = axes.map(axis => {
              const { x, y } = getCoords(level, axis.angle);
              return `${x},${y}`;
            }).join(' ');
            return (
              <polygon
                key={i}
                points={levelPoints}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Axes Lines */}
          {axes.map((axis, i) => {
            const start = getCoords(0, axis.angle);
            const end = getCoords(100, axis.angle);
            return (
              <line
                key={i}
                x1={start.x} y1={start.y}
                x2={end.x} y2={end.y}
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <polygon
            points={points}
            fill="rgba(99, 102, 241, 0.2)"
            stroke="#6366f1"
            strokeWidth="3"
            className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
          />

          {/* Data Points */}
          {axes.map((axis, i) => {
            const { x, y } = getCoords(axis.value, axis.angle);
            return (
              <circle
                key={i}
                cx={x} cy={y}
                r="4"
                fill="#818cf8"
                stroke="#1e293b"
                strokeWidth="2"
              />
            );
          })}

          {/* Labels */}
          {axes.map((axis, i) => {
            // Push labels out a bit
            const { x, y } = getCoords(120, axis.angle);
            return (
              <text
                key={i}
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize="11"
                fontWeight="600"
                fontFamily="monospace"
              >
                {axis.label}
              </text>
            );
          })}
        </svg>

        {/* Overlay Value Tooltips (Static for now) */}
        {axes.map((axis, i) => {
          const { x, y } = getCoords(axis.value, axis.angle);
          // Simple interaction could be added here
          return null;
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
        {axes.map((axis, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{axis.label}</span>
            <span className={`font-mono font-bold ${axis.value > 50 ? 'text-indigo-400' : 'text-slate-400'}`}>
              {axis.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};