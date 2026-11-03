import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const css = read('../src/layouts/shell.css');
const dashboard = read('../src/pages/shared/WorkspaceDashboard.tsx');
const app = read('../src/App.tsx');
for (const [name, token] of Object.entries({advisor: '#e9bf72', admin: '#c5ff64'})) {
  assert(css.includes(token), `${name} dark token absent`);
  assert(css.includes(`data-area="${name}"`), `${name} role scope absent`);
}
for (const cls of ['bg-white','bg-\\[\\#F7F7F5\\]','text-\\[\\#20252B\\]','text-\\[\\#8A949E\\]','border-\\[\\#E1E4E6\\]','bg-\\[\\#D6A85F\\]']) assert(css.includes(cls), `Missing mapping ${cls}`);
for(const needle of ['useAppointments','getAdvisorAppointments','grid-cols-4','min-h-[138px]','max-[1150px]:grid-cols-1','role === "advisor"']) assert(dashboard.includes(needle),`Dashboard missing ${needle}`);
assert(!dashboard.includes('490.000') && !dashboard.includes('86M'),'Do not fabricate metric values');
assert(app.includes('<WorkspaceDashboard role="advisor"/>'));
assert(dashboard.includes('max-[650px]:'), 'Tailwind responsive variants must remain');
console.log('PASS: role scoped theme, legacy dark compatibility, responsive ATELIER dashboards and real appointment integration.');
