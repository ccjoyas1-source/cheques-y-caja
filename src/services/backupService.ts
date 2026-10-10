import { Check, Client, Transfer, CashIncome, InitialBalanceConfig, UserRole } from '../types';
import { formatCurrency, formatDateDisplay, getTodayDateString } from '../utils/dateUtils';

export interface AppBackupPayload {
  version: string;
  backupDate: string;
  recipientEmail: string;
  type: 'manual' | 'scheduled_monthly';
  summary: {
    totalChecks: number;
    totalClients: number;
    totalTransfers: number;
    totalCashIncomes: number;
    initialBalance: number;
  };
  data: {
    checks: Check[];
    clients: Client[];
    transfers: Transfer[];
    cashIncomes: CashIncome[];
    initialBalance: InitialBalanceConfig;
    currentUser: UserRole;
  };
}

const BACKUP_META_KEY = 'chequespro_last_backup_meta';
export const DEFAULT_BACKUP_EMAIL = 'ccjoyas1@gmail.com';

export interface BackupMeta {
  lastBackupDate?: string;
  lastBackupType?: 'manual' | 'scheduled_monthly';
  recipientEmail: string;
  status: 'idle' | 'success' | 'pending';
}

export const getStoredBackupMeta = (): BackupMeta => {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (!raw) return { recipientEmail: DEFAULT_BACKUP_EMAIL, status: 'idle' };
    return JSON.parse(raw);
  } catch {
    return { recipientEmail: DEFAULT_BACKUP_EMAIL, status: 'idle' };
  }
};

export const saveStoredBackupMeta = (meta: BackupMeta) => {
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Error saving backup meta', e);
  }
};

/**
 * Builds the complete structured backup payload
 */
export const buildBackupPayload = (
  data: {
    checks: Check[];
    clients: Client[];
    transfers: Transfer[];
    cashIncomes: CashIncome[];
    initialBalance: InitialBalanceConfig;
    currentUser: UserRole;
  },
  type: 'manual' | 'scheduled_monthly' = 'manual',
  email: string = DEFAULT_BACKUP_EMAIL
): AppBackupPayload => {
  return {
    version: '3.0.0',
    backupDate: new Date().toISOString(),
    recipientEmail: email,
    type,
    summary: {
      totalChecks: data.checks.length,
      totalClients: data.clients.length,
      totalTransfers: data.transfers.length,
      totalCashIncomes: data.cashIncomes.length,
      initialBalance: data.initialBalance.amount,
    },
    data,
  };
};

/**
 * Downloads the backup JSON file locally
 */
export const downloadBackupFile = (payload: AppBackupPayload) => {
  const dateStr = getTodayDateString();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Respaldo_ChequesPro_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates an email body and mailto link for sending the backup to ccjoyas1@gmail.com
 */
export const sendBackupViaEmailClient = (payload: AppBackupPayload) => {
  const dateStr = getTodayDateString();
  const subject = encodeURIComponent(
    `[Respaldo ChequesPro] Copia de Seguridad al ${formatDateDisplay(dateStr)} - ccjoyas1@gmail.com`
  );

  const pendingChecks = payload.data.checks.filter((c) => c.status === 'pending' || c.status === 'due_soon');
  const cashedChecks = payload.data.checks.filter((c) => c.status === 'cashed');
  const bouncedChecks = payload.data.checks.filter((c) => c.status === 'bounced');

  const totalPendingAmount = pendingChecks.reduce((acc, c) => acc + c.amount, 0);
  const totalCashedAmount = cashedChecks.reduce((acc, c) => acc + c.amount, 0);
  const totalTransfersAmount = payload.data.transfers.reduce((acc, t) => acc + t.amount, 0);
  const totalCashIncomeAmount = payload.data.cashIncomes.reduce((acc, i) => acc + i.amount, 0);

  const bodySummary = `RESPALDO OFICIAL DE CHEQUESPRO
Fecha de generación: ${new Date().toLocaleString('es-EC')}
Destinatario: ${payload.recipientEmail}
Tipo de respaldo: ${payload.type === 'scheduled_monthly' ? 'Automático de Fin de Mes' : 'Inmediato / Manual'}

=========================================
RESUMEN GENERAL DE FINANZAS Y REGISTROS
=========================================
• Total de Cheques Registrados: ${payload.summary.totalChecks}
  - Por cobrar (futuros/vence pronto): ${pendingChecks.length} ($${totalPendingAmount.toFixed(2)})
  - Efectivizados en caja: ${cashedChecks.length} ($${totalCashedAmount.toFixed(2)})
  - Protestados / Devueltos: ${bouncedChecks.length}
• Total de Clientes Activos: ${payload.summary.totalClients}
• Ingresos en Efectivo Registrados: ${payload.summary.totalCashIncomes} ($${totalCashIncomeAmount.toFixed(2)})
• Egresos / Transferencias a Bancos: ${payload.summary.totalTransfers} ($${totalTransfersAmount.toFixed(2)})
• Saldo Inicial de Caja Configurado: $${payload.summary.initialBalance.toFixed(2)}

=========================================
INSTRUCCIONES DE RECUPERACIÓN (RESTORE):
=========================================
1. Para restaurar esta data en caso de pérdida, abre ChequesPro en tu navegador.
2. Haz clic en "Restaurar Respaldo" e ingresa o sube el archivo JSON adjunto/descargado.
3. El sistema verificará y sincronizará de inmediato todos los cheques, cobros y saldos.

=========================================
DATOS EN BRUTO PARA RECUPERACIÓN (JSON):
=========================================
${JSON.stringify(payload)}`;

  // Email clients can have URL length limits (~2000 chars), so we also trigger download automatically
  const bodyEncoded = encodeURIComponent(
    bodySummary.length > 1800
      ? bodySummary.slice(0, 1800) +
          '\n\n[Nota: La data completa ha sido descargada simultáneamente en tu equipo como Respaldo_ChequesPro_' +
          dateStr +
          '.json para adjuntarlo a este correo o guardarlo en Drive]'
      : bodySummary
  );

  const mailtoUrl = `mailto:${payload.recipientEmail}?subject=${subject}&body=${bodyEncoded}`;
  window.open(mailtoUrl, '_blank');
};

/**
 * Checks if a monthly backup is due (last day of current month or if current month hasn't had one)
 */
export const isMonthlyBackupDue = (meta: BackupMeta): boolean => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  // Last day of current month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isEndOfMonth = now.getDate() >= lastDayOfMonth - 1; // Last 1 or 2 days of month

  if (!isEndOfMonth) return false;

  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (meta.lastBackupDate && meta.lastBackupDate.startsWith(currentMonthKey) && meta.lastBackupType === 'scheduled_monthly') {
    return false; // Already made scheduled monthly backup this month
  }

  return true;
};
