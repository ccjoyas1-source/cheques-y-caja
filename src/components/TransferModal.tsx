import React, { useState, useEffect } from 'react';
import { Transfer, UserRole } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/dateUtils';
import { COMMON_DESTINATION_ACCOUNTS } from '../utils/initialData';
import { X, ArrowRightLeft, DollarSign, Building2, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCash: number;
  currentUser: UserRole;
  onSaveTransfer: (transfer: Omit<Transfer, 'id' | 'createdAt'>, transferId?: string) => void;
  editingTransfer?: Transfer | null;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  availableCash,
  currentUser,
  onSaveTransfer,
  editingTransfer,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [destinationAccount, setDestinationAccount] = useState<string>(COMMON_DESTINATION_ACCOUNTS[0]);
  const [customDestination, setCustomDestination] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [transferredBy, setTransferredBy] = useState<UserRole>(currentUser);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (editingTransfer) {
        setAmount(editingTransfer.amount.toString());
        if (COMMON_DESTINATION_ACCOUNTS.includes(editingTransfer.destinationAccount)) {
          setDestinationAccount(editingTransfer.destinationAccount);
          setCustomDestination('');
        } else {
          setDestinationAccount('OTRO');
          setCustomDestination(editingTransfer.destinationAccount);
        }
        setReferenceNumber(editingTransfer.referenceNumber);
        setNotes(editingTransfer.notes || '');
        setTransferredBy(editingTransfer.transferredBy);
        setDate(editingTransfer.date);
      } else {
        setAmount('');
        setDestinationAccount(COMMON_DESTINATION_ACCOUNTS[0]);
        setCustomDestination('');
        setReferenceNumber(`TRF-${Math.floor(10000 + Math.random() * 90000)}`);
        setNotes('');
        setTransferredBy(currentUser);
        setDate(getTodayDateString());
      }
    }
  }, [isOpen, editingTransfer, currentUser]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  // If editing, the original amount was already deducted from available cash, so we give credit back for validation
  const originalAmount = editingTransfer ? editingTransfer.amount : 0;
  const maxAllowedAmount = availableCash + originalAmount;
  const remainingAfterTransfer = Math.max(0, maxAllowedAmount - numAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Por favor ingresa un monto mayor a $0.');
      return;
    }

    if (numAmount > maxAllowedAmount) {
      setError(
        `No dispones de suficiente saldo en efectivo. El monto máximo disponible para este movimiento es de ${formatCurrency(
          maxAllowedAmount
        )}.`
      );
      return;
    }

    const finalAccount = destinationAccount === 'OTRO' ? customDestination.trim() : destinationAccount;
    if (!finalAccount) {
      setError('Por favor especifica la cuenta de destino o motivo de egreso.');
      return;
    }

    if (!referenceNumber.trim()) {
      setError('Por favor ingresa el número de referencia o comprobante.');
      return;
    }

    onSaveTransfer(
      {
        amount: numAmount,
        destinationAccount: finalAccount,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        transferredBy,
        date,
      },
      editingTransfer ? editingTransfer.id : undefined
    );

    onClose();
  };

  const isEditing = Boolean(editingTransfer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
              {isEditing ? <Edit3 className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Editar Egreso / Transferencia' : 'Nuevo Egreso / Transferencia'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Modificando comprobante ${editingTransfer?.referenceNumber}`
                  : 'Registrar salida de efectivo o transferencia bancaria'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cash Status Strip */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-800 font-medium block">
                {isEditing ? 'Saldo disponible + Monto actual:' : 'Saldo Disponible en Efectivo:'}
              </span>
              <span className="text-lg font-bold text-emerald-950 tabular-nums">
                {formatCurrency(maxAllowedAmount)}
              </span>
              {isEditing && (
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  (Incluye ${formatCurrency(originalAmount)} del egreso en edición)
                </span>
              )}
            </div>
            {numAmount > 0 && numAmount <= maxAllowedAmount && (
              <div className="text-right">
                <span className="text-slate-500 block">Saldo resultante en caja:</span>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {formatCurrency(remainingAfterTransfer)}
                </span>
              </div>
            )}
          </div>

          {/* Amount to transfer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Monto a Transferir / Egresar (USD)</span>
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(maxAllowedAmount.toString())}
                disabled={maxAllowedAmount <= 0}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline disabled:opacity-40 cursor-pointer"
              >
                Asignar todo el disponible ({formatCurrency(maxAllowedAmount)})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAllowedAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white tabular-nums"
                required
              />
            </div>
          </div>

          {/* Destination Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Cuenta Bancaria / Destino / Motivo de Salida</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            >
              {COMMON_DESTINATION_ACCOUNTS.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
              <option value="OTRO">Otro destino / Gasto (escribir detalle)</option>
            </select>

            {destinationAccount === 'OTRO' && (
              <input
                type="text"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                placeholder="Ej. Banco Bolivariano - Cta Cte #10928392 o Pago de Arriendo"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                autoFocus
                required
              />
            )}
          </div>

          {/* Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Comprobante / N° Referencia <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej. TRF-99120"
                className="w-full px-3 py-2 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          {/* Authorized by & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Realizado / Autorizado por
              </label>
              <select
                value={transferredBy}
                onChange={(e) => setTransferredBy(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Maria">María (Gestora de cheques)</option>
                <option value="Cristian">Cristian (Administrador)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Concepto / Nota Opcional
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Traslado a cuenta comercial"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
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
              disabled={maxAllowedAmount <= 0}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 ${
                maxAllowedAmount > 0
                  ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isEditing ? 'Guardar Cambios' : 'Confirmar Egreso / Transferencia'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
