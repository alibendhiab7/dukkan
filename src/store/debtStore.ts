import { create } from 'zustand';

export interface CustomerDebt {
  id: string;
  tenantId: string;
  customerName: string;
  amountYer: number;
  updatedAt: string;
  phone?: string;
}

export interface DebtAuditLog {
  id: string;
  tenantId: string;
  debtId: string;
  customerName: string;
  type: 'add' | 'reduce' | 'set';
  amountYer: number;
  balanceAfterYer: number;
  notes: string;
  createdBy: string;
  createdAt: string;
}

interface DebtState {
  debts: CustomerDebt[];
  logs: DebtAuditLog[];
  loadDebts: (tenantId: string) => void;
  addDebt: (tenantId: string, customerName: string, amountYer: number, notes: string, username: string, phone?: string) => void;
  reduceDebt: (tenantId: string, customerName: string, amountYer: number, notes: string, username: string) => void;
  setDebt: (tenantId: string, customerName: string, amountYer: number, notes: string, username: string, phone?: string) => void;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debts: [],
  logs: [],

  loadDebts: (tenantId) => {
    try {
      const storedDebts = localStorage.getItem(`grocery_debts_${tenantId}`);
      const storedLogs = localStorage.getItem(`grocery_debt_logs_${tenantId}`);
      set({
        debts: storedDebts ? JSON.parse(storedDebts) : [],
        logs: storedLogs ? JSON.parse(storedLogs) : [],
      });
    } catch {
      set({ debts: [], logs: [] });
    }
  },

  addDebt: (tenantId, customerName, amountYer, notes, username, phone) => {
    const { debts, logs } = get();
    const normalizedName = customerName.trim();
    if (!normalizedName) return;

    // Find or create customer
    let debtItem = debts.find(d => d.customerName.toLowerCase() === normalizedName.toLowerCase());
    let isNew = false;
    let oldAmount = 0;

    if (!debtItem) {
      isNew = true;
      debtItem = {
        id: 'debt_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : Date.now().toString()),
        tenantId,
        customerName: normalizedName,
        amountYer: 0,
        updatedAt: new Date().toISOString(),
        phone
      };
    } else {
      oldAmount = debtItem.amountYer;
      if (phone) {
        debtItem.phone = phone;
      }
    }

    const newAmount = oldAmount + amountYer;
    const updatedDebtItem = {
      ...debtItem,
      amountYer: newAmount,
      updatedAt: new Date().toISOString()
    };

    const newLog: DebtAuditLog = {
      id: 'log_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : Date.now().toString()),
      tenantId,
      debtId: updatedDebtItem.id,
      customerName: normalizedName,
      type: 'add',
      amountYer,
      balanceAfterYer: newAmount,
      notes: notes || 'إضافة مديونية جديدة',
      createdBy: username,
      createdAt: new Date().toISOString()
    };

    const updatedDebts = isNew 
      ? [...debts, updatedDebtItem] 
      : debts.map(d => d.id === updatedDebtItem.id ? updatedDebtItem : d);
    const updatedLogs = [newLog, ...logs];

    localStorage.setItem(`grocery_debts_${tenantId}`, JSON.stringify(updatedDebts));
    localStorage.setItem(`grocery_debt_logs_${tenantId}`, JSON.stringify(updatedLogs));

    set({ debts: updatedDebts, logs: updatedLogs });
  },

  reduceDebt: (tenantId, customerName, amountYer, notes, username) => {
    const { debts, logs } = get();
    const normalizedName = customerName.trim();
    if (!normalizedName) return;

    let debtItem = debts.find(d => d.customerName.toLowerCase() === normalizedName.toLowerCase());
    if (!debtItem) return;

    const oldAmount = debtItem.amountYer;
    const newAmount = Math.max(0, oldAmount - amountYer);

    const updatedDebtItem = {
      ...debtItem,
      amountYer: newAmount,
      updatedAt: new Date().toISOString()
    };

    const newLog: DebtAuditLog = {
      id: 'log_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : Date.now().toString()),
      tenantId,
      debtId: updatedDebtItem.id,
      customerName: normalizedName,
      type: 'reduce',
      amountYer,
      balanceAfterYer: newAmount,
      notes: notes || 'تسديد مديونية',
      createdBy: username,
      createdAt: new Date().toISOString()
    };

    const updatedDebts = debts.map(d => d.id === updatedDebtItem.id ? updatedDebtItem : d);
    const updatedLogs = [newLog, ...logs];

    localStorage.setItem(`grocery_debts_${tenantId}`, JSON.stringify(updatedDebts));
    localStorage.setItem(`grocery_debt_logs_${tenantId}`, JSON.stringify(updatedLogs));

    set({ debts: updatedDebts, logs: updatedLogs });
  },

  setDebt: (tenantId, customerName, amountYer, notes, username, phone) => {
    const { debts, logs } = get();
    const normalizedName = customerName.trim();
    if (!normalizedName) return;

    let debtItem = debts.find(d => d.customerName.toLowerCase() === normalizedName.toLowerCase());
    let isNew = false;

    if (!debtItem) {
      isNew = true;
      debtItem = {
        id: 'debt_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : Date.now().toString()),
        tenantId,
        customerName: normalizedName,
        amountYer: 0,
        updatedAt: new Date().toISOString(),
        phone
      };
    } else {
      if (phone) {
        debtItem.phone = phone;
      }
    }

    const updatedDebtItem = {
      ...debtItem,
      amountYer,
      updatedAt: new Date().toISOString()
    };

    const newLog: DebtAuditLog = {
      id: 'log_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : Date.now().toString()),
      tenantId,
      debtId: updatedDebtItem.id,
      customerName: normalizedName,
      type: 'set',
      amountYer,
      balanceAfterYer: amountYer,
      notes: notes || 'تعديل قيمة المديونية',
      createdBy: username,
      createdAt: new Date().toISOString()
    };

    const updatedDebts = isNew 
      ? [...debts, updatedDebtItem] 
      : debts.map(d => d.id === updatedDebtItem.id ? updatedDebtItem : d);
    const updatedLogs = [newLog, ...logs];

    localStorage.setItem(`grocery_debts_${tenantId}`, JSON.stringify(updatedDebts));
    localStorage.setItem(`grocery_debt_logs_${tenantId}`, JSON.stringify(updatedLogs));

    set({ debts: updatedDebts, logs: updatedLogs });
  }
}));
