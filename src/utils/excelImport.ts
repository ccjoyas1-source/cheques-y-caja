import * as XLSX from 'xlsx';
import { Check, Client, CashIncome, Transfer, InitialBalanceConfig, UserRole } from '../types';
import { getTodayDateString, resolveCheckStatus } from './dateUtils';

export interface ParsedImportData {
  initialBalance?: {
    amount: number;
    date: string;
    notes?: string;
  };
  checks: Array<{
    clientName: string;
    amount: number;
    dueDate: string;
    checkNumber: string;
    bank: string;
    issueDate?: string;
    notes?: string;
    clientPhone?: string;
    clientIdentification?: string;
    isValid: boolean;
    errors: string[];
  }>;
  cashIncomes: Array<{
    clientName: string;
    amount: number;
    date: string;
    notes?: string;
    isValid: boolean;
    errors: string[];
  }>;
  expenses: Array<{
    destinationAccount: string;
    amount: number;
    date: string;
    referenceNumber: string;
    notes?: string;
    isValid: boolean;
    errors: string[];
  }>;
  newClientsDetected: string[];
  totalChecksAmount: number;
  totalCashIncomesAmount: number;
  totalExpensesAmount: number;
}

import { canonicalizeClientName } from './clientUtils';
export { canonicalizeClientName };

// Helper to normalize dates from Excel
export const normalizeExcelDate = (val: any): string => {
  if (!val) return getTodayDateString();

  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const m = String(dmyMatch[2]).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}

  return getTodayDateString();
};

export const parseAmountValue = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
  if (!val) return 0;
  const cleanStr = String(val)
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : Math.abs(num);
};

// Find matching header key in row object
const findColumnValue = (row: Record<string, any>, possibleKeys: string[]): any => {
  const keys = Object.keys(row);
  for (const possible of possibleKeys) {
    const match = keys.find((k) => k.trim().toLowerCase().replace(/[\._\-]/g, ' ') === possible);
    if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
      return row[match];
    }
  }
  return undefined;
};

// Parse an entire workbook
export const parseFullWorkbook = (workbook: XLSX.WorkBook, existingClients: Client[]): ParsedImportData => {
  const existingClientNames = new Set(existingClients.map((c) => c.name.toLowerCase()));
  const newClientsSet = new Set<string>();

  const result: ParsedImportData = {
    checks: [],
    cashIncomes: [],
    expenses: [],
    newClientsDetected: [],
    totalChecksAmount: 0,
    totalCashIncomesAmount: 0,
    totalExpensesAmount: 0,
  };

  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const lowerSheetName = sheetName.toLowerCase();
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    if (!rows || rows.length === 0) continue;

    // 1. Initial Balance Sheet
    if (lowerSheetName.includes('saldo inicial') || lowerSheetName.includes('apertura')) {
      for (const row of rows) {
        const amountVal = findColumnValue(row, ['monto', 'monto usd', 'saldo inicial', 'valor', 'saldo', 'importe']);
        const amount = parseAmountValue(amountVal);
        if (amount > 0) {
          const dateVal = findColumnValue(row, ['fecha', 'fecha apertura', 'fecha inicio']);
          const notesVal = findColumnValue(row, ['concepto', 'observaciones', 'detalle', 'notas']);
          result.initialBalance = {
            amount,
            date: normalizeExcelDate(dateVal),
            notes: notesVal ? String(notesVal).trim() : 'Saldo inicial importado',
          };
          break;
        }
      }
      continue;
    }

    // 2. Cash Incomes Sheet
    if (lowerSheetName.includes('ingreso') || lowerSheetName.includes('efectivo')) {
      for (const row of rows) {
        const clientVal = findColumnValue(row, ['cliente', 'nombre', 'concepto', 'cliente o concepto', 'recibido de']);
        const amountVal = findColumnValue(row, ['monto', 'valor', 'importe', 'total', 'monto usd']);
        const dateVal = findColumnValue(row, ['fecha', 'fecha ingreso', 'fecha cobro']);
        const notesVal = findColumnValue(row, ['concepto', 'notas', 'detalle', 'observaciones']);

        const clientName = canonicalizeClientName(clientVal ? String(clientVal).trim() : 'Venta en Efectivo');
        const amount = parseAmountValue(amountVal);
        const date = normalizeExcelDate(dateVal);
        const notes = notesVal ? String(notesVal).trim() : '';

        if (amount > 0) {
          result.cashIncomes.push({
            clientName,
            amount,
            date,
            notes,
            isValid: true,
            errors: [],
          });
          result.totalCashIncomesAmount += amount;
          if (clientName && !existingClientNames.has(clientName.toLowerCase())) {
            newClientsSet.add(clientName);
          }
        }
      }
      continue;
    }

    // 3. Expenses / Transfers Sheet
    if (lowerSheetName.includes('egreso') || lowerSheetName.includes('transferencia') || lowerSheetName.includes('gasto')) {
      for (const row of rows) {
        const destVal = findColumnValue(row, ['cuenta destino', 'destino', 'cuenta', 'motivo', 'concepto', 'proveedor']);
        const amountVal = findColumnValue(row, ['monto', 'valor', 'importe', 'total']);
        const dateVal = findColumnValue(row, ['fecha', 'fecha transferencia', 'fecha egreso']);
        const refVal = findColumnValue(row, ['comprobante', 'n° comprobante', 'referencia', 'n° referencia', 'numero']);
        const notesVal = findColumnValue(row, ['notas', 'observaciones', 'detalle']);

        const amount = parseAmountValue(amountVal);
        if (amount > 0) {
          result.expenses.push({
            destinationAccount: destVal ? String(destVal).trim() : 'Transferencia Bancaria',
            amount,
            date: normalizeExcelDate(dateVal),
            referenceNumber: refVal ? String(refVal).trim() : `TRF-${Math.floor(10000 + Math.random() * 90000)}`,
            notes: notesVal ? String(notesVal).trim() : undefined,
            isValid: true,
            errors: [],
          });
          result.totalExpensesAmount += amount;
        }
      }
      continue;
    }

    // 4. Checks Sheet (or general sheet with rows)
    for (const row of rows) {
      // Check if this single row represents Saldo Inicial
      const typeVal = String(findColumnValue(row, ['tipo', 'tipo operacion', 'concepto']) || '').toLowerCase();
      if (typeVal.includes('saldo inicial')) {
        const amount = parseAmountValue(findColumnValue(row, ['monto', 'valor', 'saldo inicial', 'saldo']));
        if (amount > 0 && !result.initialBalance) {
          result.initialBalance = {
            amount,
            date: normalizeExcelDate(findColumnValue(row, ['fecha'])),
            notes: 'Saldo inicial importado',
          };
          continue;
        }
      }

      // Check if row is an Ingreso en Efectivo
      if (typeVal.includes('ingreso efectivo') || typeVal.includes('efectivo')) {
        const clientName = canonicalizeClientName(String(findColumnValue(row, ['cliente', 'nombre']) || 'Ingreso Efectivo').trim());
        const amount = parseAmountValue(findColumnValue(row, ['monto', 'valor']));
        const date = normalizeExcelDate(findColumnValue(row, ['fecha', 'fecha cobro']));
        if (amount > 0) {
          result.cashIncomes.push({
            clientName,
            amount,
            date,
            notes: String(findColumnValue(row, ['concepto', 'notas', 'detalle']) || ''),
            isValid: true,
            errors: [],
          });
          result.totalCashIncomesAmount += amount;
          continue;
        }
      }

      // Check if row is an Egreso
      if (typeVal.includes('egreso') || typeVal.includes('transferencia')) {
        const amount = parseAmountValue(findColumnValue(row, ['monto', 'valor']));
        if (amount > 0) {
          result.expenses.push({
            destinationAccount: String(findColumnValue(row, ['destino', 'cuenta', 'banco', 'cliente']) || 'Egreso de Caja').trim(),
            amount,
            date: normalizeExcelDate(findColumnValue(row, ['fecha', 'fecha cobro'])),
            referenceNumber: String(findColumnValue(row, ['n° cheque', 'comprobante', 'referencia']) || `EGR-${Math.floor(1000 + Math.random() * 9000)}`),
            notes: String(findColumnValue(row, ['concepto', 'notas']) || ''),
            isValid: true,
            errors: [],
          });
          result.totalExpensesAmount += amount;
          continue;
        }
      }

      // Default: Postdated Check
      const clientVal = findColumnValue(row, ['cliente', 'nombre', 'nombre cliente', 'razon social', 'empresa', 'titular']);
      const amountVal = findColumnValue(row, ['valor', 'monto', 'valor usd', 'monto usd', 'importe', 'total', 'dolares']);
      const dueDateVal = findColumnValue(row, ['fecha cobro', 'fecha de cobro', 'fecha vencimiento', 'vencimiento', 'cobro', 'fecha']);
      const checkNumVal = findColumnValue(row, ['n° cheque', 'num cheque', 'numero cheque', 'nro cheque', 'cheque', 'numero']);
      const bankVal = findColumnValue(row, ['banco', 'banco emisor', 'institucion']);
      const issueDateVal = findColumnValue(row, ['fecha emision', 'emision']);
      const notesVal = findColumnValue(row, ['concepto', 'notas', 'detalle', 'observaciones']);
      const phoneVal = findColumnValue(row, ['telefono', 'celular', 'whatsapp']);
      const idVal = findColumnValue(row, ['ruc', 'cedula', 'identificacion', 'ci']);

      const clientName = canonicalizeClientName(clientVal ? String(clientVal).trim() : '');
      const amount = parseAmountValue(amountVal);

      if (clientName && amount > 0) {
        const dueDate = normalizeExcelDate(dueDateVal);
        const checkNumber = checkNumVal ? String(checkNumVal).trim() : `CH-${Math.floor(100000 + Math.random() * 900000)}`;
        const bank = bankVal ? String(bankVal).trim() : 'Banco General';
        const issueDate = issueDateVal ? normalizeExcelDate(issueDateVal) : getTodayDateString();
        const notes = notesVal ? String(notesVal).trim() : '';
        const clientPhone = phoneVal ? String(phoneVal).trim() : undefined;
        const clientIdentification = idVal ? String(idVal).trim() : undefined;

        result.checks.push({
          clientName,
          amount,
          dueDate,
          checkNumber,
          bank,
          issueDate,
          notes,
          clientPhone,
          clientIdentification,
          isValid: true,
          errors: [],
        });
        result.totalChecksAmount += amount;

        if (!existingClientNames.has(clientName.toLowerCase())) {
          newClientsSet.add(clientName);
        }
      }
    }
  }

  result.newClientsDetected = Array.from(newClientsSet);
  return result;
};

// Generates the official multi-tab Excel template
export const generateSampleExcelTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet: Saldo Inicial
  const sheetSaldoInicial = [
    {
      'Concepto': 'Saldo Inicial de Apertura en Caja',
      'Monto USD': 3500.00,
      'Fecha': '2026-10-01',
      'Observaciones': 'Dinero en efectivo existente al iniciar el control',
    },
  ];
  const wsSaldo = XLSX.utils.json_to_sheet(sheetSaldoInicial);
  wsSaldo['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, wsSaldo, '1. Saldo Inicial');

  // 2. Sheet: Cheques Postfechados
  const sheetCheques = [
    {
      'Cliente': 'Joyería El Diamante Real',
      'Monto': 2850.00,
      'Fecha Cobro': '2026-10-25',
      'N° Cheque': 'CH-004812',
      'Banco': 'Banco Pichincha',
      'Fecha Emisión': '2026-10-01',
      'Concepto': 'Lote cadenas oro 18k factura 104',
      'Teléfono': '+593 99 876 5432',
      'RUC o Cédula': '1792837465001',
    },
    {
      'Cliente': 'Carlos Mendoza Alarcón',
      'Monto': 1400.00,
      'Fecha Cobro': '2026-11-05',
      'N° Cheque': 'CH-007931',
      'Banco': 'Banco Guayaquil',
      'Fecha Emisión': '2026-10-05',
      'Concepto': 'Anillo solitario diamante 1ct',
      'Teléfono': '+593 98 111 2233',
      'RUC o Cédula': '0912837465',
    },
    {
      'Cliente': 'Distribuidora Aurum S.A.',
      'Monto': 4200.00,
      'Fecha Cobro': '2026-11-15',
      'N° Cheque': 'CH-009105',
      'Banco': 'Produbanco',
      'Fecha Emisión': '2026-10-08',
      'Concepto': 'Abono 2 pedido mayorista',
      'Teléfono': '+593 99 444 8899',
      'RUC o Cédula': '1798372615001',
    },
  ];
  const wsCheques = XLSX.utils.json_to_sheet(sheetCheques);
  wsCheques['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsCheques, '2. Cheques Postfechados');

  // 3. Sheet: Ingresos en Efectivo
  const sheetIngresos = [
    {
      'Cliente o Concepto': 'Sofía Valdivieso Arteaga',
      'Monto': 950.00,
      'Fecha': '2026-10-07',
      'Concepto': 'Pago en efectivo aretes esmeralda',
    },
    {
      'Cliente o Concepto': 'Venta Mostrador Joyería',
      'Monto': 620.00,
      'Fecha': '2026-10-08',
      'Concepto': 'Cadena oro plata venta directa',
    },
  ];
  const wsIngresos = XLSX.utils.json_to_sheet(sheetIngresos);
  wsIngresos['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, wsIngresos, '3. Ingresos en Efectivo');

  // 4. Sheet: Egresos y Transferencias
  const sheetEgresos = [
    {
      'Cuenta Destino o Motivo': 'Banco Pichincha - Cta Corriente',
      'Monto': 1500.00,
      'Fecha': '2026-10-06',
      'N° Comprobante': 'TRF-10492',
      'Observaciones': 'Depósito de fondos a cuenta principal',
    },
    {
      'Cuenta Destino o Motivo': 'Pago Proveedor de Oro',
      'Monto': 800.00,
      'Fecha': '2026-10-08',
      'N° Comprobante': 'EGR-8841',
      'Observaciones': 'Adquisición de láminas de oro 24k',
    },
  ];
  const wsEgresos = XLSX.utils.json_to_sheet(sheetEgresos);
  wsEgresos['!cols'] = [{ wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, wsEgresos, '4. Egresos y Transferencias');

  XLSX.writeFile(workbook, 'Plantilla_ChequesPro_Completa.xlsx');
};
