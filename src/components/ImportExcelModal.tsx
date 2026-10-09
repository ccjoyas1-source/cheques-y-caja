import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Client, Check, UserRole, CashIncome, Transfer, InitialBalanceConfig } from '../types';
import {
  parseFullWorkbook,
  generateSampleExcelTemplate,
  ParsedImportData,
} from '../utils/excelImport';
import { formatCurrency, formatDateDisplay, resolveCheckStatus } from '../utils/dateUtils';
import {
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Building2,
  DollarSign,
  Wallet,
  ArrowRightLeft,
  Info,
} from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClients: Client[];
  currentUser: UserRole;
  onImportComplete: (payload: {
    checks: Check[];
    newClients: Client[];
    cashIncomes: CashIncome[];
    expenses: Transfer[];
    initialBalance?: InitialBalanceConfig;
    replaceAll: boolean;
  }) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  existingClients,
  currentUser,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [importResult, setImportResult] = useState<ParsedImportData | null>(null);
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setImportResult(null);
    setFileName('');
    setPastedText('');
    setErrorMsg('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processWorkbook = (workbook: XLSX.WorkBook, sourceName: string) => {
    try {
      const parsed = parseFullWorkbook(workbook, existingClients);
      const totalItems =
        parsed.checks.length +
        parsed.cashIncomes.length +
        parsed.expenses.length +
        (parsed.initialBalance ? 1 : 0);

      if (totalItems === 0) {
        setErrorMsg('No se encontraron filas válidas en el archivo o texto.');
        return;
      }

      setImportResult(parsed);
      setFileName(sourceName);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Error al procesar el archivo: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        processWorkbook(workbook, file.name);
      } catch (err: any) {
        setErrorMsg('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Hubo un error al abrir el archivo.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Pega primero el texto o celdas de tu Excel.');
      return;
    }

    try {
      const workbook = XLSX.read(pastedText, { type: 'string' });
      processWorkbook(workbook, 'Celdas pegadas desde Excel');
    } catch (err: any) {
      setErrorMsg('Error al interpretar las celdas pegadas: ' + err.message);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult) return;

    // 1. Build new clients
    const newClientsToAdd: Client[] = [];
    const clientNameToIdMap = new Map<string, string>();

    existingClients.forEach((c) => {
      clientNameToIdMap.set(c.name.toLowerCase(), c.id);
    });

    const addClientIfNew = (name: string, phone?: string, idNum?: string) => {
      const lower = name.toLowerCase().trim();
      if (!lower) return;
      if (!clientNameToIdMap.has(lower)) {
        const newClient: Client = {
          id: `cli-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: name.trim(),
          phone,
          identification: idNum,
          createdAt: new Date().toISOString().split('T')[0],
        };
        newClientsToAdd.push(newClient);
        clientNameToIdMap.set(lower, newClient.id);
      }
    };

    // 2. Checks to import
    const checksToImport: Check[] = importResult.checks.map((row, idx) => {
      addClientIfNew(row.clientName, row.clientPhone, row.clientIdentification);
      const newCheck: Check = {
        id: `chk-imp-${Date.now()}-${idx}`,
        checkNumber: row.checkNumber,
        clientName: row.clientName,
        amount: row.amount,
        dueDate: row.dueDate,
        issueDate: row.issueDate || row.dueDate,
        bank: row.bank,
        status: 'pending',
        notes: row.notes || '',
        createdBy: currentUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newCheck.status = resolveCheckStatus(newCheck);
      return newCheck;
    });

    // 3. Cash Incomes to import
    const cashIncomesToImport: CashIncome[] = importResult.cashIncomes.map((row, idx) => {
      addClientIfNew(row.clientName);
      return {
        id: `inc-imp-${Date.now()}-${idx}`,
        clientName: row.clientName,
        amount: row.amount,
        date: row.date,
        notes: row.notes,
        receivedBy: currentUser,
        createdAt: new Date().toISOString(),
      };
    });

    // 4. Expenses to import
    const expensesToImport: Transfer[] = importResult.expenses.map((row, idx) => ({
      id: `egr-imp-${Date.now()}-${idx}`,
      destinationAccount: row.destinationAccount,
      amount: row.amount,
      date: row.date,
      referenceNumber: row.referenceNumber,
      notes: row.notes,
      transferredBy: currentUser,
      createdAt: new Date().toISOString(),
    }));

    // 5. Initial balance config if detected
    let initialBalanceToSave: InitialBalanceConfig | undefined = undefined;
    if (importResult.initialBalance && importResult.initialBalance.amount > 0) {
      initialBalanceToSave = {
        amount: importResult.initialBalance.amount,
        date: importResult.initialBalance.date,
        notes: importResult.initialBalance.notes || 'Saldo inicial importado',
        setBy: currentUser,
      };
    }

    onImportComplete({
      checks: checksToImport,
      newClients: newClientsToAdd,
      cashIncomes: cashIncomesToImport,
      expenses: expensesToImport,
      initialBalance: initialBalanceToSave,
      replaceAll: importMode === 'replace',
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Importar Datos Completos desde Excel
              </h3>
              <p className="text-xs text-slate-500">
                Saldo inicial, cheques postfechados, ingresos en efectivo y egresos
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={generateSampleExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Descargar plantilla Excel completa con Saldo Inicial, Cheques, Ingresos y Egresos"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Descargar Plantilla Oficial</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!importResult ? (
            <>
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Subir Archivo (.xlsx / .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Copiar y Pegar desde Excel</span>
                </button>
              </div>

              {activeTab === 'file' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Haz clic para seleccionar tu archivo Excel o CSV
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Compatible con <strong>.xlsx</strong> (multil-hoja) o <strong>.csv</strong>
                    </p>
                  </div>

                  {/* Template Info Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-600" />
                      <span>Estructura de la Plantilla para Importación Inicial:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="text-slate-900 block font-semibold">1. Saldo Inicial</strong>
                        Columna Monto USD y Fecha de apertura de caja.
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="text-slate-900 block font-semibold">2. Cheques Postfechados</strong>
                        Cliente, Monto, Fecha Cobro, N° Cheque, Banco.
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="text-slate-900 block font-semibold">3. Ingresos en Efectivo</strong>
                        Cliente / Concepto, Monto en efectivo, Fecha.
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <strong className="text-slate-900 block font-semibold">4. Egresos y Transferencias</strong>
                        Destino / Motivo, Monto, Fecha, N° Comprobante.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pega aquí tus celdas copiadas de Excel (incluyendo encabezados):
                    </label>
                    <textarea
                      rows={7}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Cliente	Valor	Fecha Cobro	N° Cheque	Banco&#10;Joyería El Diamante	2500	2026-10-30	CH-00918	Banco Pichincha"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPasted}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Interpretar Datos Pegados
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Preview of detected items */
            <div className="space-y-4">
              
              {/* Header Status */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Datos leídos con éxito: {fileName}</span>
                  </div>
                  <div className="text-emerald-900 mt-1">
                    Revisa el resumen antes de aplicar la importación.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 text-xs text-emerald-900 font-semibold bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer self-start sm:self-auto"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Detected Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                
                {/* Saldo inicial */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block">
                    Saldo Inicial
                  </span>
                  <span className="text-base font-bold text-indigo-950 tabular-nums">
                    {importResult.initialBalance ? formatCurrency(importResult.initialBalance.amount) : '$0.00'}
                  </span>
                  <span className="text-[10px] text-indigo-600 block mt-0.5">
                    {importResult.initialBalance ? 'Detectado en archivo' : 'Sin saldo inicial'}
                  </span>
                </div>

                {/* Cheques */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                    Cheques Postfechados
                  </span>
                  <span className="text-base font-bold text-amber-950 tabular-nums">
                    {formatCurrency(importResult.totalChecksAmount)}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    {importResult.checks.length} cheque(s)
                  </span>
                </div>

                {/* Ingresos en efectivo */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">
                    Ingresos Efectivo
                  </span>
                  <span className="text-base font-bold text-emerald-950 tabular-nums">
                    {formatCurrency(importResult.totalCashIncomesAmount)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    {importResult.cashIncomes.length} ingreso(s)
                  </span>
                </div>

                {/* Egresos */}
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wide block">
                    Egresos / Transf.
                  </span>
                  <span className="text-base font-bold text-rose-950 tabular-nums">
                    -{formatCurrency(importResult.totalExpensesAmount)}
                  </span>
                  <span className="text-[10px] text-rose-700 block mt-0.5">
                    {importResult.expenses.length} egreso(s)
                  </span>
                </div>

              </div>

              {/* Mode choice: Append vs Replace */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">¿Cómo deseas procesar la importación?</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-slate-900"
                    />
                    <span>Agregar a los datos existentes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600"
                    />
                    <span>Importación limpia (Reemplazar todo con este archivo)</span>
                  </label>
                </div>
              </div>

              {/* Preview table of checks */}
              {importResult.checks.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Vista previa de cheques a ingresar:
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <tr>
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3">Monto (USD)</th>
                          <th className="py-2 px-3">Fecha Cobro</th>
                          <th className="py-2 px-3">N° Cheque</th>
                          <th className="py-2 px-3">Banco</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.checks.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {row.clientName}
                            </td>
                            <td className="py-2 px-3 font-bold tabular-nums">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="py-2 px-3 tabular-nums">
                              {formatDateDisplay(row.dueDate)}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {row.checkNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {row.bank}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {importResult && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Confirmar e Importar Datos</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
