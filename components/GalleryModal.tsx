"use client";

import { useState } from "react";
import { X, Trash2, ZoomIn } from "lucide-react";
import type { CapturedFrame } from "@/lib/useMqtt";

interface Props {
  captures: CapturedFrame[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

function fmt(d: Date) {
  const p = (v: number) => v.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function kb(bytes: Uint8Array) {
  return (bytes.length / 1024).toFixed(1) + " KB";
}

export function GalleryModal({ captures, onDelete, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState<CapturedFrame | null>(null);
  const items = [...captures].reverse();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-white font-semibold">
          Captured Images ({captures.length})
        </span>
        <button onClick={onClose} className="text-white hover:opacity-70">
          <X size={22} />
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          No captures yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((c, i) => (
            <div
              key={c.id}
              className="bg-gray-900 rounded-xl overflow-hidden border border-white/10"
            >
              {/* Thumbnail */}
              <div className="relative group">
                <img
                  src={c.dataUrl}
                  alt={`Capture ${items.length - i}`}
                  className="w-full h-44 object-cover"
                />
                <button
                  onClick={() => setFullscreen(c)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ZoomIn size={28} className="text-white" />
                </button>
              </div>

              {/* Info row */}
              <div className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-white text-sm font-semibold">
                    Capture #{items.length - i}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{fmt(c.time)}</p>
                  <p className="text-cyan-400 text-xs mt-0.5">{kb(c.bytes)}</p>
                </div>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col">
          <div className="flex justify-end px-3 py-2 shrink-0">
            <button
              onClick={() => setFullscreen(null)}
              className="text-white hover:opacity-70"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            <img
              src={fullscreen.dataUrl}
              alt="Fullscreen"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ touchAction: "pinch-zoom" }}
            />
          </div>
          <div className="text-center py-3 shrink-0">
            <p className="text-white/70 text-sm">{fmt(fullscreen.time)}</p>
            <p className="text-cyan-400 text-xs mt-1">{kb(fullscreen.bytes)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
