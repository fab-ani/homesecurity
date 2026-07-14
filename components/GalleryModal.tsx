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

function sizeKb(c: CapturedFrame) {
  // bytes is empty for images restored from localStorage; estimate from dataUrl
  const n = c.bytes.length > 0
    ? c.bytes.length
    : Math.round((c.dataUrl.length - c.dataUrl.indexOf(",") - 1) * 3 / 4);
  return (n / 1024).toFixed(1) + " KB";
}

function ImgDims({ src }: { src: string }) {
  const [dims, setDims] = useState<string | null>(null);
  return (
    <>
      <img src={src} alt="" className="hidden" onLoad={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        setDims(`${el.naturalWidth} × ${el.naturalHeight} px`);
      }} />
      {dims && <span className="text-cyan-400 text-xs">{dims}</span>}
    </>
  );
}

export function GalleryModal({ captures, onDelete, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState<CapturedFrame | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const items = [...captures].reverse();

  function handleDelete(id: string) {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 shrink-0">
        <span className="text-white font-semibold text-base">
          Captured Images ({captures.length})
        </span>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={22} />
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          No captures yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {items.map((c, i) => (
            <div
              key={c.id}
              className="bg-gray-900 rounded-2xl overflow-hidden border border-white/10"
            >
              {/* Image — contain so nothing gets cropped */}
              <div
                className="relative w-full bg-gray-800 flex items-center justify-center cursor-pointer"
                style={{ minHeight: "260px" }}
                onClick={() => setFullscreen(c)}
              >
                <img
                  src={c.dataUrl}
                  alt={`Capture ${items.length - i}`}
                  className="max-w-full max-h-72 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                  <ZoomIn size={32} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Info */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white font-semibold text-sm">
                      Capture #{items.length - i}
                    </span>
                    <span className="text-gray-400 text-xs">{fmt(c.time)}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-gray-500 text-xs">{sizeKb(c)}</span>
                      <ImgDims src={c.dataUrl} />
                    </div>
                  </div>

                  {/* Delete — tap once to arm, tap again to confirm */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    onBlur={() => setConfirmId(null)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      confirmId === c.id
                        ? "bg-red-600 text-white"
                        : "bg-gray-700 text-red-400 hover:bg-red-900/40"
                    }`}
                  >
                    <Trash2 size={14} />
                    {confirmId === c.id ? "Confirm" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen */}
      {fullscreen && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col">
          <div className="flex justify-end px-3 py-2 shrink-0">
            <button
              onClick={() => setFullscreen(null)}
              className="text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={fullscreen.dataUrl}
              alt="Fullscreen capture"
              className="max-w-full max-h-full object-contain"
              style={{ touchAction: "pinch-zoom", imageRendering: "pixelated" }}
            />
          </div>
          <div className="text-center py-3 px-4 shrink-0 flex flex-col gap-1">
            <span className="text-white/70 text-sm">{fmt(fullscreen.time)}</span>
            <div className="flex justify-center gap-3">
              <span className="text-gray-500 text-xs">{sizeKb(fullscreen)}</span>
              <ImgDims src={fullscreen.dataUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
