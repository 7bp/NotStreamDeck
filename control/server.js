const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const store = require('./store');

const VERSION = '1.0.0';

const app = express();
app.use(cors());
app.use(express.json());

const HTTP_PORT = parseInt(process.env.PORT, 10) || parseInt(process.env.HTTP_PORT, 10) || (() => { const d = store.get(); return d.http_port || 3000; })();
const WS_PORT = parseInt(process.env.WS_PORT, 10) || (() => { const d = store.get(); return d.ws_port || 8080; })();

// ---------- Agent WebSocket connections ----------
const agentConns = new Map(); // deviceId -> { ws, hostId }
const pendingQueries = new Map(); // commandId -> { resolve, timer }

// ---------- Frontend WebSocket connections ----------
const frontendConns = new Set();

// ---------- WebSocket server for agents ----------
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`[ws] Agent WebSocket listening on :${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('[ws] new connection (agent?)');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const config = store.get();

    if (msg.type === 'hello') {
      if (msg.token !== config.token) {
        console.log('[ws] rejected connection — token mismatch');
        ws.close();
        return;
      }

      const deviceId = msg.device_id;
      const agentVersion = msg.version || null;
      console.log(`[ws] agent hello: ${deviceId} (v${agentVersion || '?'})`);

      let host = store.getHostByDeviceId(deviceId);
      if (!host) {
        host = { id: uuidv4(), name: deviceId.slice(0, 8), deviceId, status: 'online', lastSeen: Date.now(), version: agentVersion };
        store.addHost(host);
        store.setHostOnline(deviceId);
        console.log(`[ws] auto-registered host: ${host.name} (${deviceId})`);
        broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
      } else {
        // Update version on reconnect
        if (agentVersion) {
          store.updateHostVersion(deviceId, agentVersion);
        }
      }

      ws.deviceId = deviceId;
      ws.hostId = host.id;
      agentConns.set(deviceId, { ws, hostId: host.id });
      store.setHostOnline(deviceId);
      broadcastFrontend({ type: 'host_status', data: hostStatusList() });
    } else if (msg.id && typeof msg.ok === 'boolean') {
      // Command response — resolve pending query
      const pending = pendingQueries.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve(msg);
        pendingQueries.delete(msg.id);
      }
      // If the response contains a notification, store + broadcast it
      if (msg.notification) {
        const host = store.get().hosts.find((h) => h.id === ws.hostId);
        const notif = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: Date.now(), hostId: ws.hostId, hostName: host?.name || 'agent', title: msg.notification.title || '', body: msg.notification.body || '' };
        store.addNotification(notif);
        broadcastFrontend({ type: 'notification', data: notif });
      }
    } else if (msg.type === 'notification') {
      // Agent notification — store + broadcast to frontend
      const host = store.get().hosts.find((h) => h.id === ws.hostId);
      const notif = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: Date.now(), hostId: ws.hostId, hostName: host?.name || 'agent', title: msg.title || '', body: msg.body || '' };
      store.addNotification(notif);
      broadcastFrontend({ type: 'notification', data: notif });
      console.log(`[notif] from ${notif.hostName}: ${notif.title} — ${notif.body}`);
    }
  });

  ws.on('close', () => {
    if (ws.deviceId) {
      console.log(`[ws] agent disconnected: ${ws.deviceId}`);
      agentConns.delete(ws.deviceId);
      store.setHostOffline(ws.deviceId);
      broadcastFrontend({ type: 'host_status', data: hostStatusList() });
    }
  });

  ws.on('error', () => {});
});

// ---------- File uploads ----------
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.use('/uploads', express.static(uploadsDir));

// ---------- HTTP server (frontend API + static files) ----------
const httpServer = http.createServer(app);

// ---------- Frontend WebSocket (upgrade path on HTTP server) ----------
const wssFrontend = new WebSocket.Server({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/ws') {
    wssFrontend.handleUpgrade(request, socket, head, (ws) => {
      frontendConns.add(ws);
      // Send current host status immediately
      ws.send(JSON.stringify({ type: 'host_status', data: hostStatusList() }));
      ws.send(JSON.stringify({ type: 'config', data: stripConfig(store.get()) }));

      ws.on('close', () => frontendConns.delete(ws));
      ws.on('error', () => frontendConns.delete(ws));
    });
  } else {
    socket.destroy();
  }
});

function broadcastFrontend(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of frontendConns) {
    try { ws.send(msg); } catch { frontendConns.delete(ws); }
  }
}

function hostStatusList() {
  return store.get().hosts.map((h) => ({ id: h.id, name: h.name, status: h.status, version: h.version || null }));
}

function stripConfig(config) {
  const { token, ...rest } = config;
  return { ...rest, version: VERSION };
}

// ---------- REST API ----------

// Config
app.get('/api/config', (_, res) => res.json(stripConfig(store.get())));

app.get('/api/version', (_, res) => res.json({ version: VERSION }));

app.put('/api/config', (req, res) => {
  const config = store.get();
  Object.assign(config, req.body);
  store.save();
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json({ ok: true });
});

// Hosts
app.get('/api/hosts', (_, res) => res.json(store.get().hosts));

app.post('/api/hosts', (req, res) => {
  const host = { id: uuidv4(), ...req.body, status: 'offline', lastSeen: null };
  store.addHost(host);
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json(host);
});

app.put('/api/hosts/:id', (req, res) => {
  const config = store.get();
  const idx = config.hosts.findIndex((h) => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  config.hosts[idx] = { ...config.hosts[idx], ...req.body };
  store.save();
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json(config.hosts[idx]);
});

app.delete('/api/hosts/:id', (req, res) => {
  store.removeHost(req.params.id);
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  // disconnect agent if connected
  for (const [deviceId, conn] of agentConns) {
    if (conn.hostId === req.params.id) {
      conn.ws.close();
      agentConns.delete(deviceId);
    }
  }
  res.json({ ok: true });
});

// Pages
app.get('/api/pages', (_, res) => res.json(store.get().pages));

app.post('/api/pages', (req, res) => {
  const page = { id: uuidv4(), cols: 5, rows: 3, keys: [], ...req.body };
  store.addPage(page);
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json(page);
});

app.put('/api/pages/:id', (req, res) => {
  store.updatePage(req.params.id, req.body);
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json({ ok: true });
});

app.delete('/api/pages/:id', (req, res) => {
  store.removePage(req.params.id);
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json({ ok: true });
});

// Import/export pages
app.post('/api/pages/export', (_, res) => {
  const config = store.get();
  const pages = config.pages.map((p) => ({
    name: p.name,
    cols: p.cols,
    rows: p.rows,
    iconSize: p.iconSize,
    bgImage: p.bgImage,
    hostId: p.hostId,
    keys: (p.keys || []).map((k) => {
      const { id, ...rest } = k;
      return rest;
    }),
  }));
  res.json({ pages });
});

app.post('/api/pages/import', (req, res) => {
  const { pages } = req.body;
  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'invalid pages array' });
  }
  const config = store.get();
  config.pages = pages.map((p) => ({
    id: uuidv4(),
    name: p.name || 'Imported',
    cols: p.cols || 5,
    rows: p.rows || 3,
    iconSize: p.iconSize || 64,
    bgImage: p.bgImage || null,
    hostId: p.hostId || null,
    keys: (p.keys || []).map((k) => ({ id: uuidv4(), ...k })),
  }));
  store.save();
  broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
  res.json({ ok: true, count: config.pages.length });
});

// Keys
app.post('/api/pages/:pageId/keys', (req, res) => {
  const key = { id: uuidv4(), ...req.body };
  if (store.addKey(req.params.pageId, key)) {
    broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
    res.json(key);
  } else {
    res.status(404).json({ error: 'page not found' });
  }
});

app.put('/api/keys/:id', (req, res) => {
  if (store.updateKey(req.params.id, req.body)) {
    broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'key not found' });
  }
});

app.delete('/api/keys/:id', (req, res) => {
  if (store.removeKey(req.params.id)) {
    broadcastFrontend({ type: 'config', data: stripConfig(store.get()) });
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'key not found' });
  }
});

// Execute a key action — supports multi-host macros
function sendToAgent(hostId, cmd, callback) {
  const config = store.get();
  const host = config.hosts.find((h) => h.id === hostId);
  if (!host) return callback({ ok: false, error: 'host not found' });
  const conn = agentConns.get(host.deviceId);
  if (!conn) return callback({ ok: false, error: 'host offline' });
  try {
    conn.ws.send(JSON.stringify(cmd));
    console.log(`[exec] sent ${cmd.type} to ${host.name}`);
    callback(null, { ok: true, commandId: cmd.id });
  } catch (e) {
    callback({ ok: false, error: 'send failed' });
  }
}

app.post('/api/execute/:keyId', async (req, res) => {
  const key = store.getKey(req.params.keyId);
  if (!key) return res.status(404).json({ error: 'key not found' });

  const targetHostId = req.body?.hostId || key.hostId;
  const config = store.get();
  const token = config.token;

  if (key.action.type === 'macro') {
    const actions = key.action.payload?.actions || [];
    const mode = key.action.payload?.mode || 'serial';

    const results = [];
    for (let i = 0; i < actions.length; i++) {
      const step = actions[i];
      const stepHostId = step.hostId || targetHostId;
      if (!stepHostId) { results.push({ step: i, ok: false, error: 'no host assigned' }); continue; }

      const cmd = { id: uuidv4(), type: step.type, payload: step.payload || {}, token };

      if (mode === 'parallel') {
        sendToAgent(stepHostId, cmd, (err, result) => {
          results.push({ step: i, ...(err || result) });
        });
      } else {
        await new Promise((resolve) => {
          sendToAgent(stepHostId, cmd, (err, result) => {
            results.push({ step: i, ...(err || result) });
            resolve();
          });
        });
      }
    }
    return res.json({ ok: true, macroMode: mode, results });
  }

  // Simple (non-macro) execution
  if (!targetHostId) return res.status(400).json({ error: 'no host assigned' });
  const host = config.hosts.find((h) => h.id === targetHostId);
  if (!host) return res.status(404).json({ error: 'host not found' });
  const conn = agentConns.get(host.deviceId);
  if (!conn) return res.status(503).json({ error: 'host offline' });

  const cmd = { id: uuidv4(), type: key.action.type, payload: key.action.payload, token };

  try {
    conn.ws.send(JSON.stringify(cmd));
    console.log(`[exec] sent ${key.action.type} to ${host.name}`);
    res.json({ ok: true, commandId: cmd.id });
  } catch (e) {
    console.error('[exec] send failed:', e.message);
    res.status(500).json({ error: 'send failed' });
  }
});

// ---------- Client IP ----------
app.get('/api/myip', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
  res.json({ ip });
});

// ---------- Verify PIN ----------
app.post('/api/verify-pin', (req, res) => {
  const config = store.get();
  const pin = config.pin || '000000';
  res.json({ ok: req.body?.pin === pin });
});

function sendAgentQuery(hostId, type, payload, res, timeoutMs) {
  const config = store.get();
  const host = config.hosts.find((h) => h.id === hostId);
  if (!host) return res.status(404).json({ error: 'host not found' });
  const conn = agentConns.get(host.deviceId);
  if (!conn) return res.status(503).json({ error: 'host offline' });

  const cmdId = uuidv4();
  const cmd = { id: cmdId, type, payload: payload || {}, token: config.token };

  const timer = setTimeout(() => {
    pendingQueries.delete(cmdId);
    res.status(504).json({ error: 'timeout' });
  }, timeoutMs || 8000);

  pendingQueries.set(cmdId, {
    resolve: (data) => { clearTimeout(timer); res.json(data); },
    timer,
  });

  try { conn.ws.send(JSON.stringify(cmd)); } catch { clearTimeout(timer); pendingQueries.delete(cmdId); res.status(500).json({ error: 'send failed' }); }
}

// ---------- List Apps ----------
app.post('/api/list-apps/:hostId', (req, res) => sendAgentQuery(req.params.hostId, 'list_apps', {}, res, 15000));

// ---------- Foreground App ----------
app.post('/api/foreground-app/:hostId', (req, res) => sendAgentQuery(req.params.hostId, 'foreground_app', {}, res, 5000));


// ---------- Upload endpoint ----------
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- Serve React frontend ----------
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---------- Start ----------
httpServer.listen(HTTP_PORT, () => {
  console.log(`[http] Server on http://localhost:${HTTP_PORT}`);
  console.log(`[ws]   Frontend WebSocket on ws://localhost:${HTTP_PORT}/ws`);
  console.log(`[ws]   Agent WebSocket on :${WS_PORT}`);
});
