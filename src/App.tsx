import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  Client,
  Transfer,
  CashIncome,
  InitialBalanceConfig,
  UserRole,
  CheckFiltersState,
} from './types';
import {
  getStoredChecks,
  saveStoredChecks,
  getStoredClients,
  saveStoredClients,
  getStoredTransfers,
  saveStoredTransfers,
  getStoredCashIncomes,
  saveStoredCashIncomes,
  getStoredInitialBalance,
  saveStoredInitialBalance,
  getStoredUser,
  saveStoredUser,
  exportToCSV,
  clearAllDataToZero,
  broadcastLocalChange,
  wipeAllStorage,
} from './services/storageService';
import {
  CollectionsData,
  RemoteChange,
  isDbConfigured,
  markDeviceLinked,
  signOut,
} from './services/dbService';
import { useCloudSync, SyncStatus } from './hooks/useCloudSync';
import {
  getTodayDateString,
  getDaysDifference,
  resolveCheckStatus,
} from './utils/dateUtils';
import {
  canonicalizeClientName,
  unifyClientRecords,
  autoUnifyKnownAliases,
  autoUnifyAndreaDias,
} from './utils/clientUtils';
import { INITIAL_BANKS } from './utils/initialData';

// Components
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { UrgentAlertBanner } from './components/UrgentAlertBanner';
import { CheckFilters } from './components/CheckFilters';
import { CheckList } from './components/CheckList';
import { CheckFormModal } from './components/CheckFormModal';
import { TransferModal } from './components/TransferModal';
import { BounceCheckModal } from './components/BounceCheckModal';
import { CheckDetailModal } from './components/CheckDetailModal';
import { ClientsManagerModal } from './components/ClientsManagerModal';
import { TransfersView } from './components/TransfersView';
import { ImportExcelModal } from './components/ImportExcelModal';
import { CashIncomeModal } from './components/CashIncomeModal';
import { InitialBalanceModal } from './components/InitialBalanceModal';
import { BackupModal } from './components/BackupModal';
import {
  AppBackupPayload,
  isMonthlyBackupDue,
  getStoredBackupMeta,
  saveStoredBackupMeta,
  buildBackupPayload,
  downloadBackupFile,
  sendBackupViaEmailClient,
} from './services/backupService';
import { generateSampleExcelTemplate } from './utils/excelImport';
import { Trash2, FileSpreadsheet, Plus, Download, Sparkles, CheckCircle2, Shield, LogOut, Loader2 } from 'lucide-react';

const INITIAL_BALANCE_ID = 'initial_balance';

// IDs únicos aunque dos dispositivos creen registros en el mismo milisegundo
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Canonicalization applied to every record, whether it comes from localStorage or the database
const normalizeCheck = (c: Check): Check => {
  const updated = { ...c, clientName: canonicalizeClientName(c.clientName) };
  return { ...updated, status: resolveCheckStatus(updated) };
};

const normalizeClient = (c: Client): Client => ({ ...c, name: canonicalizeClientName(c.name) });

const normalizeClients = (raw: Client[]): Client[] =>
  autoUnifyKnownAliases([], [], raw).updatedClients.map(normalizeClient);

const normalizeIncome = (inc: CashIncome): CashIncome => ({
  ...inc,
  clientName: canonicalizeClientName(inc.clientName),
});

// Applies a change made on another device to one of the state lists
const applyRemoteListChange = <T extends { id: string }>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  change: RemoteChange,
  normalize: (doc: T) => T = (doc) => doc
) => {
  if (change.type === 'delete') {
    setter((prev) => prev.filter((x) => x.id !== change.id));
    return;
  }
  const doc = normalize(change.data as unknown as T);
  setter((prev) =>
    prev.some((x) => x.id === doc.id) ? prev.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...prev]
  );
};

const SYNC_STATUS_UI: Record<SyncStatus, { label: string; dot: string }> = {
  disabled: { label: 'Solo en este navegador', dot: 'bg-slate-400' },
  connecting: { label: 'Conectando…', dot: 'bg-amber-400 animate-pulse' },
  synced: { label: 'Sincronizado', dot: 'bg-emerald-500' },
  saving: { label: 'Guardando…', dot: 'bg-sky-500 animate-pulse' },
  offline: { label: 'Sin conexión · reintentando', dot: 'bg-amber-500' },
  error: { label: 'Error al guardar · reintentando', dot: 'bg-rose-500' },
};

export default function App() {
  // Master state with automatic canonicalization
  const [checks, setChecks] = useState<Check[]>(() => getStoredChecks().map(normalizeCheck));

  const [clients, setClients] = useState<Client[]>(() => normalizeClients(getStoredClients()));

  const [transfers, setTransfers] = useState<Transfer[]>(getStoredTransfers);

  const [cashIncomes, setCashIncomes] = useState<CashIncome[]>(() => getStoredCashIncomes().map(normalizeIncome));

  const [initialBalance, setInitialBalance] = useState<InitialBalanceConfig>(getStoredInitialBalance);
  const [currentUser, setCurrentUser] = useState<UserRole>(getStoredUser);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transfers'>('dashboard');

  // Filter state
  const [filters, setFilters] = useState<CheckFiltersState>({
    search: '',
    clientName: '',
    status: 'all',
    bank: '',
    timeframe: 'all',
    sortBy: 'dueDate_asc',
  });

  // Modals state
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [bouncingCheck, setBouncingCheck] = useState<Check | null>(null);
  const [detailCheck, setDetailCheck] = useState<Check | null>(null);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false);
  const [isCashIncomeModalOpen, setIsCashIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<CashIncome | null>(null);
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [monthlyBackupNotice, setMonthlyBackupNotice] = useState<boolean>(false);

  // Sync to localStorage and broadcast to other open tabs / windows
  useEffect(() => {
    saveStoredChecks(checks);
    broadcastLocalChange();
  }, [checks]);

  useEffect(() => {
    saveStoredClients(clients);
    broadcastLocalChange();
  }, [clients]);

  useEffect(() => {
    saveStoredTransfers(transfers);
    broadcastLocalChange();
  }, [transfers]);

  useEffect(() => {
    saveStoredCashIncomes(cashIncomes);
    broadcastLocalChange();
  }, [cashIncomes]);

  useEffect(() => {
    saveStoredInitialBalance(initialBalance);
    broadcastLocalChange();
  }, [initialBalance]);

  useEffect(() => {
    saveStoredUser(currentUser);
  }, [currentUser]);

  // Sync between tabs of this same browser (only without database: with it, realtime covers every device)
  useEffect(() => {
    if (isDbConfigured) return;
    const handleStorageSync = (e: StorageEvent) => {
      // Reload states from updated localStorage
      setChecks(getStoredChecks().map(normalizeCheck));
      setClients(normalizeClients(getStoredClients()));
      setTransfers(getStoredTransfers());
      setCashIncomes(getStoredCashIncomes().map(normalizeIncome));
      setInitialBalance(getStoredInitialBalance());
    };

    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Shared database: every change made by María or Cristian is saved and shows up on all devices in real time
  const cloudData = useMemo<CollectionsData>(
    () => ({
      checks,
      clients,
      transfers,
      cash_incomes: cashIncomes,
      settings: [{ id: INITIAL_BALANCE_ID, ...initialBalance }],
    }),
    [checks, clients, transfers, cashIncomes, initialBalance]
  );

  const handleRemoteLoad = useCallback((remote: CollectionsData) => {
    const res = autoUnifyKnownAliases(
      (remote.checks as Check[]).map(normalizeCheck),
      (remote.cash_incomes as CashIncome[]).map(normalizeIncome),
      normalizeClients(remote.clients as Client[])
    );
    setChecks(res.updatedChecks);
    setCashIncomes(res.updatedCashIncomes);
    setClients(res.updatedClients);
    setTransfers(remote.transfers as Transfer[]);
    const balance = remote.settings.find((d) => d.id === INITIAL_BALANCE_ID);
    if (balance) {
      const { id, ...config } = balance as InitialBalanceConfig & { id: string };
      setInitialBalance(config);
    }
  }, []);

  const handleRemoteChange = useCallback((change: RemoteChange) => {
    switch (change.collection) {
      case 'checks':
        applyRemoteListChange(setChecks, change, normalizeCheck);
        break;
      case 'clients':
        applyRemoteListChange(setClients, change, normalizeClient);
        break;
      case 'transfers':
        applyRemoteListChange(setTransfers, change);
        break;
      case 'cash_incomes':
        applyRemoteListChange(setCashIncomes, change, normalizeIncome);
        break;
      case 'settings':
        if (change.type === 'upsert' && change.id === INITIAL_BALANCE_ID) {
          const { id, ...config } = change.data as InitialBalanceConfig & { id: string };
          setInitialBalance(config);
        }
        break;
    }
  }, []);

  const cloudSync = useCloudSync({
    data: cloudData,
    onRemoteLoad: handleRemoteLoad,
    onRemoteChange: handleRemoteChange,
    confirmUploadLocal: (count) =>
      window.confirm(
        `Este navegador tiene ${count} registro(s) guardados localmente que no están en la base de datos compartida.\n\n` +
          '¿Deseas subirlos para que se vean en todos los dispositivos?\n\n' +
          'Aceptar = subirlos · Cancelar = descartarlos y usar solo los datos de la nube'
      ),
  });

  const handleSignOut = async () => {
    if (
      cloudSync.hasPendingChanges() &&
      !window.confirm('Hay cambios que aún no se guardaron en la base de datos. Si cierras sesión se perderán. ¿Continuar?')
    ) {
      return;
    }
    await signOut();
    wipeAllStorage();
    markDeviceLinked(false);
  };

  // Check if monthly backup is due (end of month)
  useEffect(() => {
    const meta = getStoredBackupMeta();
    if (isMonthlyBackupDue(meta)) {
      setMonthlyBackupNotice(true);
    }
  }, []);

  // Auto-unify known aliases (andrea Dias -> Andrea diaz, lola ponton -> MAGDALENA PONTON) on mount
  useEffect(() => {
    const res = autoUnifyKnownAliases(checks, cashIncomes, clients);
    if (res.wasMerged) {
      setChecks(res.updatedChecks);
      setCashIncomes(res.updatedCashIncomes);
      setClients(res.updatedClients);
    }
  }, []);

  // Financial calculations
  // 1. Cheques que llegaron a fecha (efectivizados automáticamente y no protestados/anulados)
  const totalCashed = useMemo(() => {
    return checks
      .filter((c) => c.status === 'cashed')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [checks]);

  // 2. Ingresos en efectivo directo
  const totalCashIncomes = useMemo(() => {
    return cashIncomes.reduce((sum, i) => sum + i.amount, 0);
  }, [cashIncomes]);

  // 3. Cheques protestados / devueltos (monto total restado)
  const bouncedChecks = useMemo(() => {
    return checks.filter((c) => c.status === 'bounced');
  }, [checks]);

  const totalBounced = useMemo(() => {
    return bouncedChecks.reduce((sum, c) => sum + c.amount, 0);
  }, [bouncedChecks]);

  // 4. Total transferido / egresos
  const totalTransferred = useMemo(() => {
    return transfers.reduce((sum, t) => sum + t.amount, 0);
  }, [transfers]);

  // 5. Saldo en Efectivo Disponible = Saldo Inicial + Cheques Cobrados + Ingresos en Efectivo - Egresos
  const availableCash = useMemo(() => {
    const raw = initialBalance.amount + totalCashed + totalCashIncomes - totalTransferred;
    return Math.max(0, raw);
  }, [initialBalance.amount, totalCashed, totalCashIncomes, totalTransferred]);

  // 6. Cheques pendientes por cobrar (futuros)
  const pendingChecks = useMemo(() => {
    return checks.filter(
      (c) => c.status !== 'cashed' && c.status !== 'cancelled' && c.status !== 'bounced'
    );
  }, [checks]);

  const totalPendingAmount = useMemo(() => {
    return pendingChecks.reduce((sum, c) => sum + c.amount, 0);
  }, [pendingChecks]);

  // 7. Cheques que vencen esta semana (próximos 7 días)
  const dueThisWeekChecks = useMemo(() => {
    return pendingChecks.filter((c) => {
      const diff = getDaysDifference(c.dueDate);
      return diff > 0 && diff <= 7;
    });
  }, [pendingChecks]);

  const dueThisWeekAmount = useMemo(() => {
    return dueThisWeekChecks.reduce((sum, c) => sum + c.amount, 0);
  }, [dueThisWeekChecks]);

  // Available banks for filtering
  const availableBanks = useMemo(() => {
    const list = new Set<string>(INITIAL_BANKS);
    checks.forEach((c) => {
      if (c.bank) list.add(c.bank);
    });
    return Array.from(list);
  }, [checks]);

  // Filtered & Sorted Checks
  const filteredChecks = useMemo(() => {
    const todayStr = getTodayDateString();

    return checks
      .filter((check) => {
        // Search filter
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchNumber = check.checkNumber.toLowerCase().includes(q);
          const matchClient = check.clientName.toLowerCase().includes(q);
          const matchBank = check.bank.toLowerCase().includes(q);
          const matchNotes = (check.notes || '').toLowerCase().includes(q);
          if (!matchNumber && !matchClient && !matchBank && !matchNotes) return false;
        }

        // Client filter
        if (filters.clientName && check.clientName !== filters.clientName) {
          return false;
        }

        // Bank filter
        if (filters.bank && check.bank !== filters.bank) {
          return false;
        }

        // Status filter
        if (filters.status !== 'all') {
          if (filters.status === 'uncollected') {
            if (check.status === 'cashed' || check.status === 'cancelled' || check.status === 'bounced') {
              return false;
            }
          } else if (filters.status === 'due_this_week') {
            if (check.status === 'cashed' || check.status === 'cancelled' || check.status === 'bounced') {
              return false;
            }
            const diff = getDaysDifference(check.dueDate);
            if (diff <= 0 || diff > 7) return false;
          } else if (filters.status === 'cashed') {
            if (check.status !== 'cashed') return false;
          } else if (filters.status === 'bounced') {
            if (check.status !== 'bounced') return false;
          } else if (filters.status === 'cancelled') {
            if (check.status !== 'cancelled') return false;
          }
        }

        // Timeframe filter
        if (filters.timeframe !== 'all') {
          const diff = getDaysDifference(check.dueDate);
          if (filters.timeframe === 'today' && diff !== 0) return false;
          if (filters.timeframe === 'this_week' && (diff < 0 || diff > 7)) return false;
          if (filters.timeframe === 'next_30_days' && (diff < 0 || diff > 30)) return false;
          if (filters.timeframe === 'this_month') {
            const [tY, tM] = todayStr.split('-');
            const [cY, cM] = check.dueDate.split('-');
            if (tY !== cY || tM !== cM) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const isAUncollected = a.status !== 'cashed' && a.status !== 'cancelled' && a.status !== 'bounced';
        const isBUncollected = b.status !== 'cashed' && b.status !== 'cancelled' && b.status !== 'bounced';

        if (isAUncollected && !isBUncollected) return -1;
        if (!isAUncollected && isBUncollected) return 1;

        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [checks, filters]);

  // Sumatorias para la vista actual
  const totalFilteredAmount = useMemo(() => {
    return filteredChecks.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredChecks]);

  const totalFilteredPendingAmount = useMemo(() => {
    return filteredChecks
      .filter((c) => c.status !== 'cashed' && c.status !== 'cancelled' && c.status !== 'bounced')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [filteredChecks]);

  // Handlers
  const handleFilterChange = (newFilters: Partial<CheckFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      clientName: '',
      status: 'all',
      bank: '',
      timeframe: 'all',
      sortBy: 'dueDate_asc',
    });
  };

  // Merge / Unify client records (e.g. "andrea Dias" -> "Andrea diaz")
  const handleMergeClients = (sourceClientName: string, targetClientName: string) => {
    const res = unifyClientRecords(checks, cashIncomes, clients, sourceClientName, targetClientName);
    if (res.wasMerged) {
      setChecks(res.updatedChecks);
      setCashIncomes(res.updatedCashIncomes);
      setClients(res.updatedClients);
      if (
        filters.clientName &&
        filters.clientName.trim().toLowerCase() === sourceClientName.trim().toLowerCase()
      ) {
        setFilters((prev) => ({ ...prev, clientName: targetClientName }));
      }
    }
  };

  const handleSaveCheck = (checkData: Partial<Check>, newClientName?: string) => {
    const canonicalClient = canonicalizeClientName(checkData.clientName || 'Cliente General');
    const canonicalNewClient = newClientName ? canonicalizeClientName(newClientName) : undefined;

    if (canonicalNewClient) {
      const exists = clients.some((c) => c.name.toLowerCase() === canonicalNewClient.toLowerCase());
      if (!exists) {
        const newClient: Client = {
          id: newId('cli'),
          name: canonicalNewClient,
          createdAt: getTodayDateString(),
        };
        setClients((prev) => [newClient, ...prev]);
      }
    }

    if (editingCheck) {
      setChecks((prev) =>
        prev.map((c) => {
          if (c.id === editingCheck.id) {
            const updated: Check = {
              ...c,
              ...checkData,
              clientName: canonicalClient,
              updatedAt: new Date().toISOString(),
            } as Check;
            return {
              ...updated,
              status: resolveCheckStatus(updated),
            };
          }
          return c;
        })
      );
      setEditingCheck(null);
    } else {
      const newCheck: Check = {
        id: newId('chk'),
        checkNumber: checkData.checkNumber || `CH-${Math.floor(100000 + Math.random() * 900000)}`,
        clientName: canonicalClient,
        amount: checkData.amount || 0,
        issueDate: checkData.issueDate || getTodayDateString(),
        dueDate: checkData.dueDate || getTodayDateString(),
        bank: checkData.bank || 'Banco Pichincha',
        status: 'pending',
        notes: checkData.notes || '',
        createdBy: currentUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newCheck.status = resolveCheckStatus(newCheck);
      setChecks((prev) => [newCheck, ...prev]);
    }
  };

  const handleConfirmBounce = (
    checkId: string,
    reason: string,
    notes: string,
    bouncedDate: string,
    bouncedBy: UserRole
  ) => {
    setChecks((prev) =>
      prev.map((c) => {
        if (c.id === checkId) {
          return {
            ...c,
            status: 'bounced',
            bouncedReason: reason,
            bouncedNotes: notes,
            bouncedDate,
            bouncedBy,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  const handleRecoverBounce = (check: Check) => {
    if (window.confirm(`¿Confirmas reactivar el cheque ${check.checkNumber}? El valor volverá a sumarse al saldo en efectivo.`)) {
      setChecks((prev) =>
        prev.map((c) => {
          if (c.id === check.id) {
            const restored: Check = {
              ...c,
              bouncedReason: undefined,
              bouncedNotes: undefined,
              bouncedDate: undefined,
              bouncedBy: undefined,
              updatedAt: new Date().toISOString(),
            };
            return {
              ...restored,
              status: resolveCheckStatus(restored),
            };
          }
          return c;
        })
      );
    }
  };

  // Cash Incomes
  const handleSaveCashIncome = (
    incomeData: Omit<CashIncome, 'id' | 'createdAt'>,
    newClientName?: string,
    incomeId?: string
  ) => {
    const canonicalClient = canonicalizeClientName(incomeData.clientName);
    const canonicalNewClient = newClientName ? canonicalizeClientName(newClientName) : undefined;

    if (canonicalNewClient) {
      const exists = clients.some((c) => c.name.toLowerCase() === canonicalNewClient.toLowerCase());
      if (!exists) {
        const newClient: Client = {
          id: newId('cli'),
          name: canonicalNewClient,
          createdAt: getTodayDateString(),
        };
        setClients((prev) => [newClient, ...prev]);
      }
    }

    if (incomeId) {
      setCashIncomes((prev) =>
        prev.map((item) =>
          item.id === incomeId
            ? {
                ...item,
                ...incomeData,
                clientName: canonicalClient,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } else {
      const newIncome: CashIncome = {
        ...incomeData,
        clientName: canonicalClient,
        id: newId('inc'),
        createdAt: new Date().toISOString(),
      };
      setCashIncomes((prev) => [newIncome, ...prev]);
    }
    setEditingIncome(null);
  };

  const handleDeleteCashIncome = (id: string) => {
    setCashIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  // Initial Balance
  const handleSaveInitialBalance = (config: InitialBalanceConfig) => {
    setInitialBalance(config);
  };

  // Transfers / Expenses
  const handleSaveTransfer = (
    transferData: Omit<Transfer, 'id' | 'createdAt'>,
    transferId?: string
  ) => {
    if (transferId) {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                ...transferData,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } else {
      const newTransfer: Transfer = {
        ...transferData,
        id: newId('trf'),
        createdAt: new Date().toISOString(),
      };
      setTransfers((prev) => [newTransfer, ...prev]);
    }
    setEditingTransfer(null);
  };

  const handleDeleteTransfer = (id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCancelCheck = (check: Check) => {
    if (window.confirm(`¿Confirmas anular el cheque ${check.checkNumber}?`)) {
      setChecks((prev) =>
        prev.map((c) => (c.id === check.id ? { ...c, status: 'cancelled', updatedAt: new Date().toISOString() } : c))
      );
    }
  };

  const handleAddClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const cleanName = canonicalizeClientName(clientData.name);
    const newClient: Client = {
      ...clientData,
      name: cleanName,
      id: newId('cli'),
      createdAt: getTodayDateString(),
    };
    setClients((prev) => [newClient, ...prev]);
  };

  // Import handler supporting checks, clients, cash incomes, expenses, and initial balance
  const handleImportComplete = (payload: {
    checks: Check[];
    newClients: Client[];
    cashIncomes: CashIncome[];
    expenses: Transfer[];
    initialBalance?: InitialBalanceConfig;
    replaceAll: boolean;
  }) => {
    if (payload.initialBalance) {
      setInitialBalance(payload.initialBalance);
    }

    if (payload.replaceAll) {
      setChecks(payload.checks);
      if (payload.newClients.length > 0) {
        setClients(payload.newClients);
      }
      setCashIncomes(payload.cashIncomes);
      setTransfers(payload.expenses);
    } else {
      setChecks((prev) => [...payload.checks, ...prev]);
      if (payload.newClients.length > 0) {
        setClients((prev) => [...payload.newClients, ...prev]);
      }
      if (payload.cashIncomes.length > 0) {
        setCashIncomes((prev) => [...payload.cashIncomes, ...prev]);
      }
      if (payload.expenses.length > 0) {
        setTransfers((prev) => [...payload.expenses, ...prev]);
      }
    }
  };

  // Clear all data to zero clean
  const handleClearAllData = () => {
    if (
      window.confirm(
        isDbConfigured
          ? '¿Deseas limpiar todos los datos para iniciar en limpio (0 cheques, 0 clientes, 0 movimientos)?\n\nATENCIÓN: se borrarán de la base de datos compartida, para todos los usuarios y dispositivos.'
          : '¿Deseas limpiar todos los datos para iniciar en limpio (0 cheques, 0 clientes, 0 movimientos)?'
      )
    ) {
      clearAllDataToZero();
      setChecks([]);
      setClients([]);
      setTransfers([]);
      setCashIncomes([]);
      setInitialBalance({
        amount: 0,
        date: getTodayDateString(),
        notes: 'Apertura limpia',
        setBy: currentUser,
      });
    }
  };

  // Until the shared data is downloaded, don't allow edits that would be overwritten
  if (isDbConfigured && !cloudSync.hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Cargando datos compartidos…</p>
        {(cloudSync.status === 'error' || cloudSync.status === 'offline') && (
          <p className="text-xs text-rose-600">
            No se pudo conectar con la base de datos. Reintentando automáticamente…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onOpenNewCheck={() => {
          setEditingCheck(null);
          setIsCheckModalOpen(true);
        }}
        onOpenTransferModal={() => {
          setEditingTransfer(null);
          setIsTransferModalOpen(true);
        }}
        onOpenCashIncomeModal={() => {
          setEditingIncome(null);
          setIsCashIncomeModalOpen(true);
        }}
        onOpenInitialBalanceModal={() => setIsInitialBalanceModalOpen(true)}
        onOpenClientsModal={() => setIsClientsModalOpen(true)}
        onOpenTransfersHistory={() => setActiveTab('transfers')}
        onOpenImportExcel={() => setIsImportExcelModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Monthly Backup Reminder Banner */}
        {monthlyBackupNotice && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Respaldo Mensual Requerido (Fin de Mes)
                </h4>
                <p className="text-xs text-slate-600">
                  Es momento de generar el respaldo mensual y enviarlo automáticamente a <strong>ccjoyas1@gmail.com</strong> para salvaguardar todos los cheques y movimientos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Crear Respaldo Ahora
              </button>
              <button
                onClick={() => setMonthlyBackupNotice(false)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Urgent Alerts */}
        <UrgentAlertBanner
          checks={checks}
          onFilterDueThisWeek={() => {
            setActiveTab('dashboard');
            handleFilterChange({ status: 'due_this_week', timeframe: 'this_week' });
          }}
          onFilterBounced={() => {
            setActiveTab('dashboard');
            handleFilterChange({ status: 'bounced' });
          }}
        />

        {/* Tab 1 & Tab 2: Dashboard / Checks list */}
        {activeTab !== 'transfers' ? (
          <>
            {/* Clean State Quick Import Banner */}
            {checks.length === 0 && (
              <div className="mb-6 p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-white to-indigo-50/40 border border-emerald-200 rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Sistema Limpio · Listo para Importar tu Excel Actualizado
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl">
                        La base de datos está completamente en blanco (0 cheques registrados). Puedes subir tu archivo Excel con Saldo Inicial, Cheques, Ingresos y Egresos, o descargar la plantilla oficial.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => generateSampleExcelTemplate()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Descargar Plantilla</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImportExcelModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                      <span>Importar Excel Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Top 4 KPI Metrics */}
            <MetricsCards
              availableCash={availableCash}
              initialBalance={initialBalance.amount}
              totalCashed={totalCashed}
              totalCashIncomes={totalCashIncomes}
              totalBounced={totalBounced}
              totalTransferred={totalTransferred}
              totalPendingAmount={totalPendingAmount}
              pendingCount={pendingChecks.length}
              dueThisWeekAmount={dueThisWeekAmount}
              dueThisWeekCount={dueThisWeekChecks.length}
              bouncedCount={bouncedChecks.length}
              onOpenTransferModal={() => {
                setEditingTransfer(null);
                setIsTransferModalOpen(true);
              }}
              onOpenCashIncomeModal={() => {
                setEditingIncome(null);
                setIsCashIncomeModalOpen(true);
              }}
              onOpenInitialBalanceModal={() => setIsInitialBalanceModalOpen(true)}
              onFilterDueThisWeek={() => handleFilterChange({ status: 'due_this_week' })}
              onFilterBounced={() => handleFilterChange({ status: 'bounced' })}
              onFilterAllPending={() => handleFilterChange({ status: 'uncollected' })}
            />

            {/* Filter Bar with Sumatorias: Total por Cobrar and Monto Total en Vista */}
            <CheckFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              clients={clients}
              banks={availableBanks}
              totalFilteredAmount={totalFilteredAmount}
              totalFilteredPendingAmount={totalFilteredPendingAmount}
              filteredCount={filteredChecks.length}
              onExportCSV={() => exportToCSV(filteredChecks)}
              onOpenImportExcel={() => setIsImportExcelModalOpen(true)}
            />

            {/* Postdated Checks Table / Card View */}
            <CheckList
              checks={filteredChecks}
              currentUser={currentUser}
              onEditCheck={(chk) => {
                setEditingCheck(chk);
                setIsCheckModalOpen(true);
              }}
              onViewDetail={(chk) => setDetailCheck(chk)}
              onBounceCheck={(chk) => setBouncingCheck(chk)}
              onRecoverBounceCheck={handleRecoverBounce}
              onCancelCheck={handleCancelCheck}
              onAddNewCheck={() => {
                setEditingCheck(null);
                setIsCheckModalOpen(true);
              }}
            />
          </>
        ) : (
          /* Tab 3: Dedicated Cash Flow, Cash Incomes & Transfers */
          <TransfersView
            transfers={transfers}
            cashIncomes={cashIncomes}
            initialBalance={initialBalance}
            availableCash={availableCash}
            totalCashed={totalCashed}
            totalCashIncomes={totalCashIncomes}
            totalTransferred={totalTransferred}
            totalBounced={totalBounced}
            onOpenTransferModal={() => {
              setEditingTransfer(null);
              setIsTransferModalOpen(true);
            }}
            onOpenCashIncomeModal={() => {
              setEditingIncome(null);
              setIsCashIncomeModalOpen(true);
            }}
            onOpenInitialBalanceModal={() => setIsInitialBalanceModalOpen(true)}
            onEditTransfer={(transfer) => {
              setEditingTransfer(transfer);
              setIsTransferModalOpen(true);
            }}
            onDeleteTransfer={handleDeleteTransfer}
            onEditCashIncome={(income) => {
              setEditingIncome(income);
              setIsCashIncomeModalOpen(true);
            }}
            onDeleteCashIncome={handleDeleteCashIncome}
            currentUser={currentUser}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>ChequesPro · Sistema para Cristian y María</span>
            <span
              className="inline-flex items-center gap-1.5 font-medium text-slate-600"
              title={isDbConfigured ? 'Estado de la base de datos compartida' : 'Configura Supabase para compartir los datos'}
            >
              <span className={`w-2 h-2 rounded-full ${SYNC_STATUS_UI[cloudSync.status].dot}`} />
              {SYNC_STATUS_UI[cloudSync.status].label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleClearAllData}
              className="text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
              title="Limpiar todos los datos para empezar desde cero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar datos (Empezar en blanco)</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsImportExcelModalOpen(true)}
              className="hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar Excel</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="text-amber-700 hover:text-amber-900 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
              title="Respaldo automático mensual para ccjoyas1@gmail.com"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Respaldos (ccjoyas1@gmail.com)</span>
            </button>
            <span aria-hidden="true">·</span>
            <span>Fecha: {getTodayDateString()}</span>
            {isDbConfigured && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  onClick={handleSignOut}
                  className="hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CheckFormModal
        isOpen={isCheckModalOpen}
        onClose={() => {
          setIsCheckModalOpen(false);
          setEditingCheck(null);
        }}
        onSaveCheck={handleSaveCheck}
        clients={clients}
        banks={availableBanks}
        currentUser={currentUser}
        editingCheck={editingCheck}
      />

      <CashIncomeModal
        isOpen={isCashIncomeModalOpen}
        onClose={() => {
          setIsCashIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        clients={clients}
        currentUser={currentUser}
        onSaveCashIncome={handleSaveCashIncome}
        editingIncome={editingIncome}
      />

      <InitialBalanceModal
        isOpen={isInitialBalanceModalOpen}
        onClose={() => setIsInitialBalanceModalOpen(false)}
        currentConfig={initialBalance}
        currentUser={currentUser}
        onSaveInitialBalance={handleSaveInitialBalance}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        availableCash={availableCash}
        currentUser={currentUser}
        onSaveTransfer={handleSaveTransfer}
        editingTransfer={editingTransfer}
      />

      <BounceCheckModal
        isOpen={bouncingCheck !== null}
        check={bouncingCheck}
        onClose={() => setBouncingCheck(null)}
        currentUser={currentUser}
        onConfirmBounce={handleConfirmBounce}
      />

      <CheckDetailModal
        isOpen={detailCheck !== null}
        check={detailCheck}
        onClose={() => setDetailCheck(null)}
        onBounceCheck={(chk) => {
          setDetailCheck(null);
          setBouncingCheck(chk);
        }}
        onRecoverBounceCheck={handleRecoverBounce}
      />

      <ClientsManagerModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        clients={clients}
        checks={checks}
        onAddClient={handleAddClient}
        onMergeClients={handleMergeClients}
        onSelectClientToFilter={(clientName) => {
          setActiveTab('dashboard');
          handleFilterChange({ clientName });
        }}
      />

      <ImportExcelModal
        isOpen={isImportExcelModalOpen}
        onClose={() => setIsImportExcelModalOpen(false)}
        existingClients={clients}
        currentUser={currentUser}
        onImportComplete={handleImportComplete}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        data={{
          checks,
          clients,
          transfers,
          cashIncomes,
          initialBalance,
          currentUser,
        }}
        onRestoreData={(backup) => {
          setChecks(backup.data.checks);
          setClients(backup.data.clients);
          setTransfers(backup.data.transfers);
          setCashIncomes(backup.data.cashIncomes);
          setInitialBalance(backup.data.initialBalance);
        }}
      />

    </div>
  );
}
