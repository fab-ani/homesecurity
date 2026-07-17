"use client";

import { useRef, useState } from "react";
import { Images, Camera, Smartphone } from "lucide-react";
import { useMqtt } from "@/lib/useMqtt";
import { StatusChip } from "./StatusChip";
import { GalleryModal } from "./GalleryModal";

export function SecurityDashboard() {
  const {
    isConnected,
    isHardwareOnline,
    isCameraOn,
    statusMessage,
    currentFrame,
    captures,
    toggleCamera,
    deleteCapture,
    dismissAlert,
    retryConnect,
    addPhoneCapture,
  } = useMqtt();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      // Resize to max 1024px on the longest side to keep memory low
      const MAX = 1024;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      addPhoneCapture(dataUrl);
    };
    img.src = blobUrl;
  }
  const isAlert = statusMessage.includes("ALERT");
  const lastCapture = captures.length > 0 ? captures[captures.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* App bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-cyan-400" />
          <span className="font-bold text-base sm:text-lg">Your home security</span>
        </div>
        <button
          disabled={captures.length === 0}
          onClick={() => setGalleryOpen(true)}
          className="relative p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <Images size={22} />
          {captures.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center leading-none">
              {captures.length > 99 ? "99" : captures.length}
            </span>
          )}
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-3 p-3 sm:p-4 max-w-2xl mx-auto w-full">

        {/* Status chips */}
        <div className="grid grid-cols-2 gap-2">
          <StatusChip
            label="App MQTT"
            online={isConnected}
            onRetry={isConnected ? undefined : retryConnect}
          />
          <StatusChip label="Hardware" online={isHardwareOnline} />
        </div>

        {/* Alert / status card */}
        <div
          className={`rounded-xl p-4 transition-colors ${
            isAlert ? "bg-red-900 border border-red-500" : "bg-gray-800"
          }`}
        >
          <p
            className="text-base sm:text-lg font-bold text-center whitespace-pre-line"
          >
            {statusMessage}
          </p>
          {isAlert && (
            <div className="flex justify-center mt-3">
              <button
                onClick={dismissAlert}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
              >
                ✕ Dismiss Alert
              </button>
            </div>
          )}
        </div>

        {/* Camera view */}
        <div className="flex-1 min-h-48 sm:min-h-64 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
          {currentFrame ? (
            <div className="relative w-full h-full">
              <img
                src={currentFrame}
                alt="Live capture"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Captured — storing...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-4 w-full h-full">
              <p className="text-gray-400 text-sm text-center">
                Upload an image and run preprocessing to see results.
              </p>
              {lastCapture && (
                <div className="flex-1 w-full min-h-0">
                  <img
                    src={lastCapture.dataUrl}
                    alt="Last capture"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera toggle */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <div>
            <p className="font-medium text-sm sm:text-base">Remote Camera Control</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {isCameraOn ? "Streaming via GSM Network" : "Standby Mode"}
            </p>
          </div>
          <button
            disabled={!isConnected}
            onClick={() => toggleCamera(!isCameraOn)}
            className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-40 ${
              isCameraOn ? "bg-cyan-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                isCameraOn ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Phone camera button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoFile}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors text-sm font-medium text-white border border-white/10"
        >
          <Smartphone size={17} className="text-cyan-400" />
          Use Device Camera
        </button>

      </main>

      {/* Gallery modal */}
      {galleryOpen && (
        <GalleryModal
          captures={captures}
          onDelete={deleteCapture}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
