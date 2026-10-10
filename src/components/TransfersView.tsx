import React, { useState } from 'react';
import { Transfer, CashIncome, InitialBalanceConfig, UserRole } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/dateUtils';
import {
  ArrowRightLeft,
  Building2,
  Plus,
  ArrowUpRight,
  Trash2,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Wallet,
  Settings,
  Pencil,
} from 'lucide-react';

interface TransfersViewProps {
  transfers: Transfer[];
  cashIncomes: CashIncome[];
  initialBalance: InitialBalanceConfig;
  availableCash: number;
  totalCashed: number;
  totalCashIncomes: number;
  totalTransferred: number;
  totalBounced: number;
  onOpenTransferModal: () => void;
  onOpenCashIncomeModal: () => void;
  onOpenInitialBalanceModal: () => void;
  onEditTransfer?: (transfer: Transfer) => void;
  onDeleteTransfer?: (id: string) => void;
  onEditCashIncome?: (income: CashIncome) => void;
  onDeleteCashIncome?: (id: string) => void;
  currentUser: UserRole;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  transfers,
  cashIncomes,
  initialBalance,
  availableCash,
  totalCashed,
  totalCashIncomes,
  totalTransferred,
  totalBounced,
  onOpenTransferModal,
  onOpenCashIncomeModal,
  onOpenInitialBalanceModal,
  onEditTransfer,
  onDeleteTransfer,
  onEditCashIncome,
  onDeleteCashIncome,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'transfers' | 'cashIncomes'>('transfers');

  return (
    <div className="space-y-6">
      
      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Saldo Disponible */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
            <span>Saldo en Efectivo Disponible</span>
            <button
              onClick={onOpenInitialBalanceModal}
              className="text-slate-400 hover:text-slate-700"
              title="Ajustar saldo inicial"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(availableCash)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onOpenCashIncomeModal}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>+ Efectivo</span>
            </button>
            <button
              onClick={onOpenTransferModal}
              disabled={availableCash <= 0}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Transferir
            </button>
          </div>
        </div>

        {/* Saldo Inicial */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
            <span>Saldo Inicial de Caja</span>
            <button
              onClick={onOpenInitialBalanceModal}
              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold"
            >
              Cambiar
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-950 tabular-nums">
            {formatCurrency(initialBalance.amount)}
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate" title={initialBalance.notes}>
            {initialBalance.notes || 'Configuración de apertura'}
          </p>
        </div>

        {/* Ingresos en Efectivo Directos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Ingresos Directos en Efectivo
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums">
            {formatCurrency(totalCashIncomes)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {cashIncomes.length} cobro(s) o venta(s) recibidas en efectivo
          </p>
        </div>

        {/* Egresos y Transferencias */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Egresos / Transferencias
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-700 tabular-nums">
            {formatCurrency(totalTransferred)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {transfers.length} traslado(s) a bancos o gastos
          </p>
        </div>

      </div>

      {/* Tabs for movements table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Navigation sub-tabs */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('transfers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'transfers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              Egresos y Transferencias ({transfers.length})
            </button>
            <button
              onClick={() => setActiveSubTab('cashIncomes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'cashIncomes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              Ingresos en Efectivo ({cashIncomes.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab === 'transfers' ? (
              <button
                onClick={onOpenTransferModal}
                disabled={availableCash <= 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Nuevo Egreso / Transferencia</span>
              </button>
            ) : (
              <button
                onClick={onOpenCashIncomeModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Registrar Ingreso en Efectivo</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab 1: Transfers & Expenses Table */}
        {activeSubTab === 'transfers' && (
          <div>
            {transfers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se han registrado transferencias ni egresos aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Cuenta Destino / Motivo</th>
                      <th className="py-3 px-4">N° Comprobante</th>
                      <th className="py-3 px-4 text-right">Monto (USD)</th>
                      <th className="py-3 px-4">Autorizado Por</th>
                      <th className="py-3 px-4">Concepto</th>
                      {(onEditTransfer || onDeleteTransfer) && (
                        <th className="py-3 px-4 text-right">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 tabular-nums">
                          {formatDateDisplay(t.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.destinationAccount}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {t.referenceNumber}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          -{formatCurrency(t.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="inline-flex items-center gap-1 font-medium">
                            {t.transferredBy === 'Cristian' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{t.transferredBy}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {t.notes || '-'}
                        </td>
                        {(onEditTransfer || onDeleteTransfer) && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onEditTransfer && (
                                <button
                                  onClick={() => onEditTransfer(t)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar egreso o transferencia"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteTransfer && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `¿Deseas revertir este egreso (${t.referenceNumber} por ${formatCurrency(
                                          t.amount
                                        )}) y devolver el valor a caja?`
                                      )
                                    ) {
                                      onDeleteTransfer(t.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Revertir egreso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sub-tab 2: Cash Incomes Table */}
        {activeSubTab === 'cashIncomes' && (
          <div>
            {cashIncomes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se han registrado ingresos en efectivo directo aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Cliente / Procedencia</th>
                      <th className="py-3 px-4 text-right">Monto (USD)</th>
                      <th className="py-3 px-4">Recibido Por</th>
                      <th className="py-3 px-4">Concepto / Detalle</th>
                      {(onEditCashIncome || onDeleteCashIncome) && (
                        <th className="py-3 px-4 text-right">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cashIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 tabular-nums">
                          {formatDateDisplay(inc.date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inc.clientName}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                          +{formatCurrency(inc.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="inline-flex items-center gap-1 font-medium">
                            {inc.receivedBy === 'Cristian' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{inc.receivedBy}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {inc.notes || '-'}
                        </td>
                        {(onEditCashIncome || onDeleteCashIncome) && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onEditCashIncome && (
                                <button
                                  onClick={() => onEditCashIncome(inc)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Editar ingreso en efectivo"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                              )}
                              {onDeleteCashIncome && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('¿Deseas eliminar este registro de ingreso en efectivo?')) {
                                      onDeleteCashIncome(inc.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar ingreso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
