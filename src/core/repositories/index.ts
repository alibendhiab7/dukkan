// src/core/repositories/index.ts
// Re-export from sqlite (localStorage) implementation
export {
  tenantRepo,
  userRepo,
  settingsRepo,
  productRepo,
  movementRepo,
  salesRepo,
  rateRepo,
  auditRepo
} from './sqlite';
