import React, { useState, useEffect, useCallback, useRef } from 'react';
import StreamDeck from './components/StreamDeck.jsx';
import SetupPanel from './components/SetupPanel.jsx';
import KeyEditor from './components/KeyEditor.jsx';
import Screensaver from './components/Screensaver.jsx';
import { AddKeyForm, PageForm } from './components/PageManager.jsx';
import { useConfig, useHosts, usePages, useExecute, useUpload, useWebSocket, useMyIP } from './hooks/useApi.js';

export default function App() {
  const [view, setView] = useState('deck');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [hostStatus, setHostStatus] = useState({});
const [serverVersion, setServerVersion] = useState(null);
  const [dimmed, setDimmed] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinVal, setPinVal] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [previewSs, setPreviewSs] = useState(false);

  const timerRef = useRef(null);

  // Clock — 24h format
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // PIN gate — toggle edit mode on grid, or open full setup
  const requestSetup = (mode) => {
    if (mode === 'full') {
      setEditMode(false);
      setView('setup');
      return;
    }
    if (editMode) {
      setEditMode(false);
    } else {
      setShowPin(true);
      setPinVal('');
    }
  };

  const handlePinInput = (val) => {
    setPinVal(val);
  };

  const submitPin = () => {
    fetch('/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pinVal }) })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setShowPin(false);
          setPinVal('');
          if (isRestricted) {
            setView('setup');
          } else {
            setEditMode(true);
          }
        } else {
          setPinVal('');
        }
      })
      .catch(() => setPinVal(''));
  };

  const [pendingAddKey, setPendingAddKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [pageForm, setPageForm] = useState({ name: '', cols: 5, rows: 3, iconSize: 64, appNames: '' });
  const [bgUploading, setBgUploading] = useState(false);

  const { config, setConfig, saveConfig } = useConfig();
  const dimTimeout = (config?.screensaverTimeout ?? 30) * 1000;

  // Dim timer — only on deck view, not in edit mode
  useEffect(() => {
    if (view !== 'deck' || editMode) {
      setDimmed(false);
      return;
    }

    const start = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDimmed(true), dimTimeout);
    };

    start();

    const handler = () => {
      setDimmed(false);
      start();
    };

    document.addEventListener('touchstart', handler);
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);

    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [view, editMode, dimTimeout]);

  const { hosts, addHost, updateHost, deleteHost, setHosts } = useHosts();
  const { pages, addPage, updatePage, deletePage, addKey, updateKey, deleteKey, setPages } = usePages();
  const { execute } = useExecute();
  const { upload } = useUpload();
  const clientIP = useMyIP();

  const allowedIPs = config?.allowedIPs || [];
  const isRestricted = allowedIPs.length > 0 && clientIP && !allowedIPs.includes(clientIP);

  // Pick up server version from config
  useEffect(() => {
    if (config?.version) setServerVersion(config.version);
  }, [config]);

  // Request fullscreen on first user interaction
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Foreground app polling (for app-filtered pages)
  const [foregroundApp, setForegroundApp] = useState(null);
  useEffect(() => {
    if (!config?.appFilterEnabled || view !== 'deck') { setForegroundApp(null); return; }
    const onlineHost = hosts?.find((h) => hostStatus[h.id]?.status === 'online');
    if (!onlineHost) { setForegroundApp(null); return; }
    const poll = () => {
      fetch(`/api/foreground-app/${onlineHost.id}`, { method: 'POST' })
        .then((r) => r.json())
        .then((d) => { if (d.ok) setForegroundApp(d.data?.name || null); })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [config?.appFilterEnabled, view, hosts, hostStatus]);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    fetch('/api/notifications').then((r) => r.json()).then((data) => { if (Array.isArray(data)) setNotifications(data); }).catch(() => {});
  }, []);

  const pushNotif = useCallback((n) => {
    setNotifications((prev) => [n, ...prev].slice(0, 200));
    setToast(n);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useWebSocket(
    useCallback((msg) => {
      if (msg.type === 'host_status') {
        const map = {};
        for (const h of msg.data) map[h.id] = { status: h.status, version: h.version || null };
        setHostStatus(map);
        setHosts((prev) => prev.map((h) => ({ ...h, status: map[h.id]?.status || 'offline' })));
      }
      if (msg.type === 'config') {
        setConfig(msg.data);
        if (msg.data.version) setServerVersion(msg.data.version);
        if (msg.data.pages) setPages(msg.data.pages);
        if (msg.data.hosts) {
          setHosts((prev) => {
            const newHosts = msg.data.hosts;
            return newHosts.map((nh) => {
              const old = prev.find((p) => p.id === nh.id);
              return { ...nh, status: old?.status || nh.status || 'offline' };
            });
          });
        }
      }
      if (msg.type === 'notification') {
        pushNotif(msg.data);
      }
    }, [setConfig, setHosts, pushNotif]),
  );

  const clearNotifs = () => { setNotifications([]); fetch('/api/notifications', { method: 'DELETE' }); };

  // Kiosk mode — lock to deck, hide setup
  const isKiosk = config?.kioskMode;

  // Filter pages by foreground app (when enabled)
  let visiblePages = pages;
  if (config?.appFilterEnabled && foregroundApp && pages.length > 0) {
    const matched = pages.filter((p) => {
      const names = Array.isArray(p.appNames) ? p.appNames : [];
      return names.length === 0 || names.some((n) => foregroundApp.toLowerCase().includes(n.toLowerCase()));
    });
    if (matched.length > 0) visiblePages = matched;
  }

  const handleAddKey = useCallback((pageId, row, col) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const cols = page.cols || 5;
    const rows = page.rows || 3;
    setPendingAddKey({ pageId, row, col, cols, rows });
  }, [pages]);

  const handleEditKey = useCallback((key) => {
    setEditingKey(key);
  }, []);

  const handleEditPage = useCallback(() => {
    const page = pages[activePageIdx] || pages[0];
    if (!page) return;
    setPageForm({ name: page.name, cols: page.cols, rows: page.rows, iconSize: page.iconSize || 64, hostId: page.hostId || '', backgroundImage: page.backgroundImage || '', appNames: (page.appNames || []).join(', ') });
    setEditingPage(page.id);
  }, [pages, activePageIdx]);

  const savePage = useCallback(() => {
    if (!pageForm.name.trim()) return;
    const updates = { ...pageForm, appNames: pageForm.appNames ? pageForm.appNames.split(',').map((s) => s.trim()).filter(Boolean) : [] };
    updatePage(editingPage, updates);
    setEditingPage(null);
  }, [pageForm, editingPage, updatePage]);

  const handleBgUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const res = await upload(file);
      if (res.url) setPageForm((prev) => ({ ...prev, backgroundImage: res.url }));
    } catch {}
    setBgUploading(false);
  }, [upload]);

  const executeKey = useCallback((keyId, hostOverride) => {
    if (hostOverride) {
      return fetch(`/api/execute/${keyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: hostOverride }),
      }).then((r) => r.json());
    }
    return execute(keyId);
  }, [execute]);

  const handleNavigate = useCallback((payload) => {
    if (!payload) return;
    switch (payload.target) {
      case 'home': setActivePageIdx(0); break;
      case 'next': setActivePageIdx((i) => Math.min(pages.length - 1, i + 1)); break;
      case 'prev': setActivePageIdx((i) => Math.max(0, i - 1)); break;
      case 'index':
        if (typeof payload.pageIndex === 'number') setActivePageIdx(Math.min(pages.length - 1, Math.max(0, payload.pageIndex)));
        break;
      case 'name': {
        const idx = pages.findIndex((p) => p.name === payload.pageName);
        if (idx >= 0) setActivePageIdx(idx);
        break;
      }
    }
  }, [pages]);

  const handlePreviewScreensaver = useCallback(() => {
    setPreviewSs(true);
    setTimeout(() => setPreviewSs(false), 5000);
  }, []);

  // ---- Render content ----
  let content;

  if (!config) {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>Loading…</p>
      </div>
    );
  } else if (isKiosk) {
    // Kiosk mode — always show deck, skip setup/lock
    const cp = pages[Math.min(activePageIdx, pages.length - 1)] || pages[0];
    content = cp ? (
      <StreamDeck
        page={cp} pages={pages} hosts={hosts} hostStatus={hostStatus}
        pageIndex={Math.min(activePageIdx, pages.length - 1)} pageCount={pages.length}
        timeStr={timeStr} editMode={false} serverVersion={serverVersion}
        kioskMode={true}
        notifications={notifications} showNotifs={showNotifs} setShowNotifs={setShowNotifs} clearNotifs={clearNotifs}
        onExitKiosk={() => saveConfig({ kioskMode: false })}
        onNavigate={handleNavigate}
        onPrev={() => setActivePageIdx((i) => Math.max(0, i - 1))}
        onNext={() => setActivePageIdx((i) => Math.min(pages.length - 1, i + 1))}
        onSetup={() => {}}
        onExecute={executeKey} onAddKey={() => {}} onEditKey={() => {}} onEditPage={() => {}}
      />
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>No pages configured.</p>
      </div>
    );
  } else if (view === 'setup') {
    content = (
      <SetupPanel
        config={config}
        hosts={hosts}
        pages={pages}
        addHost={addHost}
        updateHost={updateHost}
        deleteHost={deleteHost}
        addPage={addPage}
        updatePage={updatePage}
        deletePage={deletePage}
        addKey={addKey}
        updateKey={updateKey}
        deleteKey={deleteKey}
        saveConfig={saveConfig}
        onDone={() => setView('deck')}
        upload={upload}
        onPreviewScreensaver={handlePreviewScreensaver}
        clientIP={clientIP}
      />
    );
  } else if (view !== 'setup' && isRestricted) {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
        <div style={{ fontSize: '3rem', opacity: 0.4 }}>🔒</div>
        <p style={{ color: '#555', fontSize: '1rem' }}>Access restricted</p>
        <p style={{ color: '#444', fontSize: '0.85rem' }}>Your IP is not on the allowed list.</p>
        <button onClick={() => { setShowPin(true); setPinVal(''); }} style={btnStyle}>Settings</button>
      </div>
    );
  } else if (pages.length === 0) {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>No pages yet.</p>
        <button onClick={requestSetup} style={btnStyle}>Open Setup</button>
      </div>
    );
  } else {
    const page = pages[activePageIdx] || pages[0];
    const currPages = visiblePages.length > 0 ? visiblePages : pages;
    const currPage = currPages[Math.min(activePageIdx, currPages.length - 1)] || currPages[0] || page;

    content = (
      <>
        <StreamDeck
          page={currPage}
          pages={pages}
          hosts={hosts}
          hostStatus={hostStatus}
          pageIndex={Math.min(activePageIdx, currPages.length - 1)}
          pageCount={currPages.length}
          timeStr={timeStr}
          editMode={editMode}
          serverVersion={serverVersion}
          kioskMode={isKiosk}
          notifications={notifications} showNotifs={showNotifs} setShowNotifs={setShowNotifs} clearNotifs={clearNotifs}
          onExitKiosk={() => saveConfig({ kioskMode: false })}
          onNavigate={handleNavigate}
          onPrev={() => setActivePageIdx((i) => Math.max(0, i - 1))}
          onNext={() => setActivePageIdx((i) => Math.min(currPages.length - 1, i + 1))}
          onSetup={requestSetup}
          onExecute={executeKey}
          onAddKey={handleAddKey}
          onEditKey={handleEditKey}
          onEditPage={handleEditPage}
        />
      </>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* PIN overlay — always on top */}
      {showPin && (
        <div style={pinOverlay}>
          <div style={pinBox}>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 16 }}>Enter PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinVal}
              onChange={(e) => handlePinInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
              style={pinInput}
              autoFocus
            />
            <button onClick={submitPin} style={{ ...btnStyle, marginTop: 16, width: '100%' }}>Verify</button>
          </div>
        </div>
      )}
      {content}
      {/* Toast notification */}
      {toast && (
        <div
          onClick={() => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
            setToast((t) => t ? { ...t, expanded: !t.expanded } : null);
          }}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
            background: toast.expanded ? '#1a1a1a' : 'rgba(26,26,26,0.95)',
            border: '1px solid #2a2a2a', borderRadius: 12, cursor: 'pointer',
            width: toast.expanded ? 340 : 'auto', minWidth: 60, maxWidth: 340,
            padding: toast.expanded ? '16px 20px' : '8px 16px',
            transition: 'all 0.25s ease', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: toast.expanded ? 'column' : 'row',
            alignItems: 'center', gap: 8,
          }}
        >
          {!toast.expanded && (
            <>
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🔔</span>
              <span style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{toast.hostName}</span>
              <span style={{ fontSize: '0.75rem', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{toast.title || toast.body}</span>
            </>
          )}
          {toast.expanded && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{toast.hostName}</span>
                <button onClick={(e) => { e.stopPropagation(); setToast(null); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
              </div>
              {toast.title && <div style={{ fontSize: '0.9rem', color: '#eee', fontWeight: 600, width: '100%' }}>{toast.title}</div>}
              {toast.body && <div style={{ fontSize: '0.8rem', color: '#999', width: '100%', lineHeight: 1.4 }}>{toast.body}</div>}
              {toast.timestamp && <div style={{ fontSize: '0.7rem', color: '#555', width: '100%', marginTop: 4 }}>{(() => { const s = Math.floor((Date.now() - toast.timestamp) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; })()}</div>}
            </>
          )}
        </div>
      )}
      {/* Add key modal (from grid edit mode) */}
      {pendingAddKey && (
        <div style={modalOverlay} onClick={() => setPendingAddKey(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <AddKeyForm
              pageId={pendingAddKey.pageId}
              cols={pendingAddKey.cols}
              rows={pendingAddKey.rows}
              existingKeys={pages.find((p) => p.id === pendingAddKey.pageId)?.keys || []}
              addKey={addKey}
              onDone={() => setPendingAddKey(null)}
              hosts={hosts}
              upload={upload}
              initialRow={pendingAddKey.row}
              initialCol={pendingAddKey.col}
            />
          </div>
        </div>
      )}
      {/* Edit key modal (from grid edit mode) */}
      {editingKey && (
        <div style={modalOverlay} onClick={() => setEditingKey(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <KeyEditor
              keyData={editingKey}
              hosts={hosts}
              onSave={(u) => { updateKey(editingKey.id, u); setEditingKey(null); }}
              onDelete={() => { deleteKey(editingKey.id); setEditingKey(null); }}
              onCancel={() => setEditingKey(null)}
              upload={upload}
            />
          </div>
        </div>
      )}

      {/* Edit page modal (from grid edit mode footer) */}
      {editingPage && (
        <div style={modalOverlay} onClick={() => setEditingPage(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <PageForm
              form={pageForm}
              setForm={setPageForm}
              onSave={savePage}
              onCancel={() => setEditingPage(null)}
              bgUploading={bgUploading}
              handleBgUpload={handleBgUpload}
              hosts={hosts}
            />
          </div>
        </div>
      )}

      {/* Dim overlay — always rendered, fades in/out */}
      {!isRestricted && (
        <div
          style={{
            ...dimOverlay,
            background: `rgba(0,0,0,${config?.screensaverOpacity ?? 1})`,
            opacity: previewSs || (view === 'deck' && dimmed) ? 1 : 0,
            pointerEvents: previewSs || (view === 'deck' && dimmed) ? 'auto' : 'none',
            transition: 'opacity 1.5s ease',
          }}
        >
          <Screensaver
            mode={config?.screensaver || 'clock'}
            timeStr={timeStr}
            pages={pages}
            hosts={hosts}
            hostStatus={hostStatus}
          />
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  padding: '12px 24px', fontSize: '1rem', background: '#2a2a2a', color: '#eee',
  border: '1px solid #444', borderRadius: 8, cursor: 'pointer',
};

const dimOverlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: '#000', zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

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

const pinOverlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.85)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const pinBox = {
  background: '#1a1a1a', padding: '32px 40px', borderRadius: 16,
  textAlign: 'center', border: '1px solid #2a2a2a',
};

const pinInput = {
  width: 180, padding: '12px 16px', background: '#222', border: '1px solid #444',
  borderRadius: 8, color: '#eee', fontSize: '1.5rem',
  textAlign: 'center', outline: 'none', letterSpacing: '0.3em',
};
