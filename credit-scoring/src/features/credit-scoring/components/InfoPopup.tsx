import { useState, useRef, useEffect } from 'react';
import { Info, X, Zap } from 'lucide-react';

export interface InfoPopupData {
  title: string;
  subtitle?: string;
  whatIs: string;
  impact: string;
}

interface InfoPopupProps {
  data: InfoPopupData;
  /** Size of the trigger icon */
  size?: number;
}

export function InfoPopup({ data, size = 14 }: InfoPopupProps) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors"
        aria-label={`Info: ${data.title}`}
        title="Ver explicacion"
      >
        <Info size={size} />
      </button>

      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={data.title}
        >
          <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div
              className="flex items-start justify-between p-4 border-b border-border"
              style={{ background: 'linear-gradient(135deg, hsl(210, 50%, 18%), hsl(174, 54%, 55%))' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Info size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
                  {data.subtitle && (
                    <p className="text-xs text-white/70 truncate">{data.subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors shrink-0 ml-2"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-4">
              {/* What is it */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🔍</span>
                  <span className="text-xs font-semibold text-foreground">
                    Que es y como funciona?
                  </span>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.whatIs}
                  </p>
                </div>
              </div>

              {/* Impact */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={14} className="text-status-warning" />
                  <span className="text-xs font-semibold text-foreground">
                    Impacto en el Sistema
                  </span>
                </div>
                <div className="bg-status-warning-bg rounded-md p-3">
                  <p className="text-xs text-foreground leading-relaxed">
                    {data.impact}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
