const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data.json');

const defaults = {
  token: 'shared-secret',
  http_port: 3000,
  ws_port: 8080,
  pin: '000000',
  allowedIPs: [],
  screensaverTimeout: 30,
  screensaverOpacity: 1,
  kioskMode: false,
  appFilterEnabled: false,
  hosts: [],
  pages: [
    {
      id: 'page-default',
      name: 'Main',
      cols: 5,
      rows: 3,
      keys: [],
    },
  ],
};

let data = null;

function load() {
  if (data) return data;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      data = JSON.parse(raw);
      if (!data.pages || !Array.isArray(data.pages)) data.pages = defaults.pages;
      if (!data.hosts || !Array.isArray(data.hosts)) data.hosts = defaults.hosts;
      return data;
    }
  } catch {
    // fall through
  }
  data = JSON.parse(JSON.stringify(defaults));
  save();
  return data;
}

function save() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[store] write failed:', e.message);
  }
}

function get() {
  return load();
}

function setHostStatus(deviceId, status) {
  const d = load();
  const host = d.hosts.find((h) => h.deviceId === deviceId);
  if (host) {
    host.status = status;
    host.lastSeen = Date.now();
    save();
  }
}

function setHostOnline(deviceId) {
  setHostStatus(deviceId, 'online');
}

function setHostOffline(deviceId) {
  setHostStatus(deviceId, 'offline');
}

function addHost(host) {
  const d = load();
  d.hosts.push({ id: host.id, name: host.name, deviceId: host.deviceId, status: 'offline', lastSeen: null, version: host.version || null });
  save();
}

function updateHostVersion(deviceId, version) {
  const d = load();
  const host = d.hosts.find((h) => h.deviceId === deviceId);
  if (host) {
    host.version = version;
    save();
  }
}

function removeHost(id) {
  const d = load();
  d.hosts = d.hosts.filter((h) => h.id !== id);
  save();
}

function addPage(page) {
  const d = load();
  d.pages.push({ id: page.id, name: page.name, cols: page.cols || 5, rows: page.rows || 3, keys: [] });
  save();
}

function removePage(id) {
  const d = load();
  d.pages = d.pages.filter((p) => p.id !== id);
  save();
}

function updatePage(id, updates) {
  const d = load();
  const page = d.pages.find((p) => p.id === id);
  if (page) {
    Object.assign(page, updates);
    save();
  }
}

function addKey(pageId, key) {
  const d = load();
  const page = d.pages.find((p) => p.id === pageId);
  if (page) {
    page.keys.push(key);
    save();
    return true;
  }
  return false;
}

function updateKey(keyId, updates) {
  const d = load();
  for (const page of d.pages) {
    const idx = page.keys.findIndex((k) => k.id === keyId);
    if (idx !== -1) {
      page.keys[idx] = { ...page.keys[idx], ...updates };
      save();
      return true;
    }
  }
  return false;
}

function removeKey(keyId) {
  const d = load();
  for (const page of d.pages) {
    const idx = page.keys.findIndex((k) => k.id === keyId);
    if (idx !== -1) {
      page.keys.splice(idx, 1);
      save();
      return true;
    }
  }
  return false;
}

function getKey(keyId) {
  const d = load();
  for (const page of d.pages) {
    const key = page.keys.find((k) => k.id === keyId);
    if (key) return key;
  }
  return null;
}

function getHostByDeviceId(deviceId) {
  return load().hosts.find((h) => h.deviceId === deviceId) || null;
}

module.exports = {
  get,
  save,
  addHost,
  removeHost,
  setHostOnline,
  setHostOffline,
  addPage,
  removePage,
  updatePage,
  addKey,
  updateKey,
  removeKey,
  getKey,
  getHostByDeviceId,
  updateHostVersion,
};
