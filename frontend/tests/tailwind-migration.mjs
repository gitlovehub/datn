import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const src = (name) => readFileSync(path.join(process.cwd(), 'src', name), 'utf8');
const index = src('index.css');
const garage = src('pages/customer/Cars.tsx');
const services = src('pages/customer/Services.tsx');
const hub = src('components/AdminHubNav.tsx');
const dash = src('pages/shared/WorkspaceDashboard.tsx');
const ui = src('components/ui/index.tsx');
const shell = src('layouts/shell.css');
assert.match(index, /@import "tailwindcss"/);
assert.match(index, /@theme inline/);
for (const token of ['cs-bg','cs-surface','cs-text','cs-border','cs-accent','cs-soft','cs-muted'])
  assert.ok(index.includes(`--color-${token}:`), `Tailwind theme token missing: ${token}`);
for (const [name, code, utility] of [
  ['Garage', garage, 'max-[670px]:grid-cols-1'],
  ['Public services', services, 'text-at-ink'],
  ['Admin navigation', hub, 'hover:bg-cs-surface-2'],
  ['Advisor/Admin dashboard', dash, 'grid-cols-4'],
  ['Common components', ui, 'bg-cs-surface'],
]) assert.ok(code.includes(utility), `${name} does not contain migrated Tailwind utilities`);
for (const style of ['atelier-garage.css','atelier-services.css','workspace-dashboard.css'])
  assert.equal(existsSync(path.join(process.cwd(),'src/styles',style)), false, `${style} is obsolete`);
assert.doesNotMatch(garage + services + dash, /atelier-(garage|services)\.css|workspace-dashboard\.css/);
assert.match(shell, /data-area="admin"/);
assert.match(shell, /data-area="advisor"/);
assert.match(garage, /getMyVehicles\(\)/);
assert.match(dash, /getAdvisorAppointments/);
assert.match(services, /fetchApi/);
console.log('PASS: Tailwind v4 role tokens, migrated customer/services/admin/dashboard/shared UI, responsive & API invariants');
