import React, { useState } from 'react';

export interface BarChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  tooltipText?: string;
}

interface SimpleBarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  valueFormatter?: (val: number) => string;
  barColor?: string;
  emptyMessage?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 180,
  valueFormatter = (v) => v.toLocaleString(),
  barColor = 'currentColor',
  emptyMessage = 'Sin datos para el período seleccionado',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div
        className="flex items-center justify-center text-content4 text-sm rounded-xl border border-dashed border-divider p-6 w-full"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 40; // reserve space for bottom labels
  const barWidth = Math.max(12, Math.min(36, Math.floor(600 / (data.length * 1.5))));

  return (
    <div className="w-full relative flex flex-col items-center">
      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${data.length * (barWidth + 14) + 20} ${height}`}
          className="w-full min-w-[280px] overflow-visible"
          style={{ height }}
          role="img"
          aria-label="Gráfico de barras de ventas"
        >
          {/* Baseline */}
          <line
            x1="0"
            y1={chartHeight}
            x2={data.length * (barWidth + 14) + 20}
            y2={chartHeight}
            className="stroke-divider"
            strokeWidth="1"
          />

          {data.map((point, index) => {
            const barHeight = Math.max(3, (point.value / maxValue) * (chartHeight - 20));
            const x = index * (barWidth + 14) + 14;
            const y = chartHeight - barHeight;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={point.label + index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Background hover pillar */}
                <rect
                  x={x - 4}
                  y={0}
                  width={barWidth + 8}
                  height={chartHeight}
                  className={`fill-content4/5 rounded-t transition-colors ${
                    isHovered ? 'fill-content4/15' : ''
                  }`}
                />

                {/* Primary Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  className={`transition-all duration-200 ${
                    isHovered ? 'fill-primary opacity-100' : 'fill-primary/80 opacity-90'
                  }`}
                  style={{ fill: barColor !== 'currentColor' ? barColor : undefined }}
                />

                {/* X-Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className={`text-[11px] fill-content4 select-none ${
                    isHovered ? 'fill-foreground font-semibold' : ''
                  }`}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Tooltip info bar */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="absolute top-1 right-2 bg-content1 border border-border-default shadow-md px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-10 pointer-events-none animate-fadeIn">
          <span className="font-semibold text-foreground">{data[hoveredIndex].label}:</span>
          <span className="text-primary font-bold">{valueFormatter(data[hoveredIndex].value)}</span>
          {data[hoveredIndex].tooltipText && (
            <span className="text-content4">({data[hoveredIndex].tooltipText})</span>
          )}
        </div>
      )}
    </div>
  );
};
