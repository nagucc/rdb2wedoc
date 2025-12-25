'use client';

import { useState, useEffect } from 'react';
import { SystemMetrics } from '@/lib/services/monitoring.service';

interface ActivityChartProps {
  data?: number[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const [chartData, setChartData] = useState<number[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setChartData(data);
    } else {
      setChartData(generateMockData());
    }
  }, [data]);

  const generateMockData = (): number[] => {
    const days = 7;
    const data = [];
    for (let i = 0; i < days; i++) {
      data.push(Math.floor(Math.random() * 100) + 20);
    }
    return data;
  };

  const maxValue = Math.max(...chartData, 100);
  const minValue = Math.min(...chartData, 0);
  const range = maxValue - minValue || 1;

  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="relative h-64 w-full">
      <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform="translate(0, 0)">
          <path
            d={`
              M 0 ${200 - ((chartData[0] - minValue) / range) * 160}
              ${chartData.slice(1).map((value, index) => {
                const x = ((index + 1) / (chartData.length - 1)) * 400;
                const y = 200 - ((value - minValue) / range) * 160;
                return ` L ${x} ${y}`;
              }).join('')}
              L 400 200
              L 0 200
              Z
            `}
            fill="url(#gradient)"
          />

          <path
            d={`
              M 0 ${200 - ((chartData[0] - minValue) / range) * 160}
              ${chartData.slice(1).map((value, index) => {
                const x = ((index + 1) / (chartData.length - 1)) * 400;
                const y = 200 - ((value - minValue) / range) * 160;
                return ` L ${x} ${y}`;
              }).join('')}
            `}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chartData.map((value, index) => {
            const x = (index / (chartData.length - 1)) * 400;
            const y = 200 - ((value - minValue) / range) * 160;
            const isHovered = hoveredIndex === index;

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#3b82f6"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {isHovered && (
                  <g>
                    <rect
                      x={x - 30}
                      y={y - 40}
                      width={60}
                      height={28}
                      rx={4}
                      fill="#1f2937"
                      opacity="0.9"
                    />
                    <text
                      x={x}
                      y={y - 22}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={12}
                      fontWeight="600"
                    >
                      {value}
                    </text>
                    <path
                      d={`M ${x - 4} ${y - 12} L ${x} ${y - 8} L ${x + 4} ${y - 12}`}
                      fill="#1f2937"
                      opacity="0.9"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {days.map((day, index) => (
          <div
            key={index}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {maxValue}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round((maxValue + minValue) / 2)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {minValue}
        </div>
      </div>
    </div>
  );
}
