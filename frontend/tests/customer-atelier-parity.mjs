import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p,root),'utf8');
const app = read('src/App.tsx');
const nav = read('src/layouts/navigation.ts');
const shell = read('src/layouts/AppShell.tsx');
const history = read('src/pages/customer/ServiceHistory.tsx');
const quotation = read('src/pages/customer/Quotation.tsx');
const stylesheet = read('src/styles/atelier-customer-complete.css');
const api = read('src/services/customerApi.ts');
assert.match(app, /path="\/customer\/service-history" element=\{<ServiceHistory\/>\}/);
for(const [label,route] of [['Đặt lịch','/customer/booking'],['Lịch hẹn','/customer/appointments'],['Xe của tôi','/customer/cars'],['Tiến độ xe','/repair-status'],['Báo giá','/quotation'],['Lịch sử','/customer/service-history']]) {
  assert.ok(nav.includes(`label: "${label}", path: "${route}"`), `${label} route missing`);
}
assert.match(shell,/atelier-customer-complete.css/);
assert.match(stylesheet, /\.at-customer-modal/);
assert.match(stylesheet, /data-theme="dark"/);
assert.match(stylesheet, /\.cs-customer-layout/);
assert.match(history,/getMyRepairOrders\(\)/);
assert.match(history,/\.filter\(row => finished\.has\(row\.status\)\)/);
assert.doesNotMatch(history,/localStorage|seed|demo-data/);
assert.match(quotation,/respondQuotation\(selectedRow\.quotation\.id, responses\)/);
assert.match(quotation,/className="at-quote-card"/);
assert.doesNotMatch(quotation,/localStorage|seed|demo-data/);
assert.match(api,/fetchApi\("\/me\/repair-orders"\)/);
assert.match(api,/fetchApi\(`\/me\/quotations\/\$\{quotationId\}\/respond`/);
console.log('PASS Customer ATELIER: 6 nav pages, real history + quotation API, CSS scope, dark theme, no demo storage.');
