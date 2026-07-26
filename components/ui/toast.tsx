"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface ToastCtx {
  showToast: (msg: string) => void;
}

const Ctx = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setMsg(message);
    window.setTimeout(() => setMsg(null), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      {msg ? (
        <div className="fixed bottom-7 right-7 z-[2000] bg-primary text-white px-8 py-4 rounded-ravia shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-semibold animate-[slideIn_0.3s_ease-out]">
          {msg}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
