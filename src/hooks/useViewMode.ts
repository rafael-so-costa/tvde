import { useState, useEffect } from "react";
import { ViewMode } from "@/components/common/ViewToggle";

export function useViewMode(key: string, defaultMode: ViewMode = "grid") {
  const storageKey = `tvde_view_${key}`;
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved && ["icons", "list", "grid"].includes(saved)) {
        return saved as ViewMode;
      }
    }
    return defaultMode;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  return [viewMode, setViewMode] as const;
}
