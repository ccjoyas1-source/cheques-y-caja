import React from 'react';
import { Check, UserRole } from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  getDaysDifference,
  getStatusLabel,
  getStatusBadgeStyle,
} from '../utils/dateUtils';
import {
  Calendar,
  Building2,
  Clock,
  AlertTriangle,
  MoreVertical,
  Eye,
  Edit2,
  FileText,
  Ban,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface CheckListProps {
  checks: Check[];
  currentUser: UserRole;
  onEditCheck: (check: Check) => void;
  onViewDetail: (check: Check) => void;
  onBounceCheck: (check: Check) => void;
  onRecoverBounceCheck?: (check: Check) => void;
  onCancelCheck: (check: Check) => void;
  onAddNewCheck: () => void;
}

export const CheckList: React.FC<CheckListProps> = ({
  checks,
  currentUser,
  onEditCheck,
  onViewDetail,
  onBounceCheck,
  onRecoverBounceCheck,
  onCancelCheck,
  onAddNewCheck,
}) => {
  const [activeMenuCheckId, setActiveMenuCheckId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuCheckId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  if (checks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No se encontraron cheques</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          No hay cheques que coincidan con los filtros aplicados o aún no has registrado cheques postfechados.
        </p>
        <button
          onClick={onAddNewCheck}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span>Registrar Nuevo Cheque</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Cheques Registrados
          </h2>
          <span className="text-xs text-slate-500">
            · Efectivización automática por fecha de cobro
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Efectivo automático al cumplir fecha
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Vencen esta semana
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Fecha Cobro / Estado</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">N° Cheque / Banco</th>
              <th className="py-3 px-4 text-right">Valor (USD)</th>
              <th className="py-3 px-4">Estado de Cobro</th>
              <th className="py-3 px-4">Concepto / Notas</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {checks.map((check) => {
              const daysDiff = getDaysDifference(check.dueDate);
              const isBounced = check.status === 'bounced';
              const isCancelled = check.status === 'cancelled';
              const isCashed = check.status === 'cashed';
              const isThisWeek = !isBounced && !isCancelled && !isCashed && daysDiff >= 0 && daysDiff <= 7;

              // Row background styling
              let rowBg = 'hover:bg-slate-50/70 transition-colors';
              if (isBounced) {
                rowBg = 'bg-rose-50/50 hover:bg-rose-50/80 transition-colors';
              } else if (isThisWeek) {
                rowBg = 'bg-amber-50/40 hover:bg-amber-50/70 transition-colors';
              } else if (isCashed) {
                rowBg = 'bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors';
              }

              const badge = getStatusBadgeStyle(check.status);

              return (
                <tr key={check.id} className={rowBg}>
                  
                  {/* Fecha de Cobro & Indicador */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 tabular-nums">
                      {formatDateDisplay(check.dueDate)}
                    </div>
                    
                    {/* Urgency or auto-cashed status note */}
                    {isBounced ? (
                      <div className="text-[11px] font-semibold text-rose-700 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Restado del saldo (-{formatCurrency(check.amount)})</span>
                      </div>
                    ) : isCashed ? (
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Efectivizado automáticamente</span>
                      </div>
                    ) : daysDiff === 0 ? (
                      <div className="text-[11px] font-bold text-amber-700 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ¡Cumple HOY! (Se efectiviza)
                      </div>
                    ) : daysDiff > 0 && daysDiff <= 7 ? (
                      <div className="text-[11px] font-medium text-amber-800 mt-0.5">
                        En {daysDiff} días (Esta semana)
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        En {daysDiff} días
                      </div>
                    )}
                  </td>

                  {/* Cliente */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      {check.clientName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Emisión: {formatDateDisplay(check.issueDate)}
                    </div>
                  </td>

                  {/* N° Cheque & Banco */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-800 font-medium">
                      {check.checkNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{check.bank}</span>
                    </div>
                  </td>

                  {/* Valor en Dólares */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className={`text-sm font-bold tabular-nums ${isBounced ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                      {formatCurrency(check.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isBounced ? 'DEVUELTO' : 'USD'}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg} ${badge.border}`}>
                      {getStatusLabel(check.status)}
                    </span>
                    {isBounced && check.bouncedReason && (
                      <div className="text-[10px] text-rose-700 font-medium mt-0.5 max-w-[170px] truncate" title={check.bouncedReason}>
                        {check.bouncedReason}
                      </div>
                    )}
                  </td>

                  {/* Concepto / Registro */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-700 line-clamp-1 max-w-[220px]" title={check.notes}>
                      {check.notes || 'Sin concepto'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Reg. por {check.createdBy}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* Si el cheque está protestado, opción de reactivar/recuperado */}
                      {isBounced ? (
                        <button
                          onClick={() => onRecoverBounceCheck && onRecoverBounceCheck(check)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="Revertir protesto y volver a considerar como cheque al día"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Recuperado</span>
                        </button>
                      ) : !isCancelled ? (
                        /* Botón para marcar como Protestado o Devuelto (resta donde corresponda) */
                        <button
                          onClick={() => onBounceCheck(check)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="Marcar cheque como protestado o devuelto (resta el monto del efectivo)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Protestado / Devuelto</span>
                        </button>
                      ) : null}

                      {/* Botón Ver Detalle */}
                      <button
                        onClick={() => onViewDetail(check)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Ver ficha y comprobante"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown de opciones adicionales */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuCheckId(activeMenuCheckId === check.id ? null : check.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Más opciones"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuCheckId === check.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs text-slate-700 text-left"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuCheckId(null);
                                onEditCheck(check);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Editar Cheque</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuCheckId(null);
                                onViewDetail(check);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver Ficha</span>
                            </button>

                            {!isBounced && !isCancelled && (
                              <button
                                onClick={() => {
                                  setActiveMenuCheckId(null);
                                  onCancelCheck(check);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-2 cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5 text-slate-400" />
                                <span>Anular Cheque</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
