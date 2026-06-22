import React, { useState } from 'react';

const modalOverlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.7)', zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
};

const modalBox = {
  background: '#1a1a1a', borderRadius: 12, padding: 24,
  maxWidth: 420, width: '100%', maxHeight: '85vh', overflow: 'auto',
  border: '1px solid #2a2a2a',
};
import HostManager from './HostManager.jsx';
import PageManager from './PageManager.jsx';
import KeyEditor from './KeyEditor.jsx';

export default function SetupPanel({
  config, hosts, pages,
  addHost, updateHost, deleteHost,
  addPage, updatePage, deletePage,
  addKey, updateKey, deleteKey,
  saveConfig, onDone, upload, onPreviewScreensaver, clientIP,
}) {
  const [tab, setTab] = useState('pages');
  const [editKey, setEditKey] = useState(null);
  const [editPageId, setEditPageId] = useState(null);
  const [importMsg, setImportMsg] = useState('');

  const handleExport = () => {
    fetch('/api/pages/export', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamdeck-pages-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.pages || !Array.isArray(data.pages)) {
          setImportMsg('Invalid file: missing pages array');
          return;
        }
        fetch('/api/pages/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: data.pages }),
        })
          .then((r) => r.json())
          .then((r) => {
            if (r.ok) {
              setImportMsg(`Imported ${r.count} pages`);
              setTimeout(() => setImportMsg(''), 3000);
            } else {
              setImportMsg('Import failed');
            }
          })
          .catch(() => setImportMsg('Import error'));
      } catch {
        setImportMsg('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tabs = [
    { id: 'pages', label: 'Pages' },
    { id: 'hosts', label: 'Hosts' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Setup</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#555', fontSize: '0.7rem' }}>v{config?.version || '?'}</span>
          <button style={styles.doneBtn} onClick={onDone}>Done</button>
        </div>
      </div>

      <div style={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pages' && (
        <div style={styles.tabContent}>
          <PageManager
            pages={pages}
            hosts={hosts}
            addPage={addPage}
            updatePage={updatePage}
            deletePage={deletePage}
            addKey={addKey}
            deleteKey={deleteKey}
            onEditKey={(pgId, key) => { setEditPageId(pgId); setEditKey(key); }}
            upload={upload}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            <button style={styles.actionBtn} onClick={handleExport}>Export Pages</button>
            <button style={styles.actionBtn} onClick={() => document.getElementById('import-input').click()}>Import Pages</button>
            <input id="import-input" type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
          {importMsg && <p style={{ textAlign: 'center', color: '#2a6', fontSize: '0.8rem', marginTop: 8 }}>{importMsg}</p>}
        </div>
      )}

      {editKey && (
        <div style={modalOverlay} onClick={() => setEditKey(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <KeyEditor
              keyData={editKey}
              hosts={hosts}
              onSave={(u) => { updateKey(editKey.id, u); setEditKey(null); }}
              onDelete={() => { deleteKey(editKey.id); setEditKey(null); }}
              onCancel={() => setEditKey(null)}
              upload={upload}
            />
          </div>
        </div>
      )}

      {tab === 'hosts' && (
        <div style={styles.tabContent}>
          <HostManager hosts={hosts} addHost={addHost} updateHost={updateHost} deleteHost={deleteHost} serverVersion={config?.version} />
        </div>
      )}

      {tab === 'settings' && (
        <div style={styles.tabContent}>
          <SettingsPanel config={config} saveConfig={saveConfig} onPreviewScreensaver={onPreviewScreensaver} clientIP={clientIP} />
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ config, saveConfig, onPreviewScreensaver, clientIP }) {
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [ssMsg, setSsMsg] = useState('');
  const [ipMsg, setIpMsg] = useState('');

  const saveToken = () => {
    if (!token.trim()) return;
    saveConfig({ token: token.trim() });
    setToken('');
    setMsg('Token updated. Restart agents for it to take effect.');
    setTimeout(() => setMsg(''), 3000);
  };

  const saveScreensaver = (mode) => {
    saveConfig({ screensaver: mode });
    setSsMsg('Screensaver updated');
    setTimeout(() => setSsMsg(''), 2000);
  };

  const allowMyIP = () => {
    if (!clientIP) return;
    const current = config.allowedIPs || [];
    if (current.includes(clientIP)) { setIpMsg('IP already allowed'); setTimeout(() => setIpMsg(''), 2000); return; }
    saveConfig({ allowedIPs: [...current, clientIP] });
    setIpMsg(`IP ${clientIP} added to whitelist`);
    setTimeout(() => setIpMsg(''), 3000);
  };

  const removeIP = (ip) => {
    saveConfig({ allowedIPs: (config.allowedIPs || []).filter((a) => a !== ip) });
    setIpMsg(`IP ${ip} removed`);
    setTimeout(() => setIpMsg(''), 3000);
  };

  const modes = [
    { id: 'clock', label: 'Digital Clock' },
    { id: 'gradient', label: 'Ambient Gradient' },
    { id: 'weather', label: 'Weather' },
    { id: 'icons', label: 'Icon Slideshow' },
    { id: 'pulse', label: 'Network Pulse' },
    { id: 'datequote', label: 'Date & Quote' },
    { id: 'photos', label: 'Photo Slideshow' },
    { id: 'cycle', label: 'Cycle All' },
  ];
  const current = config.screensaver || 'clock';

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #222' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚡</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>StreamDeck Control</div>
          <div style={{ color: '#555', fontSize: '0.8rem' }}>v0.1.0</div>
        </div>
      </div>

      <p style={{ color: '#888', marginBottom: 4 }}>WebSocket Server Port</p>
      <p style={{ fontSize: '1.1rem', marginBottom: 20 }}>{config.ws_port || 8080}</p>

      <p style={{ color: '#888', marginBottom: 4 }}>Authentication Token</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input
          style={styles.input}
          type="password"
          placeholder="Enter new token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button style={saveBtnStyle} onClick={saveToken}>Update</button>
      </div>
      {msg && <p style={{ color: '#2a6', fontSize: '0.8rem' }}>{msg}</p>}

      <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 16 }}>Server v{config?.version || '?'}</p>

      <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid #222' }}>
        <p style={{ color: '#888', marginBottom: 8 }}>Access Control</p>
        <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: 8 }}>
          Your IP: <code style={{ color: '#aaa' }}>{clientIP || 'detecting…'}</code>
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button style={{ ...modeBtn, background: '#2a6', color: '#fff' }} onClick={allowMyIP}>Allow this IP</button>
        </div>
        {(config.allowedIPs || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
            <p style={{ color: '#666', fontSize: '0.75rem' }}>Allowed IPs:</p>
            {(config.allowedIPs || []).map((ip) => (
              <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ color: '#aaa', fontSize: '0.8rem' }}>{ip}</code>
                <button style={{ ...modeBtn, background: 'transparent', color: '#c44', padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => removeIP(ip)}>remove</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ color: '#555', fontSize: '0.75rem', lineHeight: 1.4 }}>
          When IPs are listed, only those IPs can view the main deck. Settings are always accessible via PIN.
        </div>
        {ipMsg && <p style={{ color: '#2a6', fontSize: '0.8rem', marginTop: 4 }}>{ipMsg}</p>}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ color: '#888', margin: 0 }}>Screensaver</p>
          <button style={{ ...modeBtn, background: '#333', color: '#ccc' }} onClick={onPreviewScreensaver}>Preview</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          {modes.map((m) => (
            <button
              key={m.id}
              style={{
                ...modeBtn,
                background: current === m.id ? '#2a6' : '#2a2a2a',
                color: current === m.id ? '#fff' : '#aaa',
              }}
              onClick={() => saveScreensaver(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {ssMsg && <p style={{ color: '#2a6', fontSize: '0.8rem' }}>{ssMsg}</p>}

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#888', margin: 0, fontSize: '0.85rem' }}>Timeout ({config.screensaverTimeout || 30}s)</p>
          </div>
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={config.screensaverTimeout || 30}
            onChange={(e) => saveConfig({ screensaverTimeout: parseInt(e.target.value) })}
            style={{ width: '100%', margin: '4px 0 8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#888', margin: 0, fontSize: '0.85rem' }}>Dim Opacity ({Math.round((config.screensaverOpacity || 1) * 100)}%)</p>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            step={5}
            value={Math.round((config.screensaverOpacity || 1) * 100)}
            onChange={(e) => saveConfig({ screensaverOpacity: parseInt(e.target.value) / 100 })}
            style={{ width: '100%', margin: '4px 0' }}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!config.kioskMode} onChange={(e) => saveConfig({ kioskMode: e.target.checked })} />
            <span style={{ color: '#888', fontSize: '0.85rem' }}>Kiosk Mode — hides setup, locks to grid</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!config.appFilterEnabled} onChange={(e) => saveConfig({ appFilterEnabled: e.target.checked })} />
            <span style={{ color: '#888', fontSize: '0.85rem' }}>App Filter — only show pages matching the active app</span>
          </label>
        </div>
      </div>

      <p style={{ color: '#555', fontSize: '0.8rem', marginTop: 24, lineHeight: 1.5 }}>
        All data (pages, keys, hosts, token) is persisted in <code>data.json</code> next to the server.
      </p>
    </div>
  );
}

const saveBtnStyle = {
  padding: '8px 16px', background: '#2a6', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap',
};

const modeBtn = {
  padding: '6px 14px', border: 'none', borderRadius: 16, cursor: 'pointer',
  fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'background 0.2s',
};

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%', background: '#111', color: '#eee', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' },
  title: { fontSize: '1.2rem', fontWeight: 600 },
  doneBtn: { padding: '8px 20px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer' },
  tabs: { display: 'flex', gap: 0, padding: '12px 16px 0', borderBottom: '1px solid #2a2a2a' },
  tab: { padding: '8px 18px', background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#eee', borderBottomColor: '#2a6' },
  tabContent: { flex: 1, overflow: 'auto', padding: 12 },
  actionBtn: { padding: '6px 14px', background: '#2a2a2a', color: '#ccc', border: '1px solid #444', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' },
};
