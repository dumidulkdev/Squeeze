"use client";

import { memo } from "react";
import { CircleAlert, Download, LoaderCircle, X } from "lucide-react";
import type { Item } from "@/lib/types";
import { formatBytes } from "@/lib/format";

/** Shared by the table header in Converter so columns line up. */
export const ROW_GRID =
  "grid items-center gap-x-4 grid-cols-[minmax(0,1fr)_auto_64px] md:grid-cols-[minmax(0,1fr)_88px_104px_64px_64px]";

interface Props {
  item: Item;
  locked: boolean;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
}

const ICON_BTN =
  "rounded p-1.5 text-muted transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/60 disabled:pointer-events-none disabled:opacity-30";

function FileRow({ item, locked, onRemove, onDownload }: Props) {
  const { file, status } = item;
  const saved =
    status === "done" && item.outSize !== undefined && file.size > 0
      ? Math.round((1 - item.outSize / file.size) * 100)
      : null;
  const busy = status === "decoding" || status === "encoding";

  const savedEl =
    saved === null ? null : (
      <span className={`tabular-nums ${saved > 0 ? "text-good" : "text-muted"}`}>
        {saved > 0 ? `−${saved}%` : `+${Math.abs(saved)}%`}
      </span>
    );

  return (
    <li className={`row-cv ${ROW_GRID} border-b border-line px-4 py-2.5 text-[13px] last:border-b-0`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-9 shrink-0 overflow-hidden rounded bg-raised">
          {item.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="truncate text-xs text-muted tabular-nums">
            {status === "error" ? (
              <span className="text-red-400">{item.error}</span>
            ) : item.width ? (
              `${item.width}×${item.height}`
            ) : (
              file.type === "image/png" ? "PNG" : "JPG"
            )}
          </p>
        </div>
      </div>

      <span className="hidden text-right text-muted tabular-nums md:block">{formatBytes(file.size)}</span>

      <div className="flex items-center justify-end gap-2 text-right tabular-nums">
        {status === "done" && item.outSize !== undefined && (
          <div className="flex flex-col items-end md:block">
            <span>{formatBytes(item.outSize)}</span>
            <span className="text-xs md:hidden">{savedEl}</span>
          </div>
        )}
        {busy && (
          <span className="flex items-center gap-1.5 text-muted">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            <span className="hidden sm:inline">{status === "decoding" ? "Reading" : "Converting"}</span>
          </span>
        )}
        {status === "queued" && <span className="text-muted">Queued</span>}
        {status === "error" && <CircleAlert className="size-4 text-red-400" aria-label="Failed" />}
      </div>

      <span className="hidden text-right md:block">{savedEl}</span>

      <div className="flex items-center justify-end">
        {status === "done" && (
          <button
            type="button"
            onClick={() => onDownload(item.id)}
            aria-label={`Download ${item.outName}`}
            className={ICON_BTN}
          >
            <Download className="size-4" />
          </button>
        )}
        <button
          type="button"
          disabled={locked}
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${file.name}`}
          className={ICON_BTN}
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

export default memo(FileRow);
