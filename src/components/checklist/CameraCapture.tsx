import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Video, RefreshCw, X, Square, Circle } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  mode: "photo" | "video";
  onCapture: (dataUrl: string, type: "photo" | "video", name: string) => void;
  maxVideoSeconds?: number;
}

export function CameraCapture({ open, onClose, mode, onCapture, maxVideoSeconds = 30 }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCameraReady(false);
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    stopStream();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: mode === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }, [mode, stopStream]);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open]);

  const handleSwitchCamera = () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ratio = Math.min(1, 1920 / video.videoWidth);
    canvas.width = video.videoWidth * ratio;
    canvas.height = video.videoHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const name = `foto_${Date.now()}.jpg`;
    onCapture(dataUrl, "photo", name);
    toast.success("Foto capturada!");
    onClose();
  };

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const name = `video_${Date.now()}.webm`;
          onCapture(dataUrl, "video", name);
          toast.success("Vídeo gravado!");
          onClose();
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev + 1 >= maxVideoSeconds) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Erro ao iniciar gravação");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {mode === "photo" ? <Camera className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            {mode === "photo" ? "Capturar Foto" : "Gravar Vídeo"}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={mode === "photo"}
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-destructive-foreground" />
              {recordingTime}s / {maxVideoSeconds}s
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6">
              <div className="text-center space-y-3">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={() => startCamera(facingMode)}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 p-4">
          <Button variant="outline" size="icon" onClick={handleSwitchCamera} disabled={!cameraReady || isRecording}>
            <RefreshCw className="w-5 h-5" />
          </Button>

          {mode === "photo" ? (
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90"
              onClick={handleCapturePhoto}
              disabled={!cameraReady}
            >
              <Circle className="w-8 h-8" />
            </Button>
          ) : isRecording ? (
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
              onClick={handleStopRecording}
            >
              <Square className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
              onClick={handleStartRecording}
              disabled={!cameraReady}
            >
              <Circle className="w-8 h-8 fill-current" />
            </Button>
          )}

          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
