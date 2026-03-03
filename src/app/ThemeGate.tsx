'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'gh_theme';

/**
 * ThemeGate:
 * - On first visit (no localStorage key), shows a simple chooser (dark/light).
 * - Always shows a floating toggle button so users can switch anytime.
 * - Applies theme by setting: document.documentElement.dataset.theme = 'dark' | 'light'
 */
export default function ThemeGate({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [hydrated, setHydrated] = useState(false);
  const [showChooser, setShowChooser] = useState(false);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? null;
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        setShowChooser(false);
      } else {
        // default to dark, but let user choose
        setTheme('dark');
        setShowChooser(true);
      }
    } catch {
      // If localStorage unavailable, just default to dark
      setTheme('dark');
      setShowChooser(false);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, hydrated]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const buttonLabel = useMemo(() => {
    return theme === 'dark' ? '☀️ Claro' : '🌙 Noche';
  }, [theme]);

  if (!hydrated) return <>{children}</>;

  return (
    <>
      {children}

      {/* Floating toggle - always visible */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Cambiar tema"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 99999,
          padding: '10px 12px',
          borderRadius: 9999,
          border: '1px solid rgba(0,0,0,0.15)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          background: theme === 'dark' ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)',
          color: theme === 'dark' ? '#fff' : '#111',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {buttonLabel}
      </button>

      {/* First-time chooser */}
      {showChooser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              borderRadius: 16,
              background: '#fff',
              color: '#111',
              border: '1px solid rgba(0,0,0,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Elige un modo</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Puedes cambiarlo luego con el botón flotante.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChooser(false)}
                aria-label="Cerrar"
                style={{
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: '#fff',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  setShowChooser(false);
                }}
                style={{
                  borderRadius: 14,
                  padding: 14,
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: '#111',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                🌙 Nocturno
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  setShowChooser(false);
                }}
                style={{
                  borderRadius: 14,
                  padding: 14,
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: '#fff',
                  color: '#111',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ☀️ Claro
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Consejo: si algo se ve raro, prueba a recargar tras cambiar el tema.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
