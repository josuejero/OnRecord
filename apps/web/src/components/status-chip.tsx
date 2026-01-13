import type { FeatureFlags } from '@/lib/config/features';

type StatusChipProps = {
  flags: FeatureFlags;
};

const makeLabel = (label: string, enabled: boolean) => `${label} ${enabled ? 'on' : 'off'}`;

export default function StatusChip({ flags }: StatusChipProps) {
  const segments = [
    `Recap ${flags.aiRecapProvider}`,
    makeLabel('Voice input', flags.voiceInputEnabled),
    makeLabel('Voice upload', flags.voiceUploadEnabled),
    makeLabel('AI recap', flags.aiRecapEnabled),
    makeLabel('Labeler', flags.labelerEnabled),
    makeLabel('Evals', flags.evalsPageEnabled),
  ];

  return (
    <div
      aria-label="Feature flag status"
      className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 shadow-sm shadow-slate-900/5"
    >
      {segments.map((segment) => (
        <span key={segment} className="whitespace-nowrap">
          {segment}
        </span>
      ))}
    </div>
  );
}
