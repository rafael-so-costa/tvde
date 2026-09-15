import { createContext, useCallback, useContext, useState, ReactNode } from "react";

export type ChatWindowState = "open" | "minimized";

interface OpenWindow {
  conversaId: string;
  state: ChatWindowState;
  /** Counts new messages since last focused (for visual indicator on minimized bar). */
  unread: number;
}

interface FloatingChatContextValue {
  windows: OpenWindow[];
  openConversa: (id: string) => void;
  minimizeConversa: (id: string) => void;
  closeConversa: (id: string) => void;
  focusConversa: (id: string) => void;
  isOpen: (id: string) => boolean;
  bumpUnread: (id: string) => void;
  clearUnread: (id: string) => void;
}

const FloatingChatContext = createContext<FloatingChatContextValue | null>(null);

const MAX_OPEN = 3;

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<OpenWindow[]>([]);

  const openConversa = useCallback((id: string) => {
    setWindows((prev) => {
      const idx = prev.findIndex((w) => w.conversaId === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], state: "open", unread: 0 };
        return copy;
      }
      const next: OpenWindow = { conversaId: id, state: "open", unread: 0 };
      // Cap simultaneous open windows: minimize the oldest if exceeded
      const open = [...prev, next];
      const openCount = open.filter((w) => w.state === "open").length;
      if (openCount > MAX_OPEN) {
        let toMinimize = MAX_OPEN;
        return open.map((w) => {
          if (w.state === "open" && w.conversaId !== id && toMinimize-- > 0) {
            return { ...w, state: "minimized" as const };
          }
          return w;
        });
      }
      return open;
    });
  }, []);

  const minimizeConversa = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.conversaId === id ? { ...w, state: "minimized" } : w)));
  }, []);

  const closeConversa = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.conversaId !== id));
  }, []);

  const focusConversa = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.conversaId === id ? { ...w, state: "open" as const, unread: 0 } : w)),
    );
  }, []);

  const isOpen = useCallback((id: string) => windows.some((w) => w.conversaId === id), [windows]);

  const bumpUnread = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.conversaId === id && w.state === "minimized" ? { ...w, unread: w.unread + 1 } : w)),
    );
  }, []);

  const clearUnread = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.conversaId === id ? { ...w, unread: 0 } : w)));
  }, []);

  return (
    <FloatingChatContext.Provider
      value={{ windows, openConversa, minimizeConversa, closeConversa, focusConversa, isOpen, bumpUnread, clearUnread }}
    >
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) throw new Error("useFloatingChat must be used within FloatingChatProvider");
  return ctx;
}
