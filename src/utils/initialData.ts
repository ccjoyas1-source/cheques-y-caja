import { Check, Client, Transfer, CashIncome, InitialBalanceConfig } from '../types';

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_BANKS = [
  'Banco Pichincha',
  'Banco Guayaquil',
  'Produbanco',
  'Banco del Pacífico',
  'Banco Bolivariano',
  'Banco Internacional',
  'Banco General Rumiñahui',
  'Cooperativa JEP',
  'Chase Bank / USA',
];

export const COMMON_DESTINATION_ACCOUNTS = [
  'Banco Pichincha - Cta Corriente',
  'Banco Guayaquil - Cta Ahorros',
  'Produbanco - Cta Corriente',
  'Caja de Seguridad / Bóveda Principal',
  'Pago a Proveedor de Oro / Joyas',
  'Gastos Operativos / Egreso de Caja',
];

export const INITIAL_CHECKS: Check[] = [];

export const INITIAL_TRANSFERS: Transfer[] = [];

export const INITIAL_CASH_INCOMES: CashIncome[] = [];

export const INITIAL_BALANCE_CONFIG: InitialBalanceConfig = {
  amount: 0,
  date: '2026-10-09',
  notes: 'Saldo inicial de apertura',
  setBy: 'Cristian',
};
