"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { OutputFormat, Settings, TraceDetail } from "@/lib/types";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  disabled: boolean;
  actions?: ReactNode;
}

const FORMATS: { id: OutputFormat; name: string }[] = [
  { id: "webp", name: "WebP" },
  { id: "svg-embedded", name: "SVG embed" },
  { id: "svg-traced", name: "SVG trace" },
];

const HINTS: Record<OutputFormat, string> = {
  webp: "Best for photos and general web use. Typically 60–90% smaller than the original.",
  "svg-embedded": "A compressed WebP wrapped in an .svg file. Looks identical to the original.",
  "svg-traced": "Converts to true vector shapes. Suits logos and flat graphics; photos look posterized.",
};

const WIDTHS = [
  { v: 0, l: "Original" },
  { v: 3840, l: "3840 px" },
  { v: 2560, l: "2560 px" },
  { v: 1920, l: "1920 px" },
  { v: 1280, l: "1280 px" },
  { v: 800, l: "800 px" },
];

const DETAILS: { id: TraceDetail; l: string }[] = [
  { id: "low", l: "Low" },
  { id: "medium", l: "Medium" },
  { id: "high", l: "High" },
];

const LABEL = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-background p-0.5">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors ${FOCUS} ${
              on ? "bg-raised text-foreground shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-muted hover:text-foreground"
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsBar({ settings, onChange, disabled, actions }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const traced = settings.format === "svg-traced";

  return (
    <section aria-label="Conversion settings" className="rounded-lg border border-line bg-surface">
      <fieldset disabled={disabled} className="flex flex-wrap items-end gap-x-8 gap-y-4 p-4 disabled:opacity-60">
        <div>
          <span className={LABEL}>Format</span>
          <Segmented
            label="Output format"
            value={settings.format}
            options={FORMATS}
            onChange={(format) => set({ format })}
          />
        </div>

        {traced ? (
          <div>
            <span className={LABEL}>Detail</span>
            <Segmented
              label="Trace detail"
              value={settings.traceDetail}
              options={DETAILS.map((d) => ({ id: d.id, name: d.l }))}
              onChange={(traceDetail) => set({ traceDetail })}
            />
          </div>
        ) : (
          <div className="w-44">
            <label htmlFor="quality" className={`${LABEL} flex justify-between`}>
              <span>Quality</span>
              <span className="text-foreground tabular-nums">{settings.quality}</span>
            </label>
            <input
              id="quality"
              type="range"
              min={1}
              max={100}
              value={settings.quality}
              onChange={(e) => set({ quality: Number(e.target.value) })}
              className={`block h-8 w-full ${FOCUS}`}
            />
          </div>
        )}

        <div>
          <label htmlFor="maxw" className={LABEL}>
            Max width
          </label>
          <div className="relative">
            <select
              id="maxw"
              value={settings.maxWidth}
              onChange={(e) => set({ maxWidth: Number(e.target.value) })}
              className={`h-9 w-32 appearance-none rounded-md border border-line bg-background pl-3 pr-8 text-[13px] font-medium ${FOCUS}`}
            >
              {WIDTHS.map((w) => (
                <option key={w.v} value={w.v}>
                  {w.l}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          </div>
        </div>

        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </fieldset>
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted">{HINTS[settings.format]}</p>
    </section>
  );
}
