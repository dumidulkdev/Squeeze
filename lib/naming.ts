import type { OutputFormat } from "./types";

export function extFor(format: OutputFormat): string {
  return format === "webp" ? "webp" : "svg";
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function outputName(name: string, format: OutputFormat): string {
  return `${baseName(name)}.${extFor(format)}`;
}

/** Keeps original names; adds " (1)", " (2)" only when two files would collide. */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((n) => {
    let candidate = n;
    if (used.has(candidate.toLowerCase())) {
      const dot = n.lastIndexOf(".");
      const stem = dot > 0 ? n.slice(0, dot) : n;
      const ext = dot > 0 ? n.slice(dot) : "";
      let k = 1;
      while (used.has(`${stem} (${k})${ext}`.toLowerCase())) k++;
      candidate = `${stem} (${k})${ext}`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
