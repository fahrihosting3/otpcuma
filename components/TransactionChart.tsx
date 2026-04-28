"use client";

import { useMemo } from "react";
import { type TransactionData } from "@/lib/externalDB";

interface TransactionChartProps {
  transactions: TransactionData[];
  type?: "bar" | "line";
  height?: number;
}

export default function TransactionChart({
  transactions,
  type = "bar",
  height = 250,
}: TransactionChartProps) {
  const chartData = useMemo(() => {
    const days: { [key: string]: { success: number; pending: number; failed: number; total: number } } = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      days[key] = { success: 0, pending: 0, failed: 0, total: 0 };
    }

    transactions.forEach((trx) => {
      const date = new Date(trx.createdAt);
      const key = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      
      if (days[key]) {
        days[key].total += trx.amount || 0;
        if (trx.status === "success") {
          days[key].success += trx.amount || 0;
        } else if (trx.status === "pending") {
          days[key].pending += trx.amount || 0;
        } else {
          days[key].failed += trx.amount || 0;
        }
      }
    });

    return Object.entries(days).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [transactions]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map((d) => d.total), 1);
  }, [chartData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}jt`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}rb`;
    }
    return value.toString();
  };

  if (transactions.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">Belum ada data transaksi</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative">
      {/* Legend */}
      <div className="absolute top-0 right-0 flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-400 border border-slate-800"></div>
          <span className="text-slate-600">Sukses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-400 border border-slate-800"></div>
          <span className="text-slate-600">Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-rose-400 border border-slate-800"></div>
          <span className="text-slate-600">Gagal</span>
        </div>
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-6 bottom-8 w-12 flex flex-col justify-between text-xs text-slate-500 font-mono">
        <span>{formatCurrency(maxValue)}</span>
        <span>{formatCurrency(maxValue / 2)}</span>
        <span>0</span>
      </div>

      {/* Chart area */}
      <div className="absolute left-14 right-0 top-6 bottom-8 flex items-end gap-2">
        {type === "bar" ? (
          chartData.map((day, idx) => {
            const heightPercent = (day.total / maxValue) * 100;
            const successPercent = day.total > 0 ? (day.success / day.total) * 100 : 0;
            const pendingPercent = day.total > 0 ? (day.pending / day.total) * 100 : 0;
            const failedPercent = day.total > 0 ? (day.failed / day.total) * 100 : 0;
            
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end group relative"
                style={{ height: "100%" }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap border-2 border-slate-600 shadow-lg pointer-events-none">
                  <div className="font-bold mb-1">{day.date}</div>
                  <div className="text-emerald-400">Sukses: Rp{day.success.toLocaleString("id-ID")}</div>
                  <div className="text-amber-400">Pending: Rp{day.pending.toLocaleString("id-ID")}</div>
                  <div className="text-rose-400">Gagal: Rp{day.failed.toLocaleString("id-ID")}</div>
                </div>
                
                {/* Stacked bars */}
                <div 
                  className="w-full flex flex-col-reverse border-2 border-slate-800 transition-all group-hover:border-amber-400 overflow-hidden"
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                >
                  {successPercent > 0 && (
                    <div 
                      className="w-full bg-emerald-400 transition-all"
                      style={{ height: `${successPercent}%` }}
                    />
                  )}
                  {pendingPercent > 0 && (
                    <div 
                      className="w-full bg-amber-400 transition-all"
                      style={{ height: `${pendingPercent}%` }}
                    />
                  )}
                  {failedPercent > 0 && (
                    <div 
                      className="w-full bg-rose-400 transition-all"
                      style={{ height: `${failedPercent}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          (() => {
            // Calculate smooth bezier curve path
            const getPoints = (data: typeof chartData, getValue: (d: typeof chartData[0]) => number) => {
              return data.map((d, i) => ({
                x: (i / (data.length - 1)) * 100,
                y: 100 - (getValue(d) / maxValue) * 100,
              }));
            };

            const createSmoothPath = (points: { x: number; y: number }[]) => {
              if (points.length < 2) return "";
              
              let path = `M ${points[0].x} ${points[0].y}`;
              
              for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i === 0 ? i : i - 1];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
                
                // Control point tension
                const tension = 0.3;
                
                const cp1x = p1.x + (p2.x - p0.x) * tension;
                const cp1y = p1.y + (p2.y - p0.y) * tension;
                const cp2x = p2.x - (p3.x - p1.x) * tension;
                const cp2y = p2.y - (p3.y - p1.y) * tension;
                
                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
              }
              
              return path;
            };

            const createSmoothAreaPath = (points: { x: number; y: number }[]) => {
              const linePath = createSmoothPath(points);
              if (!linePath) return "";
              return `${linePath} L 100 100 L 0 100 Z`;
            };

            const successPoints = getPoints(chartData, (d) => d.success);
            const totalPoints = getPoints(chartData, (d) => d.total);

            return (
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={100 - y}
                    x2="100"
                    y2={100 - y}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                ))}
                
                {/* Success line with area */}
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                
                {/* Total area fill */}
                <path
                  fill="url(#totalGradient)"
                  d={createSmoothAreaPath(totalPoints)}
                />
                
                {/* Success area fill */}
                <path
                  fill="url(#successGradient)"
                  d={createSmoothAreaPath(successPoints)}
                />
                
                {/* Total line (dashed, smooth curve) */}
                <path
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={createSmoothPath(totalPoints)}
                />
                
                {/* Success line (smooth curve) */}
                <path
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={createSmoothPath(successPoints)}
                />
                
                {/* Data points */}
                {successPoints.map((point, i) => (
                  <g key={i}>
                    {/* Outer glow */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill="#10b981"
                      opacity="0.3"
                    />
                    {/* Main point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="2"
                      fill="#10b981"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                  </g>
                ))}
              </svg>
            );
          })()
        )}
      </div>

      {/* X-axis labels */}
      <div className="absolute left-14 right-0 bottom-0 flex justify-between text-xs text-slate-500 font-mono">
        {chartData.map((day, idx) => (
          <span key={idx} className="flex-1 text-center truncate text-[10px]">
            {day.date}
          </span>
        ))}
      </div>
    </div>
  );
}
