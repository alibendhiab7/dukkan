// src/core/database/db.ts
// Professional LocalStorage-backed SQL engine for the Grocery SaaS PWA
// Supports SELECT, INSERT, UPDATE, DELETE with parameterized queries

export interface DatabaseDriver {
  initialize(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ rowsAffected: number; insertId?: number }>;
  transaction(callback: (tx: DatabaseDriver) => Promise<void>): Promise<void>;
  clearDatabase(): Promise<void>;
}

const ALL_TABLES = [
  'tenants',
  'users',
  'tenant_settings',
  'products',
  'inventory_movements',
  'sales',
  'sale_items',
  'exchange_rates',
  'audit_logs',
  'notifications',
  'financial_costs',
  'customers',
  'coupons',
  'product_returns',
  'return_items',
  'user_permissions'
] as const;

const DB_VERSION_KEY = 'grocery_saas_db_version';
const CURRENT_DB_VERSION = 6;

class LocalStorageSqlEngine implements DatabaseDriver {
  private prefix = 'grocery_saas_db_';
  private inTx = false;
  private txStore: Record<string, any[]> = {};
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const storedVersion = parseInt(localStorage.getItem(DB_VERSION_KEY) || '0', 10);
    if (storedVersion < CURRENT_DB_VERSION) {
      console.log(`[DB] Version mismatch: stored=${storedVersion}, current=${CURRENT_DB_VERSION}. Clearing for fresh seed.`);
      await this.clearDatabase();
      localStorage.setItem(DB_VERSION_KEY, String(CURRENT_DB_VERSION));
    }

    for (const t of ALL_TABLES) {
      const key = this.prefix + t;
      const raw = localStorage.getItem(key);
      if (raw === null) {
        localStorage.setItem(key, '[]');
      } else {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const seen = new Set<string>();
            const uniqueList: any[] = [];
            for (const item of list) {
              const pk = t === 'tenant_settings' ? item.tenant_id : item.id;
              if (pk) {
                const pkStr = String(pk);
                if (!seen.has(pkStr)) {
                  seen.add(pkStr);
                  uniqueList.push(item);
                }
              } else {
                uniqueList.push(item);
              }
            }
            if (uniqueList.length !== list.length) {
              console.log(`[DB] De-duplicated ${list.length - uniqueList.length} rows in table ${t}`);
              localStorage.setItem(key, JSON.stringify(uniqueList));
            }
          }
        } catch (_e) {
          // Ignore parse errors
        }
      }
    }

    this.initialized = true;
    console.log('[DB] LocalStorage SQL Engine initialized (v' + CURRENT_DB_VERSION + ')');
  }

  async clearDatabase(): Promise<void> {
    for (const t of ALL_TABLES) {
      localStorage.setItem(this.prefix + t, '[]');
    }
    this.txStore = {};
    localStorage.removeItem('grocery_saas_session');
  }

  private read(table: string): any[] {
    if (this.inTx && this.txStore[table] !== undefined) {
      return this.txStore[table];
    }
    const raw = localStorage.getItem(this.prefix + table);
    return raw ? JSON.parse(raw) : [];
  }

  private write(table: string, data: any[]): void {
    if (this.inTx) {
      this.txStore[table] = data;
      return;
    }
    localStorage.setItem(this.prefix + table, JSON.stringify(data));
  }

  async transaction(callback: (tx: DatabaseDriver) => Promise<void>): Promise<void> {
    this.inTx = true;
    this.txStore = {};
    for (const t of ALL_TABLES) {
      this.txStore[t] = JSON.parse(JSON.stringify(this.read(t)));
    }

    try {
      await callback(this);
      for (const t of Object.keys(this.txStore)) {
        localStorage.setItem(this.prefix + t, JSON.stringify(this.txStore[t]));
      }
    } catch (err) {
      console.error('[DB] Transaction rolled back:', err);
      throw err;
    } finally {
      this.inTx = false;
      this.txStore = {};
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const norm = sql.trim().replace(/\s+/g, ' ');
    const rx = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+([\w.]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i;
    const m = norm.match(rx);
    if (!m) throw new Error(`[DB] Unsupported SELECT: ${sql}`);

    const [, cols, tableName, whereStr, orderCol, orderDir, limitStr] = m;
    const table = tableName.toLowerCase();
    let rows = [...this.read(table)];

    if (whereStr) rows = this.applyWhere(rows, whereStr, [...params]);
    if (orderCol) {
      const desc = orderDir?.toUpperCase() === 'DESC';
      rows.sort((a, b) => {
        let va = a[orderCol], vb = b[orderCol];
        if (typeof va === 'string' && !isNaN(Date.parse(va)) && isNaN(Number(va))) {
          va = new Date(va).getTime();
          vb = new Date(vb).getTime();
        }
        return desc ? (va < vb ? 1 : va > vb ? -1 : 0) : (va < vb ? -1 : va > vb ? 1 : 0);
      });
    }
    if (limitStr) rows = rows.slice(0, parseInt(limitStr, 10));
    if (cols.trim() !== '*') {
      const colList = cols.split(',').map(c => c.trim().split('.').pop()!);
      rows = rows.map(r => {
        const o: any = {};
        colList.forEach(c => { o[c] = r[c]; });
        return o;
      });
    }
    return rows as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const norm = sql.trim().replace(/\s+/g, ' ');

    if (/^INSERT INTO/i.test(norm)) {
      const m = norm.match(/^INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
      if (!m) throw new Error(`[DB] Unsupported INSERT: ${sql}`);
      const table = m[1].toLowerCase();
      const colNames = m[2].split(',').map(c => c.trim());
      const row: any = {};
      colNames.forEach((c, i) => { row[c] = params[i]; });
      if (row.id === undefined || row.id === null) {
        row.id = crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      }
      const data = this.read(table);
      let exists = false;
      if (table === 'tenant_settings') {
        exists = data.some(r => r.tenant_id === row.tenant_id);
      } else if (row.id !== undefined && row.id !== null) {
        exists = data.some(r => r.id === row.id);
      }
      if (exists) {
        console.warn(`[DB] Primary key violation on table ${table}. Row already exists.`);
        return { rowsAffected: 0 };
      }
      data.push(row);
      this.write(table, data);
      return { rowsAffected: 1 };
    }

    if (/^UPDATE/i.test(norm)) {
      const m = norm.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?$/i);
      if (!m) throw new Error(`[DB] Unsupported UPDATE: ${sql}`);
      const table = m[1].toLowerCase();
      const setClauses = m[2].split(',').map(s => s.trim());
      const setCols = setClauses.map(s => s.split('=')[0].trim());
      const setParams = params.slice(0, setCols.length);
      const whereParams = params.slice(setCols.length);
      const data = this.read(table);
      let affected = 0;
      const updated = data.map(row => {
        if (m[3] && this.applyWhere([row], m[3], [...whereParams]).length === 0) return row;
        if (!m[3] || this.applyWhere([row], m[3], [...whereParams]).length > 0) {
          const copy = { ...row };
          setCols.forEach((c, i) => { copy[c] = setParams[i]; });
          affected++;
          return copy;
        }
        return row;
      });
      this.write(table, updated);
      return { rowsAffected: affected };
    }

    if (/^DELETE FROM/i.test(norm)) {
      const m = norm.match(/^DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?$/i);
      if (!m) throw new Error(`[DB] Unsupported DELETE: ${sql}`);
      const table = m[1].toLowerCase();
      const data = this.read(table);
      let affected = 0;
      const kept = data.filter(row => {
        if (m[2] && this.applyWhere([row], m[2], [...params]).length > 0) {
          affected++;
          return false;
        }
        if (!m[2]) { affected++; return false; }
        return true;
      });
      this.write(table, kept);
      return { rowsAffected: affected };
    }

    throw new Error(`[DB] Unsupported SQL: ${sql}`);
  }

  private applyWhere(rows: any[], whereStr: string, params: any[]): any[] {
    const clean = whereStr.replace(/\b\w+\.(\w+)\b/g, '$1');
    const conditions = clean.split(/\s+AND\s+/i);

    return rows.filter(row => {
      let pIdx = 0;
      let match = true;

      for (const cond of conditions) {
        const parsed = cond.trim().match(/^(\w+)\s*(=|!=|<>|<|>|<=|>=|LIKE)\s*(\?|'.*?'|\d+(?:\.\d+)?)$/i);
        if (!parsed) {
          const flag = cond.trim().match(/^(\w+)\s*(=|!=|<>)\s*(\d)$/);
          if (flag) {
            const rv = row[flag[1]];
            const cv = parseInt(flag[3], 10);
            const rb = rv === true || rv === 1 || rv === '1';
            const cb = cv === 1;
            if (flag[2] === '=' ? rb !== cb : rb === cb) match = false;
            continue;
          }
          continue;
        }

        const [, col, op, rawVal] = parsed;
        let right: any;
        if (rawVal === '?') {
          right = params[pIdx++];
        } else if (rawVal.startsWith("'")) {
          right = rawVal.slice(1, -1);
        } else {
          right = Number(rawVal);
        }
        const left = row[col];

        switch (op) {
          case '=':
            if (left !== right) {
              const lb = left === true || left === 1 || left === '1';
              const rb2 = right === true || right === 1 || right === '1';
              if (typeof left === 'boolean' || typeof right === 'boolean') {
                if (lb !== rb2) match = false;
              } else {
                if (String(left) !== String(right)) match = false;
              }
            }
            break;
          case '!=': case '<>': if (left === right) match = false; break;
          case '<':  if (!(left < right)) match = false; break;
          case '>':  if (!(left > right)) match = false; break;
          case '<=': if (!(left <= right)) match = false; break;
          case '>=': if (!(left >= right)) match = false; break;
          case 'LIKE': case 'like': {
            const rx = new RegExp('^' + right.toString().replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
            if (!rx.test(String(left || ''))) match = false;
            break;
          }
        }
      }
      return match;
    });
  }
}

export const db: DatabaseDriver = new LocalStorageSqlEngine();
