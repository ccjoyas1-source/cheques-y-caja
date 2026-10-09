import React, { useState } from 'react';
import { Client, Check } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import {
  canonicalizeClientName,
  isAndreaDiasVariant,
  isLolaPontonVariant,
  normalizeClientKey,
} from '../utils/clientUtils';
import {
  X,
  UserPlus,
  Phone,
  CreditCard,
  Search,
  ArrowRight,
  User,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ClientsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  checks: Check[];
  onAddClient: (clientData: Omit<Client, 'id' | 'createdAt'>) => void;
  onSelectClientToFilter: (clientName: string) => void;
  onMergeClients?: (sourceClientName: string, targetClientName: string) => void;
}

export const ClientsManagerModal: React.FC<ClientsManagerModalProps> = ({
  isOpen,
  onClose,
  clients,
  checks,
  onAddClient,
  onSelectClientToFilter,
  onMergeClients,
}) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  
  // New client form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [identification, setIdentification] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Merge form state
  const [sourceClient, setSourceClient] = useState('');
  const [targetClient, setTargetClient] = useState('');
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Detect specific requested aliases
  const hasAndreaDias = clients.some((c) => isAndreaDiasVariant(c.name)) || checks.some((c) => isAndreaDiasVariant(c.clientName));
  const hasLolaPonton = clients.some((c) => isLolaPontonVariant(c.name)) || checks.some((c) => isLolaPontonVariant(c.clientName));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = canonicalizeClientName(name);
    if (!cleanName) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    const exists = clients.some((c) => normalizeClientKey(c.name) === normalizeClientKey(cleanName));
    if (exists) {
      setError(`Ya existe un cliente registrado como "${cleanName}".`);
      return;
    }

    onAddClient({
      name: cleanName,
      phone: phone.trim() || undefined,
      identification: identification.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setName('');
    setPhone('');
    setIdentification('');
    setNotes('');
    setIsAdding(false);
  };

  const handleExecuteMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceClient || !targetClient) {
      setError('Selecciona el cliente origen y el cliente destino.');
      return;
    }
    if (sourceClient.trim().toLowerCase() === targetClient.trim().toLowerCase()) {
      setError('El cliente origen y destino no pueden ser el mismo.');
      return;
    }

    if (onMergeClients) {
      onMergeClients(sourceClient, targetClient);
      setMergeSuccessMsg(`Todos los registros de "${sourceClient}" se pasaron con éxito a "${targetClient}".`);
      setSourceClient('');
      setTargetClient('');
      setIsMerging(false);
      setTimeout(() => setMergeSuccessMsg(''), 4000);
    }
  };

  const handleQuickMergeAndrea = () => {
    if (onMergeClients) {
      onMergeClients('andrea Dias', 'Andrea diaz');
      setMergeSuccessMsg('Todos los registros de "andrea Dias" se pasaron exitosamente a "Andrea diaz".');
      setTimeout(() => setMergeSuccessMsg(''), 4000);
    }
  };

  const handleQuickMergeLola = () => {
    if (onMergeClients) {
      onMergeClients('lola ponton', 'MAGDALENA PONTON');
      setMergeSuccessMsg('Todos los registros de "lola ponton" se pasaron exitosamente a "MAGDALENA PONTON".');
      setTimeout(() => setMergeSuccessMsg(''), 4000);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.identification && c.identification.includes(search))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Directorio de Clientes
            </h3>
            <p className="text-xs text-slate-500">
              {clients.length} cliente(s) registrado(s) para evitar errores de captura
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Success notice */}
          {mergeSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mergeSuccessMsg}</span>
            </div>
          )}

          {/* Special Quick Action for Andrea Dias / Andrea diaz */}
          {hasAndreaDias && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-amber-950 block">
                    Unificación detectada: "andrea Dias" → "Andrea diaz"
                  </span>
                  <span className="text-amber-800">
                    Pasa todos los cheques y datos registrados como "andrea Dias" a "Andrea diaz" con un solo clic.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickMergeAndrea}
                className="px-3.5 py-1.5 font-bold text-xs text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Unificar a Andrea diaz
              </button>
            </div>
          )}

          {/* Special Quick Action for Lola Ponton / MAGDALENA PONTON */}
          {hasLolaPonton && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="p-1 rounded-md bg-indigo-100 text-indigo-800 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-indigo-950 block">
                    Unificación detectada: "lola ponton" → "MAGDALENA PONTON"
                  </span>
                  <span className="text-indigo-800">
                    Pasa todos los cheques y datos registrados como "lola ponton" a "MAGDALENA PONTON" con un solo clic.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickMergeLola}
                className="px-3.5 py-1.5 font-bold text-xs text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Unificar a MAGDALENA PONTON
              </button>
            </div>
          )}

          {/* Top action bar: Search, Add & Merge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o identificación..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onMergeClients && clients.length >= 2 && (
                <button
                  onClick={() => {
                    setIsMerging(!isMerging);
                    setIsAdding(false);
                    setError('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isMerging
                      ? 'bg-indigo-900 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                  title="Fusionar dos clientes con nombres similares o errores de escritura"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{isMerging ? 'Cerrar Fusión' : 'Unificar Clientes'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsAdding(!isAdding);
                  setIsMerging(false);
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{isAdding ? 'Cerrar' : '+ Nuevo Cliente'}</span>
              </button>
            </div>
          </div>

          {/* Merge Clients Tool Form */}
          {isMerging && (
            <form onSubmit={handleExecuteMerge} className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>Unificar / Fusionar Clientes Duplicados</span>
              </div>
              <p className="text-slate-600">
                Pasa automáticamente todos los cheques, historial e información de un cliente hacia otro nombre canonical.
              </p>

              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Cliente a reemplazar (con error de escritura):
                  </label>
                  <select
                    value={sourceClient}
                    onChange={(e) => setSourceClient(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    <option value="">-- Seleccionar cliente origen --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Pasar todos sus datos y cheques a (Nombre final):
                  </label>
                  <select
                    value={targetClient}
                    onChange={(e) => setTargetClient(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    <option value="">-- Seleccionar cliente destino --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMerging(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  Confirmar Fusión
                </button>
              </div>
            </form>
          )}

          {/* Add Client Form */}
          {isAdding && (
            <form onSubmit={handleSave} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Registrar Nuevo Cliente
              </h4>

              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Nombre o Razón Social <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Joyería El Rubí"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Cédula / RUC
                  </label>
                  <input
                    type="text"
                    value={identification}
                    onChange={(e) => setIdentification(e.target.value)}
                    placeholder="Ej. 1792348192001"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +593 99 888 7777"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Notas / Referencia Comercial
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Mayorista de alta gama"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          )}

          {/* Clients List */}
          {clients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No hay clientes registrados aún. Puedes registrar uno nuevo o importar tu archivo Excel.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredClients.map((client) => {
                const clientChecks = checks.filter((c) => c.clientName.toLowerCase() === client.name.toLowerCase());
                const uncollectedChecks = clientChecks.filter((c) => c.status !== 'cashed' && c.status !== 'cancelled');
                const uncollectedAmount = uncollectedChecks.reduce((acc, c) => acc + c.amount, 0);

                return (
                  <div
                    key={client.id}
                    className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{client.name}</span>
                        {normalizeClientKey(client.name) === 'andrea diaz' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-300">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Unificada (incluye andrea Dias)</span>
                          </span>
                        )}
                        {normalizeClientKey(client.name) === 'magdalena ponton' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-800 rounded-md border border-indigo-300">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Unificada (incluye lola ponton)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-500 mt-1">
                        {client.identification && (
                          <span>RUC/CI: {client.identification}</span>
                        )}
                        {client.phone && (
                          <span>Tel: {client.phone}</span>
                        )}
                        {client.notes && (
                          <span className="italic text-slate-400">{client.notes}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(uncollectedAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {uncollectedChecks.length} por cobrar ({clientChecks.length} totales)
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectClientToFilter(client.name);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Ver todos los cheques de este cliente"
                      >
                        <span>Ver Cheques</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
