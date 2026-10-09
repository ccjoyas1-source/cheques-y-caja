import React, { useState, useEffect } from 'react';
import { InitialBalanceConfig, UserRole } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/dateUtils';
import { X, Wallet, CheckCircle2, DollarSign } from 'lucide-react';

interface InitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: InitialBalanceConfig;
  currentUser: UserRole;
  onSaveInitialBalance: (config: InitialBalanceConfig) => void;
}

export const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentUser,
  onSaveInitialBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(currentConfig.amount > 0 ? currentConfig.amount.toString() : '');
      setDate(currentConfig.date || getTodayDateString());
      setNotes(currentConfig.notes || 'Saldo inicial de apertura');
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    onSaveInitialBalance({
      amount: Math.max(0, numAmount),
      date,
      notes: notes.trim(),
      setBy: currentUser,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Saldo Inicial en Caja
              </h3>
              <p className="text-xs text-slate-500">
                Punto de partida del efectivo antes de los cheques y movimientos
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Monto del Saldo Inicial (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white tabular-nums"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Si empiezas desde cero, puedes dejarlo en $0.00.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fecha de Inicio o Apertura
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Observaciones / Referencia
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Saldo de apertura caja octubre..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Guardar Saldo Inicial</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
