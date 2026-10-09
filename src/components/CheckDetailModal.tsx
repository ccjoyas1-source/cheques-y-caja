import React from 'react';
import { Check } from '../types';
import {
  formatCurrency,
  formatDateLong,
  formatDateDisplay,
  getStatusLabel,
  getStatusBadgeStyle,
} from '../utils/dateUtils';
import { X, Printer, Building2, AlertTriangle, FileText, CheckCircle2, RotateCcw } from 'lucide-react';

interface CheckDetailModalProps {
  check: Check | null;
  isOpen: boolean;
  onClose: () => void;
  onBounceCheck: (check: Check) => void;
  onRecoverBounceCheck?: (check: Check) => void;
}

export const CheckDetailModal: React.FC<CheckDetailModalProps> = ({
  check,
  isOpen,
  onClose,
  onBounceCheck,
  onRecoverBounceCheck,
}) => {
  if (!isOpen || !check) return null;

  const badge = getStatusBadgeStyle(check.status);
  const isCashed = check.status === 'cashed';
  const isBounced = check.status === 'bounced';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">
              Ficha del Cheque Postfechado
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Imprimir ficha del cheque"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher Body */}
        <div className="p-6 space-y-5">
          
          {/* Check voucher facsimile */}
          <div className="border border-slate-300 rounded-xl p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 relative shadow-xs">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {check.bank}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  CHEQUE POSTFECHADO
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {check.checkNumber}
                </span>
                <div className={`text-lg font-bold tabular-nums mt-1 ${isBounced ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                  {formatCurrency(check.amount)} <span className="text-xs font-normal text-slate-500">USD</span>
                </div>
              </div>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-medium">Páguese a la orden de:</span>
                <span className="font-bold text-slate-900 text-right">{check.clientName}</span>
              </div>
              
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-medium">Fecha de Cobro:</span>
                <span className="font-semibold text-slate-900 tabular-nums text-right">
                  {formatDateLong(check.dueDate)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-medium">Fecha de Emisión:</span>
                <span className="text-slate-700 tabular-nums text-right">{formatDateDisplay(check.issueDate)}</span>
              </div>

              {check.notes && (
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-slate-400 font-medium">Concepto / Venta:</span>
                  <span className="text-slate-800 text-right font-medium max-w-[250px]">{check.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px]">
              <span className={`px-2 py-0.5 rounded font-semibold border ${badge.bg} ${badge.border}`}>
                {getStatusLabel(check.status)}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                ID: {check.id}
              </span>
            </div>
          </div>

          {/* Audit & Management details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 text-xs mb-1">
              Registro y Auditoría
            </h4>
            
            <div className="flex justify-between text-slate-600">
              <span>Registrado en sistema por:</span>
              <span className="font-semibold text-slate-900">{check.createdBy}</span>
            </div>

            {isCashed && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Efectivizado automáticamente al cumplir fecha:</span>
                <span className="tabular-nums font-semibold">{formatDateDisplay(check.dueDate)}</span>
              </div>
            )}

            {isBounced && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-rose-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cheque Protestado / Devuelto</span>
                </div>
                {check.bouncedReason && (
                  <div>
                    <span className="font-semibold">Motivo: </span>
                    <span>{check.bouncedReason}</span>
                  </div>
                )}
                {check.bouncedDate && (
                  <div>
                    <span className="font-semibold">Fecha de protesto: </span>
                    <span className="tabular-nums">{formatDateDisplay(check.bouncedDate)}</span>
                  </div>
                )}
                {check.bouncedBy && (
                  <div>
                    <span className="font-semibold">Registrado por: </span>
                    <span>{check.bouncedBy}</span>
                  </div>
                )}
                <div className="text-[11px] font-semibold text-rose-700 pt-1">
                  * Este monto fue restado del saldo en efectivo disponible.
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cerrar
            </button>

            {isBounced ? (
              <button
                onClick={() => {
                  onClose();
                  onRecoverBounceCheck && onRecoverBounceCheck(check);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-emerald-300" />
                <span>Revertir Protesto / Recuperado</span>
              </button>
            ) : check.status !== 'cancelled' ? (
              <button
                onClick={() => {
                  onClose();
                  onBounceCheck(check);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span>Marcar Protestado / Devuelto</span>
              </button>
            ) : null}
          </div>

        </div>

      </div>
    </div>
  );
};
