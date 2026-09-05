import React, { useState } from 'react';
import { TimeSeriesPoint } from '../../application/analytics/types';

interface SimpleAreaChartProps {
  data: TimeSeriesPoint[];
  height?: number;
  valueFormatter?: (val: number) => string;
  emptyMessage?: string;
}

export const SimpleAreaChart: React.FC<SimpleAreaChartProps> = ({
  data,
  height = 200,
  valueFormatter = (v) => `$${(v / 100).toFixed(2)}`,
  emptyMessage = 'Sin datos de tendencias para el período',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TimeSeriesPoint | null>(null);

  if (!data || data.length === 0 || data.every((d) => d.sales === 0)) {
    return (
      <div
        className="flex items-center justify-center text-content4 text-sm rounded-xl border border-dashed border-divider p-6 w-full"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const width = 600;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingX = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.sales), 100);

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.sales / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="w-full relative flex flex-col items-center">
      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[300px] overflow-visible"
          style={{ height }}
          role="img"
          aria-label="Gráfico de tendencia de ventas"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            className="stroke-divider"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + chartHeight / 2}
            className="stroke-divider"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight}
            x2={width - paddingX}
            y2={paddingTop + chartHeight}
            className="stroke-divider"
            strokeWidth="1"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Dots */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint?.date === p.data.date;
            return (
              <g
                key={p.data.date + i}
                onMouseEnter={() => setHoveredPoint(p.data)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {/* Hit target */}
                <circle x={p.x} y={p.y} cx={p.x} cy={p.y} r="12" className="fill-transparent" />
                {/* Visible dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  className={`transition-all ${
                    isHovered
                      ? 'fill-primary stroke-background stroke-2'
                      : 'fill-background stroke-primary stroke-2'
                  }`}
                />
                {/* X labels for subset of points if dense */}
                {(data.length <= 10 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
                  <text
                    x={p.x}
                    y={paddingTop + chartHeight + 18}
                    textAnchor="middle"
                    className="text-[10px] fill-content4 select-none"
                  >
                    {p.data.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Card */}
      {hoveredPoint && (
        <div className="absolute top-1 right-2 bg-content1 border border-border-default shadow-md px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-10 pointer-events-none animate-fadeIn">
          <span className="font-semibold text-foreground">{hoveredPoint.label}:</span>
          <span className="text-primary font-bold">{valueFormatter(hoveredPoint.sales)}</span>
          <span className="text-content4">({hoveredPoint.ticketCount} tickets)</span>
        </div>
      )}
    </div>
  );
};
