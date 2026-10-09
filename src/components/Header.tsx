import React from 'react';
import { UserRole } from '../types';
import { Plus, Users, ArrowRightLeft, ShieldCheck, UserCheck, DollarSign } from 'lucide-react';

interface HeaderProps {
  currentUser: UserRole;
  onUserChange: (user: UserRole) => void;
  onOpenNewCheck: () => void;
  onOpenTransferModal: () => void;
  onOpenCashIncomeModal?: () => void;
  onOpenInitialBalanceModal?: () => void;
  onOpenClientsModal: () => void;
  onOpenTransfersHistory: () => void;
  onOpenImportExcel?: () => void;
  activeTab: 'dashboard' | 'transfers';
  setActiveTab: (tab: 'dashboard' | 'transfers') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenNewCheck,
  onOpenTransferModal,
  onOpenCashIncomeModal,
  onOpenClientsModal,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="text-left group flex items-center gap-2.5 focus:outline-none cursor-pointer"
            >
              <img 
                src="/logo.svg" 
                alt="ChequesPro Logo" 
                className="w-9 h-9 rounded-lg shadow-xs object-contain group-hover:scale-105 transition-transform" 
              />
              <div className="leading-tight">
                <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block">
                  ChequesPro
                </span>
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap block">
                  Cheques, Efectivo y Flujo de Caja
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                activeTab === 'dashboard' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                activeTab === 'transfers' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
              }`}
            >
              Caja y Movimientos
            </button>
            <button
              onClick={onOpenTransferModal}
              className="hover:text-rose-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-slate-600 flex items-center gap-1.5 cursor-pointer font-medium"
              title="Registrar nuevo egreso o transferencia bancaria"
            >
              <ArrowRightLeft className="w-4 h-4 text-rose-500" />
              <span>Nuevo Egreso / Transferencia</span>
            </button>
            <button
              onClick={onOpenClientsModal}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Clientes</span>
            </button>
          </nav>

          {/* Zone 3: User Switcher & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* User Switcher (Maria & Cristian) */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => onUserChange('Maria')}
                title="María - Gestora de cheques (Acceso total)"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  currentUser === 'Maria'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className={`w-3.5 h-3.5 ${currentUser === 'Maria' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>María</span>
              </button>
              <button
                type="button"
                onClick={() => onUserChange('Cristian')}
                title="Cristian - Administrador y dueño (Acceso total)"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  currentUser === 'Cristian'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${currentUser === 'Cristian' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Cristian</span>
              </button>
            </div>


            {/* Cash Income Button */}
            {onOpenCashIncomeModal && (
              <button
                onClick={onOpenCashIncomeModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap cursor-pointer"
                title="Registrar cobro o ingreso en efectivo directo"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Ingreso Efectivo</span>
              </button>
            )}

            {/* Primary Action: New Check */}
            <button
              onClick={onOpenNewCheck}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Registrar Cheque</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-between border-t border-slate-100 py-2 text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2 py-1 rounded cursor-pointer ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-semibold' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-2 py-1 rounded cursor-pointer ${activeTab === 'transfers' ? 'bg-slate-100 text-slate-900 font-semibold' : ''}`}
          >
            Caja y Egresos
          </button>
          <button
            onClick={onOpenTransferModal}
            className="px-2 py-1 rounded text-rose-700 font-bold hover:bg-rose-50 cursor-pointer flex items-center gap-1"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>+ Egreso</span>
          </button>
          {onOpenCashIncomeModal && (
            <button
              onClick={onOpenCashIncomeModal}
              className="px-2 py-1 rounded text-emerald-700 font-bold hover:bg-emerald-50 cursor-pointer"
            >
              + Efectivo
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
