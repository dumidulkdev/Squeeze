import type { Settings, WorkerIn, WorkerOut } from "./types";

interface Job {
  id: string;
  file: File;
}

interface BatchHandlers {
  onStage: (id: string, stage: "decoding" | "encoding") => void;
  onDone: (id: string, blob: Blob, width: number, height: number) => void;
  onError: (id: string, message: string) => void;
  onFinish: () => void;
}

export function poolSize(): number {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(1, Math.min(6, cores - 1));
}

/** Runs jobs on a pool of workers. Returns a cancel function. */
export function runBatch(
  jobs: Job[],
  settings: Settings,
  handlers: BatchHandlers,
): () => void {
  const queue = [...jobs];
  const workers = new Set<Worker>();
  let remaining = jobs.length;
  let cancelled = false;

  const finishOne = () => {
    remaining--;
    if (remaining === 0 && !cancelled) {
      workers.forEach((w) => w.terminate());
      workers.clear();
      handlers.onFinish();
    }
  };

  const spawn = () => {
    const worker = new Worker(new URL("../workers/convert.worker.ts", import.meta.url), {
      type: "module",
    });
    let current: string | null = null;

    const next = () => {
      const job = queue.shift();
      if (!job) {
        current = null;
        return;
      }
      current = job.id;
      const msg: WorkerIn = { id: job.id, file: job.file, settings };
      worker.postMessage(msg);
    };

    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      if (cancelled) return;
      const m = e.data;
      if (m.type === "stage") handlers.onStage(m.id, m.stage);
      else if (m.type === "done") {
        handlers.onDone(m.id, m.blob, m.width, m.height);
        finishOne();
        next();
      } else {
        handlers.onError(m.id, m.message);
        finishOne();
        next();
      }
    };

    // A crashed worker (e.g. out of memory) fails its current file; replace it and go on.
    worker.onerror = () => {
      if (cancelled) return;
      worker.terminate();
      workers.delete(worker);
      if (current) {
        handlers.onError(current, "The converter crashed on this file (it may be too large).");
        finishOne();
      }
      if (queue.length > 0) spawn();
    };

    workers.add(worker);
    next();
  };

  const count = Math.min(poolSize(), jobs.length);
  for (let i = 0; i < count; i++) spawn();
  if (jobs.length === 0) handlers.onFinish();

  return () => {
    cancelled = true;
    workers.forEach((w) => w.terminate());
    workers.clear();
  };
}
