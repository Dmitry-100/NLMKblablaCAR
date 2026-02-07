import React, { useMemo, useRef, useState } from 'react';

interface RoutePoint {
  route: string;
  count: number;
}

interface RouteSvgChartProps {
  data: RoutePoint[];
}

interface RouteTooltip {
  x: number;
  y: number;
  route: string;
  count: number;
  percent: number;
}

export function RouteSvgChart({ data }: RouteSvgChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<RouteTooltip | null>(null);

  const chart = useMemo(() => {
    const width = 680;
    const rowHeight = 42;
    const height = 82 + data.length * rowHeight;
    const margin = { top: 20, right: 22, bottom: 34, left: 210 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(1, ...data.map(item => item.count));
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const ticks = Array.from({ length: 5 }, (_, idx) => Math.round((maxValue / 4) * idx));

    return { width, height, margin, innerWidth, innerHeight, maxValue, total, ticks, rowHeight };
  }, [data]);

  const showTooltip = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    item: RoutePoint
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const point = 'touches' in event ? event.touches[0] : event;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const percent = chart.total > 0 ? Math.round((item.count / chart.total) * 100) : 0;

    setTooltip({
      x: Math.max(12, Math.min(rect.width - 210, x + 14)),
      y: Math.max(8, y - 52),
      route: item.route,
      count: item.count,
      percent,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full">
        {chart.ticks.map(tick => {
          const x = chart.margin.left + (tick / chart.maxValue) * chart.innerWidth;
          return (
            <g key={`x-tick-${tick}`}>
              <line
                x1={x}
                y1={chart.margin.top}
                x2={x}
                y2={chart.margin.top + chart.innerHeight}
                stroke="var(--app-border)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={x}
                y={chart.margin.top + chart.innerHeight + 16}
                textAnchor="middle"
                fontSize="11"
                fill="var(--app-text-muted)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const y = chart.margin.top + idx * chart.rowHeight + 7;
          const barWidth = (item.count / chart.maxValue) * chart.innerWidth;
          const isLongLabel = item.route.length > 26;
          const routeLabel = isLongLabel ? `${item.route.slice(0, 24)}...` : item.route;

          return (
            <g
              key={item.route}
              onMouseMove={event => showTooltip(event, item)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={event => showTooltip(event, item)}
              onTouchMove={event => showTooltip(event, item)}
              onTouchEnd={() => setTimeout(() => setTooltip(null), 900)}
            >
              <text
                x={chart.margin.left - 10}
                y={y + 16}
                textAnchor="end"
                fontSize="12"
                fill="var(--app-text-muted)"
              >
                {routeLabel}
              </text>
              <rect
                x={chart.margin.left}
                y={y}
                width={Math.max(6, barWidth)}
                height={24}
                rx={7}
                fill="url(#routeGradient)"
                style={{ cursor: 'pointer' }}
              />
              <text
                x={chart.margin.left + Math.max(6, barWidth) + 8}
                y={y + 16}
                fontSize="12"
                fill="var(--app-text)"
              >
                {item.count}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>

      {tooltip && (
        <div
          className="app-surface-strong pointer-events-none absolute z-20 rounded-lg border px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="app-text font-semibold">{tooltip.route}</div>
          <div className="app-text-muted">
            {tooltip.count} поездок ({tooltip.percent}%)
          </div>
        </div>
      )}
    </div>
  );
}
