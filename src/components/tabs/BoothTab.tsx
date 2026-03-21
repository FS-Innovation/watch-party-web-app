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
  { id: "classic", label: "Teal", bgColor: "#0e0e0e", logoColor: "#1a6b7a", accentColor: "#1c1b1b" },
  { id: "gold", label: "Sand", bgColor: "#1a1408", logoColor: "#efbd8a", accentColor: "#2a2210" },
  { id: "silver", label: "Silver", bgColor: "#111114", logoColor: "#8bd1e2", accentColor: "#1c1c20" },
  { id: "neon", label: "Crimson", bgColor: "#0e0808", logoColor: "#b43041", accentColor: "#1a0a0e" },
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
    const cornerLen = 60;
    const cornerInset = 16;

    // Corner brackets (teal)
    ctx.strokeStyle = "#1a6b7a";
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(cornerInset, cornerInset + cornerLen);
    ctx.lineTo(cornerInset, cornerInset);
    ctx.lineTo(cornerInset + cornerLen, cornerInset);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(w - cornerInset - cornerLen, cornerInset);
    ctx.lineTo(w - cornerInset, cornerInset);
    ctx.lineTo(w - cornerInset, cornerInset + cornerLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(cornerInset, h - cornerInset - cornerLen);
    ctx.lineTo(cornerInset, h - cornerInset);
    ctx.lineTo(cornerInset + cornerLen, h - cornerInset);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(w - cornerInset - cornerLen, h - cornerInset);
    ctx.lineTo(w - cornerInset, h - cornerInset);
    ctx.lineTo(w - cornerInset, h - cornerInset - cornerLen);
    ctx.stroke();

    // Bottom banner
    const bannerH = 90;
    const grad = ctx.createLinearGradient(0, h - bannerH, 0, h);
    grad.addColorStop(0, "rgba(14, 14, 14, 0.0)");
    grad.addColorStop(0.4, "rgba(14, 14, 14, 0.85)");
    grad.addColorStop(1, "rgba(14, 14, 14, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - bannerH, w, bannerH);

    // Banner text
    ctx.fillStyle = "#efbd8a";
    ctx.font = "bold 24px Epilogue, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("BTD PRIVATE SCREENING", w / 2, h - 45);

    ctx.fillStyle = "#8bd1e2";
    ctx.font = "11px Inter, sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(), w / 2, h - 22);

    // Top bar
    const topGrad = ctx.createLinearGradient(0, 0, 0, 50);
    topGrad.addColorStop(0, "rgba(14, 14, 14, 0.9)");
    topGrad.addColorStop(1, "rgba(14, 14, 14, 0.0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 50);

    ctx.fillStyle = "#1a6b7a";
    ctx.font = "bold 16px Epilogue, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("BTD", 30, 33);

    ctx.fillStyle = "rgba(139, 209, 226, 0.5)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`#BTD-${String(user?.ticket_number || 0).padStart(4, "0")}`, w - 30, 33);
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
    <div className="pt-12 pb-28 px-6 max-w-2xl mx-auto min-h-screen">
      {/* Header */}
      <section className="mb-8">
        <div className="space-y-1 mb-2">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-on-surface-variant font-medium">
            STEP & REPEAT
          </p>
          <div className="h-0.5 w-12 bg-primary-container" />
        </div>
        <h2 className="font-headline font-bold uppercase tracking-tighter text-4xl leading-none text-on-surface">
          VIRTUAL BOOTH
        </h2>
        <p className="font-body text-sm font-light text-on-surface-variant/70 tracking-wide mt-2">
          Pick your backdrop and strike a pose
        </p>
      </section>

      <canvas ref={canvasRef} className="hidden" />

      {/* Backdrop selector — shown before and during camera */}
      {!photo && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {BACKDROPS.map((backdrop) => (
            <button
              key={backdrop.id}
              onClick={() => setSelectedBackdrop(backdrop)}
              className={`flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-all active:scale-95 ${
                selectedBackdrop.id === backdrop.id
                  ? "border-primary-container ring-2 ring-primary-container/30"
                  : "border-outline-variant/20"
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
          <div className="flex items-center pl-2">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40">
              {selectedBackdrop.label}
            </span>
          </div>
        </div>
      )}

      {/* Initial state — open camera button */}
      {!cameraActive && !photo && (
        <div className="flex flex-col items-center">
          <button
            onClick={startCamera}
            className="w-full aspect-square max-w-sm bg-surface-container-lowest border border-outline-variant/15 flex flex-col items-center justify-center gap-4 hover:border-primary-container/40 transition-all active:scale-[0.98] relative overflow-hidden"
          >
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary-container/40" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary-container/40" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary-container/40" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary-container/40" />

            <span className="material-symbols-outlined text-5xl text-primary-container/60">
              photo_camera
            </span>
            <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant/60">
              Open Camera
            </span>
          </button>
        </div>
      )}

      {/* Camera active — live preview with background replacement */}
      {cameraActive && (
        <div className="relative w-full max-w-sm mx-auto">
          {/* Live feed indicator */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-surface/70 backdrop-blur-sm px-3 py-1.5 rounded-sm">
            <div className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse shadow-[0_0_8px_#b43041]" />
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              Live Feed
            </span>
          </div>

          {/* Metadata */}
          <div className="absolute top-4 right-4 z-10 bg-surface/70 backdrop-blur-sm px-3 py-1.5 rounded-sm">
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant/50">
              ISO 100 · 4K
            </span>
          </div>

          {/* Video container with corner brackets */}
          <div className="relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-primary-container z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 border-primary-container z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 border-primary-container z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-primary-container z-10 pointer-events-none" />

            {/* Hidden video element for MediaPipe input */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={segmenterReady ? "hidden" : "w-full aspect-square object-cover"}
            />

            {/* Composited canvas (person + backdrop) */}
            {segmenterReady && (
              <canvas
                ref={compositeCanvasRef}
                className="w-full aspect-square object-cover"
              />
            )}

            {/* Loading indicator */}
            {loadingSegmenter && !segmenterReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/60 backdrop-blur-sm">
                <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin mb-3" />
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant animate-pulse">
                  Loading backdrop...
                </p>
              </div>
            )}
          </div>

          {/* Capture button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-on-surface/80 bg-transparent active:scale-90 transition-transform relative"
            >
              <div className="absolute inset-1.5 rounded-full bg-on-surface/90" />
            </button>
          </div>
        </div>
      )}

      {/* Photo captured — review and actions */}
      {photo && (
        <div className="space-y-6 w-full max-w-sm mx-auto">
          <div className="relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-primary-container z-10" />
            <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 border-primary-container z-10" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 border-primary-container z-10" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-primary-container z-10" />
            <img
              src={photo}
              alt="Your photo"
              className="w-full aspect-square"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 py-4 border border-outline-variant/20 text-on-surface-variant font-label text-sm uppercase tracking-widest hover:border-primary-container/40 transition-all active:scale-[0.98]"
            >
              Retake
            </button>
            <button
              onClick={() => { savePhoto(); downloadPhoto(); }}
              className="flex-1 py-4 bg-primary-container text-on-primary-container font-headline font-bold text-sm uppercase tracking-widest hover:bg-primary-container/80 transition-all active:scale-[0.98]"
            >
              Save
            </button>
          </div>
          {"share" in navigator && (
            <button
              onClick={sharePhoto}
              className="w-full py-4 border border-secondary/30 text-secondary font-label text-sm uppercase tracking-widest hover:bg-secondary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              Share to Socials
            </button>
          )}
        </div>
      )}
    </div>
  );
}
