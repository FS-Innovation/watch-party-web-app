"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function BoothTab() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [saving, setSaving] = useState(false);

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
    } catch {
      alert("Camera access is required for the photobooth.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;

    // Draw video (centered crop)
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 1080, 1080);

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
        Strike a pose for the red carpet
      </p>

      <canvas ref={canvasRef} className="hidden" />

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

      {cameraActive && (
        <div className="relative w-full max-w-sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-square object-cover rounded-2xl border-4 border-pink"
          />
          <button
            onClick={capturePhoto}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white bg-pink active:scale-90 transition-transform"
          />
        </div>
      )}

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
