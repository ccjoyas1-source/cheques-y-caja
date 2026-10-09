import React, { useState, useEffect } from 'react';
import { Check, UserRole } from '../types';
import { formatCurrency, formatDateDisplay, getTodayDateString } from '../utils/dateUtils';
import { X, AlertTriangle, MinusCircle, UserCheck, ShieldCheck } from 'lucide-react';

interface BounceCheckModalProps {
  check: Check | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserRole;
  onConfirmBounce: (checkId: string, reason: string, notes: string, bouncedDate: string, bouncedBy: UserRole) => void;
}

const COMMON_BOUNCE_REASONS = [
  'Fondos insuficientes (Sin fondos)',
  'Firma disconforme / No registrada',
  'Cuenta cerrada o cancelada',
  'Orden de no pago por el titular',
  'Cuenta bloqueada por orden judicial',
  'Cheque con tachones / enmendaduras',
  'Devuelto por caducidad de plazo',
  'Otro motivo bancario',
];

export const BounceCheckModal: React.FC<BounceCheckModalProps> = ({
  check,
  isOpen,
  onClose,
  currentUser,
  onConfirmBounce,
}) => {
  const [reason, setReason] = useState<string>(COMMON_BOUNCE_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [bouncedDate, setBouncedDate] = useState<string>(getTodayDateString());
  const [bouncedBy, setBouncedBy] = useState<UserRole>(currentUser);

  useEffect(() => {
    if (isOpen) {
      setReason(COMMON_BOUNCE_REASONS[0]);
      setCustomReason('');
      setNotes('');
      setBouncedDate(getTodayDateString());
      setBouncedBy(currentUser);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !check) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Otro motivo bancario' && customReason.trim() ? customReason.trim() : reason;
    onConfirmBounce(check.id, finalReason, notes.trim(), bouncedDate, bouncedBy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registrar Cheque Protestado / Devuelto
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Se restará automáticamente del saldo en efectivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          
          {/* Check information summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Cliente
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {check.clientName}
                </div>
                <div className="text-xs text-slate-500">
                  {check.bank} · N° {check.checkNumber}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Monto a Restar
                </span>
                <div className="text-lg font-bold text-rose-700 tabular-nums">
                  -{formatCurrency(check.amount)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Fecha cobro: {formatDateDisplay(check.dueDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Subtraction notice */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
            <MinusCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Ajuste de Saldo Inmediato: </span>
              Al registrar este protesto, el valor de <strong>{formatCurrency(check.amount)}</strong> dejará de formar parte del efectivo y se restará automáticamente del <strong>Saldo en Efectivo Disponible</strong>.
            </div>
          </div>

          {/* Motivo de devolución / protesto */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Motivo Bancario de la Devolución / Protesto <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {COMMON_BOUNCE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {reason === 'Otro motivo bancario' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Especifica el motivo reportado por el banco..."
                className="w-full mt-2 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                autoFocus
                required
              />
            )}
          </div>

          {/* Fecha del protesto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fecha del Protesto
              </label>
              <input
                type="date"
                value={bouncedDate}
                onChange={(e) => setBouncedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Registrado por
              </label>
              <select
                value={bouncedBy}
                onChange={(e) => setBouncedBy(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Maria">María (Gestora de cheques)</option>
                <option value="Cristian">Cristian (Administrador)</option>
              </select>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Observaciones / Gestión con el Cliente
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Notificado al cliente para reposición en efectivo o canje..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MinusCircle className="w-4 h-4 text-rose-300" />
              <span>Confirmar y Restar de Efectivo</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
