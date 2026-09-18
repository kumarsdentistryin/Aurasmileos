import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/** Structured loading block — DESIGN.md: no circular spinners. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...rest }) => (
  <div className={`clinical-skeleton ${className}`.trim()} aria-hidden="true" {...rest} />
);

/** Lock-screen roster placeholders while live clinic_members load. */
export const StaffRosterSkeleton: React.FC = () => (
  <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading clinic roster">
    <section>
      <Skeleton className="h-3 w-16 mb-2" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={`doc-skel-${i}`}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100"
          >
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3 max-w-[11rem]" />
              <Skeleton className="h-2.5 w-1/2 max-w-[8rem]" />
            </div>
          </div>
        ))}
      </div>
    </section>
    <section>
      <Skeleton className="h-3 w-20 mb-2" />
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div
            key={`desk-skel-${i}`}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100"
          >
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2 max-w-[9rem]" />
              <Skeleton className="h-2.5 w-2/5 max-w-[7rem]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);
