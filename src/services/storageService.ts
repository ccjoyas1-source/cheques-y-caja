import { Check, Client, Transfer, CashIncome, InitialBalanceConfig, UserRole } from '../types';
import {
  INITIAL_CHECKS,
  INITIAL_CLIENTS,
  INITIAL_TRANSFERS,
  INITIAL_CASH_INCOMES,
  INITIAL_BALANCE_CONFIG,
} from '../utils/initialData';

export const STORAGE_KEYS = {
  CHECKS: 'chequespro_v3_checks_fresh',
  CLIENTS: 'chequespro_v3_clients_fresh',
  TRANSFERS: 'chequespro_v3_transfers_fresh',
  CASH_INCOMES: 'chequespro_v3_cash_incomes_fresh',
  INITIAL_BALANCE: 'chequespro_v3_initial_balance_fresh',
  CURRENT_USER: 'chequespro_v3_current_user_fresh',
  SYNC_TIMESTAMP: 'chequespro_v3_sync_timestamp',
};

export const broadcastLocalChange = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_TIMESTAMP, Date.now().toString());
  } catch (e) {
    // ignore
  }
};

// Clean any previous version leftovers
export const wipeAllStorage = () => {
  try {
    const keysToRemove = [
      'chequespro_checks_v1',
      'chequespro_clients_v1',
      'chequespro_transfers_v1',
      'chequespro_current_user_v1',
      'chequespro_checks_v2_clean',
      'chequespro_clients_v2_clean',
      'chequespro_transfers_v2_clean',
      'chequespro_cash_incomes_v2',
      'chequespro_initial_balance_v2',
      STORAGE_KEYS.CHECKS,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.TRANSFERS,
      STORAGE_KEYS.CASH_INCOMES,
      STORAGE_KEYS.INITIAL_BALANCE,
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error('Error wiping storage', e);
  }
};

export const getStoredChecks = (): Check[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveStoredChecks = (checks: Check[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(checks));
  } catch (e) {
    console.error('Error saving checks to storage', e);
  }
};

export const getStoredClients = (): Client[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveStoredClients = (clients: Client[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  } catch (e) {
    console.error('Error saving clients to storage', e);
  }
};

export const getStoredTransfers = (): Transfer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveStoredTransfers = (transfers: Transfer[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
  } catch (e) {
    console.error('Error saving transfers to storage', e);
  }
};

export const getStoredCashIncomes = (): CashIncome[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASH_INCOMES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveStoredCashIncomes = (incomes: CashIncome[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CASH_INCOMES, JSON.stringify(incomes));
  } catch (e) {
    console.error('Error saving cash incomes to storage', e);
  }
};

export const getStoredInitialBalance = (): InitialBalanceConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INITIAL_BALANCE);
    if (!raw) return INITIAL_BALANCE_CONFIG;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_BALANCE_CONFIG;
  }
};

export const saveStoredInitialBalance = (balance: InitialBalanceConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INITIAL_BALANCE, JSON.stringify(balance));
  } catch (e) {
    console.error('Error saving initial balance to storage', e);
  }
};

export const getStoredUser = (): UserRole => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw === 'Maria' || raw === 'Cristian') return raw;
    return 'Cristian';
  } catch {
    return 'Cristian';
  }
};

export const saveStoredUser = (user: UserRole): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user);
  } catch (e) {
    console.error('Error saving user to storage', e);
  }
};

export const clearAllDataToZero = () => {
  wipeAllStorage();
  localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CASH_INCOMES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INITIAL_BALANCE, JSON.stringify(INITIAL_BALANCE_CONFIG));
};

export const exportToCSV = (checks: Check[]): void => {
  const headers = [
    'Número de Cheque',
    'Cliente',
    'Monto (USD)',
    'Fecha de Cobro',
    'Fecha de Emisión',
    'Banco',
    'Estado',
    'Concepto / Notas',
    'Registrado Por',
  ];

  const rows = checks.map((chk) => [
    `"${chk.checkNumber}"`,
    `"${chk.clientName}"`,
    chk.amount.toFixed(2),
    chk.dueDate,
    chk.issueDate,
    `"${chk.bank}"`,
    `"${chk.status}"`,
    `"${(chk.notes || '').replace(/"/g, '""')}"`,
    chk.createdBy,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Reporte_Cheques_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
