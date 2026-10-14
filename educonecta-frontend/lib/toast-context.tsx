"use client";

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

interface ToastState {
  message: string;
  isErr: boolean;
  show: boolean;
}

const ToastContext = createContext<((msg: string, isErr?: boolean) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: "", isErr: false, show: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, isErr = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, isErr, show: true });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={"toast" + (toast.show ? " show" : "") + (toast.isErr ? " err" : "")}>{toast.message}</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
