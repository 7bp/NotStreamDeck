import React, { useState } from 'react';

export default function HostManager({ hosts, addHost, updateHost, deleteHost, serverVersion }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', deviceId: '' });

  const startAdd = () => {
    setEditing('new');
    setForm({ name: '', deviceId: '' });
  };

  const startEdit = (host) => {
    setEditing(host.id);
    setForm({ name: host.name, deviceId: host.deviceId });
  };

  const save = () => {
    if (!form.name.trim() || !form.deviceId.trim()) return;
    if (editing === 'new') {
      addHost(form);
    } else {
      updateHost(editing, form);
    }
    setEditing(null);
  };

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.h3}>Hosts</h3>
        {!editing && (
          <button style={styles.addBtn} onClick={startAdd}>+ Add Host</button>
        )}
      </div>

      {editing && (
        <div style={styles.form}>
          <input style={styles.input} placeholder="Name (e.g. Gaming PC)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Device ID (from agent's config)" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.saveBtn} onClick={save}>Save</button>
            <button style={styles.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {hosts.map((h) => {
        const isOutdated = serverVersion && h.version && h.version !== serverVersion;
        return (
        <div key={h.id} style={styles.row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {h.name}
              {isOutdated && <span style={{ marginLeft: 6, color: '#e80', fontSize: '0.75rem' }}>❗ Outdated</span>}
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>{h.deviceId}</div>
            {h.version && <div style={{ color: '#666', fontSize: '0.75rem' }}>v{h.version}</div>}
          </div>
          <span style={{ ...styles.badge, background: h.status === 'online' ? '#2a6' : '#555' }}>
            {h.status === 'online' ? 'ONLINE' : 'OFFLINE'}
          </span>
          {editing !== h.id && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
              <button style={styles.smallBtn} onClick={() => startEdit(h)}>✏️</button>
              <button style={styles.smallBtn} onClick={() => deleteHost(h.id)}>🗑️</button>
            </div>
          )}
        </div>
        );
      })}

      {hosts.length === 0 && !editing && (
        <p style={{ color: '#555', textAlign: 'center', marginTop: 32 }}>
          No hosts yet. Add the machines your agents run on.
        </p>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h3: { fontSize: '1rem', fontWeight: 600 },
  addBtn: { padding: '6px 14px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, padding: 12, background: '#1a1a1a', borderRadius: 8 },
  input: { padding: '8px 12px', background: '#222', border: '1px solid #333', borderRadius: 6, color: '#eee', fontSize: '0.9rem', outline: 'none' },
  saveBtn: { padding: '6px 16px', background: '#2a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  cancelBtn: { padding: '6px 16px', background: '#333', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, marginBottom: 8 },
  badge: { padding: '2px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, color: '#fff' },
  smallBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 4 },
};
