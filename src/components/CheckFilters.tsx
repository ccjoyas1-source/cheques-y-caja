import React from 'react';
import { Client, CheckFiltersState } from '../types';
import { Search, Filter, X, Building2, User, Calendar, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../utils/dateUtils';

interface CheckFiltersProps {
  filters: CheckFiltersState;
  onFilterChange: (newFilters: Partial<CheckFiltersState>) => void;
  onResetFilters: () => void;
  clients: Client[];
  banks: string[];
  totalFilteredAmount: number;
  totalFilteredPendingAmount: number;
  filteredCount: number;
  onExportCSV: () => void;
  onOpenImportExcel?: () => void;
}

export const CheckFilters: React.FC<CheckFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  clients,
  banks,
  totalFilteredAmount,
  totalFilteredPendingAmount,
  filteredCount,
  onExportCSV,
  onOpenImportExcel,
}) => {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.clientName !== '' ||
    filters.status !== 'all' ||
    filters.bank !== '' ||
    filters.timeframe !== 'all';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-xs">
      
      {/* Upper Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Search Input */}
        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Buscar cheque o concepto
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="N° cheque, concepto, banco..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Client Selector (Dropdown to avoid capture errors as requested) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            <span>Filtrar por Cliente</span>
          </label>
          <select
            value={filters.clientName}
            onChange={(e) => onFilterChange({ clientName: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          >
            <option value="">Todos los clientes ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Estado del Cheque</span>
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          >
            <option value="all">Todos los cheques</option>
            <option value="uncollected">⏳ Solo Por Cobrar (Pendientes)</option>
            <option value="due_this_week">⚡ Vencen Esta Semana</option>
            <option value="cashed">✅ Efectivizados (Al Día por fecha)</option>
            <option value="bounced">❌ Protestados / Devueltos</option>
            <option value="cancelled">🚫 Anulados</option>
          </select>
        </div>

        {/* Bank Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>Banco Emisor</span>
          </label>
          <select
            value={filters.bank}
            onChange={(e) => onFilterChange({ bank: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          >
            <option value="">Todos los bancos</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Vencimiento / Cobro</span>
          </label>
          <select
            value={filters.timeframe}
            onChange={(e) => onFilterChange({ timeframe: e.target.value as any })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Vencen Hoy</option>
            <option value="this_week">Esta semana (7 días)</option>
            <option value="this_month">Este mes en curso</option>
            <option value="next_30_days">Próximos 30 días</option>
          </select>
        </div>

      </div>

      {/* Prominent Sumatoria Bar */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Sumatoria Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {/* 1. Sumatoria: Total por Cobrar (Pendiente) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Total por Cobrar (Pendiente)
              </span>
              <span className="text-xl font-bold text-slate-900 tabular-nums block">
                {formatCurrency(totalFilteredPendingAmount)}
              </span>
              <span className="text-[10px] text-slate-500">
                Cheques postfechados con fecha a futuro
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Sumatoria: Monto Total en Vista */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Monto Total en Vista
              </span>
              <span className="text-xl font-bold text-slate-900 tabular-nums block">
                {formatCurrency(totalFilteredAmount)}
              </span>
              <span className="text-[10px] text-slate-500">
                Sumatoria de {filteredCount} {filteredCount === 1 ? 'cheque mostrado' : 'cheques mostrados'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs">
              {filteredCount}
            </div>
          </div>
        </div>

        {/* Buttons: Reset filters, Import & Export */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer filtros</span>
            </button>
          )}

          {onOpenImportExcel && (
            <button
              onClick={onOpenImportExcel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              title="Importar tus clientes y cheques desde una hoja de Excel (.xlsx / .csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Importar Excel</span>
            </button>
          )}

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Descargar listado en formato Excel / CSV"
          >
            <span>Descargar CSV</span>
          </button>
        </div>

      </div>

    </div>
  );
};
