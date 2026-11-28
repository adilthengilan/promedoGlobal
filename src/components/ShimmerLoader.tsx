import React from 'react';

interface ShimmerBoxProps {
  className?: string;
  dark?: boolean;
}

export const ShimmerBox: React.FC<ShimmerBoxProps> = ({ className = '', dark = false }) => (
  <div className={`${dark ? 'shimmer-dark' : 'shimmer-bg'} rounded-xl ${className}`} />
);

interface ShimmerCardGridProps {
  count?: number;
  columns?: 2 | 3;
  variant?: 'course' | 'subject' | 'mocktest';
  className?: string;
}

export const ShimmerCardGrid: React.FC<ShimmerCardGridProps> = ({
  count = 6,
  columns = 3,
  variant = 'course',
  className = ''
}) => {
  const gridCols = columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-6 ${className}`} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-3xl border border-[#E5EEFF] overflow-hidden shadow-xs p-5 space-y-4 flex flex-col justify-between"
        >
          {variant === 'course' && (
            <ShimmerBox className="w-full h-40 rounded-2xl" />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <ShimmerBox className="h-5 w-24 rounded-lg" />
              <ShimmerBox className="h-5 w-16 rounded-lg" />
            </div>

            <ShimmerBox className="h-5 w-5/6 rounded-lg" />
            <ShimmerBox className="h-4 w-3/4 rounded-lg" />

            <div className="pt-2 space-y-2">
              <ShimmerBox className="h-3.5 w-full rounded-md" />
              <ShimmerBox className="h-3.5 w-4/5 rounded-md" />
            </div>

            {variant === 'mocktest' && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <ShimmerBox className="h-12 rounded-xl" />
                <ShimmerBox className="h-12 rounded-xl" />
                <ShimmerBox className="h-12 rounded-xl" />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <ShimmerBox className="h-10 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface ShimmerQuestionListProps {
  count?: number;
  compact?: boolean;
}

export const ShimmerQuestionList: React.FC<ShimmerQuestionListProps> = ({
  count = 4,
  compact = false
}) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading questions">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs ${
            compact ? 'p-4 space-y-3' : 'p-6 space-y-4'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShimmerBox className="h-6 w-12 rounded-lg" />
              <ShimmerBox className="h-6 w-28 rounded-lg" />
            </div>
            <ShimmerBox className="h-7 w-24 rounded-xl" />
          </div>

          <div className="space-y-2">
            <ShimmerBox className="h-4 w-full rounded-lg" />
            <ShimmerBox className="h-4 w-5/6 rounded-lg" />
            {!compact && <ShimmerBox className="h-4 w-2/3 rounded-lg" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <ShimmerBox className="h-11 rounded-2xl" />
            <ShimmerBox className="h-11 rounded-2xl" />
            <ShimmerBox className="h-11 rounded-2xl" />
            <ShimmerBox className="h-11 rounded-2xl" />
          </div>

          {!compact && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <ShimmerBox className="h-4 w-36 rounded-md" />
              <ShimmerBox className="h-7 w-28 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface ShimmerTableProps {
  rows?: number;
  title?: string;
}

export const ShimmerTable: React.FC<ShimmerTableProps> = ({ rows = 6, title }) => {
  return (
    <div className="p-6 space-y-4" aria-busy="true" aria-label={title || 'Loading data table'}>
      {title && (
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{title}</span>
          <ShimmerBox className="h-5 w-24 rounded-lg" />
        </div>
      )}
      <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-100">
        <ShimmerBox className="col-span-4 h-4 rounded-md" />
        <ShimmerBox className="col-span-2 h-4 rounded-md" />
        <ShimmerBox className="col-span-2 h-4 rounded-md" />
        <ShimmerBox className="col-span-2 h-4 rounded-md" />
        <ShimmerBox className="col-span-2 h-4 rounded-md" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-4 items-center p-3 rounded-2xl bg-slate-50/60 border border-slate-100"
          >
            <div className="col-span-4 flex items-center gap-3">
              <ShimmerBox className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <ShimmerBox className="h-3.5 w-3/4 rounded-md" />
                <ShimmerBox className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            <div className="col-span-2">
              <ShimmerBox className="h-6 w-20 rounded-xl" />
            </div>
            <div className="col-span-2">
              <ShimmerBox className="h-4 w-24 rounded-md" />
            </div>
            <div className="col-span-2">
              <ShimmerBox className="h-6 w-20 rounded-xl" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <ShimmerBox className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ShimmerPageDetailProps {
  title?: string;
}

export const ShimmerPageDetail: React.FC<ShimmerPageDetailProps> = ({ title }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFF] pt-24 pb-20 px-4 sm:px-6 lg:px-8" aria-busy="true">
      <div className="max-w-7xl mx-auto space-y-8">
        {title && (
          <div className="flex items-center gap-2.5 text-xs font-extrabold text-[#3853A4]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3853A4] animate-ping" />
            <span>{title}</span>
          </div>
        )}

        {/* Top Banner Shimmer */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EEFF] shadow-xs space-y-4">
          <div className="flex flex-wrap gap-2">
            <ShimmerBox className="h-6 w-28 rounded-lg" />
            <ShimmerBox className="h-6 w-20 rounded-lg" />
          </div>
          <ShimmerBox className="h-9 w-3/4 max-w-xl rounded-xl" />
          <ShimmerBox className="h-4 w-full max-w-2xl rounded-lg" />
          <ShimmerBox className="h-4 w-2/3 max-w-lg rounded-lg" />
        </div>

        {/* 2-Column Content + Sidebar Shimmer */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-[#E5EEFF] space-y-3">
                <div className="flex items-center justify-between">
                  <ShimmerBox className="h-5 w-1/3 rounded-lg" />
                  <ShimmerBox className="h-4 w-16 rounded-md" />
                </div>
                <ShimmerBox className="h-11 w-full rounded-xl" />
                <ShimmerBox className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl p-6 border border-[#E5EEFF] space-y-5">
              <ShimmerBox className="w-full aspect-video rounded-2xl" />
              <ShimmerBox className="h-8 w-1/2 rounded-xl" />
              <ShimmerBox className="h-12 w-full rounded-2xl" />
              <ShimmerBox className="h-10 w-full rounded-2xl" />
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <ShimmerBox className="h-4 w-full rounded-md" />
                <ShimmerBox className="h-4 w-4/5 rounded-md" />
                <ShimmerBox className="h-4 w-3/4 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ShimmerExamRunnerProps {
  title?: string;
  dark?: boolean;
}

export const ShimmerExamRunner: React.FC<ShimmerExamRunnerProps> = ({ title, dark = false }) => {
  return (
    <div
      className={`min-h-screen pt-24 pb-20 px-4 sm:px-6 ${
        dark ? 'bg-[#0B1C30] text-white' : 'bg-slate-50 text-slate-900'
      }`}
      aria-busy="true"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {title && (
          <div className="flex items-center gap-2.5 text-xs font-extrabold text-blue-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className={dark ? 'text-blue-300' : 'text-[#3853A4]'}>{title}</span>
          </div>
        )}

        {/* Top Bar Shimmer */}
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between gap-4 ${
            dark ? 'bg-[#0E223D] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShimmerBox dark={dark} className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <ShimmerBox dark={dark} className="h-4 w-48 rounded-md" />
              <ShimmerBox dark={dark} className="h-3 w-32 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBox dark={dark} className="h-9 w-28 rounded-xl" />
            <ShimmerBox dark={dark} className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Main Stage Shimmer */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
            dark ? 'bg-[#0E223D] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
          }`}
        >
          {dark ? (
            <ShimmerBox dark className="w-full aspect-video max-h-[52vh] rounded-2xl" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <ShimmerBox className="h-6 w-32 rounded-lg" />
                <ShimmerBox className="h-6 w-24 rounded-lg" />
              </div>

              <div className="space-y-2.5">
                <ShimmerBox className="h-5 w-full rounded-lg" />
                <ShimmerBox className="h-5 w-11/12 rounded-lg" />
                <ShimmerBox className="h-5 w-3/4 rounded-lg" />
              </div>

              <div className="space-y-3 pt-2">
                <ShimmerBox className="h-14 w-full rounded-2xl" />
                <ShimmerBox className="h-14 w-full rounded-2xl" />
                <ShimmerBox className="h-14 w-full rounded-2xl" />
                <ShimmerBox className="h-14 w-full rounded-2xl" />
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100/20 flex items-center justify-between">
            <ShimmerBox dark={dark} className="h-10 w-28 rounded-xl" />
            <ShimmerBox dark={dark} className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
