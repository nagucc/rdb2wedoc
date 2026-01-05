'use client';

import { useState, useEffect } from 'react';

interface ActivityChartProps {
  data?: number[];
  days?: string[];
}

interface ActivityData {
  activityData: number[];
  days: string[];
}

export default function ActivityChart({ data, days: propDays }: ActivityChartProps) {
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartDays, setChartDays] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchActivityData();
  }, []);

  useEffect(() => {
    if (data && propDays) {
      setChartData(data);
      setChartDays(propDays);
      setLoading(false);
    }
  }, [data, propDays]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/activity');
      const result = await response.json();

      if (result.success) {
        const activityData: ActivityData = result.data;
        setChartData(activityData.activityData);
        setChartDays(formatDays(activityData.days));
      } else {
        setError('获取数据失败');
        setChartData(generateMockData());
        setChartDays(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
      }
    } catch (error) {
      console.error('获取活动数据失败:', error);
      setError('网络错误');
      setChartData(generateMockData());
      setChartDays(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): number[] => {
    const days = 7;
    const data = [];
    for (let i = 0; i < days; i++) {
      data.push(Math.floor(Math.random() * 100) + 20);
    }
    return data;
  };

  const formatDays = (days: string[]): string[] => {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days.map(dateStr => {
      const date = new Date(dateStr);
      return dayNames[date.getDay()];
    });
  };

  const maxValue = Math.max(...chartData, 100);
  const minValue = Math.min(...chartData, 0);
  const range = maxValue - minValue || 1;

  const handlePointClick = (index: number) => {
    setSelectedIndex(index === selectedIndex ? null : index);
  };

  const handleRefresh = () => {
    fetchActivityData();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative h-64 w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">加载中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-0 right-0 z-20 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            重试
          </button>
        </div>
      )}

      <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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
            className="transition-opacity duration-300"
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
            className="transition-all duration-300"
          />

          {chartData.map((value, index) => {
            const x = (index / (chartData.length - 1)) * 400;
            const y = 200 - ((value - minValue) / range) * 160;
            const isHovered = hoveredIndex === index;
            const isSelected = selectedIndex === index;

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isSelected ? 6 : 4}
                  fill={isSelected ? '#1d4ed8' : '#3b82f6'}
                  className={`cursor-pointer transition-all duration-300 ${isHovered || isSelected ? 'filter drop-shadow-lg' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => handlePointClick(index)}
                  filter={isHovered || isSelected ? 'url(#glow)' : undefined}
                />

                {(isHovered || isSelected) && (
                  <g className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <rect
                      x={x - 30}
                      y={y - 40}
                      width={60}
                      height={28}
                      rx={4}
                      fill="#1f2937"
                      opacity="0.95"
                      className="transition-opacity duration-200"
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
                      opacity="0.95"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {chartDays.map((day, index) => (
          <div
            key={index}
            className={`text-xs transition-colors duration-200 ${
              hoveredIndex === index || selectedIndex === index
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-500 dark:text-gray-400'
            }`}
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

      {selectedIndex !== null && (
        <div className="absolute right-2 top-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
          <div className="font-semibold">{chartDays[selectedIndex]}</div>
          <div className="text-lg font-bold">{chartData[selectedIndex]} 条记录</div>
        </div>
      )}
    </div>
  );
}
