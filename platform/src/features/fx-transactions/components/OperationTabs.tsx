/**
 * OperationTabs — Pestañas mutuamente excluyentes para seleccionar
 * la dirección de la operación FX: "Compra USD" o "Vender USD".
 *
 * Requerimientos: 1.1, 1.2, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4
 */

export type { OperationTab } from '../utils/fxConversion';

import type { OperationTab } from '../utils/fxConversion';
import logoxending from '../../../assets/logoxending.png';

export interface OperationTabsProps {
  activeTab: OperationTab;
  onChange: (tab: OperationTab) => void;
  disabled?: boolean;
}

const TAB_CONFIG: { key: OperationTab; label: string }[] = [
  { key: 'buy', label: 'Compra USD' },
  { key: 'sell', label: 'Vender USD' },
];

export function OperationTabs({ activeTab, onChange, disabled = false }: OperationTabsProps) {
  function handleClick(tab: OperationTab) {
    if (disabled || tab === activeTab) return;
    onChange(tab);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, tab: OperationTab) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(tab);
    }
  }

  return (
    <div role="tablist" className="flex w-full rounded-lg border border-border overflow-hidden">
      {TAB_CONFIG.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(key)}
            onKeyDown={(e) => handleKeyDown(e, key)}
            className={`w-1/2 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center justify-center gap-2 ${
              isActive
                ? 'bg-[hsl(213,67%,25%)] text-white'
                : 'bg-transparent text-foreground hover:bg-muted/60'
            } ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
          >
            <img src={logoxending} alt="" className="h-5 w-5 object-contain" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
