/** Static contract checks for Task 01. Not a replacement for build or browser E2E. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => readFileSync(path.join(root, 'src', name), 'utf8');
const routes = src('App.tsx');
const shell = src('layouts/AppShell.tsx');
const nav = src('layouts/navigation.ts');
const auth = src('contexts/AuthContext.tsx');
const client = src('services/api.ts');
const guard = src('pages/auth/ProtectedRoute.tsx');
const theme = src('contexts/ThemeContext.tsx');
for (const layout of ['CustomerLayout', 'AdvisorLayout', 'AdminLayout']) {
  assert.match(routes, new RegExp(layout), `${layout} must be part of the router`);
}
for (const route of ['customer/dashboard', 'advisor', 'admin', 'customer/appointments', 'path="appointments"', 'working-hours']) {
  assert.ok(routes.includes(route), `Route ${route} missing`);
}
for (const color of ['#cf2935', '#a77a2e', '#507b2c', '#e9bf72', '#c5ff64']) {
  assert.ok(src('layouts/shell.css').includes(color), `ATELIER color ${color} missing`);
}
assert.match(nav, /customer:[\s\S]+advisor:[\s\S]+admin:/);
assert.match(shell, /aria-expanded=.*open/);
assert.match(shell, /ShellContext.Provider/);
assert.match(theme, /localStorage\.setItem\(THEME_KEY/);
assert.match(auth, /fetchApi\("\/me"\)/, 'must check the real backend before granting a role');
assert.match(guard, /session\.status === "checking"/);
assert.match(guard, /allowedRoles\.includes/);
assert.match(client, /axios\.create/);
assert.match(client, /Authorization/);
assert.match(client, /withCredentials: true/);
assert.doesNotMatch(client, /carservice-vn\.up\.railway/);
for (const name of ['Header','CustomerHeader', 'CustomerTopbar', 'Footer']) {
  assert.match(src(`components/${name}.tsx`), /if \(inShell\) return null;/,
    `Old ${name} must hide inside the new shell`);
}
console.log('PASS: Task 01 route/layout, theme, token, API and legacy-component contract checks.');
