"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  label: string;
  online: boolean;
  onRetry?: () => void;
}

export function StatusChip({ label, online, onRetry }: Props) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold select-none ${
        online ? "bg-green-700" : "bg-red-800"
      }`}
    >
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span className="truncate">
        {label}: {online ? "Online" : "Offline"}
      </span>
      {!online && onRetry && (
        <button onClick={onRetry} className="ml-auto hover:opacity-80">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}
