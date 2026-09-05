import React from 'react';

export interface DistributionSegment {
  key: string;
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface DistributionBarProps {
  segments: DistributionSegment[];
  valueFormatter?: (val: number) => string;
}

const DEFAULT_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#94a3b8', // Slate
];

export const DistributionBar: React.FC<DistributionBarProps> = ({
  segments,
  valueFormatter = (v) => `$${(v / 100).toFixed(2)}`,
}) => {
  if (!segments || segments.length === 0) {
    return <div className="text-xs text-content4 italic">Sin desglose disponible</div>;
  }

  return (
    <div className="w-full space-y-3">
      {/* Segmented bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-content4/10 gap-0.5">
        {segments.map((seg, i) => {
          if (seg.percentage <= 0) return null;
          const bg = seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <div
              key={seg.key}
              style={{ width: `${seg.percentage}%`, backgroundColor: bg }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 relative group"
              title={`${seg.label}: ${seg.percentage}% (${valueFormatter(seg.value)})`}
            />
          );
        })}
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {segments.map((seg, i) => {
          const bg = seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <div key={seg.key} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-content4/5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bg }} />
                <span className="font-medium text-foreground truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-content3">{valueFormatter(seg.value)}</span>
                <span className="font-bold text-foreground text-[11px]">{seg.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
