import { useState, useRef } from "react";
import { Camera, Loader2, User, Building2, Car } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentPhoto: string | null;
  onPhotoChange: (url: string) => void;
  bucket: string;
  folder: string;
  fallbackIcon?: "user" | "building" | "car";
  fallbackText?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  readOnly?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const iconSizes = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
};

const cameraIconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const cameraBadgeSizes = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function ProfilePhotoUpload({
  currentPhoto,
  onPhotoChange,
  bucket,
  folder,
  fallbackIcon = "user",
  fallbackText,
  size = "md",
  shape = "circle",
  readOnly = false,
  className,
}: ProfilePhotoUploadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!readOnly && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    try {
      const url = await upload(file, { bucket, folder });
      onPhotoChange(url);
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error("Error uploading photo:", error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderFallback = () => {
    if (fallbackText) {
      return (
        <span className="text-lg font-bold text-accent-foreground">
          {fallbackText}
        </span>
      );
    }

    const iconClass = cn(iconSizes[size], "text-muted-foreground");
    
    switch (fallbackIcon) {
      case "building":
        return <Building2 className={cn(iconClass, "text-primary")} />;
      case "car":
        return <Car className={cn(iconClass, "text-primary")} />;
      default:
        return <User className={cn(iconClass, "text-accent")} />;
    }
  };

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center overflow-hidden transition-all",
          shape === "circle" ? "rounded-full" : "rounded-xl",
          !readOnly && "cursor-pointer",
          !readOnly && isHovered && "ring-2 ring-primary ring-offset-2",
          currentPhoto ? "" : "bg-gradient-accent",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {isUploading ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin text-primary")} />
        ) : currentPhoto ? (
          <>
            <img
              src={currentPhoto}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
            {!readOnly && isHovered && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-inherit">
                <Camera className={cn(iconSizes[size], "text-white")} />
              </div>
            )}
          </>
        ) : (
          renderFallback()
        )}
      </div>

      {/* Camera badge - only show when not hovered and not uploading */}
      {!readOnly && !isHovered && !isUploading && (
        <div
          className={cn(
            cameraBadgeSizes[size],
            "absolute -bottom-1 -right-1 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
          )}
          onClick={handleClick}
        >
          <Camera className={cn(cameraIconSizes[size], "text-primary-foreground")} />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={readOnly || isUploading}
      />
    </div>
  );
}
