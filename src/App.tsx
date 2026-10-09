import React, { useState, useEffect, useMemo } from 'react';
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
} from './services/storageService';
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
import { generateSampleExcelTemplate } from './utils/excelImport';
import { Trash2, FileSpreadsheet, Plus, Download, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Master state with automatic canonicalization
  const [checks, setChecks] = useState<Check[]>(() => {
    const raw = getStoredChecks();
    return raw.map((c) => {
      const canonicalClient = canonicalizeClientName(c.clientName);
      const updated = {
        ...c,
        clientName: canonicalClient,
      };
      return {
        ...updated,
        status: resolveCheckStatus(updated),
      };
    });
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const raw = getStoredClients();
    const res = autoUnifyKnownAliases([], [], raw);
    return res.updatedClients.map((c) => ({
      ...c,
      name: canonicalizeClientName(c.name),
    }));
  });

  const [transfers, setTransfers] = useState<Transfer[]>(getStoredTransfers);

  const [cashIncomes, setCashIncomes] = useState<CashIncome[]>(() => {
    const raw = getStoredCashIncomes();
    return raw.map((inc) => ({
      ...inc,
      clientName: canonicalizeClientName(inc.clientName),
    }));
  });

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
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveStoredChecks(checks);
  }, [checks]);

  useEffect(() => {
    saveStoredClients(clients);
  }, [clients]);

  useEffect(() => {
    saveStoredTransfers(transfers);
  }, [transfers]);

  useEffect(() => {
    saveStoredCashIncomes(cashIncomes);
  }, [cashIncomes]);

  useEffect(() => {
    saveStoredInitialBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    saveStoredUser(currentUser);
  }, [currentUser]);

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
          id: `cli-${Date.now()}`,
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
        id: `chk-${Date.now()}`,
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
    newClientName?: string
  ) => {
    const canonicalClient = canonicalizeClientName(incomeData.clientName);
    const canonicalNewClient = newClientName ? canonicalizeClientName(newClientName) : undefined;

    if (canonicalNewClient) {
      const exists = clients.some((c) => c.name.toLowerCase() === canonicalNewClient.toLowerCase());
      if (!exists) {
        const newClient: Client = {
          id: `cli-${Date.now()}`,
          name: canonicalNewClient,
          createdAt: getTodayDateString(),
        };
        setClients((prev) => [newClient, ...prev]);
      }
    }

    const newIncome: CashIncome = {
      ...incomeData,
      clientName: canonicalClient,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCashIncomes((prev) => [newIncome, ...prev]);
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
        id: `trf-${Date.now()}`,
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
      id: `cli-${Date.now()}`,
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
        '¿Deseas limpiar todos los datos para iniciar en limpio (0 cheques, 0 clientes, 0 movimientos)?'
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
        onOpenCashIncomeModal={() => setIsCashIncomeModalOpen(true)}
        onOpenInitialBalanceModal={() => setIsInitialBalanceModalOpen(true)}
        onOpenClientsModal={() => setIsClientsModalOpen(true)}
        onOpenTransfersHistory={() => setActiveTab('transfers')}
        onOpenImportExcel={() => setIsImportExcelModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
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
              onOpenCashIncomeModal={() => setIsCashIncomeModalOpen(true)}
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
            onOpenCashIncomeModal={() => setIsCashIncomeModalOpen(true)}
            onOpenInitialBalanceModal={() => setIsInitialBalanceModalOpen(true)}
            onEditTransfer={(transfer) => {
              setEditingTransfer(transfer);
              setIsTransferModalOpen(true);
            }}
            onDeleteTransfer={handleDeleteTransfer}
            onDeleteCashIncome={handleDeleteCashIncome}
            currentUser={currentUser}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span>ChequesPro · Sistema para Cristian y María</span>
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
            <span>Fecha: {getTodayDateString()}</span>
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
        onClose={() => setIsCashIncomeModalOpen(false)}
        clients={clients}
        currentUser={currentUser}
        onSaveCashIncome={handleSaveCashIncome}
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

    </div>
  );
}
