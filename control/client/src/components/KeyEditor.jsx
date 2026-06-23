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

export default function KeyEditor({ keyData, hosts, onSave, onDelete, onCancel, upload }) {
  const [form, setForm] = useState({
    symbol: keyData.symbol || '',
    name: keyData.name || '',
    hostId: keyData.hostId || '',
    icon: keyData.icon || '',
    bgColor: keyData.bgColor || '',
    action: keyData.action || { type: 'open_app', payload: { name: '' } },
  });

  // Guided sub-fields per action type
  const [appName, setAppName] = useState(form.action.payload?.name || '');
  const [shellCmd, setShellCmd] = useState(form.action.payload?.command || '');
  const [hotkeyStr, setHotkeyStr] = useState(
    Array.isArray(form.action.payload?.keys) ? form.action.payload.keys.join(' + ') : ''
  );
  const [weatherLoc, setWeatherLoc] = useState(form.action.payload?.location || '');
  const [clipText, setClipText] = useState(form.action.payload?.text || '');
  const [volumeLevel, setVolumeLevel] = useState(form.action.payload?.level ?? 50);
  const [timerDuration, setTimerDuration] = useState(form.action.payload?.duration ?? 300);
  const [macroActs, setMacroActs] = useState(form.action.payload?.actions || []);
  const [macroMode, setMacroMode] = useState(form.action.payload?.mode || 'serial');
  const [navigateTarget, setNavigateTarget] = useState(form.action.payload?.target || 'home');
  const [navigatePageName, setNavigatePageName] = useState(form.action.payload?.pageName || '');
  const [navigatePageIndex, setNavigatePageIndex] = useState(form.action.payload?.pageIndex ?? 0);
  const [mediaCmd, setMediaCmd] = useState(form.action.payload?.command || 'playpause');
  const [uploading, setUploading] = useState(false);

  // App list for open_app
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);

  useEffect(() => {
    if (form.action.type !== 'open_app' || !form.hostId) { setApps([]); return; }
    setAppsLoading(true);
    fetch(`/api/list-apps/${form.hostId}`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.data?.apps) setApps(d.data.apps); setAppsLoading(false); })
      .catch(() => setAppsLoading(false));
  }, [form.hostId, form.action.type]);

  const changeActionType = (type) => {
    const payload = { ...(ACTION_DEFAULTS[type] || {}) };
    if (type === 'macro') payload.actions = [];
    setForm({ ...form, action: { type, payload } });
    setAppName(payload.name || '');
    setShellCmd(payload.command || '');
    setHotkeyStr('');
    setWeatherLoc(payload.location || '');
    setClipText(payload.text || '');
    setVolumeLevel(payload.level ?? 50);
    setTimerDuration(payload.duration ?? 300);
    setMacroActs(payload.actions || []);
    setNavigateTarget(payload.target || 'home');
    setNavigatePageName(payload.pageName || '');
    setNavigatePageIndex(payload.pageIndex ?? 0);
    setMediaCmd(payload.command || 'playpause');
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await upload(file);
      if (res.url) setForm({ ...form, icon: res.url });
    } catch {}
    setUploading(false);
  };

  const buildPayload = () => {
    switch (form.action.type) {
      case 'open_app':
        return { name: appName };
      case 'shell':
        return { command: shellCmd };
      case 'hotkey': {
        const keys = hotkeyStr
          .split(/\+|,|\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        return { keys };
      }
      case 'weather':
        return { location: weatherLoc };
      case 'clipboard':
        return { text: clipText };
      case 'volume':
        return { level: volumeLevel };
      case 'lock':
        return {};
      case 'timer':
        return { duration: timerDuration };
      case 'macro':
        return { actions: macroActs, mode: macroMode };
      case 'navigate':
        return { target: navigateTarget, pageName: navigatePageName, pageIndex: navigatePageIndex };
      case 'media':
        return { command: mediaCmd };
      default:
        return {};
    }
  };

  const handleSave = () => {
    const payload = buildPayload();
    onSave({ ...form, action: { ...form.action, payload } });
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Edit Key</h3>

      <div style={styles.field}>
        <label style={styles.label}>Symbol (emoji)</label>
        <input
          style={styles.input}
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          placeholder="🎮"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Icon Image (optional)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept="image/*" onChange={handleIconUpload} style={{ color: '#aaa', fontSize: '0.8rem', flex: 1 }} />
          {uploading && <span style={{ color: '#888', fontSize: '0.8rem' }}>uploading…</span>}
          {form.icon && <img src={form.icon} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />}
        </div>
        {form.icon && (
          <button style={{ ...styles.smallBtn, marginTop: 4 }} onClick={() => setForm({ ...form, icon: '' })}>Remove icon</button>
        )}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Label</label>
        <input
          style={styles.input}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Launch Game"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Icon Background Color</label>
        <input type="color" style={styles.colorInput} value={form.bgColor || '#2a2a2a'} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Host</label>
        <select
          style={styles.input}
          value={form.hostId}
          onChange={(e) => setForm({ ...form, hostId: e.target.value })}
        >
          <option value="">-- No host --</option>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.status === 'online' ? 'online' : 'offline'})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Action Type</label>
        <select
          style={styles.input}
          value={form.action.type}
          onChange={(e) => changeActionType(e.target.value)}
        >
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
      </div>

      {/* Guided fields per type */}
      {form.action.type === 'open_app' && (
        <div style={styles.field}>
          <label style={styles.label}>Application</label>
          <input
            style={styles.input}
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. Safari, /Applications/Spotify.app"
          />
          {appsLoading && <div style={styles.hint}>Loading app list…</div>}
          {apps.length > 0 && (
            <select style={{ ...styles.input, marginTop: 6 }} value={appName} onChange={(e) => setAppName(e.target.value)}>
              <option value="">-- Select from installed apps --</option>
              {apps.map((a, i) => (
                <option key={i} value={a.name}>{a.name}</option>
              ))}
            </select>
          )}
          <div style={styles.hint}>
            Name or full path of the application to open on the target machine.
          </div>
        </div>
      )}

      {form.action.type === 'shell' && (
        <div style={styles.field}>
          <label style={styles.label}>Command</label>
          <textarea
            style={{ ...styles.input, fontFamily: 'monospace', fontSize: '0.85rem', minHeight: 80, resize: 'vertical' }}
            value={shellCmd}
            onChange={(e) => setShellCmd(e.target.value)}
            placeholder="echo hello"
          />
          <div style={styles.hint}>Shell command to execute on the target machine.</div>
        </div>
      )}

      {form.action.type === 'hotkey' && (
        <div style={styles.field}>
          <label style={styles.label}>Keys</label>
          <input
            style={styles.input}
            value={hotkeyStr}
            onChange={(e) => setHotkeyStr(e.target.value)}
            placeholder="e.g. cmd + shift + c"
          />
          <div style={styles.hint}>
            Use <strong>+</strong> between keys. Modifiers: cmd, shift, ctrl, option.
          </div>
        </div>
      )}

      {form.action.type === 'weather' && (
        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input
            style={styles.input}
            value={weatherLoc}
            onChange={(e) => setWeatherLoc(e.target.value)}
            placeholder="e.g. London, New York, Tokyo"
          />
          <div style={styles.hint}>Shows current temperature. Tapping does nothing.</div>
        </div>
      )}

      {form.action.type === 'clipboard' && (
        <div style={styles.field}>
          <label style={styles.label}>Text to Copy</label>
          <textarea
            style={{ ...styles.input, fontFamily: 'monospace', fontSize: '0.85rem', minHeight: 60, resize: 'vertical' }}
            value={clipText}
            onChange={(e) => setClipText(e.target.value)}
            placeholder="Text to copy to the remote clipboard"
          />
          <div style={styles.hint}>Copied text will be available to paste on the target machine.</div>
        </div>
      )}

      {form.action.type === 'volume' && (
        <div style={styles.field}>
          <label style={styles.label}>Volume Level: {volumeLevel}%</label>
          <input
            type="range" min={0} max={100}
            style={{ width: '100%' }}
            value={volumeLevel}
            onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
          />
          <div style={styles.hint}>Sets the system volume on the target machine.</div>
        </div>
      )}

      {form.action.type === 'lock' && (
        <div style={styles.field}>
          <div style={styles.hint}>Locks the screen on the target machine. No additional configuration needed.</div>
        </div>
      )}

      {form.action.type === 'timer' && (
        <div style={styles.field}>
          <label style={styles.label}>Duration: {Math.floor(timerDuration / 60)}:{String(timerDuration % 60).padStart(2, '0')}</label>
          <input
            type="range" min={5} max={3600} step={5}
            style={{ width: '100%' }}
            value={timerDuration}
            onChange={(e) => setTimerDuration(parseInt(e.target.value))}
          />
          <div style={styles.hint}>Countdown timer. Tap to start/pause on the deck. Does not execute on the remote machine.</div>
        </div>
      )}

      {form.action.type === 'macro' && (
        <div style={styles.field}>
          <label style={styles.label}>Actions ({macroActs.length})</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Mode:</span>
            <button style={{ ...styles.smallBtn, background: macroMode === 'serial' ? 'rgba(40,180,80,0.2)' : 'transparent', color: macroMode === 'serial' ? '#5d9' : '#888' }} onClick={() => setMacroMode('serial')}>Serial</button>
            <button style={{ ...styles.smallBtn, background: macroMode === 'parallel' ? 'rgba(40,180,80,0.2)' : 'transparent', color: macroMode === 'parallel' ? '#5d9' : '#888' }} onClick={() => setMacroMode('parallel')}>Parallel</button>
          </div>
          {macroActs.map((act, i) => (
            <div key={i} style={{ background: '#222', borderRadius: 6, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: '#666', fontSize: '0.75rem', minWidth: 20 }}>{i + 1}.</span>
                <select style={{ ...styles.input, flex: 1 }} value={act.type} onChange={(e) => {
                  const n = [...macroActs];
                  n[i] = { type: e.target.value, payload: { ...(ACTION_DEFAULTS[e.target.value] || {}) }, hostId: act.hostId || '' };
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
              <select style={{ ...styles.input, marginBottom: 6 }} value={act.hostId || ''} onChange={(e) => { const n = [...macroActs]; n[i].hostId = e.target.value; setMacroActs(n); }}>
                <option value="">— Key's default host —</option>
                {(hosts || []).filter((h) => h.id).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {act.type === 'open_app' && <input style={styles.input} placeholder="App name or path" value={act.payload.name || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.name = e.target.value; setMacroActs(n); }} />}
              {act.type === 'shell' && <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 50, resize: 'vertical' }} placeholder="echo hello" value={act.payload.command || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.command = e.target.value; setMacroActs(n); }} />}
              {act.type === 'hotkey' && <input style={styles.input} placeholder="cmd + shift + c" value={(act.payload.keys || []).join(' + ')} onChange={(e) => { const n = [...macroActs]; n[i].payload.keys = e.target.value.split(/\+|,|\s+/).map((s) => s.trim()).filter(Boolean); setMacroActs(n); }} />}
              {act.type === 'clipboard' && <textarea style={{ ...styles.input, fontFamily: 'monospace', minHeight: 40, resize: 'vertical' }} placeholder="Text to copy" value={act.payload.text || ''} onChange={(e) => { const n = [...macroActs]; n[i].payload.text = e.target.value; setMacroActs(n); }} />}
              {act.type === 'volume' && (
                <div>
                  <label style={styles.label}>Level: {act.payload.level ?? 50}%</label>
                  <input type="range" min={0} max={100} style={{ width: '100%' }} value={act.payload.level ?? 50} onChange={(e) => { const n = [...macroActs]; n[i].payload.level = parseInt(e.target.value); setMacroActs(n); }} />
                </div>
              )}
              {act.type === 'lock' && <p style={{ color: '#555', fontSize: '0.75rem' }}>Locks screen — no config needed.</p>}
            </div>
          ))}
          <button style={{ ...styles.smallBtn, color: '#5a9', fontSize: '0.85rem' }} onClick={() => setMacroActs([...macroActs, { type: 'open_app', payload: { name: '' }, hostId: '' }])}>+ Add Action</button>
        </div>
      )}

      {form.action.type === 'navigate' && (
        <div style={styles.field}>
          <label style={styles.label}>Target</label>
          <select style={styles.input} value={navigateTarget} onChange={(e) => setNavigateTarget(e.target.value)}>
            <option value="home">Home (first page)</option>
            <option value="next">Next Page</option>
            <option value="prev">Previous Page</option>
            <option value="index">Page by number</option>
            <option value="name">Page by name</option>
          </select>
          {navigateTarget === 'name' && (
            <div style={{ marginTop: 6 }}>
              <input style={styles.input} placeholder="Page name" value={navigatePageName} onChange={(e) => setNavigatePageName(e.target.value)} />
            </div>
          )}
          {navigateTarget === 'index' && (
            <div style={{ marginTop: 6 }}>
              <input style={styles.input} type="number" min={0} placeholder="Page index (0 = first)" value={navigatePageIndex} onChange={(e) => setNavigatePageIndex(parseInt(e.target.value) || 0)} />
            </div>
          )}
          <div style={styles.hint}>Navigates the deck view — no remote action is sent.</div>
        </div>
      )}

      {form.action.type === 'media' && (
        <div style={styles.field}>
          <label style={styles.label}>Command</label>
          <select style={styles.input} value={mediaCmd} onChange={(e) => setMediaCmd(e.target.value)}>
            <option value="playpause">Play / Pause</option>
            <option value="next">Next Track</option>
            <option value="prev">Previous Track</option>
          </select>
          <div style={styles.hint}>Controls media playback on the target machine.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button style={styles.saveBtn} onClick={handleSave}>Save</button>
        {onDelete && <button style={styles.deleteBtn} onClick={onDelete}>Delete</button>}
        <button style={styles.cancelBtn} onClick={onCancel}>Back</button>
      </div>
    </div>
  );
}

const styles = {
  field: { marginBottom: 14 },
  label: { display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: 4 },
  hint: { color: '#555', fontSize: '0.75rem', marginTop: 3, lineHeight: 1.4 },
  input: {
    width: '100%',
    padding: '9px 12px',
    background: '#222',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#eee',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  saveBtn: { padding: '8px 20px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  deleteBtn: { padding: '8px 20px', background: '#a33', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  cancelBtn: { padding: '8px 20px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  smallBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 4, color: '#aaa' },
  colorInput: { width: '100%', height: 36, padding: 0, border: '1px solid #333', borderRadius: 6, background: '#222', cursor: 'pointer' },
};
