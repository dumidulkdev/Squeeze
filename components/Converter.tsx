"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Download, Lock, Trash2 } from "lucide-react";
import DropZone from "./DropZone";
import FileRow, { ROW_GRID } from "./FileRow";
import ProgressBar from "./ProgressBar";
import SettingsBar from "./SettingsBar";
import { DEFAULT_SETTINGS, type Item, type Settings } from "@/lib/types";
import { isAllowedImage } from "@/lib/validate";
import { outputName, uniqueNames } from "@/lib/naming";
import { runBatch } from "@/lib/workerPool";
import { saveBlob, zipAndSave } from "@/lib/zip";
import { formatBytes, formatDuration } from "@/lib/format";

interface Run {
  ids: Set<string>;
  startedAt: number;
  finishedAt: number | null;
}

/** Only the settings that change the output are part of the key. */
function settingsKey(s: Settings): string {
  return s.format === "svg-traced"
    ? `${s.format}|${s.maxWidth}|${s.traceDetail}`
    : `${s.format}|${s.maxWidth}|${s.quality}`;
}

const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

export default function Converter() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notice, setNotice] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);
  const [zipPct, setZipPct] = useState<number | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);
  const seen = useRef(new Map<string, string>()); // file key -> item id
  const thumbChain = useRef<Promise<void>>(Promise.resolve());

  const running = run !== null && run.finishedAt === null;
  const key = settingsKey(settings);

  // Tick the clock while a run is active so elapsed time / ETA stay live.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(performance.now()), 400);
    return () => clearInterval(t);
  }, [running]);

  // Stop workers if the page is left mid-run.
  useEffect(() => () => cancelRef.current?.(), []);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }, []);

  const makeThumb = useCallback(
    (id: string, file: File) => {
      thumbChain.current = thumbChain.current.then(async () => {
        try {
          const bm = await createImageBitmap(file, { resizeWidth: 96, resizeQuality: "low" });
          const c = document.createElement("canvas");
          c.width = bm.width;
          c.height = bm.height;
          c.getContext("2d")!.drawImage(bm, 0, 0);
          bm.close();
          patch(id, { thumb: c.toDataURL("image/webp", 0.6) });
        } catch {
          /* thumbnail is optional */
        }
      });
    },
    [patch],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const accepted: Item[] = [];
      let rejected = 0;
      let duplicates = 0;
      for (const file of files) {
        if (!(await isAllowedImage(file))) {
          rejected++;
          continue;
        }
        const k = fileKey(file);
        if (seen.current.has(k)) {
          duplicates++;
          continue;
        }
        const id = crypto.randomUUID();
        seen.current.set(k, id);
        accepted.push({ id, file, status: "queued" });
      }
      if (accepted.length) {
        setItems((prev) => [...prev, ...accepted]);
        accepted.forEach((a) => makeThumb(a.id, a.file));
      }
      const parts: string[] = [];
      if (rejected) parts.push(`${rejected} skipped (only real PNG and JPG files are accepted)`);
      if (duplicates) parts.push(`${duplicates} already in the list`);
      setNotice(parts.length ? parts.join(". ") + "." : null);
    },
    [makeThumb],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) seen.current.delete(fileKey(gone.file));
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = () => {
    seen.current.clear();
    setItems([]);
    setRun(null);
    setNotice(null);
  };

  const pending = useMemo(
    () => items.filter((i) => i.status !== "done" || i.doneWith !== key),
    [items, key],
  );

  const start = () => {
    if (pending.length === 0 || running) return;
    const snap = settings;
    const k = settingsKey(snap);
    const todo = pending;
    const ids = new Set(todo.map((i) => i.id));
    const names = new Map(todo.map((i) => [i.id, outputName(i.file.name, snap.format)]));

    setItems((prev) =>
      prev.map((i) =>
        ids.has(i.id)
          ? {
              ...i,
              status: "queued",
              blob: undefined,
              outSize: undefined,
              error: undefined,
              doneWith: undefined,
              outName: undefined,
            }
          : i,
      ),
    );
    const t0 = performance.now();
    setNow(t0);
    setRun({ ids, startedAt: t0, finishedAt: null });

    cancelRef.current = runBatch(
      todo.map((i) => ({ id: i.id, file: i.file })),
      snap,
      {
        onStage: (id, stage) => patch(id, { status: stage }),
        onDone: (id, blob, width, height) =>
          patch(id, {
            status: "done",
            blob,
            outSize: blob.size,
            width,
            height,
            doneWith: k,
            outName: names.get(id),
          }),
        onError: (id, message) => patch(id, { status: "error", error: message }),
        onFinish: () => {
          cancelRef.current = null;
          setRun((r) => (r ? { ...r, finishedAt: performance.now() } : r));
        },
      },
    );
  };

  const cancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setItems((prev) =>
      prev.map((i) => (i.status === "decoding" || i.status === "encoding" ? { ...i, status: "queued" } : i)),
    );
    setRun(null);
  };

  const doneItems = items.filter((i) => i.status === "done" && i.blob && i.outName);

  const downloadOne = useCallback(
    (id: string) => {
      const it = items.find((i) => i.id === id);
      if (it?.blob && it.outName) saveBlob(it.blob, it.outName);
    },
    [items],
  );

  const downloadAll = async () => {
    if (doneItems.length === 0 || zipPct !== null) return;
    if (doneItems.length === 1) {
      downloadOne(doneItems[0].id);
      return;
    }
    const names = uniqueNames(doneItems.map((i) => i.outName!));
    setZipPct(0);
    try {
      await zipAndSave(
        doneItems.map((i, n) => ({ name: names[n], blob: i.blob! })),
        "converted-images.zip",
        setZipPct,
      );
    } finally {
      setZipPct(null);
    }
  };

  // ---- derived progress numbers (real, weighted by file size) ----
  const runItems = run ? items.filter((i) => run.ids.has(i.id)) : [];
  const totalBytes = runItems.reduce((s, i) => s + i.file.size, 0);
  const finishedBytes = runItems
    .filter((i) => i.status === "done" || i.status === "error")
    .reduce((s, i) => s + i.file.size, 0);
  const finishedCount = runItems.filter((i) => i.status === "done" || i.status === "error").length;
  const pct = totalBytes > 0 ? (finishedBytes / totalBytes) * 100 : 0;
  const elapsed = run ? (run.finishedAt ?? now) - run.startedAt : 0;
  const eta = running && pct >= 3 ? (elapsed * (100 - pct)) / pct : null;
  const failed = runItems.filter((i) => i.status === "error").length;

  const origTotal = doneItems.reduce((s, i) => s + i.file.size, 0);
  const newTotal = doneItems.reduce((s, i) => s + (i.outSize ?? 0), 0);
  const savedPct = origTotal > 0 ? Math.round((1 - newTotal / origTotal) * 100) : 0;


  const hasItems = items.length > 0;
  const showPanel = run !== null || zipPct !== null || doneItems.length > 0;
  const BTN =
    "flex h-9 items-center gap-2 rounded-md px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60";

  const actions = hasItems ? (
    <>
      {doneItems.length > 0 && (
        <button
          type="button"
          onClick={downloadAll}
          disabled={zipPct !== null}
          className={`${BTN} border border-line-strong hover:bg-raised disabled:opacity-50`}
        >
          {doneItems.length > 1 ? (
            <Archive className="size-4" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {doneItems.length > 1 ? `Download ZIP · ${doneItems.length}` : "Download"}
        </button>
      )}
      {running ? (
        <button type="button" onClick={cancel} className={`${BTN} border border-line-strong hover:bg-raised`}>
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={pending.length === 0}
          className={`${BTN} bg-foreground text-background hover:bg-white disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted`}
        >
          {pending.length === 0
            ? "All converted"
            : `Convert ${pending.length} image${pending.length === 1 ? "" : "s"}`}
        </button>
      )}
    </>
  ) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="#ececef" />
              <path d="M10 8.5 16 14.5 22 8.5M10 23.5 16 17.5 22 23.5" fill="none" stroke="#09090b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Squeeze</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Lock className="size-3.5" aria-hidden /> Files never leave your browser
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-10 sm:px-6">
        {!hasItems && (
          <div className="pb-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Compress images for the web.</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              Convert PNG and JPG files to WebP or SVG in bulk. Names are kept, quality stays high, and file sizes drop
              dramatically.
            </p>
          </div>
        )}

        <SettingsBar settings={settings} onChange={setSettings} disabled={running} actions={actions} />

        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-md border border-line bg-surface px-4 py-2.5 text-[13px]"
          >
            <span className="text-muted">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-xs text-muted hover:text-foreground">
              Dismiss
            </button>
          </div>
        )}

        {!hasItems && <DropZone onFiles={addFiles} compact={false} />}

        {hasItems && (
          <>
            {showPanel && (
              <section aria-label="Progress" className="rounded-lg border border-line bg-surface">
                {(run || zipPct !== null) && (
                  <div className="space-y-4 p-4">
                    {run && (
                      <ProgressBar
                        label={
                          running
                            ? `Converting ${finishedCount} of ${runItems.length}`
                            : failed
                              ? `Finished with ${failed} error${failed === 1 ? "" : "s"}`
                              : `Finished ${runItems.length} in ${formatDuration(elapsed)}`
                        }
                        percent={run.finishedAt !== null ? 100 : pct}
                        detail={
                          running
                            ? `${Math.floor(pct)}% · ${formatDuration(elapsed)}${eta !== null ? ` · about ${formatDuration(eta)} left` : ""}`
                            : "100%"
                        }
                      />
                    )}
                    {zipPct !== null && (
                      <ProgressBar label="Building ZIP" percent={zipPct} detail={`${Math.floor(zipPct)}%`} />
                    )}
                  </div>
                )}
                {doneItems.length > 0 && (
                  <dl
                    className={`grid grid-cols-2 gap-px bg-line sm:grid-cols-4 ${run || zipPct !== null ? "border-t border-line" : ""}`}
                  >
                    {[
                      { k: "Converted", v: String(doneItems.length), c: "" },
                      { k: "Original", v: formatBytes(origTotal), c: "" },
                      { k: "Output", v: formatBytes(newTotal), c: "" },
                      {
                        k: "Saved",
                        v: savedPct > 0 ? `${savedPct}%` : `+${Math.abs(savedPct)}%`,
                        c: savedPct > 0 ? "text-good" : "",
                      },
                    ].map((s) => (
                      <div key={s.k} className="bg-surface px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{s.k}</dt>
                        <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${s.c}`}>{s.v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )}

            <section aria-label="Images" className="overflow-hidden rounded-lg border border-line bg-surface">
              <div
                className={`${ROW_GRID} border-b border-line px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted`}
              >
                <span>File</span>
                <span className="hidden text-right md:block">Original</span>
                <span className="text-right">Output</span>
                <span className="hidden text-right md:block">Saved</span>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={running}
                    aria-label="Clear all images"
                    title="Clear all"
                    className="rounded p-1.5 text-muted transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/60 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <ul>
                {items.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    locked={running}
                    onRemove={removeItem}
                    onDownload={downloadOne}
                  />
                ))}
              </ul>
            </section>

            <DropZone onFiles={addFiles} compact />
          </>
        )}
      </main>
    </div>
  );
}
