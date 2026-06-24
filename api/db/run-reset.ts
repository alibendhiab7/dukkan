import { turso } from './turso';

async function reset() {
  const tables = [
    'audit_logs', 'debt_logs', 'debts', 'return_items', 'product_returns',
    'sale_items', 'sales', 'inventory_movements', 'promotions',
    'coupons', 'customers', 'financial_costs', 'notifications',
    'exchange_rates', 'products', 'user_permissions', 'users',
    'tenant_settings', 'tenants'
  ];
  for (const t of tables) {
    await turso.execute(`DELETE FROM ${t}`);
  }
  console.log('[Reset] All data cleared.');
}

reset()
  .then(() => process.exit(0))
  .catch((e) => { console.error('[Reset] Failed:', e); process.exit(1); });
