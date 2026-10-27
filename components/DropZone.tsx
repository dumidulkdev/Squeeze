"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  compact: boolean;
}

export default function DropZone({ onFiles, compact }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`group flex w-full items-center justify-center gap-3 border border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60 ${
          over ? "border-foreground/60 bg-raised" : "border-line-strong hover:bg-surface"
        } ${compact ? "rounded-md py-3.5 text-[13px]" : "flex-col rounded-lg py-20"}`}
      >
        {compact ? (
          <>
            <Plus className="size-4 text-muted group-hover:text-foreground" aria-hidden />
            <span className="text-muted group-hover:text-foreground">Add more images, or drop them here</span>
          </>
        ) : (
          <>
            <span className="flex size-11 items-center justify-center rounded-lg border border-line bg-raised text-muted">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            <span className="text-[15px] font-medium">Drop images here, or click to browse</span>
            <span className="text-[13px] text-muted">PNG, JPG and JPEG. Add as many as you like.</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
