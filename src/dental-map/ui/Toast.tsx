"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export type ToastVariant = "error" | "success" | "info";

type ToastItem = { id: number; variant: ToastVariant; message: string };

export type ToastApi = {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
};

const AUTO_DISMISS_MS = 3500;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Dependency-free toast host. Mount high in the tree so any descendant can call
 * useToast(). Toasts auto-dismiss after ~3.5s and stack top-center via a portal.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      if (!message) {
        return;
      }
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, variant, message }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      error: (message: string) => push("error", message),
      success: (message: string) => push("success", message),
      info: (message: string) => push("info", message)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, { className: string; Icon: ComponentType<{ size?: number; className?: string }> }> = {
  error: { className: "bg-danger/10 text-danger", Icon: XCircle },
  success: { className: "bg-brand-50 text-brand-700", Icon: CheckCircle2 },
  info: { className: "bg-surface-0 text-ink-700", Icon: Info }
};

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[80] flex flex-col items-center gap-2 px-4"
      aria-live="assertive"
    >
      {toasts.map(({ id, variant, message }) => {
        const { className, Icon } = variantStyles[variant];
        return (
          <div
            key={id}
            role={variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-[modal-in_0.15s_ease-out] items-center gap-2.5",
              "rounded-2xl border border-surface-200/60 px-4 py-3 text-sm font-medium shadow-card backdrop-blur",
              className
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span className="min-w-0 flex-1">{message}</span>
            <button
              type="button"
              aria-label="Yopish"
              onClick={() => onDismiss(id)}
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

/** Access the toast API. Throws if used outside a ToastProvider. */
export function useToast(): { toast: ToastApi } {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return { toast: context };
}
