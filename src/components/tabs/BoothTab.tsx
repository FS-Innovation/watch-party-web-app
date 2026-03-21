"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
// MediaPipe is loaded dynamically to avoid webpack module resolution issues
type ImageSegmenterType = {
  segmentForVideo: (video: HTMLVideoElement, timestamp: number) => {
    categoryMask?: { getAsUint8Array: () => Uint8Array; width: number; height: number; close: () => void };
  };
  close: () => void;
};

// --- Backdrop generation (canvas-drawn step-and-repeat patterns) ---

interface Backdrop {
  id: string;
  label: string;
  bgColor: string;
  logoColor: string;
  accentColor: string;
}

const BACKDROPS: Backdrop[] = [
  { id: "classic", label: "Classic", bgColor: "#0a0a0a", logoColor: "#e91e8c", accentColor: "#1a1a1a" },
  { id: "gold", label: "Gold", bgColor: "#1a1408", logoColor: "#d4a843", accentColor: "#2a2210" },
  { id: "silver", label: "Silver", bgColor: "#111114", logoColor: "#b0b0b8", accentColor: "#1c1c20" },
  { id: "neon", label: "Neon", bgColor: "#0a000a", logoColor: "#ff00ff", accentColor: "#1a001a" },
];

function drawStepAndRepeat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backdrop: Backdrop
) {
  // Fill background
  ctx.fillStyle = backdrop.bgColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid pattern
  ctx.strokeStyle = backdrop.accentColor;
  ctx.lineWidth = 1;
  const gridSize = 120;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Tiled "BTD" logos in a step-and-repeat pattern
  ctx.font = "bold 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const spacingX = 160;
  const spacingY = 120;

  for (let row = 0; row * spacingY < h + spacingY; row++) {
    const offsetX = row % 2 === 0 ? 0 : spacingX / 2;
    for (let col = -1; col * spacingX < w + spacingX; col++) {
      const x = col * spacingX + offsetX + spacingX / 2;
      const y = row * spacingY + spacingY / 2;

      // Logo text
      ctx.fillStyle = backdrop.logoColor;
      ctx.globalAlpha = 0.35;
      ctx.fillText("BTD", x, y - 12);

      // Subtitle
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = backdrop.logoColor;
      ctx.globalAlpha = 0.2;
      ctx.fillText("PRIVATE SCREENING", x, y + 10);

      ctx.font = "bold 28px Georgia, serif";
      ctx.globalAlpha = 1;
    }
  }
}

function generateBackdropThumbnail(backdrop: Backdrop): string {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  drawStepAndRepeat(ctx, 200, 200, backdrop);
  return canvas.toDataURL("image/jpeg", 0.8);
}

// --- Main component ---

export default function BoothTab() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const segmenterRef = useRef<ImageSegmenterType | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBackdrop, setSelectedBackdrop] = useState<Backdrop>(BACKDROPS[0]);
  const [segmenterReady, setSegmenterReady] = useState(false);
  const [loadingSegmenter, setLoadingSegmenter] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Generate thumbnails on mount
  useEffect(() => {
    const thumbs: Record<string, string> = {};
    BACKDROPS.forEach((b) => {
      thumbs[b.id] = generateBackdropThumbnail(b);
    });
    setThumbnails(thumbs);
  }, []);

  // Initialize MediaPipe segmenter
  const initSegmenter = useCallback(async () => {
    if (segmenterRef.current) return;
    setLoadingSegmenter(true);
    try {
      // Dynamic import to avoid webpack module resolution issues with MediaPipe
      const cdnUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { FilesetResolver, ImageSegmenter } = await (Function(`return import("${cdnUrl}")`)() as Promise<any>);
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      segmenterRef.current = segmenter as ImageSegmenterType;
      setSegmenterReady(true);
    } catch (err) {
      console.error("Failed to load segmenter:", err);
      // Fall back to no segmentation
      setSegmenterReady(false);
    } finally {
      setLoadingSegmenter(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      // Start loading segmenter in parallel
      initSegmenter();
    } catch {
      alert("Camera access is required for the photobooth.");
    }
  }, [initSegmenter]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (segmenterRef.current) {
        segmenterRef.current.close();
        segmenterRef.current = null;
      }
    };
  }, [stream]);

  // Real-time compositing loop
  useEffect(() => {
    if (!cameraActive || !segmenterReady) return;

    const video = videoRef.current;
    const compositeCanvas = compositeCanvasRef.current;
    if (!video || !compositeCanvas) return;

    const ctx = compositeCanvas.getContext("2d", { willReadFrequently: true })!;
    let lastTime = 0;

    const renderFrame = () => {
      if (!video || video.readyState < 2 || !segmenterRef.current) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const now = performance.now();
      // Throttle to ~20fps for performance
      if (now - lastTime < 50) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }
      lastTime = now;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const size = Math.min(vw, vh);
      compositeCanvas.width = size;
      compositeCanvas.height = size;

      // Crop center of video
      const sx = (vw - size) / 2;
      const sy = (vh - size) / 2;

      // Draw backdrop
      drawStepAndRepeat(ctx, size, size, selectedBackdrop);

      // Run segmentation
      const result = segmenterRef.current.segmentForVideo(video, now);
      const mask = result.categoryMask;

      if (mask) {
        // Draw video to an offscreen canvas for pixel access
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = size;
        tmpCanvas.height = size;
        const tmpCtx = tmpCanvas.getContext("2d")!;
        tmpCtx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

        const videoImageData = tmpCtx.getImageData(0, 0, size, size);
        const compositeImageData = ctx.getImageData(0, 0, size, size);
        const maskData = mask.getAsUint8Array();
        const maskWidth = mask.width;
        const maskHeight = mask.height;

        // Composite: where mask > 0 (person), use video pixels
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            // Map composite pixel to mask pixel
            const mx = Math.floor((x / size) * maskWidth);
            const my = Math.floor((y / size) * maskHeight);
            const maskIdx = my * maskWidth + mx;
            const isPerson = maskData[maskIdx] > 0;

            if (isPerson) {
              const idx = (y * size + x) * 4;
              compositeImageData.data[idx] = videoImageData.data[idx];
              compositeImageData.data[idx + 1] = videoImageData.data[idx + 1];
              compositeImageData.data[idx + 2] = videoImageData.data[idx + 2];
              compositeImageData.data[idx + 3] = 255;
            }
          }
        }

        ctx.putImageData(compositeImageData, 0, 0);
        mask.close();
      } else {
        // No mask available — just draw video
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [cameraActive, segmenterReady, selectedBackdrop]);

  const capturePhoto = () => {
    const compositeCanvas = compositeCanvasRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;

    if (compositeCanvas && segmenterReady && compositeCanvas.width > 0) {
      // Use the composited frame (person + backdrop)
      ctx.drawImage(compositeCanvas, 0, 0, 1080, 1080);
    } else {
      // Fallback: use raw video
      const video = videoRef.current;
      if (!video) return;
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 1080, 1080);
    }

    // Draw BTD frame overlay
    drawFrame(ctx, 1080, 1080);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhoto(dataUrl);
    stopCamera();
  };

  const drawFrame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Border
    ctx.strokeStyle = "#e91e8c";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Inner border
    ctx.strokeStyle = "rgba(233, 30, 140, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Bottom banner
    const bannerH = 100;
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, h - bannerH, w, bannerH);

    // Text
    ctx.fillStyle = "#e91e8c";
    ctx.font = "bold 28px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("BTD PRIVATE SCREENING", w / 2, h - 55);

    ctx.fillStyle = "#999";
    ctx.font = "16px Inter, sans-serif";
    ctx.fillText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), w / 2, h - 25);

    // Top corner logo area
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, w, 50);
    ctx.fillStyle = "#e91e8c";
    ctx.font = "bold 18px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("BTD", 30, 33);
    ctx.fillStyle = "#888";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`#${String(user?.ticket_number || 0).padStart(4, "0")}`, w - 30, 33);
  };

  const downloadPhoto = () => {
    if (!photo) return;
    const link = document.createElement("a");
    link.download = `btd-screening-${Date.now()}.jpg`;
    link.href = photo;
    link.click();
  };

  const sharePhoto = async () => {
    if (!photo) return;
    try {
      const blob = await fetch(photo).then((r) => r.blob());
      const file = new File([blob], "btd-screening.jpg", { type: "image/jpeg" });
      await navigator.share({ files: [file], title: "BTD Private Screening" });
    } catch {
      downloadPhoto();
    }
  };

  const savePhoto = async () => {
    if (!photo || saving) return;
    setSaving(true);
    try {
      const token = sessionStorage.getItem("magic_token");
      await fetch("/api/photobooth/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic_token: token, image_data: photo }),
      });
    } finally {
      setSaving(false);
    }
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  return (
    <div className="px-4 py-6 pb-24 flex flex-col items-center">
      <h2 className="font-serif text-2xl text-foreground mb-2 text-center">
        Virtual Step & Repeat
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Pick your backdrop and strike a pose
      </p>

      <canvas ref={canvasRef} className="hidden" />

      {/* Backdrop selector — shown before and during camera */}
      {!photo && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 w-full max-w-sm justify-center">
          {BACKDROPS.map((backdrop) => (
            <button
              key={backdrop.id}
              onClick={() => setSelectedBackdrop(backdrop)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                selectedBackdrop.id === backdrop.id
                  ? "border-pink ring-2 ring-pink/30"
                  : "border-border"
              }`}
            >
              {thumbnails[backdrop.id] ? (
                <img
                  src={thumbnails[backdrop.id]}
                  alt={backdrop.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: backdrop.bgColor }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Initial state — open camera button */}
      {!cameraActive && !photo && (
        <button
          onClick={startCamera}
          className="w-64 h-64 rounded-2xl border-2 border-dashed border-pink/40 flex flex-col items-center justify-center gap-3 hover:border-pink transition-colors active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-pink">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <span className="text-pink font-medium">Open Camera</span>
        </button>
      )}

      {/* Camera active — live preview with background replacement */}
      {cameraActive && (
        <div className="relative w-full max-w-sm">
          {/* Hidden video element for MediaPipe input */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={segmenterReady ? "hidden" : "w-full aspect-square object-cover rounded-2xl border-4 border-pink"}
          />

          {/* Composited canvas (person + backdrop) */}
          {segmenterReady && (
            <canvas
              ref={compositeCanvasRef}
              className="w-full aspect-square rounded-2xl border-4 border-pink object-cover"
            />
          )}

          {/* Loading indicator */}
          {loadingSegmenter && !segmenterReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <p className="text-white text-sm font-medium animate-pulse">
                Loading backdrop...
              </p>
            </div>
          )}

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white bg-pink active:scale-90 transition-transform"
          />
        </div>
      )}

      {/* Photo captured — review and actions */}
      {photo && (
        <div className="space-y-4 w-full max-w-sm">
          <img
            src={photo}
            alt="Your photo"
            className="w-full aspect-square rounded-2xl"
          />
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 py-3 rounded-xl border border-border text-gray-400 font-medium active:scale-[0.98]"
            >
              Retake
            </button>
            <button
              onClick={() => { savePhoto(); downloadPhoto(); }}
              className="flex-1 py-3 rounded-xl bg-pink text-white font-medium active:scale-[0.98]"
            >
              Save
            </button>
          </div>
          {"share" in navigator && (
            <button
              onClick={sharePhoto}
              className="w-full py-3 rounded-xl border border-pink text-pink font-medium active:scale-[0.98]"
            >
              Share to Socials
            </button>
          )}
        </div>
      )}
    </div>
  );
}
