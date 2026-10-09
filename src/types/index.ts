export type UserRole = 'Maria' | 'Cristian';

export type CheckStatus = 
  | 'pending'    // Futuro (más de 7 días para su cobro)
  | 'due_soon'   // Vence en los próximos 7 días (por efectivizarse)
  | 'cashed'     // Efectivizado automáticamente al cumplir fecha
  | 'bounced'    // Protestado / Devuelto (restado del efectivo disponible)
  | 'cancelled'; // Anulado

export interface Check {
  id: string;
  checkNumber: string;
  clientName: string;
  amount: number; // en USD
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (fecha de cobro)
  bank: string;
  status: CheckStatus;
  notes?: string;
  cashedDate?: string; // YYYY-MM-DD
  cashedBy?: UserRole | 'Sistema (Automático)';
  destinationAccountAtCashing?: string;
  bouncedDate?: string;
  bouncedReason?: string;
  bouncedBy?: UserRole;
  bouncedNotes?: string;
  createdBy: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  identification?: string; // Cédula o RUC
  notes?: string;
  createdAt: string;
}

export interface CashIncome {
  id: string;
  clientName: string;
  amount: number; // en USD
  date: string; // YYYY-MM-DD
  notes?: string;
  receivedBy: UserRole;
  createdAt: string;
}

export interface InitialBalanceConfig {
  amount: number;
  date: string;
  notes?: string;
  setBy: UserRole;
}

export interface Transfer {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  destinationAccount: string;
  referenceNumber: string;
  notes?: string;
  transferredBy: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface CheckFiltersState {
  search: string;
  clientName: string;
  status: string; // 'all' | 'uncollected' (pendientes+vencidos) | 'due_this_week' | 'overdue' | 'cashed' | 'bounced'
  bank: string;
  timeframe: 'all' | 'today' | 'this_week' | 'this_month' | 'next_30_days';
  sortBy: 'dueDate_asc' | 'dueDate_desc' | 'amount_desc' | 'amount_asc';
}
