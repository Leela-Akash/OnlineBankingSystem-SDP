import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('docs/screenshots/chrome_profile');
const outDir = path.resolve('docs/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function loginApi(username, password, role) {
  const url = `http://localhost:8080/api/v1/${role}/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${username}: ${res.statusText}`);
  return await res.json();
}

async function runCapture(prefix = 'before') {
  console.log(`Starting capture for prefix: ${prefix}`);
  const customerAuth = await loginApi('johndoe', 'customer123', 'customer');
  const staffAuth = await loginApi('staff', 'staff123', 'staff');
  const adminAuth = await loginApi('admin', 'admin123', 'admin');

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9223/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome debugging port');
    chrome.kill();
    return;
  }

  const browserWs = new WebSocket(wsUrl);
  await new Promise(r => browserWs.onopen = r);

  let id = 1;
  const callbacks = new Map();
  browserWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  function sendBrowser(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      browserWs.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  // Helper for single page session
  async function capturePage(targetUrl, authData, pageName, viewports) {
    const target = await sendBrowser('Target.createTarget', { url: 'about:blank' });
    const targetWsUrl = `ws://127.0.0.1:9223/devtools/page/${target.result.targetId}`;

    const ws = new WebSocket(targetWsUrl);
    await new Promise(r => ws.onopen = r);

    let pageMsgId = 1;
    const pageCallbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pageCallbacks.has(msg.id)) {
        pageCallbacks.get(msg.id)(msg);
        pageCallbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const mId = pageMsgId++;
        pageCallbacks.set(mId, resolve);
        ws.send(JSON.stringify({ id: mId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // First go to origin to set localStorage
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 600));

    if (authData) {
      await send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('token', '${authData.token}');
          localStorage.setItem('refreshToken', '${authData.refreshToken || ""}');
          localStorage.setItem('userRole', '${authData.role}');
          localStorage.setItem('userId', '${authData.id || 1}');
          localStorage.setItem('username', '${authData.username}');
          localStorage.setItem('bank_theme', 'light');
        `
      });
    } else {
      await send('Runtime.evaluate', {
        expression: `
          localStorage.clear();
          localStorage.setItem('bank_theme', 'light');
        `
      });
    }

    // Now navigate to target URL
    await send('Page.navigate', { url: `http://localhost:5173${targetUrl}` });
    await new Promise(r => setTimeout(r, 1500));

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise(r => setTimeout(r, 400));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot?.result?.data) {
        const filename = `${pageName}_${vp.name}_${prefix}.png`;
        fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.result.data, 'base64'));
        console.log(`Saved: ${filename}`);
      }
    }

    ws.close();
    await sendBrowser('Target.closeTarget', { targetId: target.result.targetId });
  }

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 }
  ];

  const pages = [
    { url: '/', auth: null, name: 'home' },
    { url: '/customerlogin', auth: null, name: 'login_customer' },
    { url: '/customerregistration', auth: null, name: 'register_customer' },
    { url: '/customer/profile', auth: customerAuth, name: 'customer_dashboard' },
    { url: '/customer/statements', auth: customerAuth, name: 'customer_statements' },
    { url: '/funds', auth: customerAuth, name: 'customer_transfers' },
    { url: '/loans', auth: customerAuth, name: 'customer_loans' },
    { url: '/dashboard', auth: staffAuth, name: 'staff_dashboard' },
    { url: '/staffloans', auth: staffAuth, name: 'staff_loans' },
    { url: '/admin/dashboard', auth: adminAuth, name: 'admin_dashboard' },
    { url: '/admin/reports', auth: adminAuth, name: 'admin_reports' },
    { url: '/admin/manage-customers', auth: adminAuth, name: 'admin_customers' }
  ];

  for (const p of pages) {
    try {
      console.log(`Capturing ${p.name}...`);
      await capturePage(p.url, p.auth, p.name, viewports);
    } catch (err) {
      console.error(`Error capturing ${p.name}:`, err.message);
    }
  }

  browserWs.close();
  chrome.kill();
  console.log(`Finished capture for ${prefix}!`);
}

const prefixArg = process.argv[2] || 'before';
runCapture(prefixArg).catch(console.error);
