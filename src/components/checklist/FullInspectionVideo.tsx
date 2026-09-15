import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, Play, RotateCcw, Check, Trash2 } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { MediaFile } from "@/types/checklist";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";

interface FullInspectionVideoProps {
  mediaKey: string;
  media: Record<string, MediaFile[]>;
  onMediaChange: (key: string, files: MediaFile[]) => void;
}

export function FullInspectionVideo({ mediaKey, media, onMediaChange }: FullInspectionVideoProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const videos = (media[mediaKey] || []).filter(f => f.type === "video");
  const hasVideo = videos.length > 0;
  const latestVideo = hasVideo ? videos[videos.length - 1] : null;

  const handleCapture = (dataUrl: string, type: "photo" | "video", name: string) => {
    const newFile: MediaFile = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      name,
      dataUrl,
      timestamp: new Date().toISOString(),
    };
    onMediaChange(mediaKey, [...(media[mediaKey] || []), newFile]);
  };

  const handleDelete = () => {
    onMediaChange(mediaKey, []);
    setPreviewOpen(false);
  };

  return (
    <>
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Inspeção Geral do Veículo</h4>
              <p className="text-xs text-muted-foreground">Grave um vídeo completo andando em volta do carro</p>
            </div>
          </div>

          {hasVideo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm text-success font-medium">Vídeo gravado com sucesso</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Play className="w-3.5 h-3.5" /> Assistir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowCamera(true)}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Gravar novamente
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Apagar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="default"
              className="w-full gap-2"
              onClick={() => setShowCamera(true)}
            >
              <Video className="w-4 h-4" /> Gravar Inspeção Completa
            </Button>
          )}
        </CardContent>
      </Card>

      {showCamera && (
        <CameraCapture
          open={true}
          onClose={() => setShowCamera(false)}
          mode="video"
          onCapture={handleCapture}
          maxVideoSeconds={60}
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" /> Vídeo da Inspeção Completa
            </DialogTitle>
          </DialogHeader>
          {latestVideo && (
            <video src={latestVideo.dataUrl} controls className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          handleDelete();
          setDeleteOpen(false);
        }}
        title="Excluir vídeo de inspeção"
        description="Tem certeza que deseja excluir o vídeo da inspeção completa? Esta ação não pode ser desfeita."
      />
    </>
  );
}
