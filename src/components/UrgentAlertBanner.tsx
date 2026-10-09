import React from 'react';
import { Check } from '../types';
import { formatCurrency, getDaysDifference } from '../utils/dateUtils';
import { AlertTriangle, Clock, ArrowRight, MinusCircle } from 'lucide-react';

interface UrgentAlertBannerProps {
  checks: Check[];
  onFilterDueThisWeek: () => void;
  onFilterBounced: () => void;
}

export const UrgentAlertBanner: React.FC<UrgentAlertBannerProps> = ({
  checks,
  onFilterDueThisWeek,
  onFilterBounced,
}) => {
  const bouncedChecks = checks.filter((c) => c.status === 'bounced');
  const dueTodayChecks = checks.filter((c) => {
    if (c.status === 'bounced' || c.status === 'cancelled') return false;
    return getDaysDifference(c.dueDate) === 0;
  });

  const bouncedTotal = bouncedChecks.reduce((sum, c) => sum + c.amount, 0);
  const dueTodayTotal = dueTodayChecks.reduce((sum, c) => sum + c.amount, 0);

  if (bouncedChecks.length === 0 && dueTodayChecks.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      
      {/* Protested / Returned Check Alert (Subtraction notice) */}
      {bouncedChecks.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <MinusCircle className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-rose-950 block">
                Alerta: {bouncedChecks.length} {bouncedChecks.length === 1 ? 'cheque protestado / devuelto' : 'cheques protestados / devueltos'} por un total de -{formatCurrency(bouncedTotal)}
              </span>
              <span className="text-rose-800">
                Este valor fue restado del saldo en efectivo disponible. Requiere gestión o canje con el cliente.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onFilterBounced}
              className="px-3 py-1.5 font-semibold text-rose-900 bg-white border border-rose-300 hover:bg-rose-100 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Revisar cheques devueltos
            </button>
          </div>
        </div>
      )}

      {/* Due Today Notification (Auto-cashed) */}
      {dueTodayChecks.length > 0 && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-emerald-950 block">
                ¡{dueTodayChecks.length} {dueTodayChecks.length === 1 ? 'cheque llegó a fecha HOY' : 'cheques llegaron a fecha HOY'}! ({formatCurrency(dueTodayTotal)})
              </span>
              <span className="text-emerald-800">
                Se han efectivizado automáticamente y su valor ya está consolidado en el saldo en efectivo disponible.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onFilterDueThisWeek}
              className="px-3 py-1.5 font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Ver cheques al día
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
