import React, { useState } from 'react';
import {
  Check,
  Client,
  Transfer,
  CashIncome,
  InitialBalanceConfig,
  UserRole,
} from '../types';
import {
  AppBackupPayload,
  buildBackupPayload,
  downloadBackupFile,
  sendBackupViaEmailClient,
  DEFAULT_BACKUP_EMAIL,
  getStoredBackupMeta,
  saveStoredBackupMeta,
} from '../services/backupService';
import { formatDateDisplay, formatCurrency, getTodayDateString } from '../utils/dateUtils';
import {
  X,
  ShieldCheck,
  Mail,
  Download,
  UploadCloud,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  RefreshCw,
  FileJson,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    checks: Check[];
    clients: Client[];
    transfers: Transfer[];
    cashIncomes: CashIncome[];
    initialBalance: InitialBalanceConfig;
    currentUser: UserRole;
  };
  onRestoreData: (backup: AppBackupPayload) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  data,
  onRestoreData,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');
  const [emailRecipient, setEmailRecipient] = useState(DEFAULT_BACKUP_EMAIL);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const meta = getStoredBackupMeta();

  if (!isOpen) return null;

  // Trigger manual immediate backup
  const handleCreateBackupNow = (withEmail: boolean) => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = buildBackupPayload(data, 'manual', emailRecipient);

      // 1. Download file directly
      downloadBackupFile(payload);

      // 2. Open email client with template if requested
      if (withEmail) {
        sendBackupViaEmailClient(payload);
      }

      // Update meta
      saveStoredBackupMeta({
        lastBackupDate: new Date().toISOString(),
        lastBackupType: 'manual',
        recipientEmail: emailRecipient,
        status: 'success',
      });

      setSuccessMsg(
        withEmail
          ? `¡Respaldo generado exitosamente! Se descargó el archivo JSON y se abrió tu correo para enviar a ${emailRecipient}.`
          : `¡Respaldo descargado exitosamente como archivo JSON!`
      );
    } catch (e) {
      console.error(e);
      setErrorMsg('Ocurrió un error al generar el respaldo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore data from JSON input or file
  const handleRestoreBackup = (rawJson: string) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const parsed = JSON.parse(rawJson);

      // Validate structure
      if (!parsed.data || !Array.isArray(parsed.data.checks)) {
        throw new Error('El archivo no contiene un formato de respaldo válido de ChequesPro.');
      }

      const confirmed = window.confirm(
        `¿Deseas restaurar la información del respaldo con ${parsed.data.checks.length} cheques y ${parsed.data.clients?.length || 0} clientes? Esto actualizará los registros del sistema.`
      );

      if (!confirmed) return;

      onRestoreData(parsed as AppBackupPayload);
      setSuccessMsg('¡Datos restaurados con éxito en el sistema!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al analizar el contenido JSON del respaldo.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreText(content);
      handleRestoreBackup(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-400 text-slate-900">
              <ShieldCheck className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h3 className="text-base font-bold">Respaldos y Seguridad de Datos</h3>
              <p className="text-xs text-slate-300">
                Copias mensuales automáticas y restauración de información
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Generar Respaldo
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Recuperar / Restaurar Data
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'create' ? (
            <div className="space-y-5">
              {/* Email destination config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Correo para Envío de Respaldos</span>
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">
                    Correo electrónico oficial configurado:
                  </label>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    placeholder="ccjoyas1@gmail.com"
                  />
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Automatización Fin de Mes:</strong> El sistema evalúa automáticamente cada fin de mes el envío del respaldo completo con todos los cheques, cobros y saldo de caja.
                  </span>
                </div>
              </div>

              {/* Data Summary */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-700 mb-2.5">
                  Resumen de lo que se respaldará hoy:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{data.checks.length}</div>
                    <div className="text-[11px] text-slate-500">Cheques</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{data.clients.length}</div>
                    <div className="text-[11px] text-slate-500">Clientes</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{data.cashIncomes.length}</div>
                    <div className="text-[11px] text-slate-500">Ingr. Efectivo</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{data.transfers.length}</div>
                    <div className="text-[11px] text-slate-500">Egresos</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateBackupNow(true)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Crear Respaldo Ahora y Enviar al Correo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateBackupNow(false)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Descargar Archivo JSON</span>
                </button>
              </div>

              {meta.lastBackupDate && (
                <p className="text-[11px] text-slate-400 text-center">
                  Último respaldo ejecutado:{' '}
                  {new Date(meta.lastBackupDate).toLocaleString('es-EC')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <strong>¿Perdiste datos o cambiaste de equipo?</strong> Sube aquí tu archivo de respaldo descargado o copia el contenido JSON recibido en tu correo electrónico ({emailRecipient}) para restaurar toda la base de datos al instante.
              </div>

              {/* Upload file */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Opción 1: Subir archivo .json de respaldo
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-medium text-slate-700">
                    Seleccionar archivo Respaldo_ChequesPro.json
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste JSON */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Opción 2: Pegar código JSON de recuperación
                </label>
                <textarea
                  rows={4}
                  value={restoreText}
                  onChange={(e) => setRestoreText(e.target.value)}
                  placeholder="Pega aquí el contenido del correo o archivo JSON..."
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleRestoreBackup(restoreText)}
                  disabled={!restoreText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restaurar Datos Ahora</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Destinatario oficial: ccjoyas1@gmail.com</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
