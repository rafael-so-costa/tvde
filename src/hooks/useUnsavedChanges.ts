import { useEffect, useCallback, useState } from "react";

export function useUnsavedChanges(hasChanges: boolean) {
  const [isDirty, setIsDirty] = useState(hasChanges);

  useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Você tem alterações não salvas. Deseja realmente sair?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = useCallback(
    (callback: () => void) => {
      if (isDirty) {
        const confirmed = window.confirm(
          "Você tem alterações não salvas. Deseja realmente sair?"
        );
        if (confirmed) {
          setIsDirty(false);
          callback();
        }
      } else {
        callback();
      }
    },
    [isDirty]
  );

  const markSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    isDirty,
    confirmNavigation,
    markSaved,
    markDirty,
  };
}
