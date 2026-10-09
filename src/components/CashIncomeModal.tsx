import React, { useState, useEffect } from 'react';
import { Client, UserRole, CashIncome } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/dateUtils';
import { canonicalizeClientName } from '../utils/clientUtils';
import { X, DollarSign, User, UserPlus, CheckCircle2 } from 'lucide-react';

interface CashIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  currentUser: UserRole;
  onSaveCashIncome: (incomeData: Omit<CashIncome, 'id' | 'createdAt'>, newClientName?: string) => void;
}

export const CashIncomeModal: React.FC<CashIncomeModalProps> = ({
  isOpen,
  onClose,
  clients,
  currentUser,
  onSaveCashIncome,
}) => {
  const [clientName, setClientName] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState<UserRole>(currentUser);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setClientName(clients[0]?.name || '');
      setIsNewClient(clients.length === 0);
      setNewClientName('');
      setAmount('');
      setDate(getTodayDateString());
      setNotes('');
      setReceivedBy(currentUser);
      setError('');
    }
  }, [isOpen, currentUser, clients]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawClient = isNewClient ? newClientName.trim() : clientName.trim();
    const finalClient = canonicalizeClientName(rawClient);
    if (!finalClient) {
      setError('Por favor indica el cliente o concepto del ingreso.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0 dólares.');
      return;
    }

    onSaveCashIncome(
      {
        clientName: finalClient,
        amount: numAmount,
        date,
        notes: notes.trim() || undefined,
        receivedBy,
      },
      isNewClient ? finalClient : undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registrar Ingreso en Efectivo
              </h3>
              <p className="text-xs text-slate-500">
                Suma directamente al saldo en efectivo disponible
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
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Client or Concept */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente o Procedencia</span>
                <span className="text-rose-500">*</span>
              </label>

              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewClient(!isNewClient)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  {isNewClient ? 'Seleccionar existente' : '+ Escribir nuevo'}
                </button>
              )}
            </div>

            {isNewClient || clients.length === 0 ? (
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Ej. Sofía Valdivieso, Venta Mostrador..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                autoFocus
                required
              />
            ) : (
              <select
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Monto en Dólares */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Monto en Efectivo (USD) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white tabular-nums"
                required
              />
            </div>
          </div>

          {/* Fecha y Recibido Por */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fecha del Ingreso
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
                Recibido por
              </label>
              <select
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Maria">María (Gestora de cheques)</option>
                <option value="Cristian">Cristian (Administrador)</option>
              </select>
            </div>
          </div>

          {/* Notas / Concepto */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Concepto / Detalle
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Abono en efectivo factura 1084, venta directa..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
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
              <span>Guardar Ingreso en Efectivo</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
