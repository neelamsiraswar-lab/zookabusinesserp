import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  shimmer?: boolean;
}

/**
 * Base atomic Skeleton component with fluid shimmer wave animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  shimmer = true,
  className = '',
  style,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-2xl';
      case 'text':
      default:
        return 'rounded-lg';
    }
  };

  const styleObj: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  };

  return (
    <div
      className={`bg-slate-200/90 dark:bg-slate-800/80 ${shimmer ? 'animate-shimmer' : ''} ${getVariantClass()} ${className}`}
      style={styleObj}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * High-fidelity Skeleton Shimmer for Dashboard View
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" aria-label="Loading dashboard content...">
      {/* Welcome Banner Shimmer */}
      <div className="rounded-2xl p-5 bg-slate-900/95 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-56 sm:w-72 h-7 bg-slate-800" />
          <Skeleton variant="text" className="w-44 sm:w-80 h-4 bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton variant="rounded" className="w-36 h-9 bg-slate-800" />
          <Skeleton variant="rounded" className="w-32 h-9 bg-slate-800" />
          <Skeleton variant="rounded" className="w-32 h-9 bg-slate-800" />
        </div>
      </div>

      {/* Daily Tracker Shimmer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5">
            <Skeleton variant="text" className="w-48 h-5" />
            <Skeleton variant="text" className="w-64 h-3.5" />
          </div>
          <Skeleton variant="rounded" className="w-48 h-9" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton variant="rounded" className="w-9 h-9" />
                <Skeleton variant="text" className="w-16 h-3" />
              </div>
              <Skeleton variant="text" className="w-28 h-6" />
              <Skeleton variant="text" className="w-36 h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* 4 Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="circular" className="w-10 h-10" />
              <Skeleton variant="rounded" className="w-14 h-5" />
            </div>
            <Skeleton variant="text" className="w-24 h-4" />
            <Skeleton variant="text" className="w-36 h-7" />
            <Skeleton variant="text" className="w-full h-2" />
          </div>
        ))}
      </div>

      {/* Charts & Recent Activity Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Trend Chart Placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton variant="text" className="w-40 h-5" />
              <Skeleton variant="text" className="w-28 h-3" />
            </div>
            <Skeleton variant="rounded" className="w-24 h-7" />
          </div>
          {/* Simulated chart bars */}
          <div className="h-56 flex items-end justify-between gap-3 pt-8 px-2 border-b border-slate-100 dark:border-slate-800">
            {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 100].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton 
                  variant="rounded" 
                  className="w-full" 
                  style={{ height: `${h}%` }} 
                />
                <Skeleton variant="text" className="w-4 h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Recent Invoices Shimmer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <Skeleton variant="text" className="w-32 h-5" />
            <Skeleton variant="rounded" className="w-16 h-4" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton variant="text" className="w-24 h-3.5" />
                    <Skeleton variant="text" className="w-16 h-2.5" />
                  </div>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <Skeleton variant="text" className="w-16 h-3.5 ml-auto" />
                  <Skeleton variant="rounded" className="w-12 h-4 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Universal High-Fidelity Table Skeleton Shimmer
 * Used across Invoices, Purchases, Inventory, Parties, Payments
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showMetricsBar?: boolean;
}> = ({ rows = 6, columns = 5, showMetricsBar = true }) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-300" aria-label="Loading table records...">
      {/* Optional Top Metric / Action Pills */}
      {showMetricsBar && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <Skeleton variant="text" className="w-20 h-3" />
              <Skeleton variant="text" className="w-28 h-6" />
            </div>
          ))}
        </div>
      )}

      {/* Filter & Search Bar Shimmer */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Skeleton variant="rounded" className="w-full h-10" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton variant="rounded" className="w-24 h-10" />
          <Skeleton variant="rounded" className="w-28 h-10" />
          <Skeleton variant="rounded" className="w-32 h-10 bg-indigo-500/20" />
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <Skeleton variant="rounded" className="w-5 h-5 shrink-0" />
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton variant="text" className="w-36 h-4" />
          <Skeleton variant="text" className="w-28 h-4 hidden sm:block" />
          <Skeleton variant="text" className="w-24 h-4 hidden md:block" />
          <Skeleton variant="text" className="w-20 h-4" />
          <Skeleton variant="text" className="w-16 h-4" />
        </div>

        {/* Table Rows Shimmer */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, rIndex) => (
            <div key={rIndex} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
              <Skeleton variant="rounded" className="w-5 h-5 shrink-0" />
              
              {/* Primary Col (ID / Code) */}
              <div className="space-y-1.5 w-24">
                <Skeleton variant="text" className="w-20 h-4" />
                <Skeleton variant="text" className="w-14 h-2.5" />
              </div>

              {/* Title & Avatar / Party */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
                <div className="space-y-1 flex-1 min-w-0">
                  <Skeleton variant="text" className="w-3/4 max-w-[180px] h-4" />
                  <Skeleton variant="text" className="w-1/2 max-w-[120px] h-2.5" />
                </div>
              </div>

              {/* Tag / Category chip */}
              <div className="hidden sm:block w-28">
                <Skeleton variant="rounded" className="w-20 h-5" />
              </div>

              {/* Date / Secondary Info */}
              <div className="hidden md:block w-24 space-y-1">
                <Skeleton variant="text" className="w-16 h-3" />
              </div>

              {/* Financial Amount */}
              <div className="w-24 text-right space-y-1">
                <Skeleton variant="text" className="w-20 h-4 ml-auto" />
                <Skeleton variant="text" className="w-12 h-2.5 ml-auto" />
              </div>

              {/* Status Pill */}
              <div className="w-20 flex justify-end">
                <Skeleton variant="rounded" className="w-16 h-6 rounded-full" />
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Skeleton variant="rounded" className="w-7 h-7" />
                <Skeleton variant="rounded" className="w-7 h-7" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Pagination Bar */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Skeleton variant="text" className="w-36 h-4" />
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="w-8 h-8" />
            <Skeleton variant="rounded" className="w-8 h-8" />
            <Skeleton variant="rounded" className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Card Grid Skeleton Shimmer
 * Used for POS Billing items grid, Tenants list, or Inventory Catalog cards
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300" aria-label="Loading catalog cards...">
      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Skeleton variant="rounded" className="w-full sm:w-72 h-10" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton variant="rounded" className="w-20 h-8" />
          <Skeleton variant="rounded" className="w-20 h-8" />
          <Skeleton variant="rounded" className="w-20 h-8" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <Skeleton variant="rounded" className="w-full h-28 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton variant="text" className="w-3/4 h-4" />
              <Skeleton variant="text" className="w-1/2 h-3" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <Skeleton variant="text" className="w-16 h-5" />
              <Skeleton variant="rounded" className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Form / Modal Skeleton Shimmer
 */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <Skeleton variant="text" className="w-48 h-6" />
          <Skeleton variant="text" className="w-64 h-3.5" />
        </div>
        <Skeleton variant="rounded" className="w-8 h-8" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton variant="text" className="w-24 h-3.5" />
            <Skeleton variant="rounded" className="w-full h-10" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Skeleton variant="rounded" className="w-24 h-10" />
        <Skeleton variant="rounded" className="w-32 h-10 bg-indigo-500/20" />
      </div>
    </div>
  );
};

/**
 * Route / Tab Adaptive Skeleton View
 * Automatically loads the designated skeleton layout matching the requested module.
 */
export const ViewSkeleton: React.FC<{ tab?: string }> = ({ tab = 'dashboard' }) => {
  switch (tab) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'invoices':
    case 'purchases':
    case 'payments':
    case 'accounting':
    case 'gst_returns':
    case 'cheques':
      return <TableSkeleton rows={7} showMetricsBar={true} />;
    case 'inventory':
    case 'pos_billing':
      return <CardGridSkeleton count={8} />;
    case 'parties':
      return <TableSkeleton rows={6} columns={4} showMetricsBar={true} />;
    case 'settings':
    case 'users':
      return <FormSkeleton fields={8} />;
    default:
      return <TableSkeleton rows={6} showMetricsBar={true} />;
  }
};
