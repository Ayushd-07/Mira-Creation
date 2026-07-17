const http = require('http');
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

async function main() {
  try {
    const adm = await login('admin@mira.com', 'admin123');
    
    // Test PUT settings
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
    if (putS.s !== 200) {
      console.log('PUT BODY:', putS.b);
      return;
    }
    
    // Test GET settings
    const getS = await req(adm.token, '/api/settings', 'GET');
    const data = JSON.parse(getS.b);
    console.log('GET companyName:', data.companyName);
    console.log('GET email:', data.email);
    console.log('GET phone:', data.phone);
    console.log('GET logo:', data.logo);
    
    if (data.companyName === 'Mira Creation') {
      console.log('SETTINGS SAVE WORKS CORRECTLY');
    } else {
      console.log('SETTINGS SAVE FAILED - companyName not updated');
    }
    
    // Test Manager 403 on settings PUT
    const mgr = await login('manager@mira.com', 'manager123');
    const mgrPut = await req(mgr.token, '/api/settings', 'PUT', { companyName: 'hack' });
    console.log('Manager PUT settings should be 403:', mgrPut.s);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
main();