import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  trend: string;
  description: string;
  onClick?: () => void;
  href?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800'
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800'
  }
};

export default function MetricsCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  description,
  onClick,
  href
}: MetricsCardProps) {
  const classes = colorClasses[color];
  const isClickable = onClick || href;

  const cardContent = (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-300" style={{ backgroundColor: classes.text.replace('text-', '') }}></div>
      
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${classes.bg} ${classes.text} transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-medium ${classes.bg} ${classes.text}`}>
            {trend}
          </div>
        </div>

        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </div>
        </div>

        <div className="mb-1">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </h3>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer">
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div className="cursor-pointer" onClick={onClick}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
