import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Video, Paperclip, X, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { toast } from "sonner";
import { CameraCapture } from "./CameraCapture";

export interface MediaFile {
  id: string;
  type: "photo" | "video" | "file";
  name: string;
  dataUrl: string;
  timestamp: string;
}

interface MediaCaptureProps {
  mediaKey: string;
  media: Record<string, MediaFile[]>;
  onMediaChange: (key: string, files: MediaFile[]) => void;
  compact?: boolean;
}

const MAX_FILE_SIZE_MB = 10;

function generateId() {
  return `media_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function compressImage(file: File, maxWidth = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MediaCapture({ mediaKey, media, onMediaChange, compact = false }: MediaCaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [cameraMode, setCameraMode] = useState<"photo" | "video" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const currentFiles = media[mediaKey] || [];

  const addFile = (file: MediaFile) => {
    onMediaChange(mediaKey, [...currentFiles, file]);
  };

  const removeFile = (fileId: string) => {
    onMediaChange(mediaKey, currentFiles.filter(f => f.id !== fileId));
  };

  const handleCameraCapture = (dataUrl: string, type: "photo" | "video", name: string) => {
    addFile({ id: generateId(), type, name, dataUrl, timestamp: new Date().toISOString() });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Ficheiro muito grande (máx ${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    try {
      const isImage = file.type.startsWith("image/");
      const dataUrl = isImage ? await compressImage(file) : await fileToDataUrl(file);
      const type = isImage ? "photo" as const : file.type.startsWith("video/") ? "video" as const : "file" as const;
      addFile({ id: generateId(), type, name: file.name, dataUrl, timestamp: new Date().toISOString() });
      toast.success("Ficheiro anexado");
    } catch {
      toast.error("Erro ao processar ficheiro");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />

      <div className={compact ? "flex gap-1" : "flex gap-2 flex-wrap"}>
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} className={compact ? "h-7 text-xs gap-1 px-2" : "gap-1"} onClick={() => setCameraMode("photo")}>
          <Camera className={compact ? "w-3 h-3" : "w-4 h-4"} />
          {!compact && "Foto"}
        </Button>
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} className={compact ? "h-7 text-xs gap-1 px-2" : "gap-1"} onClick={() => setCameraMode("video")}>
          <Video className={compact ? "w-3 h-3" : "w-4 h-4"} />
          {!compact && "Vídeo"}
        </Button>
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} className={compact ? "h-7 text-xs gap-1 px-2" : "gap-1"} onClick={() => fileRef.current?.click()}>
          <Paperclip className={compact ? "w-3 h-3" : "w-4 h-4"} />
          {!compact && "Anexar"}
        </Button>
        {currentFiles.length > 0 && (
          <span className="text-xs text-muted-foreground self-center ml-1">
            {currentFiles.length} ficheiro{currentFiles.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {currentFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {currentFiles.map(f => (
            <div key={f.id} className="relative group w-14 h-14 rounded-md border overflow-hidden bg-muted">
              {f.type === "photo" ? (
                <img src={f.dataUrl} alt={f.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewFile(f)} />
              ) : f.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center cursor-pointer bg-muted" onClick={() => setPreviewFile(f)}>
                  <Video className="w-5 h-5 text-muted-foreground" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center cursor-pointer bg-muted" onClick={() => setPreviewFile(f)}>
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setDeleteTarget(f.id)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Camera Capture Dialog */}
      {cameraMode && (
        <CameraCapture
          open={!!cameraMode}
          onClose={() => setCameraMode(null)}
          mode={cameraMode}
          onCapture={handleCameraCapture}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{previewFile?.name}</span>
              <Button variant="ghost" size="icon" onClick={() => { if (previewFile) { setDeleteTarget(previewFile.id); } }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewFile?.type === "photo" && (
            <img src={previewFile.dataUrl} alt={previewFile.name} className="w-full rounded-lg" />
          )}
          {previewFile?.type === "video" && (
            <video src={previewFile.dataUrl} controls className="w-full rounded-lg" />
          )}
          {previewFile?.type === "file" && (
            <div className="text-center py-8">
              <Paperclip className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{previewFile.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            removeFile(deleteTarget);
            if (previewFile?.id === deleteTarget) setPreviewFile(null);
            setDeleteTarget(null);
          }
        }}
        title="Excluir ficheiro"
        description="Tem certeza que deseja excluir este ficheiro? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
