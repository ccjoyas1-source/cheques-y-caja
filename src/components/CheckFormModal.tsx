import React, { useState, useEffect } from 'react';
import { Check, Client, UserRole } from '../types';
import { getTodayDateString, resolveCheckStatus } from '../utils/dateUtils';
import { canonicalizeClientName } from '../utils/clientUtils';
import { X, Calendar, DollarSign, Building2, User, UserPlus, CheckCircle, Clock } from 'lucide-react';

interface CheckFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCheck: (checkData: Partial<Check>, newClientName?: string) => void;
  clients: Client[];
  banks: string[];
  currentUser: UserRole;
  editingCheck?: Check | null;
}

export const CheckFormModal: React.FC<CheckFormModalProps> = ({
  isOpen,
  onClose,
  onSaveCheck,
  clients,
  banks,
  currentUser,
  editingCheck,
}) => {
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [isAddingNewClient, setIsAddingNewClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(getTodayDateString());
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [bank, setBank] = useState<string>(banks[0] || 'Banco Pichincha');
  const [customBank, setCustomBank] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<UserRole>(currentUser);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editingCheck) {
      setSelectedClientName(editingCheck.clientName);
      setIsAddingNewClient(false);
      setNewClientName('');
      setAmount(editingCheck.amount.toString());
      setDueDate(editingCheck.dueDate);
      setIssueDate(editingCheck.issueDate);
      setCheckNumber(editingCheck.checkNumber);
      if (banks.includes(editingCheck.bank)) {
        setBank(editingCheck.bank);
        setCustomBank('');
      } else {
        setBank('OTRO');
        setCustomBank(editingCheck.bank);
      }
      setNotes(editingCheck.notes || '');
      setCreatedBy(editingCheck.createdBy);
    } else {
      // Default new check values
      setSelectedClientName(clients[0]?.name || '');
      setIsAddingNewClient(false);
      setNewClientName('');
      setAmount('');
      // Default due date to 30 days from today
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
      setIssueDate(getTodayDateString());
      setCheckNumber(`CH-${Math.floor(100000 + Math.random() * 900000)}`);
      setBank(banks[0] || 'Banco Pichincha');
      setCustomBank('');
      setNotes('');
      setCreatedBy(currentUser);
    }
    setError('');
  }, [editingCheck, isOpen, currentUser, clients, banks]);

  if (!isOpen) return null;

  // Shortcut helpers for due date
  const addDaysToDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawClient = isAddingNewClient ? newClientName.trim() : selectedClientName.trim();
    const finalClient = canonicalizeClientName(rawClient);
    if (!finalClient) {
      setError('Por favor selecciona o ingresa el nombre del cliente.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0 dólares.');
      return;
    }

    if (!dueDate) {
      setError('Por favor selecciona la fecha de cobro del cheque.');
      return;
    }

    if (!checkNumber.trim()) {
      setError('Por favor ingresa el número de cheque.');
      return;
    }

    const finalBank = bank === 'OTRO' ? customBank.trim() : bank;
    if (!finalBank) {
      setError('Por favor especifica el banco emisor.');
      return;
    }

    const checkData: Partial<Check> = {
      clientName: finalClient,
      amount: numAmount,
      dueDate,
      issueDate,
      checkNumber: checkNumber.trim(),
      bank: finalBank,
      notes: notes.trim(),
      createdBy,
    };

    onSaveCheck(checkData, isAddingNewClient ? finalClient : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingCheck ? 'Editar Cheque Postfechado' : 'Registrar Cheque Postfechado'}
            </h3>
            <p className="text-xs text-slate-500">
              Registra los datos del cheque para programación y alertas automáticas de cobro
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* 1. Client Selection (Dropdown vs New Client) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente Emisor</span>
                <span className="text-rose-500">*</span>
              </label>
              
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewClient(!isAddingNewClient);
                  setError('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {isAddingNewClient ? (
                  <span>Seleccionar de lista existente</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Registrar nuevo cliente</span>
                  </>
                )}
              </button>
            </div>

            {isAddingNewClient ? (
              <div>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nombre completo o razón social del cliente..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Se guardará automáticamente en la lista desplegable de clientes para futuros cheques.
                </p>
              </div>
            ) : (
              <select
                value={selectedClientName}
                onChange={(e) => setSelectedClientName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                <option value="">-- Seleccionar cliente de la lista --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.identification ? `(${c.identification})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Valor en Dólares & N° de Cheque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Valor en Dólares (USD)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white tabular-nums"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Número de Cheque <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Ej. CH-004812"
                className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                required
              />
            </div>

          </div>

          {/* 3. Banco Emisor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Banco Emisor</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="OTRO">Otro banco (especificar)</option>
              </select>

              {bank === 'OTRO' && (
                <input
                  type="text"
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  placeholder="Escribe el nombre del banco..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* 4. Calendario: Fecha de Cobro (Vencimiento) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Fecha de Cobro (Día que se efectiviza)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Se activará en efectivo en esta fecha
              </span>
            </div>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />

            {/* Quick date buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Plazos comunes:</span>
              <button
                type="button"
                onClick={() => addDaysToDueDate(7)}
                className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                +7 días
              </button>
              <button
                type="button"
                onClick={() => addDaysToDueDate(15)}
                className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                +15 días
              </button>
              <button
                type="button"
                onClick={() => addDaysToDueDate(30)}
                className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                +30 días
              </button>
              <button
                type="button"
                onClick={() => addDaysToDueDate(45)}
                className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                +45 días
              </button>
              <button
                type="button"
                onClick={() => addDaysToDueDate(60)}
                className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              >
                +60 días
              </button>
            </div>
          </div>

          {/* 5. Fecha de Emisión y Registrado Por */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fecha de Emisión / Recepción
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Registrado por (Usuario)
              </label>
              <select
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Maria">María (Gestora de cheques)</option>
                <option value="Cristian">Cristian (Administrador)</option>
              </select>
            </div>
          </div>

          {/* 6. Concepto / Detalle de la Operación */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Concepto / Detalle de Venta o Joyería
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Venta de anillo oro 18k, abono factura #1042..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
            />
          </div>

          {/* Modal Footer */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>{editingCheck ? 'Guardar Cambios' : 'Registrar Cheque'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
