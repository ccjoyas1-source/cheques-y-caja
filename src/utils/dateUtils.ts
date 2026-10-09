import { Check, CheckStatus } from '../types';

// Referencia base del sistema: 2026-10-09
export const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (dateString: string): string => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Devuelve los días de diferencia entre hoy y la fecha dada
// Negativo = ya pasó (vencido)
// 0 = hoy
// Positivo = días futuros
export const getDaysDifference = (targetDateStr: string): number => {
  const todayStr = getTodayDateString();
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [cY, cM, cD] = targetDateStr.split('-').map(Number);

  const today = new Date(tY, tM - 1, tD);
  const target = new Date(cY, cM - 1, cD);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// Verifica si la fecha está dentro de la semana actual (lunes a domingo) o próximos 7 días
export const isDueThisWeek = (dateStr: string): boolean => {
  const daysDiff = getDaysDifference(dateStr);
  return daysDiff >= 0 && daysDiff <= 7;
};

// Obtiene el estado real dinámico del cheque:
// Los cheques que llegan a fecha se efectivizan automáticamente.
export const resolveCheckStatus = (check: Check): CheckStatus => {
  if (check.status === 'bounced' || check.status === 'cancelled') {
    return check.status;
  }
  const daysDiff = getDaysDifference(check.dueDate);
  // Si la fecha ya llegó (hoy o fecha pasada), se efectiviza automáticamente
  if (daysDiff <= 0) {
    return 'cashed';
  }
  // Si es fecha futura dentro de los próximos 7 días
  if (daysDiff <= 7) {
    return 'due_soon';
  }
  // Fecha futura más de 7 días
  return 'pending';
};

export const getStatusLabel = (status: CheckStatus): string => {
  switch (status) {
    case 'cashed':
      return 'Efectivizado (Al Día)';
    case 'due_soon':
      return 'Vence Esta Semana';
    case 'pending':
      return 'Por Cobrar (Pendiente)';
    case 'bounced':
      return 'Protestado / Devuelto';
    case 'cancelled':
      return 'Anulado';
    default:
      return 'Desconocido';
  }
};

export const getStatusBadgeStyle = (status: CheckStatus): { bg: string; text: string; border: string } => {
  switch (status) {
    case 'cashed':
      return { bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'due_soon':
      return { bg: 'bg-amber-50 text-amber-900', text: 'text-amber-800', border: 'border-amber-300' };
    case 'pending':
      return { bg: 'bg-sky-50 text-sky-800', text: 'text-sky-700', border: 'border-sky-200' };
    case 'bounced':
      return { bg: 'bg-rose-50 text-rose-900', text: 'text-rose-700', border: 'border-rose-300' };
    case 'cancelled':
      return { bg: 'bg-slate-100 text-slate-700', text: 'text-slate-600', border: 'border-slate-200' };
    default:
      return { bg: 'bg-slate-50 text-slate-700', text: 'text-slate-600', border: 'border-slate-200' };
  }
};
