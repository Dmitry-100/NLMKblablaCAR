import React, { useMemo, useRef, useState } from 'react';

interface WeekdayPoint {
  day: string;
  count: number;
}

interface WeekdaySvgChartProps {
  data: WeekdayPoint[];
}

interface TooltipState {
  x: number;
  y: number;
  day: string;
  count: number;
  percent: number;
}

export function WeekdaySvgChart({ data }: WeekdaySvgChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const chart = useMemo(() => {
    const width = 620;
    const height = 300;
    const margin = { top: 20, right: 18, bottom: 44, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(1, ...data.map(item => item.count));
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const ticks = Array.from({ length: 5 }, (_, idx) => Math.round((maxValue / 4) * idx)).reverse();

    return { width, height, margin, innerWidth, innerHeight, maxValue, total, ticks };
  }, [data]);

  const step = chart.innerWidth / data.length;
  const barWidth = Math.min(52, step * 0.62);

  const showTooltip = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    item: WeekdayPoint
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const point = 'touches' in event ? event.touches[0] : event;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const percent = chart.total > 0 ? Math.round((item.count / chart.total) * 100) : 0;
    setTooltip({
      x: Math.max(12, Math.min(rect.width - 160, x + 10)),
      y: Math.max(8, y - 52),
      day: item.day,
      count: item.count,
      percent,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full">
        <rect
          x={chart.margin.left}
          y={chart.margin.top}
          width={chart.innerWidth}
          height={chart.innerHeight}
          fill="transparent"
          stroke="var(--app-border)"
          strokeWidth="1"
          rx="8"
        />

        {chart.ticks.map(tick => {
          const y =
            chart.margin.top + chart.innerHeight - (tick / chart.maxValue) * chart.innerHeight;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={chart.margin.left}
                y1={y}
                x2={chart.margin.left + chart.innerWidth}
                y2={y}
                stroke="var(--app-border)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={chart.margin.left - 8}
                y={y + 4}
                fontSize="11"
                textAnchor="end"
                fill="var(--app-text-muted)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const valueHeight = (item.count / chart.maxValue) * chart.innerHeight;
          const x = chart.margin.left + idx * step + (step - barWidth) / 2;
          const y = chart.margin.top + chart.innerHeight - valueHeight;
          return (
            <g
              key={item.day}
              onMouseMove={event => showTooltip(event, item)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={event => showTooltip(event, item)}
              onTouchMove={event => showTooltip(event, item)}
              onTouchEnd={() => setTimeout(() => setTooltip(null), 900)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(4, valueHeight)}
                rx="8"
                fill="url(#weekdayGradient)"
                style={{ cursor: 'pointer' }}
              />
              <text
                x={x + barWidth / 2}
                y={chart.margin.top + chart.innerHeight + 18}
                fontSize="11"
                textAnchor="middle"
                fill="var(--app-text-muted)"
              >
                {item.day}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="weekdayGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>

      {tooltip && (
        <div
          className="app-surface-strong pointer-events-none absolute z-20 rounded-lg border px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="app-text font-semibold">{tooltip.day}</div>
          <div className="app-text-muted">
            {tooltip.count} поездок ({tooltip.percent}%)
          </div>
        </div>
      )}
    </div>
  );
}
