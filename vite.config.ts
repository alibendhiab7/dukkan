import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { URL } from 'url'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env and .env.local into process.env for local API route execution
const loadEnv = () => {
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    const envPath = path.resolve(__dirname, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const index = trimmed.indexOf('=');
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            let value = trimmed.substring(index + 1).trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
          }
        }
      }
    }
  }
};

loadEnv();

const apiMiddleware = () => ({
  name: 'api-middleware',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url.startsWith('/api')) {
        return next();
      }

      console.log(`[API Dev] Request: ${req.method} ${req.url}`);
      console.log(`[API Dev] Loaded TURSO_DATABASE_URL: ${process.env.TURSO_DATABASE_URL}`);

      try {
        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        const routeMap: Record<string, string> = {
          '/api/system/init': './api/system/init.ts',
          '/api/tenants': './api/tenants/index.ts',
          '/api/tenants/payments': './api/tenants/payments.ts',
          '/api/users': './api/users/index.ts',
          '/api/products': './api/products/index.ts',
          '/api/sales': './api/sales/index.ts',
          '/api/customers': './api/customers/index.ts',
          '/api/notifications': './api/notifications/index.ts',
          '/api/coupons': './api/coupons/index.ts',
          '/api/costs': './api/costs/index.ts',
          '/api/debts': './api/debts/index.ts',
          '/api/promotions': './api/promotions/index.ts',
          '/api/returns': './api/returns/index.ts',
          '/api/rates': './api/rates/index.ts',
          '/api/settings': './api/settings/index.ts',
          '/api/permissions': './api/permissions/index.ts',
          '/api/auth/login': './api/auth/login.ts',
          '/api/reports': './api/reports/index.ts'
        };

        const handlerPath = routeMap[pathname];
        if (!handlerPath) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
          return;
        }

        // Parse query params
        const query: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          query[key] = val;
        });
        req.query = query;

        // Parse body
        let body = {};
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => data += chunk);
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch {
                resolve({});
              }
            });
          });
        }
        req.body = body;

        // Mock response methods
        res.status = (code: number) => {
          res.statusCode = code;
          return res;
        };
        res.json = (jsonBody: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(jsonBody));
        };
        res.send = (textBody: any) => {
          res.end(textBody);
        };

        // Load the handler dynamically using Vite's SSR module loader
        const module = await server.ssrLoadModule(handlerPath);
        await module.default(req, res);
      } catch (err: any) {
        console.error('API Dev Middleware Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddleware()],
})

