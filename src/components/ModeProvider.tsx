"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * Estado de cliente COMPARTIDO del registro de lenguaje (claro / jurídico),
 * descrito en ARCHITECTURE.md: Context + localStorage. Es la ÚNICA fuente del
 * toggle; los componentes lo consumen vía `useMode()` en lugar de inventar su
 * propio estado por tarjeta.
 *
 * - "plain"  → lenguaje claro para usuarios no abogados (default).
 * - "legal"  → lenguaje técnico-jurídico para abogados.
 *
 * El default en server/primer render es "plain" para evitar mismatch de
 * hidratación; la preferencia guardada se aplica en `useEffect` tras montar.
 */

export type LanguageMode = "plain" | "legal";

const STORAGE_KEY = "uplaw-language-mode";

interface ModeContextValue {
  mode: LanguageMode;
  setMode: (m: LanguageMode) => void;
  toggle: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<LanguageMode>("plain");

  // Aplica la preferencia persistida una vez montado (no en SSR).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "plain" || saved === "legal") setMode(saved);
    } catch {
      // localStorage puede no estar disponible; el default alcanza.
    }
  }, []);

  const update = useCallback((m: LanguageMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // sin persistencia, el estado en memoria sigue funcionando.
    }
  }, []);

  const toggle = useCallback(() => update(mode === "plain" ? "legal" : "plain"), [mode, update]);

  return <ModeContext.Provider value={{ mode, setMode: update, toggle }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode debe usarse dentro de <ModeProvider>.");
  return ctx;
}

/**
 * Control del registro de lenguaje. Dos botones segmentados, accesibles por
 * teclado, con estado expresado en texto y `aria-pressed` (el color solo
 * refuerza).
 */
export function ModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useMode();
  return (
    <div
      className={`inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 text-sm ${className}`}
      role="group"
      aria-label="Registro de lenguaje"
    >
      <button
        type="button"
        onClick={() => setMode("plain")}
        aria-pressed={mode === "plain"}
        className={`rounded px-3 py-1 ${mode === "plain" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Lenguaje claro
      </button>
      <button
        type="button"
        onClick={() => setMode("legal")}
        aria-pressed={mode === "legal"}
        className={`rounded px-3 py-1 ${mode === "legal" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Lenguaje jurídico
      </button>
    </div>
  );
}
