import React, { useState, useEffect } from 'react';

const ACTION_DEFAULTS = {
  open_app: { name: '' },
  shell: { command: '' },
  hotkey: { keys: [] },
  weather: { location: '' },
  clipboard: { text: '' },
  volume: { level: 50 },
  lock: {},
  timer: { duration: 300 },
  macro: { actions: [] },
  navigate: { target: 'home', pageName: '', pageIndex: 0 },
  media: { command: 'playpause' },
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

export default function PageManager({ pages, hosts, addPage, updatePage, deletePage, addKey, deleteKey, onEditKey, upload, onAddKeyAt }) {
  const [editPage, setEditPage] = useState(null);
  const [form, setForm] = useState({ name: '', cols: 5, rows: 3, iconSize: 64 });
  const [addingKey, setAddingKey] = useState(null);
  const [addKeyPos, setAddKeyPos] = useState(null);
  const [bgUploading, setBgUploading] = useState(false);

  const startAdd = () => {
    setEditPage('new');
    setForm({ name: '', cols: 5, rows: 3, iconSize: 64 });
  };

  const startEdit = (p) => {
    setEditPage(p.id);
    setForm({ name: p.name, cols: p.cols, rows: p.rows, iconSize: p.iconSize || 64, backgroundImage: p.backgroundImage || '' });
  };

  const startAddKey = (pageId, row, col) => {
    setAddingKey(pageId);
    setAddKeyPos(row !== undefined ? { row, col } : null);
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const res = await upload(file);
      if (res.url) setForm({ ...form, backgroundImage: res.url });
    } catch {}
    setBgUploading(false);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editPage === 'new') {
      addPage(form);
    } else {
      updatePage(editPage, form);
    }
    setEditPage(null);
  };

  // Key grid preview for a page
  const renderPagePreview = (page) => {
    const cols = page.cols || 5;
    const rows = page.rows || 3;
    const keyMap = {};
    for (const k of (page.keys || [])) keyMap[`${k.row}:${k.col}`] = k;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>{page.name}</strong>
          <button style={styles.smallBtn} onClick={() => deletePage(page.id)}>🗑️</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, marginBottom: 4 }}>
          {Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const k = keyMap[`${r}:${c}`];
            return (
              <div
                key={i}
                style={{
                  ...styles.cell,
                  background: k ? '#2a2a2a' : '#1a1a1a',
                  cursor: k ? 'pointer' : 'pointer',
                }}
                onClick={() => {
                  if (k) onEditKey(page.id, k);
                  else startAddKey(page.id, r, c);
                }}
              >
                {k ? (
                  <span style={{ fontSize: '0.8rem' }}>{k.symbol || '?'}</span>
                ) : (
                  <span style={{ color: '#555', fontSize: '0.8rem' }}>+</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button style={styles.addKeyBtn} onClick={() => startEdit(page)}>✏️ Edit Page</button>
          <button style={styles.addKeyBtn} onClick={() => startAddKey(page.id)}>+ Add Key</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.h3}>Pages</h3>
        {!editPage && (
          <button style={styles.addBtn} onClick={startAdd}>+ Add Page</button>
        )}
      </div>

      {editPage && (
        <div style={modalOverlay} onClick={() => setEditPage(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <PageForm form={form} setForm={setForm} onSave={save} onCancel={() => setEditPage(null)} bgUploading={bgUploading} handleBgUpload={handleBgUpload} hosts={hosts} />
          </div>
        </div>
      )}

      {pages.map((p) => (
        <div key={p.id} style={styles.pageCard}>
          {renderPagePreview(p)}
        </div>
      ))}

      {pages.length === 0 && !editPage && (
        <p style={{ color: '#555', textAlign: 'center', marginTop: 32 }}>
          No pages yet. Create your first stream deck page.
        </p>
      )}

      {addingKey && (
        <div style={modalOverlay} onClick={() => { setAddingKey(null); setAddKeyPos(null); }}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <AddKeyForm
              pageId={addingKey}
              cols={pages.find((p) => p.id === addingKey)?.cols || 5}
              rows={pages.find((p) => p.id === addingKey)?.rows || 3}
              existingKeys={pages.find((p) => p.id === addingKey)?.keys || []}
              addKey={addKey}
              onDone={() => { setAddingKey(null); setAddKeyPos(null); }}
              hosts={hosts}
              upload={upload}
              initialRow={addKeyPos?.row}
              initialCol={addKeyPos?.col}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PageForm({ form, setForm, onSave, onCancel, bgUploading, handleBgUpload, hosts }) {
  return (
    <div style={styles.form}>
      <input style={styles.input} placeholder="Page name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div>
          <label style={styles.label}>Columns</label>
          <input style={{ ...styles.input, width: 70 }} type="number" min={1} max={8} value={form.cols} onChange={(e) => setForm({ ...form, cols: Math.max(1, Math.min(8, parseInt(e.target.value) || 1)) })} />
        </div>
        <div>
          <label style={styles.label}>Rows</label>
          <input style={{ ...styles.input, width: 70 }} type="number" min={1} max={6} value={form.rows} onChange={(e) => setForm({ ...form, rows: Math.max(1, Math.min(6, parseInt(e.target.value) || 1)) })} />
        </div>
        <div>
          <label style={styles.label}>Icon Size</label>
          <input style={{ ...styles.input, width: 70 }} type="number" min={32} max={128} value={form.iconSize || 64} onChange={(e) => setForm({ ...form, iconSize: Math.max(32, Math.min(128, parseInt(e.target.value) || 64)) })} />
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Pinned Host (optional)</label>
        <select style={styles.input} value={form.hostId || ''} onChange={(e) => setForm({ ...form, hostId: e.target.value || '' })}>
          <option value="">-- No host (free per-key) --</option>
          {hosts.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <div style={styles.hint}>
          If set, the page only shows when this host is online and all keys run on it.
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Background Image (optional)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept="image/*" onChange={handleBgUpload} style={{ color: '#aaa', fontSize: '0.8rem', flex: 1 }} />
          {bgUploading && <span style={{ color: '#888', fontSize: '0.8rem' }}>uploading…</span>}
          {form.backgroundImage && <img src={form.backgroundImage} alt="" style={{ width: 48, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
        </div>
        {form.backgroundImage && (
          <button style={{ ...styles.smallBtn, marginTop: 4 }} onClick={() => setForm({ ...form, backgroundImage: '' })}>Remove background</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={styles.saveBtn} onClick={onSave}>Save</button>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function AddKeyForm({ pageId, cols, rows, existingKeys, addKey, onDone, hosts, upload, initialRow, initialCol }) {
  const initSlot = () => {
    if (initialRow !== undefined && initialCol !== undefined) return { row: initialRow, col: initialCol };
    const taken = new Set();
    for (const k of existingKeys || []) taken.add(`${k.row}:${k.col}`);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (!taken.has(`${r}:${c}`)) return { row: r, col: c };
    return { row: 0, col: 0 };
  };
  const slot = initSlot();
  const [keyForm, setKeyForm] = useState({ row: slot.row, col: slot.col, symbol: '', name: '', hostId: hosts[0]?.id || '', icon: '', bgColor: '', action: { type: 'open_app', payload: { name: '' } } });
  const [appName, setAppName] = useState('');
  const [shellCmd, setShellCmd] = useState('');
  const [hotkeyStr, setHotkeyStr] = useState('');
  const [weatherLoc, setWeatherLoc] = useState('');
  const [clipText, setClipText] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(50);
  const [timerDuration, setTimerDuration] = useState(300);
  const [macroActs, setMacroActs] = useState([]);
  const [navigateTarget, setNavigateTarget] = useState('home');
  const [navigatePageName, setNavigatePageName] = useState('');
  const [navigatePageIndex, setNavigatePageIndex] = useState(0);
  const [mediaCmd, setMediaCmd] = useState('playpause');
  const [uploading, setUploading] = useState(false);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);

  const changeType = (type) => {
    const payload = { ...(ACTION_DEFAULTS[type] || {}) };
    if (type === 'macro') payload.actions = [];
    setKeyForm({ ...keyForm, action: { type, payload } });
    setAppName('');
    setShellCmd('');
    setHotkeyStr('');
    setWeatherLoc('');
    setClipText('');
    setVolumeLevel(50);
    setTimerDuration(300);
    setMacroActs(payload.actions || []);
    setNavigateTarget(payload.target || 'home');
    setNavigatePageName(payload.pageName || '');
    setNavigatePageIndex(payload.pageIndex ?? 0);
    setMediaCmd(payload.command || 'playpause');
  };

  useEffect(() => {
    if (keyForm.action.type !== 'open_app' || !keyForm.hostId) { setApps([]); return; }
    setAppsLoading(true);
    fetch(`/api/list-apps/${keyForm.hostId}`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.data?.apps) setApps(d.data.apps); setAppsLoading(false); })
      .catch(() => setAppsLoading(false));
  }, [keyForm.hostId, keyForm.action.type]);

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await upload(file);
      if (res.url) setKeyForm({ ...keyForm, icon: res.url });
    } catch {}
    setUploading(false);
  };

  const buildPayload = () => {
    switch (keyForm.action.type) {
      case 'open_app': return { name: appName };
      case 'shell': return { command: shellCmd };
      case 'hotkey': return { keys: hotkeyStr.split(/\+|,|\s+/).map((s) => s.trim()).filter(Boolean) };
      case 'weather': return { location: weatherLoc };
      case 'clipboard': return { text: clipText };
      case 'volume': return { level: volumeLevel };
      case 'lock': return {};
      case 'timer': return { duration: timerDuration };
      case 'macro': return { actions: macroActs };
      case 'navigate': return { target: navigateTarget, pageName: navigatePageName, pageIndex: navigatePageIndex };
      case 'media': return { command: mediaCmd };
      default: return {};
    }
  };

  const save = () => {
    addKey(pageId, { ...keyForm, action: { ...keyForm.action, payload: buildPayload() } });
    onDone();
  };

  return (
    <div style={styles.addKeyForm}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <label style={styles.label}>Row (0-{rows - 1})</label>
        <label style={styles.label}>Col (0-{cols - 1})</label>
        <input style={styles.input} type="number" min={0} max={rows - 1} value={keyForm.row} onChange={(e) => setKeyForm({ ...keyForm, row: parseInt(e.target.value) || 0 })} />
        <input style={styles.input} type="number" min={0} max={cols - 1} value={keyForm.col} onChange={(e) => setKeyForm({ ...keyForm, col: parseInt(e.target.value) || 0 })} />
      </div>

      <input style={styles.input} placeholder="Symbol (emoji)" value={keyForm.symbol} onChange={(e) => setKeyForm({ ...keyForm, symbol: e.target.value })} />

      <label style={styles.label}>Icon Image (optional)</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="image/*" onChange={handleIconUpload} style={{ color: '#aaa', fontSize: '0.8rem', flex: 1 }} />
        {uploading && <span style={{ color: '#888', fontSize: '0.8rem' }}>uploading…</span>}
        {keyForm.icon && <img src={keyForm.icon} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />}
      </div>
      {keyForm.icon && (
        <button style={{ ...styles.smallBtn, alignSelf: 'flex-start' }} onClick={() => setKeyForm({ ...keyForm, icon: '' })}>Remove icon</button>
      )}

      <input style={styles.input} placeholder="Label" value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} />

      <div>
        <label style={styles.label}>Icon Background Color</label>
        <input type="color" style={styles.colorInput} value={keyForm.bgColor || '#2a2a2a'} onChange={(e) => setKeyForm({ ...keyForm, bgColor: e.target.value })} />
      </div>

      <select style={styles.input} value={keyForm.hostId} onChange={(e) => setKeyForm({ ...keyForm, hostId: e.target.value })}>
        <option value="">-- No host --</option>
        {hosts.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>

      <label style={styles.label}>Action</label>
      <select style={styles.input} value={keyForm.action.type} onChange={(e) => changeType(e.target.value)}>
        <option value="open_app">Open Application</option>
        <option value="shell">Run Command</option>
        <option value="hotkey">Send Hotkey</option>
        <option value="weather">Weather Display</option>
        <option value="clipboard">Copy to Clipboard</option>
        <option value="volume">Set Volume</option>
        <option value="lock">Lock Screen</option>
        <option value="timer">Timer</option>
        <option value="macro">Macro (Sequence)</option>
        <option value="navigate">Navigate Page</option>
        <option value="media">Music Control</option>
      </select>

      {keyForm.action.type === 'open_app' && (
        <div>
          <input style={styles.input} placeholder="App name or path" value={appName} onChange={(e) => setAppName(e.target.value)} />
          {appsLoading && <div style={{ color: '#555', fontSize: '0.75rem' }}>Loading…</div>}
          {apps.length > 0 && (
            <select style={{ ...styles.input, marginTop: 4 }} value={appName} onChange={(e) => setAppName(e.target.value)}>
              <option value="">-- Select app --</option>
              {apps.map((a, i) => <option key={i} value={a.name}>{a.name}</option>)}
            </select>
          )}
        </div>
      )}
      {keyForm.action.type === 'shell' && (
        <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} placeholder="echo hello" value={shellCmd} onChange={(e) => setShellCmd(e.target.value)} />
      )}
      {keyForm.action.type === 'hotkey' && (
        <input style={styles.input} placeholder="e.g. cmd + shift + c" value={hotkeyStr} onChange={(e) => setHotkeyStr(e.target.value)} />
      )}
      {keyForm.action.type === 'weather' && (
        <input style={styles.input} placeholder="e.g. London" value={weatherLoc} onChange={(e) => setWeatherLoc(e.target.value)} />
      )}
      {keyForm.action.type === 'clipboard' && (
        <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} placeholder="Text to copy" value={clipText} onChange={(e) => setClipText(e.target.value)} />
      )}
      {keyForm.action.type === 'volume' && (
        <div>
          <label style={styles.label}>Level: {volumeLevel}%</label>
          <input type="range" min={0} max={100} style={{ width: '100%' }} value={volumeLevel} onChange={(e) => setVolumeLevel(parseInt(e.target.value))} />
        </div>
      )}
      {keyForm.action.type === 'lock' && (
        <p style={{ color: '#555', fontSize: '0.8rem' }}>Locks the remote screen. No config needed.</p>
      )}
      {keyForm.action.type === 'timer' && (
        <div>
          <label style={styles.label}>Duration: {Math.floor(timerDuration / 60)}:{String(timerDuration % 60).padStart(2, '0')}</label>
          <input type="range" min={5} max={3600} step={5} style={{ width: '100%' }} value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value))} />
        </div>
      )}

      {keyForm.action.type === 'macro' && (
        <div>
          <label style={styles.label}>Actions ({macroActs.length})</label>
          {macroActs.map((act, i) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 6, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: '#666', fontSize: '0.75rem', minWidth: 20 }}>{i + 1}.</span>
                <select style={{ ...styles.input, flex: 1 }} value={act.type} onChange={(e) => {
                  const n = [...macroActs];
                  n[i] = { type: e.target.value, payload: { ...(ACTION_DEFAULTS[e.target.value] || {}) } };
                  setMacroActs(n);
                }}>
                  <option value="open_app">Open App</option>
                  <option value="shell">Run Command</option>
                  <option value="hotkey">Hotkey</option>
                  <option value="clipboard">Clipboard</option>
                  <option value="volume">Volume</option>
                  <option value="lock">Lock</option>
                </select>
                <button style={{ ...styles.smallBtn, color: '#a55' }} onClick={() => setMacroActs(macroActs.filter((_, j) => j !== i))}>✕</button>
              </div>
              {act.type === 'open_app' && <input style={styles.input} placeholder="App name" value={act.payload.name || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.name = e.target.value; setMacroActs(n); }} />}
              {act.type === 'shell' && <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 50, resize: 'vertical' }} placeholder="echo hello" value={act.payload.command || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.command = e.target.value; setMacroActs(n); }} />}
              {act.type === 'hotkey' && <input style={styles.input} placeholder="cmd + shift + c" value={(act.payload.keys || []).join(' + ')} onChange={(e) => { const n = [...macroActs]; n[i].payload.keys = e.target.value.split(/\+|,|\s+/).map((s) => s.trim()).filter(Boolean); setMacroActs(n); }} />}
              {act.type === 'clipboard' && <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 40, resize: 'vertical' }} placeholder="Text to copy" value={act.payload.text || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.text = e.target.value; setMacroActs(n); }} />}
              {act.type === 'volume' && (
                <div>
                  <label style={styles.label}>Level: {act.payload.level ?? 50}%</label>
                  <input type="range" min={0} max={100} style={{ width: '100%' }} value={act.payload.level ?? 50} onChange={(e) => { const n = [...macroActs]; n[i].payload.level = parseInt(e.target.value); setMacroActs(n); }} />
                </div>
              )}
              {act.type === 'lock' && <p style={{ color: '#555', fontSize: '0.75rem' }}>Locks screen.</p>}
            </div>
          ))}
          <button style={{ ...styles.smallBtn, color: '#5a9', fontSize: '0.85rem' }} onClick={() => setMacroActs([...macroActs, { type: 'open_app', payload: { name: '' } }])}>+ Add Action</button>
        </div>
      )}

      {keyForm.action.type === 'navigate' && (
        <div>
          <select style={styles.input} value={navigateTarget} onChange={(e) => setNavigateTarget(e.target.value)}>
            <option value="home">Home (first page)</option>
            <option value="next">Next Page</option>
            <option value="prev">Previous Page</option>
            <option value="index">Page by number</option>
            <option value="name">Page by name</option>
          </select>
          {navigateTarget === 'name' && (
            <input style={{ ...styles.input, marginTop: 4 }} placeholder="Page name" value={navigatePageName} onChange={(e) => setNavigatePageName(e.target.value)} />
          )}
          {navigateTarget === 'index' && (
            <input style={{ ...styles.input, marginTop: 4 }} type="number" min={0} placeholder="Page index" value={navigatePageIndex} onChange={(e) => setNavigatePageIndex(parseInt(e.target.value) || 0)} />
          )}
        </div>
      )}

      {keyForm.action.type === 'media' && (
        <select style={styles.input} value={mediaCmd} onChange={(e) => setMediaCmd(e.target.value)}>
          <option value="playpause">Play / Pause</option>
          <option value="next">Next Track</option>
          <option value="prev">Previous Track</option>
        </select>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={styles.saveBtn} onClick={save}>Add</button>
        <button style={styles.cancelBtn} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h3: { fontSize: '1rem', fontWeight: 600 },
  addBtn: { padding: '6px 14px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, padding: 12, background: '#1a1a1a', borderRadius: 8 },
  input: { padding: '8px 12px', background: '#222', border: '1px solid #333', borderRadius: 6, color: '#eee', fontSize: '0.9rem', outline: 'none' },
  field: { marginBottom: 8 },
  label: { color: '#888', fontSize: '0.8rem' },
  saveBtn: { padding: '6px 16px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  cancelBtn: { padding: '6px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' },
  hint: { color: '#555', fontSize: '0.75rem', marginTop: 3, lineHeight: 1.4 },
  pageCard: { background: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 10 },
  cell: {
    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: '1px solid #2a2a2a', fontSize: '0.8rem', minHeight: 36,
  },
  addKeyBtn: { padding: '4px 12px', background: '#2a2a2a', color: '#aaa', border: '1px dashed #444', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' },
  addKeyForm: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#222', borderRadius: 8, marginTop: 8 },
  smallBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 4, color: '#aaa' },
  colorInput: { width: '100%', height: 36, padding: 0, border: '1px solid #333', borderRadius: 6, background: '#222', cursor: 'pointer' },
};
