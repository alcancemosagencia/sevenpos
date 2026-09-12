import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { SettingRow } from './SettingRow';
import { Moon, Sun, Check } from 'lucide-react';

export const AppearanceSection: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Apariencia</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Personaliza el tema visual y contraste de SevenPOS para tu entorno de trabajo.
        </p>
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Tema de la interfaz"
          description="Alterna entre el modo oscuro de alta densidad y el modo claro de alto contraste."
        >
          <div className="w-full md:w-80 flex gap-2.5">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                theme === 'dark'
                  ? 'border-brand-primary bg-brand-primary/10 shadow-xs'
                  : 'border-border-default bg-surface hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center">
                  <Moon size={16} />
                </div>
                {theme === 'dark' && (
                  <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div>
                <h5 className={`text-xs font-bold ${theme === 'dark' ? 'text-brand-primary' : 'text-text-primary'}`}>
                  Oscuro
                </h5>
                <p className="text-[11px] text-text-tertiary mt-0.5">Para mesón y baja luz</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                theme === 'light'
                  ? 'border-brand-primary bg-brand-primary/10 shadow-xs'
                  : 'border-border-default bg-surface hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center">
                  <Sun size={16} />
                </div>
                {theme === 'light' && (
                  <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div>
                <h5 className={`text-xs font-bold ${theme === 'light' ? 'text-brand-primary' : 'text-text-primary'}`}>
                  Claro
                </h5>
                <p className="text-[11px] text-text-tertiary mt-0.5">Para luz diurna</p>
              </div>
            </button>
          </div>
        </SettingRow>
      </div>
    </div>
  );
};
