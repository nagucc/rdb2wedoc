'use client';

import { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { DataSourceStats } from '@/lib/services/datasource.service';

interface DataSourceStatsChartProps {
  stats: DataSourceStats;
}

export default function DataSourceStatsChart({ stats }: DataSourceStatsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const maxValue = Math.max(...stats.queryTrend, 100);
  const minValue = Math.min(...stats.queryTrend, 0);
  const range = maxValue - minValue || 1;

  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500'
  ];

  const totalDataFlow = stats.dataFlowDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            使用统计
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            数据查询量趋势和数据流量分布
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <BarChart3 className="h-4 w-4" />
            <span>总查询: {stats.totalQueries.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <PieChart className="h-4 w-4" />
            <span>总流量: {(totalDataFlow / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                查询量趋势
              </h4>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              最近7天
            </span>
          </div>

          <div className="relative h-64 w-full">
            <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {stats.queryTrend.map((value, index) => {
                const x = (index / (stats.queryTrend.length - 1)) * 400;
                const barWidth = 40;
                const barHeight = ((value - minValue) / range) * 160;
                const y = 200 - barHeight;
                const isHovered = hoveredIndex === index;

                return (
                  <g key={index}>
                    <rect
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="url(#barGradient)"
                      rx={4}
                      className="cursor-pointer transition-all hover:opacity-80"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {isHovered && (
                      <g>
                        <rect
                          x={x - 30}
                          y={y - 35}
                          width={60}
                          height={28}
                          rx={4}
                          fill="#1f2937"
                          opacity="0.9"
                        />
                        <text
                          x={x}
                          y={y - 17}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={12}
                          fontWeight="600"
                        >
                          {value}
                        </text>
                        <path
                          d={`M ${x - 4} ${y - 7} L ${x} ${y - 3} L ${x + 4} ${y - 7}`}
                          fill="#1f2937"
                          opacity="0.9"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
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
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                数据流量分布
              </h4>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Top 5 数据源
            </span>
          </div>

          <div className="space-y-4">
            {stats.dataFlowDistribution.map((item, index) => {
              const percentage = totalDataFlow > 0 ? (item.value / totalDataFlow) * 100 : 0;
              const colorClass = colors[index % colors.length];

              return (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${colorClass}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(item.value / 1000).toFixed(1)}K
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {stats.dataFlowDistribution.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PieChart className="mb-4 h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                暂无数据流量数据
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          数据源概览
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              总数据源
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalDataSources}
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/10">
            <div className="text-sm text-green-700 dark:text-green-400">
              已连接
            </div>
            <div className="mt-2 text-3xl font-bold text-green-900 dark:text-green-400">
              {stats.connectedDataSources}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/10">
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              未连接
            </div>
            <div className="mt-2 text-3xl font-bold text-yellow-900 dark:text-yellow-400">
              {stats.disconnectedDataSources}
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
            <div className="text-sm text-red-700 dark:text-red-400">
              连接错误
            </div>
            <div className="mt-2 text-3xl font-bold text-red-900 dark:text-red-400">
              {stats.errorDataSources}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}