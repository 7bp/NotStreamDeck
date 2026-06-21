import React, { useState, useEffect } from 'react';
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

export default function StreamDeck({ page, hosts, hostStatus, pageIndex, pageCount, onPrev, onNext, onSetup, onExecute, onAddKey, onEditKey, onEditPage, editMode, timeStr, onNavigate, serverVersion }) {
  const cols = page.cols || 5;
  const rows = page.rows || 3;
  const iconSize = page.iconSize || 64;

  const keyMap = {};
  for (const k of (page.keys || [])) keyMap[`${k.row}:${k.col}`] = k;

  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ row: r, col: c, key: keyMap[`${r}:${c}`] || null });

  const hostOnline = {};
  if (hosts) for (const h of hosts) hostOnline[h.id] = hostStatus[h.id]?.status === 'online';

  const onlineHosts = (hosts || []).filter((h) => hostOnline[h.id]);

  const pinnedHostId = page.hostId;
  const pinnedHostOnline = pinnedHostId ? hostOnline[pinnedHostId] : true;
  const pinnedHostName = pinnedHostId ? (hosts || []).find((h) => h.id === pinnedHostId)?.name || 'Host' : null;

  const bgStyle = page.backgroundImage
    ? { backgroundImage: `url(${page.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  if (pinnedHostId && !pinnedHostOnline) {
    return (
      <div style={{ ...styles.wrapper, ...bgStyle }}>
        <div style={styles.topFade} />
        <div style={styles.bottomFade} />
        <div style={styles.topBar}>
          <div style={styles.pageNav}>
            <button style={styles.navBtn} onClick={onPrev} disabled={pageIndex === 0}>◀</button>
            <span style={styles.pageLabel}>{page.name || 'Untitled'}</span>
            <button style={styles.navBtn} onClick={onNext} disabled={pageIndex >= pageCount - 1}>▶</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={styles.clock}>{timeStr}</span>
            <button style={{ ...styles.setupBtn, opacity: editMode ? 0.9 : 0.4 }} onClick={onSetup} title={editMode ? 'Exit edit mode' : 'Setup'}>{editMode ? '✓' : '⚙️'}</button>
          </div>
        </div>
        <div style={styles.offlineMsg}>
          <span style={{ fontSize: '2rem', marginBottom: 4 }}>💤</span>
          <span>{pinnedHostName} is offline</span>
        </div>
        <div style={styles.dots}>
          {Array.from({ length: pageCount }, (_, i) => (
            <span key={i} style={{ ...styles.dot, opacity: i === pageIndex ? 1 : 0.25 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.wrapper, ...bgStyle }}>
      <div style={styles.topFade} />
      <div style={styles.bottomFade} />
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.pageNav}>
          <button style={styles.navBtn} onClick={onPrev} disabled={pageIndex === 0}>◀</button>
          <span style={styles.pageLabel}>{page.name || 'Untitled'}</span>
          <button style={styles.navBtn} onClick={onNext} disabled={pageIndex >= pageCount - 1}>▶</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.clock}>{timeStr}</span>
          <button style={{ ...styles.setupBtn, opacity: editMode ? 0.9 : 0.4 }} onClick={onSetup} title={editMode ? 'Exit edit mode' : 'Setup'}>{editMode ? '✓' : '⚙️'}</button>
        </div>
      </div>

      {/* Online hosts bar */}
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

      {/* Grid */}
      <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map(({ row, col, key }) => {
          const effectiveHostId = pinnedHostId || key?.hostId;
          return (
            <div key={`${row}-${col}`} style={styles.cell}>
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
                <button style={styles.addCell} onClick={() => onAddKey(page.id, row, col)} title="Add key">
                  <span style={styles.addPlus}>+</span>
                </button>
              ) : <div style={{ width: iconSize, height: iconSize }} />}
            </div>
          );
        })}
      </div>

      {/* Edit mode footer */}
      {editMode && (
        <div style={styles.editFooter}>
          <button style={styles.setupLink} onClick={onEditPage}>⚙️ Edit Page</button>
          <button style={styles.setupLink} onClick={() => onSetup('full')}>Hosts & Config</button>
        </div>
      )}

      {/* Page dots */}
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
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '12px 16px',
    gap: 8,
    position: 'relative',
    zIndex: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
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
  hostsBar: {
    display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0',
  },
  hostChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'rgba(40,180,80,0.12)', color: '#5d9', fontSize: '0.75rem',
    padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(40,180,80,0.2)',
  },
  hostDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#5d9',
    display: 'inline-block',
  },
  grid: {
    display: 'grid',
    gap: 12, flex: 1, alignContent: 'center',
    justifyItems: 'center', alignItems: 'center',
  },
  cell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addCell: {
    width: 64, height: 64, borderRadius: '22%', border: '1px dashed rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
  addPlus: {
    color: '#555', fontSize: '1.5rem', userSelect: 'none',
  },
  editFooter: {
    display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0',
  },
  setupLink: {
    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#888',
    padding: '6px 16px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
  },
  dots: {
    display: 'flex', justifyContent: 'center', gap: 7, padding: '6px 0',
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%', background: '#555',
    transition: 'opacity 0.2s',
  },
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
  offlineMsg: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    color: '#666', fontSize: '1.1rem',
  },
};
