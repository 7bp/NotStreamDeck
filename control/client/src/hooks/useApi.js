import { useState, useEffect, useCallback, useRef } from 'react';

export function useConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = useCallback((patch) => {
    return fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => r.json());
  }, []);

  return { config, loading, saveConfig, setConfig };
}

export function useHosts() {
  const [hosts, setHosts] = useState([]);

  const fetchHosts = useCallback(() => {
    fetch('/api/hosts').then((r) => r.json()).then(setHosts).catch(() => {});
  }, []);

  useEffect(() => { fetchHosts(); }, [fetchHosts]);

  const addHost = useCallback((h) =>
    fetch('/api/hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(h),
    }).then((r) => r.json()).then((h2) => { setHosts((p) => [...p, h2]); return h2; }),
  []);

  const updateHost = useCallback((id, patch) =>
    fetch(`/api/hosts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => r.json()).then(() => fetchHosts()),
  [fetchHosts]);

  const deleteHost = useCallback((id) =>
    fetch(`/api/hosts/${id}`, { method: 'DELETE' }).then(() =>
      setHosts((p) => p.filter((h) => h.id !== id))
    ),
  []);

  return { hosts, addHost, updateHost, deleteHost, setHosts };
}

export function usePages() {
  const [pages, setPages] = useState([]);

  const fetchPages = useCallback(() => {
    fetch('/api/pages').then((r) => r.json()).then(setPages).catch(() => {});
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const addPage = useCallback((p) =>
    fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    }).then((r) => r.json()).then((p2) => { setPages((prev) => [...prev, p2]); return p2; }),
  []);

  const updatePage = useCallback((id, patch) =>
    fetch(`/api/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(() => fetchPages()),
  [fetchPages]);

  const deletePage = useCallback((id) =>
    fetch(`/api/pages/${id}`, { method: 'DELETE' }).then(() =>
      setPages((p) => p.filter((pg) => pg.id !== id))
    ),
  []);

  const addKey = useCallback((pageId, key) =>
    fetch(`/api/pages/${pageId}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(key),
    }).then((r) => r.json()).then((k) => { fetchPages(); return k; }),
  [fetchPages]);

  const updateKey = useCallback((keyId, patch) =>
    fetch(`/api/keys/${keyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(() => fetchPages()),
  [fetchPages]);

  const deleteKey = useCallback((keyId) =>
    fetch(`/api/keys/${keyId}`, { method: 'DELETE' }).then(() => fetchPages()),
  [fetchPages]);

  return { pages, addPage, updatePage, deletePage, addKey, updateKey, deleteKey, setPages };
}

export function useMyIP() {
  const [ip, setIP] = useState(null);
  useEffect(() => {
    fetch('/api/myip').then((r) => r.json()).then((d) => setIP(d.ip)).catch(() => {});
  }, []);
  return ip;
}

export function useUpload() {
  const upload = useCallback((file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch('/api/upload', { method: 'POST', body: fd }).then((r) => r.json());
  }, []);
  return { upload };
}

export function useExecute() {
  const execute = useCallback((keyId) =>
    fetch(`/api/execute/${keyId}`, { method: 'POST' }).then((r) => r.json()),
  []);
  return { execute };
}

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        onMessageRef.current?.(msg);
      } catch {}
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current === ws) {
          window.location.reload();
        }
      }, 3000);
    };

    return () => { ws.close(); wsRef.current = null; };
  }, []);

  return wsRef;
}
