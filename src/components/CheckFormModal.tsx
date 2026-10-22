import React, { useState, useEffect } from 'react';
import { Check, Client, UserRole } from '../types';
import { getTodayDateString } from '../utils/dateUtils';
import { canonicalizeClientName } from '../utils/clientUtils';
import {
  X,
  Calendar,
  DollarSign,
  Building2,
  User,
  UserPlus,
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  Layers,
  FileText,
} from 'lucide-react';

export interface CheckRowItem {
  id: string;
  checkNumber: string;
  amount: string;
  dueDate: string;
}

interface CheckFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCheck: (checkData: Partial<Check>, newClientName?: string) => void;
  onSaveMultipleChecks?: (checksData: Array<Partial<Check>>, newClientName?: string) => void;
  clients: Client[];
  banks: string[];
  currentUser: UserRole;
  editingCheck?: Check | null;
}

export const CheckFormModal: React.FC<CheckFormModalProps> = ({
  isOpen,
  onClose,
  onSaveCheck,
  onSaveMultipleChecks,
  clients,
  banks,
  currentUser,
  editingCheck,
}) => {
  // Mode: 'single' | 'multiple'
  const [mode, setMode] = useState<'single' | 'multiple'>('single');

  // Shared fields
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [isAddingNewClient, setIsAddingNewClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [bank, setBank] = useState<string>(banks[0] || 'Banco Pichincha');
  const [customBank, setCustomBank] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<UserRole>(currentUser);
  const [error, setError] = useState<string>('');

  // Single mode fields
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');

  // Multiple mode fields
  const [batchChecks, setBatchChecks] = useState<CheckRowItem[]>([]);

  // Calculate default future date helper
  const calculateDefaultDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    return d.toISOString().split('T')[0];
  };

  // Helper to suggest next check number
  const incrementCheckNumber = (baseNum: string, increment: number): string => {
    const match = baseNum.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      const nextVal = parseInt(digits, 10) + increment;
      return `${prefix}${nextVal.toString().padStart(digits.length, '0')}`;
    }
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `CH-${rand + increment}`;
  };

  useEffect(() => {
    if (editingCheck) {
      setMode('single');
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
      // Default single check values
      setSelectedClientName(clients[0]?.name || '');
      setIsAddingNewClient(false);
      setNewClientName('');
      setAmount('');
      setDueDate(calculateDefaultDate(30));
      setIssueDate(getTodayDateString());
      const baseCheckNum = `CH-${Math.floor(100000 + Math.random() * 900000)}`;
      setCheckNumber(baseCheckNum);
      setBank(banks[0] || 'Banco Pichincha');
      setCustomBank('');
      setNotes('');
      setCreatedBy(currentUser);

      // Default batch checks (start with 2 rows ready)
      setBatchChecks([
        {
          id: `item-1`,
          checkNumber: baseCheckNum,
          amount: '',
          dueDate: calculateDefaultDate(30),
        },
        {
          id: `item-2`,
          checkNumber: incrementCheckNumber(baseCheckNum, 1),
          amount: '',
          dueDate: calculateDefaultDate(60),
        },
      ]);
    }
    setError('');
  }, [editingCheck, isOpen, currentUser, clients, banks]);

  if (!isOpen) return null;

  // Single mode helper
  const addDaysToSingleDueDate = (days: number) => {
    setDueDate(calculateDefaultDate(days));
  };

  // Batch operations
  const handleAddBatchRow = () => {
    const lastRow = batchChecks[batchChecks.length - 1];
    let nextCheckNum = `CH-${Math.floor(100000 + Math.random() * 900000)}`;
    let nextDueDate = calculateDefaultDate(30 * (batchChecks.length + 1));
    let nextAmount = '';

    if (lastRow) {
      nextCheckNum = incrementCheckNumber(lastRow.checkNumber, 1);
      nextAmount = lastRow.amount; // prefill previous amount for convenience
      try {
        const lastDate = new Date(lastRow.dueDate);
        if (!isNaN(lastDate.getTime())) {
          lastDate.setDate(lastDate.getDate() + 30);
          nextDueDate = lastDate.toISOString().split('T')[0];
        }
      } catch {
        // fallback
      }
    }

    setBatchChecks((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        checkNumber: nextCheckNum,
        amount: nextAmount,
        dueDate: nextDueDate,
      },
    ]);
  };

  const handleRemoveBatchRow = (id: string) => {
    if (batchChecks.length <= 1) {
      setError('Debes registrar al menos un cheque en la lista.');
      return;
    }
    setBatchChecks((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateBatchRow = (id: string, field: keyof CheckRowItem, value: string) => {
    setBatchChecks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleCopyAmountToAll = () => {
    const firstAmount = batchChecks[0]?.amount;
    if (!firstAmount || isNaN(parseFloat(firstAmount)) || parseFloat(firstAmount) <= 0) {
      setError('Ingresa primero un monto válido en el Cheque #1 para copiar a los demás.');
      return;
    }
    setBatchChecks((prev) =>
      prev.map((r) => ({ ...r, amount: firstAmount }))
    );
    setError('');
  };

  const totalBatchAmount = batchChecks.reduce((sum, item) => {
    const val = parseFloat(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawClient = isAddingNewClient ? newClientName.trim() : selectedClientName.trim();
    const finalClient = canonicalizeClientName(rawClient);
    if (!finalClient) {
      setError('Por favor selecciona o ingresa el nombre del cliente.');
      return;
    }

    const finalBank = bank === 'OTRO' ? customBank.trim() : bank;
    if (!finalBank) {
      setError('Por favor especifica el banco emisor.');
      return;
    }

    // Single Check Mode
    if (mode === 'single') {
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
      return;
    }

    // Multiple Checks Mode
    if (batchChecks.length === 0) {
      setError('Debes agregar al menos un cheque para registrar.');
      return;
    }

    // Validate each row
    for (let i = 0; i < batchChecks.length; i++) {
      const row = batchChecks[i];
      if (!row.checkNumber.trim()) {
        setError(`El Cheque #${i + 1} no tiene número de cheque asignado.`);
        return;
      }
      const num = parseFloat(row.amount);
      if (isNaN(num) || num <= 0) {
        setError(`El Cheque #${i + 1} (${row.checkNumber}) debe tener un valor mayor a $0.`);
        return;
      }
      if (!row.dueDate) {
        setError(`El Cheque #${i + 1} (${row.checkNumber}) no tiene fecha de cobro.`);
        return;
      }
    }

    const multipleChecksData: Array<Partial<Check>> = batchChecks.map((row, idx) => ({
      clientName: finalClient,
      amount: parseFloat(row.amount),
      dueDate: row.dueDate,
      issueDate,
      checkNumber: row.checkNumber.trim(),
      bank: finalBank,
      notes: notes.trim()
        ? `${notes.trim()} (Cheque ${idx + 1} de ${batchChecks.length})`
        : `Lote de cheques (Cheque ${idx + 1} de ${batchChecks.length})`,
      createdBy,
    }));

    if (onSaveMultipleChecks) {
      onSaveMultipleChecks(multipleChecksData, isAddingNewClient ? finalClient : undefined);
    } else {
      // Fallback
      multipleChecksData.forEach((chk, idx) => {
        onSaveCheck(chk, idx === 0 && isAddingNewClient ? finalClient : undefined);
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-h-[92vh] overflow-y-auto transition-all ${
          mode === 'multiple' ? 'max-w-2xl' : 'max-w-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-20">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {editingCheck ? (
                'Editar Cheque Postfechado'
              ) : mode === 'multiple' ? (
                <>
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>Registrar Varios Cheques (Mismo Cliente y Banco)</span>
                </>
              ) : (
                'Registrar Cheque Postfechado'
              )}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'multiple'
                ? 'Ingresa los datos compartidos una sola vez y define el valor, fecha y número de cada cheque'
                : 'Registra los datos del cheque para programación y alertas automáticas de cobro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher (Only when registering new checks) */}
        {!editingCheck && (
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Modo de registro:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setMode('single');
                    setError('');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    mode === 'single'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Cheque Único</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('multiple');
                    setError('');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    mode === 'multiple'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Varios Cheques (Mismo Cliente/Banco)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* SHARED SECTION: Client & Bank */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Datos Compartidos (Cliente y Banco)
              </span>
              {mode === 'multiple' && (
                <span className="text-[11px] text-indigo-700 font-medium bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Aplica a todos los cheques del lote
                </span>
              )}
            </div>

            {/* 1. Client Selection */}
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
                    className="w-full px-3 py-2 text-sm bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se guardará automáticamente en la lista de clientes.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedClientName}
                  onChange={(e) => setSelectedClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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

            {/* 2. Banco Emisor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Banco Emisor de la Cuenta</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* MODE: SINGLE CHECK */}
          {mode === 'single' ? (
            <>
              {/* Valor & N° de Cheque */}
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

              {/* Calendario: Fecha de Cobro */}
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

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Plazos comunes:</span>
                  <button
                    type="button"
                    onClick={() => addDaysToSingleDueDate(7)}
                    className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                  >
                    +7 días
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToSingleDueDate(15)}
                    className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                  >
                    +15 días
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToSingleDueDate(30)}
                    className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                  >
                    +30 días
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToSingleDueDate(45)}
                    className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                  >
                    +45 días
                  </button>
                  <button
                    type="button"
                    onClick={() => addDaysToSingleDueDate(60)}
                    className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                  >
                    +60 días
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* MODE: MULTIPLE CHECKS (MISMO CLIENTE Y BANCO) */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Lista de Cheques a Registrar</span>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {batchChecks.length} {batchChecks.length === 1 ? 'cheque' : 'cheques'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mismo cliente y banco. Solo cambia el valor, fecha de cobro y número de cheque.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {batchChecks.length > 1 && (
                    <button
                      type="button"
                      onClick={handleCopyAmountToAll}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Copiar el monto del Cheque #1 a todos los demás"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copiar monto #1 a todos</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddBatchRow}
                    className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Añadir Cheque</span>
                  </button>
                </div>
              </div>

              {/* Dynamic check rows */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {batchChecks.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>Cheque #{idx + 1}</span>
                      </span>

                      {batchChecks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          title="Eliminar este cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Check Number */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          N° Cheque <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={row.checkNumber}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, 'checkNumber', e.target.value)
                          }
                          placeholder="Ej. CH-100201"
                          className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                          required
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Valor ($ USD) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amount}
                            onChange={(e) =>
                              handleUpdateBatchRow(row.id, 'amount', e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white tabular-nums"
                            required
                          />
                        </div>
                      </div>

                      {/* Due Date */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Fecha de Cobro <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, 'dueDate', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch Summary Bar */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="text-xs text-indigo-950 font-medium">
                  Total del lote: <span className="font-bold">{batchChecks.length} cheques</span> del mismo cliente
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-indigo-800 block">Suma Total</span>
                  <span className="text-sm font-bold text-indigo-900 tabular-nums">
                    ${totalBatchAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fecha de Emisión y Registrado Por */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

          {/* Concepto / Detalle de la Operación */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Concepto / Detalle de Venta o Joyería
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Venta de joyas, abono factura #1042..."
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
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                mode === 'multiple'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>
                {editingCheck
                  ? 'Guardar Cambios'
                  : mode === 'multiple'
                  ? `Registrar ${batchChecks.length} Cheques ($${totalBatchAmount.toFixed(2)})`
                  : 'Registrar Cheque'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
