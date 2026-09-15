import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, ChevronLeft, ChevronRight, Loader2, ImagePlus, ZoomIn, Star, Download, ExternalLink } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  bucket: string;
  folder: string;
  title?: string;
  maxPhotos?: number;
  readOnly?: boolean;
  coverPhoto?: string | null;
  onCoverPhotoChange?: (url: string) => void;
  showSetCoverOption?: boolean;
}

export function PhotoGallery({
  photos = [],
  onPhotosChange,
  bucket,
  folder,
  title = "Galeria de Fotos",
  maxPhotos = 20,
  readOnly = false,
  coverPhoto,
  onCoverPhotoChange,
  showSetCoverOption = false,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { upload, uploadMultiple, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      const urls = await uploadMultiple(filesToUpload, { bucket, folder });
      onPhotosChange([...photos, ...urls]);
      toast.success(`${urls.length} foto(s) adicionada(s) à galeria!`);
    } catch (error) {
      console.error("Error uploading photos:", error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photoToRemove = photos[index];
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    
    // If removed photo was the cover, clear cover
    if (coverPhoto === photoToRemove && onCoverPhotoChange) {
      onCoverPhotoChange("");
    }
    
    toast.success("Foto removida da galeria");
  };

  const handleSetAsCover = (photo: string) => {
    if (onCoverPhotoChange) {
      onCoverPhotoChange(photo);
      toast.success("Foto definida como capa do perfil!");
      setIsDialogOpen(false);
    }
  };

  const openPhotoViewer = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const isCoverPhoto = (photo: string) => coverPhoto === photo;

  const handleDownload = (url: string) => {
    const filename = url.split('/').pop() || 'foto.jpg';
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          {showSetCoverOption && (
            <p className="text-xs text-muted-foreground mt-1">
              Clique numa foto e selecione "Definir como Capa" para alterar a foto de perfil
            </p>
          )}
        </div>
        {!readOnly && photos.length < maxPhotos && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 mr-2" />
            )}
            Adicionar Fotos
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={readOnly}
      />

      {photos.length === 0 ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center",
            readOnly ? "border-muted" : "border-muted-foreground/50 cursor-pointer hover:border-primary/50"
          )}
          onClick={() => !readOnly && fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            {readOnly ? "Nenhuma foto na galeria" : "Clique para adicionar fotos ou arraste aqui"}
          </p>
          {!readOnly && (
            <p className="text-sm text-muted-foreground mt-1">
              Máximo de {maxPhotos} fotos
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden group cursor-pointer",
                isCoverPhoto(photo) && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => openPhotoViewer(index)}
            >
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Cover indicator */}
              {isCoverPhoto(photo) && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Capa
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
              {!readOnly && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(index);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                Foto {selectedIndex !== null ? selectedIndex + 1 : 0} de {photos.length}
                {selectedIndex !== null && isCoverPhoto(photos[selectedIndex]) && (
                  <span className="ml-2 text-sm font-normal text-primary">(Foto de Capa)</span>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {selectedIndex !== null && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenInNewTab(photos[selectedIndex])}
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Pré-visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(photos[selectedIndex])}
                      title="Baixar foto"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </Button>
                  </>
                )}
                {showSetCoverOption && selectedIndex !== null && !isCoverPhoto(photos[selectedIndex]) && (
                  <Button
                    size="sm"
                    onClick={() => handleSetAsCover(photos[selectedIndex])}
                    className="gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Definir como Capa
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="relative flex items-center justify-center p-4 min-h-[400px]">
            {selectedIndex !== null && photos[selectedIndex] && (
              <img
                src={photos[selectedIndex]}
                alt={`Foto ${selectedIndex + 1}`}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            )}

            {/* Navigation buttons */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {selectedIndex !== null && selectedIndex < photos.length - 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={goToNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 p-4 pt-0 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={index}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 relative",
                  index === selectedIndex ? "border-primary" : "border-transparent",
                  isCoverPhoto(photo) && "ring-1 ring-primary"
                )}
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {isCoverPhoto(photo) && (
                  <Star className="absolute top-0.5 left-0.5 w-3 h-3 text-primary fill-primary" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
