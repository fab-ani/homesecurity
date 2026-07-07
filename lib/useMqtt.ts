"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import { ChunkAssembler } from "./chunkAssembler";

export interface CapturedFrame {
  id: string;
  bytes: Uint8Array;
  dataUrl: string;
  time: Date;
}

const DEVICE = "hs-fab76";
const BROKER_WS = "wss://broker.hivemq.com:8884/mqtt";
const HARDWARE_TIMEOUT_MS = 30_000;
const MAX_CAPTURES = 50;
const LS_KEY = "hs_captures";

function loadFromStorage(): CapturedFrame[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr: { id: string; dataUrl: string; time: string }[] = JSON.parse(raw);
    return arr.map((item) => {
      const base64 = item.dataUrl.split(",")[1] ?? "";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { id: item.id, bytes, dataUrl: item.dataUrl, time: new Date(item.time) };
    });
  } catch {
    return [];
  }
}

function saveToStorage(captures: CapturedFrame[]) {
  try {
    const arr = captures.map((c) => ({ id: c.id, dataUrl: c.dataUrl, time: c.time.toISOString() }));
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
}

export function useMqtt() {
  const [isConnected, setIsConnected] = useState(false);
  const [isHardwareOnline, setIsHardwareOnline] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("PIR Status: Monitoring...");
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [captures, setCaptures] = useState<CapturedFrame[]>([]);

  const clientRef = useRef<MqttClient | null>(null);
  const assemblerRef = useRef(new ChunkAssembler());
  const hardwareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capturesRef = useRef<CapturedFrame[]>([]);

  // Keep ref in sync with state
  useEffect(() => { capturesRef.current = captures; }, [captures]);

  const markHardwareOnline = useCallback(() => {
    setIsHardwareOnline(true);
    if (hardwareTimerRef.current) clearTimeout(hardwareTimerRef.current);
    hardwareTimerRef.current = setTimeout(() => setIsHardwareOnline(false), HARDWARE_TIMEOUT_MS);
  }, []);

  const onFrameReceived = useCallback((frame: Uint8Array) => {
    const copy = new Uint8Array(frame).buffer as ArrayBuffer;
    const blob = new Blob([copy], { type: "image/jpeg" });
    const dataUrl = URL.createObjectURL(blob);

    const capture: CapturedFrame = {
      id: `${Date.now()}-${Math.random()}`,
      bytes: frame,
      dataUrl,
      time: new Date(),
    };

    setCaptures((prev) => {
      const next = [...prev, capture].slice(-MAX_CAPTURES);
      saveToStorage(next);
      return next;
    });

    if (frameTimerRef.current) clearTimeout(frameTimerRef.current);
    setCurrentFrame(dataUrl);
    frameTimerRef.current = setTimeout(() => setCurrentFrame(null), 4000);
  }, []);

  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    const clientId = `web-${Date.now()}`;
    const client = mqtt.connect(BROKER_WS, {
      clientId,
      clean: true,
      reconnectPeriod: 0,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setIsConnected(true);
      client.subscribe(`${DEVICE}/pir`);
      client.subscribe(`${DEVICE}/camera/stream`);
      client.subscribe(`${DEVICE}/status`);
    });

    client.on("message", (topic, payload) => {
      markHardwareOnline();
      if (topic === `${DEVICE}/status`) return;

      if (topic === `${DEVICE}/pir`) {
        const msg = new TextDecoder().decode(payload);
        if (msg.startsWith("PERSON_DETECTED")) {
          const val = msg.includes(":") ? msg.split(":").pop() : "HIGH";
          setStatusMessage(`ALERT: Motion Detected!\n${val}`);
        } else if (msg.startsWith("DOOR_OPENED")) {
          const val = msg.includes(":") ? msg.split(":").pop() : "HIGH";
          setStatusMessage(`ALERT: Door Opened!\n${val}`);
        }
        return;
      }

      if (topic === `${DEVICE}/camera/stream`) {
        const chunk = new Uint8Array(payload);
        const frame = assemblerRef.current.addChunk(chunk);
        if (frame) onFrameReceived(frame);
      }
    });

    client.on("close", () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    });

    client.on("error", () => {
      client.end(true);
    });
  }, [markHardwareOnline, onFrameReceived]);

  // Load persisted captures + connect on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setCaptures(stored);
    connect();
    return () => {
      clientRef.current?.end(true);
      if (hardwareTimerRef.current) clearTimeout(hardwareTimerRef.current);
      if (frameTimerRef.current) clearTimeout(frameTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = useCallback((value: boolean) => {
    const client = clientRef.current;
    if (!client || !client.connected) return;
    client.publish(`${DEVICE}/camera/control`, value ? "ON" : "OFF");
    setIsCameraOn(value);
    if (!value) setCurrentFrame(null);
  }, []);

  const deleteCapture = useCallback((id: string) => {
    setCaptures((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setStatusMessage("PIR Status: Monitoring...");
    setCurrentFrame(null);
  }, []);

  const retryConnect = useCallback(() => {
    connect();
  }, [connect]);

  return {
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
  };
}
