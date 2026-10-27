interface Props {
  label: string;
  percent: number; // 0-100
  detail?: string;
}

export default function ProgressBar({ label, percent, detail }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-4 text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted tabular-nums">{detail}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p)}
        className="h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
