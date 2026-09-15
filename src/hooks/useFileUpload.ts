import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadOptions {
  bucket: string;
  folder?: string;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File, options: UploadOptions) => {
    const { bucket, folder = "", onSuccess, onError } = options;
    
    setIsUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      onSuccess?.(publicUrl);
      return publicUrl;
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      toast.error("Erro ao fazer upload: " + err.message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultiple = async (files: File[], options: UploadOptions) => {
    const urls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const url = await upload(files[i], {
        ...options,
        onSuccess: undefined,
        onError: undefined,
      });
      urls.push(url);
      setProgress(((i + 1) / files.length) * 100);
    }
    
    options.onSuccess?.(urls[0]);
    return urls;
  };

  const deleteFile = async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      toast.success("Ficheiro removido com sucesso");
    } catch (error) {
      const err = error as Error;
      toast.error("Erro ao remover ficheiro: " + err.message);
      throw error;
    }
  };

  return {
    upload,
    uploadMultiple,
    deleteFile,
    isUploading,
    progress,
  };
}
