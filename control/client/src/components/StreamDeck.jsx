import React, { useState, useEffect, useRef } from 'react';
import KeyButton from './KeyButton.jsx';

function WeatherKey({ actionPayload, iconSize, bgColor }) {
  const [temp, setTemp] = useState('--');
  const loc = actionPayload?.location || 'London';
  useEffect(() => {
    let cancelled = false;
    const fetchWeather = () => {
      fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`).then((r) => r.json()).then((d) => {
        if (cancelled) return;
        const cc = d.current_condition?.[0];
        if (cc) setTemp(`${cc.temp_C}°`);
      }).catch(() => {});
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 300000);
    return () => { cancelled = true; clearInterval(id); };
  }, [loc]);
  const size = iconSize || 64;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: size, height: size, borderRadius: '22%', background: bgColor || '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
        <span style={{ fontSize: 'clamp(1rem, 3vw, 1.6rem)', color: '#aaa' }}>{temp}</span>
      </div>
      <span style={{ fontSize: 'clamp(0.45rem, 1.2vw, 0.65rem)', color: '#fff', textAlign: 'center', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80, textShadow: '0 1px 3px rgba(0,0,0,0.7)', pointerEvents: 'none' }}>{loc}</span>
    </div>
  );
}

function TimerKey({ actionPayload, iconSize, bgColor, disabled }) {
  const duration = actionPayload?.duration || 300;
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const size = iconSize || 64;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { setRunning(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => { if (!disabled) setRunning((r) => !r); };
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;
  const done = remaining === 0;

  return (
    <div onClick={toggle} style={{ cursor: disabled ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <div style={{ width: size, height: size, borderRadius: '22%', background: done ? '#2a2020' : (bgColor || '#2a2a2a'), display: 'flex', alignItems: 'center', justifyContent: 'center', border: done ? '2px solid #a33' : 'none' }}>
        <span style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1.4rem)', color: done ? '#a55' : '#aaa', fontVariantNumeric: 'tabular-nums' }}>{done ? '✓' : display}</span>
      </div>
      <span style={{ fontSize: 'clamp(0.4rem, 1vw, 0.55rem)', color: '#fff', textAlign: 'center', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80, textShadow: '0 1px 3px rgba(0,0,0,0.7)', pointerEvents: 'none' }}>{running ? 'tap to pause' : done ? 'done' : 'tap to start'}</span>
    </div>
  );
}

function GridPage({ page, hostOnline, pinnedHostId, pinnedHostOnline, pinnedHostName, cols, rows, iconSize, editMode, onAddKey, onEditKey, onExecute, onNavigate, hosts, hostStatus, serverVersion }) {
  const keyMap = {};
  for (const k of (page.keys || [])) keyMap[`${k.row}:${k.col}`] = k;

  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ row: r, col: c, key: keyMap[`${r}:${c}`] || null });

  if (pinnedHostId && !pinnedHostOnline) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: '2rem', marginBottom: 4 }}>💤</span>
        <span style={{ color: '#666', fontSize: '1.1rem' }}>{pinnedHostName} is offline</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, flex: 1, alignContent: 'center', justifyItems: 'center', alignItems: 'center' }}>
      {cells.map(({ row, col, key }) => {
        const effectiveHostId = pinnedHostId || key?.hostId;
        return (
          <div key={`${row}-${col}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {key ? (['weather', 'timer', 'navigate'].includes(key.action?.type) ? (
              <div onClick={editMode ? () => onEditKey?.(key) : undefined} style={editMode ? { cursor: 'pointer' } : undefined}>
                {key.action.type === 'weather' ? (
                  <WeatherKey actionPayload={key.action.payload} iconSize={iconSize} bgColor={key.bgColor} />
                ) : key.action.type === 'timer' ? (
                  <TimerKey actionPayload={key.action.payload} iconSize={iconSize} bgColor={key.bgColor} disabled={editMode} />
                ) : (
                  <KeyButton
                    keyData={key}
                    disabled={false}
                    onExecute={() => editMode ? onEditKey?.(key) : onNavigate?.(key.action.payload)}
                    iconSize={iconSize}
                  />
                )}
              </div>
            ) : (
              <KeyButton
                keyData={key}
                disabled={!editMode && !hostOnline[effectiveHostId]}
                onExecute={() => editMode ? onEditKey?.(key) : onExecute(key.id, pinnedHostId)}
                iconSize={iconSize}
              />
            )) : editMode ? (
              <button style={{
                width: 64, height: 64, borderRadius: '22%', border: '1px dashed rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} onClick={() => onAddKey(page.id, row, col)} title="Add key">
                <span style={{ color: '#555', fontSize: '1.5rem', userSelect: 'none' }}>+</span>
              </button>
            ) : <div style={{ width: iconSize, height: iconSize }} />}
          </div>
        );
      })}
    </div>
  );
}

function isVideo(url) {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export default function StreamDeck({ page, pages, hosts, hostStatus, pageIndex, pageCount, onPrev, onNext, onSetup, onExecute, onAddKey, onEditKey, onEditPage, editMode, timeStr, onNavigate, serverVersion, kioskMode, onExitKiosk }) {
  const swipeStart = useRef(null);
  const prevIdx = useRef(pageIndex);
  const [slideDir, setSlideDir] = useState(null);

  useEffect(() => {
    if (pageIndex > prevIdx.current) setSlideDir('right');
    else if (pageIndex < prevIdx.current) setSlideDir('left');
    prevIdx.current = pageIndex;
    const t = setTimeout(() => setSlideDir(null), 300);
    return () => clearTimeout(t);
  }, [pageIndex]);

  const cols = page.cols || 5;
  const rows = page.rows || 3;
  const iconSize = page.iconSize || 64;

  const hostOnline = {};
  if (hosts) for (const h of hosts) hostOnline[h.id] = hostStatus[h.id]?.status === 'online';

  const onlineHosts = (hosts || []).filter((h) => hostOnline[h.id]);

  const pinnedHostId = page.hostId;
  const pinnedHostOnline = pinnedHostId ? hostOnline[pinnedHostId] : true;
  const pinnedHostName = pinnedHostId ? (hosts || []).find((h) => h.id === pinnedHostId)?.name || 'Host' : null;

  const bgUrl = page.backgroundImage;
  const isBgVideo = isVideo(bgUrl);

  let bgEl = null;
  if (bgUrl) {
    if (isBgVideo) {
      bgEl = (
        <video
          src={bgUrl}
          autoPlay loop muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }}
        />
      );
    } else {
      bgEl = (
        <div style={{
          position: 'absolute', inset: 0, zIndex: -2,
          backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      );
    }
  }

  const onTouchStart = (e) => {
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!swipeStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && pageIndex > 0) onPrev();
    else if (dx < 0 && pageIndex < pageCount - 1) onNext();
  };



  // Kiosk exit: 7 rapid taps on clock
  const kioskTaps = useRef(0);
  const kioskTimer = useRef(null);
  const [kioskPin, setKioskPin] = useState(null);
  const onClockTap = () => {
    if (!kioskMode) return;
    kioskTaps.current += 1;
    if (kioskTimer.current) clearTimeout(kioskTimer.current);
    kioskTimer.current = setTimeout(() => { kioskTaps.current = 0; }, 3000);
    if (kioskTaps.current >= 7) {
      kioskTaps.current = 0;
      setKioskPin('');
    }
  };

  const animKey = `slide-${pageIndex}-${slideDir}`;
  const animStyle = slideDir
    ? { animation: `${slideDir === 'right' ? 'sdSlideInRight' : 'sdSlideInLeft'} 0.25s ease` }
    : {};

  return (
    <div style={{ ...styles.wrapper }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {bgEl}
      <div style={styles.topFade} />
      <div style={styles.bottomFade} />
      <div style={styles.topBar}>
        <div style={styles.pageNav}>
          <button style={styles.navBtn} onClick={onPrev} disabled={pageIndex === 0}>◀</button>
          <span style={styles.pageLabel}>{page.name || 'Untitled'}</span>
          <button style={styles.navBtn} onClick={onNext} disabled={pageIndex >= pageCount - 1}>▶</button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {!kioskMode && (
            <button onClick={() => setShowNotifs?.((s) => !s)} style={styles.notifBtn} title="Notifications" data-notif>
              {notifications?.length > 0 ? `🔔${notifications.length}` : '🔕'}
              {showNotifs && (
                <div style={styles.notifPanel} data-notif>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>Notifications</span>
                    {notifications?.length > 0 && <button onClick={clearNotifs} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem' }}>Clear</button>}
                  </div>
                  {(!notifications || notifications.length === 0) ? (
                    <p style={{ color: '#444', fontSize: '0.8rem', textAlign: 'center', padding: 16 }}>No notifications</p>
                  ) : (
                    notifications.slice(0, 50).map((n) => (
                      <div key={n.id} style={{ textAlign: 'left', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 3 }}>{n.hostName} · {(() => { const s = Math.floor((Date.now() - n.timestamp) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; })()}</div>
                        {n.title && <div style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 600 }}>{n.title}</div>}
                        {n.body && <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.3 }}>{n.body}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={styles.clock} onClick={onClockTap}>{timeStr}</span>
          {!kioskMode && <button style={{ ...styles.setupBtn, opacity: editMode ? 0.9 : 0.4 }} onClick={onSetup} title={editMode ? 'Exit edit mode' : 'Setup'}>{editMode ? '✓' : '⚙️'}</button>}
        </div>
      </div>

      {kioskPin !== null && (
        <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>PIN</span>
          <input type="password" maxLength={6} autoFocus value={kioskPin}
            onChange={(e) => setKioskPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetch('/api/verify-pin', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({pin: kioskPin}) })
                  .then((r) => r.json()).then((d) => { if (d.ok) { setKioskPin(null); onExitKiosk?.(); } else setKioskPin(''); });
              }
              if (e.key === 'Escape') setKioskPin(null);
            }}
            style={{ width: 120, padding: '6px 10px', background: '#222', border: '1px solid #444', borderRadius: 6, color: '#eee', fontSize: '1rem', textAlign: 'center', outline: 'none' }}
          />
          <button onClick={() => setKioskPin(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
        </div>
      )}

      {onlineHosts.length > 0 && (
        <div style={styles.hostsBar}>
          {onlineHosts.map((h) => {
            const hs = hostStatus[h.id] || {};
            const isOutdated = serverVersion && hs.version && hs.version !== serverVersion;
            return (
              <span key={h.id} style={styles.hostChip} title={isOutdated ? `Agent v${hs.version} — server v${serverVersion}. Rebuild agent to match.` : ''}>
                <span style={styles.hostDot} /> {h.name}
                {isOutdated && <span style={{ marginLeft: 4, fontSize: '0.7rem', color: '#e80' }}>❗</span>}
              </span>
            );
          })}
        </div>
      )}

      <div key={animKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', ...animStyle }}>
        <GridPage
          page={page}
          hostOnline={hostOnline}
          pinnedHostId={pinnedHostId}
          pinnedHostOnline={pinnedHostOnline}
          pinnedHostName={pinnedHostName}
          cols={cols}
          rows={rows}
          iconSize={iconSize}
          editMode={editMode}
          onAddKey={onAddKey}
          onEditKey={onEditKey}
          onExecute={onExecute}
          onNavigate={onNavigate}
        />
      </div>

      {editMode && (
        <div style={styles.editFooter}>
          <button style={styles.setupLink} onClick={onEditPage}>⚙️ Edit Page</button>
          <button style={styles.setupLink} onClick={() => onSetup('full')}>Hosts & Config</button>
        </div>
      )}

      <div style={styles.dots}>
        {Array.from({ length: pageCount }, (_, i) => (
          <span key={i} style={{ ...styles.dot, opacity: i === pageIndex ? 1 : 0.25 }} />
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex', flexDirection: 'column', height: '100%',
    padding: '12px 16px', gap: 8, position: 'relative',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0',
  },
  pageNav: { display: 'flex', alignItems: 'center', gap: 14 },
  navBtn: {
    background: 'none', border: 'none', color: '#666', fontSize: '1.2rem',
    cursor: 'pointer', padding: '4px 6px',
  },
  pageLabel: { fontSize: '0.95rem', fontWeight: 600, color: '#ccc' },
  clock: {
    fontSize: '0.85rem', color: '#555', fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.04em', userSelect: 'none',
  },
  setupBtn: { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: 4 },
  hostsBar: { display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' },
  hostChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'rgba(40,180,80,0.12)', color: '#5d9', fontSize: '0.75rem',
    padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(40,180,80,0.2)',
  },
  hostDot: { width: 6, height: 6, borderRadius: '50%', background: '#5d9', display: 'inline-block' },
  editFooter: { display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0' },
  setupLink: {
    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#888',
    padding: '6px 16px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 7, padding: '6px 0' },
  dot: { width: 7, height: 7, borderRadius: '50%', background: '#555', transition: 'opacity 0.2s' },
  topFade: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
    pointerEvents: 'none', zIndex: -1,
  },
  bottomFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
    pointerEvents: 'none', zIndex: -1,
  },
};
