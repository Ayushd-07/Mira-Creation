import http from 'http';

const login = (e, p) => new Promise((ok) => {
  const d = JSON.stringify({ email: e, password: p });
  const r = http.request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': d.length } }, (s) => {
    let b = ''; s.on('data', c => b += c); s.on('end', () => ok(JSON.parse(b)));
  });
  r.write(d); r.end();
});

const req = (t, path, method, body) => new Promise((ok) => {
  const d = body ? JSON.stringify(body) : '';
  const r = http.request({ hostname: 'localhost', port: 4000, path, method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t, 'Content-Length': d.length } }, (s) => {
    let b = ''; s.on('data', c => b += c); s.on('end', () => ok({ s: s.statusCode, b }));
  });
  if (body) r.write(d); r.end();
});

const adm = await login('admin@mira.com', 'admin123');
console.log('Admin token:', adm.token.slice(0, 30) + '...');

const putS = await req(adm.token, '/api/settings', 'PUT', {
  companyName: 'Mira Creation',
  businessEmail: 'ops@miracreation.com',
  businessPhone: '+1 (555) 902-4412',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  language: 'en',
  dateFormat: 'DD/MM/YYYY'
});
console.log('PUT status:', putS.s);
if (putS.s !== 200) { console.log('PUT body:', putS.b.slice(0, 200)); process.exit(1); }

const getS = await req(adm.token, '/api/settings', 'GET');
const d = JSON.parse(getS.b);
console.log('GET companyName:', d.companyName);
console.log('GET email:', d.email);
console.log('GET phone:', d.phone);
console.log('GET logo:', d.logo);
if (d.companyName === 'Mira Creation') { console.log('✓ SETTINGS SAVE WORKS'); } else { console.log('✗ SETTINGS SAVE FAILED'); }

const mgr = await login('manager@mira.com', 'manager123');
const mgrPut = await req(mgr.token, '/api/settings', 'PUT', { companyName: 'x' });
console.log('Manager PUT status:', mgrPut.s, mgrPut.s === 403 ? '✓ CORRECT 403' : '✗ WRONG');

// Test form submission with all fields like frontend
const putFull = await req(adm.token, '/api/settings', 'PUT', {
  companyName: 'Mira Creation',
  displayName: 'Mira',
  businessType: 'Manufacturing',
  legalBusinessName: '',
  gstin: 'GST-1234',
  pan: '',
  businessEmail: 'ops@miracreation.com',
  businessPhone: '+1 (555) 902-4412',
  alternatePhone: '',
  website: '',
  addressLine1: '724 Fabric District',
  addressLine2: '',
  city: 'NY',
  state: 'NY',
  pinCode: '10018',
  country: 'US',
  gstRegistered: false,
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  financialYearStart: ''
});
console.log('Full form PUT status:', putFull.s);
console.log('Full form body:', putFull.b.slice(0, 300));

// Verify gstNumber saved
const get2 = await req(adm.token, '/api/settings', 'GET');
const d2 = JSON.parse(get2.b);
console.log('After full form - gstNumber:', d2.gstNumber, d2.gstNumber === 'GST-1234' ? '✓' : '✗');
console.log('After full form - address:', d2.address, d2.address === '724 Fabric District' ? '✓' : '✗');

console.log('\nALL SETTINGS TESTS COMPLETE');