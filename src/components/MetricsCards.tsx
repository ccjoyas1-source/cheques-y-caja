import React from 'react';
import { formatCurrency } from '../utils/dateUtils';
import {
  Wallet,
  CalendarClock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  MinusCircle,
  Settings,
  DollarSign,
} from 'lucide-react';

interface MetricsCardsProps {
  availableCash: number;
  initialBalance: number;
  totalCashed: number;
  totalCashIncomes: number;
  totalBounced: number;
  totalTransferred: number;
  totalPendingAmount: number;
  pendingCount: number;
  dueThisWeekAmount: number;
  dueThisWeekCount: number;
  bouncedCount: number;
  onOpenTransferModal: () => void;
  onOpenCashIncomeModal: () => void;
  onOpenInitialBalanceModal: () => void;
  onFilterDueThisWeek: () => void;
  onFilterBounced: () => void;
  onFilterAllPending: () => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  availableCash,
  initialBalance,
  totalCashed,
  totalCashIncomes,
  totalBounced,
  totalTransferred,
  totalPendingAmount,
  pendingCount,
  dueThisWeekAmount,
  dueThisWeekCount,
  bouncedCount,
  onOpenTransferModal,
  onOpenCashIncomeModal,
  onOpenInitialBalanceModal,
  onFilterDueThisWeek,
  onFilterBounced,
  onFilterAllPending,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Saldo en Efectivo Disponible */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5">
              <span>Saldo en Efectivo Disponible</span>
              <button
                type="button"
                onClick={onOpenInitialBalanceModal}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Configurar o ajustar saldo inicial"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
            {formatCurrency(availableCash)}
          </div>

          {/* Breakdown of cash components */}
          <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
            {initialBalance > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Saldo inicial:</span>
                <span className="font-semibold">{formatCurrency(initialBalance)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Cheques efectivizados:</span>
              <span className="font-semibold text-slate-700">{formatCurrency(totalCashed)}</span>
            </div>
            {totalCashIncomes > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Ingresos en efectivo:</span>
                <span className="font-semibold">+{formatCurrency(totalCashIncomes)}</span>
              </div>
            )}
            {totalBounced > 0 && (
              <div className="flex items-center justify-between text-rose-600 font-medium">
                <span>Protestados (Restado):</span>
                <span>-{formatCurrency(totalBounced)}</span>
              </div>
            )}
            {totalTransferred > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Egresos / Transferido:</span>
                <span>-{formatCurrency(totalTransferred)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={onOpenCashIncomeModal}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title="Registrar cobro o ingreso en efectivo directo"
          >
            <Plus className="w-3 h-3" />
            <span>+ Efectivo</span>
          </button>

          <button
            onClick={onOpenTransferModal}
            disabled={availableCash <= 0}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${
              availableCash > 0
                ? 'text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                : 'text-slate-400 bg-slate-50 cursor-not-allowed'
            }`}
          >
            <span>Transferir</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Total Por Cobrar Consolidado (Pendiente a futuro) */}
      <div 
        onClick={onFilterAllPending}
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer group"
      >
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Total Por Cobrar (Pendiente)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <CalendarClock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
            {formatCurrency(totalPendingAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>{pendingCount} {pendingCount === 1 ? 'cheque postfechado futuro' : 'cheques postfechados futuros'}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-medium">
          <span>Ver cheques pendientes</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      </div>

      {/* 3. Vencen Esta Semana */}
      <div 
        onClick={onFilterDueThisWeek}
        className={`rounded-xl border p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-colors ${
          dueThisWeekCount > 0 
            ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400' 
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-2">
            <span>Vencen Esta Semana</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <CalendarClock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-950 tabular-nums tracking-tight">
            {formatCurrency(dueThisWeekAmount)}
          </div>
          <div className="mt-2 text-xs font-medium text-amber-800">
            <span>
              {dueThisWeekCount} {dueThisWeekCount === 1 ? 'cheque por efectivizarse' : 'cheques por efectivizarse'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-900 font-semibold">
          <span>Filtrar semana actual</span>
          <span>→</span>
        </div>
      </div>

      {/* 4. Cheques Protestados / Devueltos */}
      <div 
        onClick={onFilterBounced}
        className={`rounded-xl border p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-colors ${
          bouncedCount > 0 
            ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400' 
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-rose-900 mb-2">
            <span>Protestados / Devueltos</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <MinusCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-950 tabular-nums tracking-tight">
            {bouncedCount > 0 ? `-${formatCurrency(totalBounced)}` : '$0.00'}
          </div>
          <div className="mt-2 text-xs font-medium text-rose-800">
            <span>
              {bouncedCount > 0 
                ? `${bouncedCount} cheque(s) devuelto(s) restado(s) de caja` 
                : 'Sin cheques protestados'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-200/80 flex items-center justify-between text-xs text-rose-900 font-semibold">
          <span>{bouncedCount > 0 ? 'Ver detalles de protesto' : 'Historial de devoluciones'}</span>
          <span>→</span>
        </div>
      </div>

    </div>
  );
};
