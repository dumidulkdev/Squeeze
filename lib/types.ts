export type OutputFormat = "webp" | "svg-embedded" | "svg-traced";
export type TraceDetail = "low" | "medium" | "high";

export interface Settings {
  format: OutputFormat;
  quality: number; // 1-100
  maxWidth: number; // 0 = original size
  traceDetail: TraceDetail;
}

export const DEFAULT_SETTINGS: Settings = {
  format: "webp",
  quality: 80,
  maxWidth: 0,
  traceDetail: "medium",
};

export type Status = "queued" | "decoding" | "encoding" | "done" | "error";

export interface Item {
  id: string;
  file: File;
  thumb?: string;
  status: Status;
  blob?: Blob;
  outSize?: number;
  width?: number;
  height?: number;
  error?: string;
  outName?: string;
  doneWith?: string;
}

export type WorkerIn = { id: string; file: File; settings: Settings };
export type WorkerOut =
  | { type: "stage"; id: string; stage: "decoding" | "encoding" }
  | { type: "done"; id: string; blob: Blob; width: number; height: number }
  | { type: "error"; id: string; message: string };
