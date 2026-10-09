import React, { useState, useEffect } from 'react';
import { Check, UserRole } from '../types';
import { formatCurrency, formatDateDisplay, getTodayDateString } from '../utils/dateUtils';
import { X, CheckCircle2, DollarSign, Wallet, ShieldCheck, UserCheck } from 'lucide-react';

interface CashCheckModalProps {
  check: Check | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserRole;
  onConfirmCashed: (checkId: string, cashedDate: string, cashedBy: UserRole, destinationAccount?: string) => void;
}

export const CashCheckModal: React.FC<CashCheckModalProps> = ({
  check,
  isOpen,
  onClose,
  currentUser,
  onConfirmCashed,
}) => {
  const [cashedDate, setCashedDate] = useState<string>(getTodayDateString());
  const [cashedBy, setCashedBy] = useState<UserRole>(currentUser);
  const [destinationAccount, setDestinationAccount] = useState<string>('Caja Efectivo Disponible');

  useEffect(() => {
    if (isOpen) {
      setCashedDate(getTodayDateString());
      setCashedBy(currentUser);
      setDestinationAccount('Caja Efectivo Disponible');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !check) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmCashed(check.id, cashedDate, cashedBy, destinationAccount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Efectivizar Cheque
              </h3>
              <p className="text-xs text-slate-500">
                Consolidar valor en el saldo de efectivo disponible
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
          
          {/* Check summary box */}
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
                  Monto
                </span>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(check.amount)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Fecha pactada: {formatDateDisplay(check.dueDate)}
                </div>
              </div>
            </div>

            {check.notes && (
              <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-600 italic">
                "{check.notes}"
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            <span className="font-semibold">Impacto en el flujo de caja: </span>
            Este monto de <strong>{formatCurrency(check.amount)}</strong> pasará de inmediato a tu <strong>Saldo en Efectivo Disponible</strong> para operar o transferir.
          </div>

          {/* Date cashed */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fecha en que se hizo efectivo
            </label>
            <input
              type="date"
              value={cashedDate}
              onChange={(e) => setCashedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              required
            />
          </div>

          {/* User who cashed it */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Cobrado / Efectivizado por
            </label>
            <select
              value={cashedBy}
              onChange={(e) => setCashedBy(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="Maria">María (Gestora de cheques)</option>
              <option value="Cristian">Cristian (Administrador)</option>
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ingreso de fondos a
            </label>
            <select
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="Caja Efectivo Disponible">Caja / Saldo en Efectivo Disponible</option>
              <option value="Banco Pichincha - Depósito en Ventanilla">Banco Pichincha - Depósito en Ventanilla</option>
              <option value="Banco Guayaquil - Depósito en Ventanilla">Banco Guayaquil - Depósito en Ventanilla</option>
            </select>
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Confirmar y Efectivizar</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
