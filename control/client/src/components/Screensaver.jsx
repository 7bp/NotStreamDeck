import React, { useState, useEffect, useRef } from 'react';

const MODES = ['clock', 'gradient', 'weather', 'icons', 'starfield', 'pulse', 'datequote', 'photos', 'bounce', 'netdiag'];

const quotes = [
  "The best time to plant a tree was 20 years ago.",
  "Simplify, then add lightness.",
  "It works on my machine.",
  "Talk is cheap. Show me the code.",
  "First, solve the problem. Then, write the code.",
  "Make it work, make it right, make it fast.",
  "Any fool can write code that a computer can understand.",
  "Debugging is twice as hard as writing the code.",
  "In the middle of difficulty lies opportunity.",
  "The only way to go fast is to go well.",
  "A journey of a thousand miles begins with a single step.",
  "Creativity is intelligence having fun.",
  "The best way to predict the future is to invent it.",
  "Done is better than perfect.",
  "Small steps lead to big changes.",
  "Stay curious, keep learning.",
  "Less is more.",
  "Perfect is the enemy of good.",
  "The details are not the details. They make the design.",
  "Have fun while building something great.",
];

function ClockMode({ timeStr }) {
  return <span style={{ color: '#222', fontSize: 'clamp(3rem, 18vw, 7rem)', fontWeight: 200, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}>{timeStr}</span>;
}

function GradientMode() {
  const [hue, setHue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHue((h) => (h + 0.3) % 360), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(135deg, hsl(${hue},40%,8%), hsl(${(hue + 60) % 360},40%,12%), hsl(${(hue + 120) % 360},40%,6%))`,
      transition: 'background 0.05s',
    }} />
  );
}

function WeatherMode() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetch('https://wttr.in?format=j1').then((r) => r.json()).then((d) => {
      const cc = d.current_condition?.[0];
      if (cc) setWeather({ temp: cc.temp_C, desc: cc.weatherDesc?.[0]?.value, code: cc.weatherCode });
    }).catch(() => {});
  }, []);
  if (!weather) return <span style={{ color: '#333', fontSize: '1.5rem' }}>--°</span>;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(3rem, 15vw, 6rem)', fontWeight: 200, color: '#222' }}>{weather.temp}°</div>
      <div style={{ fontSize: '1rem', color: '#333', marginTop: 4 }}>{weather.desc}</div>
    </div>
  );
}

function IconSlideshowMode({ pages }) {
  const allIcons = [];
  for (const p of pages || []) {
    for (const k of p.keys || []) {
      if (k.icon || k.symbol) allIcons.push(k);
    }
  }
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (allIcons.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % allIcons.length), 3000);
    return () => clearInterval(id);
  }, [allIcons.length]);
  if (allIcons.length === 0) return <span style={{ color: '#333', fontSize: '1.2rem' }}>No icons</span>;
  const k = allIcons[idx];
  return (
    <div style={{ textAlign: 'center', transition: 'opacity 0.8s' }}>
      {k.icon ? (
        <img src={k.icon} alt="" style={{ width: 'clamp(48px, 12vw, 96px)', height: 'clamp(48px, 12vw, 96px)', borderRadius: '22%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 'clamp(2rem, 10vw, 5rem)' }}>{k.symbol}</span>
      )}
      {k.name && <div style={{ color: '#333', fontSize: '0.85rem', marginTop: 8 }}>{k.name}</div>}
    </div>
  );
}

function StarfieldMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w - w / 2, y: Math.random() * h - h / 2, z: Math.random() * w,
    }));
    let frame;
    const draw = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (const s of stars) {
        s.z -= 3;
        if (s.z <= 0) { s.x = (Math.random() - 0.5) * w * 2; s.y = (Math.random() - 0.5) * h * 2; s.z = w; }
        const px = (s.x / s.z) * w / 2 + cx;
        const py = (s.y / s.z) * h / 2 + cy;
        const r = Math.max(0.5, 2 - (s.z / w) * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0.2, 1 - s.z / w)})`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
}

function PulseMode({ hosts, hostStatus }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'screensaver-pulse';
    style.textContent = '@keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.4}}';
    document.head.appendChild(style);
    return () => document.getElementById('screensaver-pulse')?.remove();
  }, []);
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '80%' }}>
      {(hosts || []).map((h) => {
        const online = hostStatus?.[h.id]?.status === 'online';
        return (
          <div key={h.id} style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: online ? 'rgba(40,180,80,0.15)' : 'rgba(80,80,80,0.1)',
              border: `2px solid ${online ? 'rgba(40,180,80,0.3)' : 'rgba(80,80,80,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: online ? '#5d9' : '#555',
                animation: online ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }} />
            </div>
            <div style={{ color: online ? '#5d9' : '#444', fontSize: '0.75rem' }}>{h.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function DateQuoteMode() {
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div style={{ textAlign: 'center', padding: '0 32px' }}>
      <div style={{ fontSize: 'clamp(1rem, 4vw, 2rem)', fontWeight: 300, color: '#222', marginBottom: 12 }}>{dateStr}</div>
      <div style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)', color: '#333', fontStyle: 'italic', maxWidth: 500, lineHeight: 1.5 }}>"{quote}"</div>
    </div>
  );
}

function PhotoSlideshowMode({ pages }) {
  const bgImages = [];
  for (const p of pages || []) {
    if (p.backgroundImage) bgImages.push(p.backgroundImage);
  }
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (bgImages.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % bgImages.length), 5000);
    return () => clearInterval(id);
  }, [bgImages.length]);
  if (bgImages.length === 0) return <span style={{ color: '#333', fontSize: '1rem' }}>No backgrounds</span>;
  return (
    <img src={bgImages[idx]} alt="" style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      objectFit: 'cover', opacity: 0.35, transition: 'opacity 1.5s',
    }} />
  );
}

function BounceMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const size = 48;
    let x = Math.random() * (w - size), y = Math.random() * (h - size);
    let dx = 2, dy = 2;
    const emojis = ['⚡', '🎮', '⚙️', '🔧', '🎯', '🚀', '💻', '🖥️'];
    let emoji = emojis[Math.floor(Math.random() * emojis.length)];
    let hue = 0;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      x += dx; y += dy;
      if (x <= 0 || x + size >= w) { dx = -dx; hue = (hue + 30) % 360; emoji = emojis[Math.floor(Math.random() * emojis.length)]; }
      if (y <= 0 || y + size >= h) { dy = -dy; hue = (hue + 30) % 360; emoji = emojis[Math.floor(Math.random() * emojis.length)]; }
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `hsl(${hue},50%,50%)`;
      ctx.fillText(emoji, x + size / 2, y + size / 2);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
}

function NetworkDiagramMode() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch('/api/network-data')
      .then((r) => r.json())
      .then((d) => { if (d.devices?.length) setDevices(d.devices); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    let w = 0, h = 0;

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const nodes = devices.length > 0 ? [...devices] : [];
    const isMock = nodes.length === 0;
    if (isMock) {
      for (let i = 0; i < 18; i++) {
        const a = 10 + Math.floor(Math.random() * 240);
        nodes.push({ ip: `192.168.${50 + i}.${i + 1}`, hostname: `node-${a}`, mac: '' });
      }
    }

    // Gateway left, others in a balanced grid
    const gwIndex = nodes.findIndex((n) => n.ip?.startsWith('192.168.') && n.ip.endsWith('.1'));
    const nodeCount = nodes.length;
    const leafNodes = nodes.filter((_, i) => i !== gwIndex);
    const leafCount = leafNodes.length;

    const boxW = Math.max(72, Math.min(120, Math.floor((w * 0.5) / Math.ceil(Math.sqrt(leafCount)) - 16)));
    const boxH = 28;
    const gapX = boxW + 18;
    const gapY = boxH + 22;
    const cols = Math.max(1, Math.floor((w * 0.55) / gapX));
    const rows = Math.ceil(leafCount / cols);

    const gridLeft = w * 0.35;
    const gridTop = Math.max(20, (h - (rows * gapY - 22)) / 2);

    const positions = nodes.map((_, i) => {
      if (gwIndex >= 0 && i === gwIndex) return { x: w * 0.15, y: h * 0.5, vx: 0, vy: 0, tx: w * 0.15, ty: h * 0.5 };
      const leafIdx = i > gwIndex ? i - 1 : i;
      const col = leafIdx % cols;
      const row = Math.floor(leafIdx / cols);
      const tx = gridLeft + col * gapX + boxW / 2;
      const ty = gridTop + row * gapY + boxH / 2;
      return { x: tx, y: ty, vx: 0, vy: 0, tx, ty };
    });

    // Packet system
    const packets = [];
    function spawnPacket(from, to) {
      const p1 = positions[from];
      const p2 = positions[to];
      if (!p1 || !p2) return;
      const midX = (p1.x + p2.x) / 2;
      // Total path length
      const len = Math.abs(midX - p1.x) + Math.abs(p2.y - midX) + Math.abs(p2.x - midX);
      packets.push({ from, to, midX, progress: 0, speed: (0.008 + Math.random() * 0.014) * (Math.min(w, h) / 400) });
    }
    function getPacketPos(p) {
      const p1 = positions[p.from];
      const p2 = positions[p.to];
      if (!p1 || !p2) return null;
      const seg1 = Math.abs(p.midX - p1.x);
      const seg2 = Math.abs(p2.y - p1.y);
      const seg3 = Math.abs(p2.x - p.midX);
      const total = seg1 + seg2 + seg3;
      const d = p.progress * total;
      if (d < seg1) {
        const t = seg1 > 0 ? d / seg1 : 0;
        return { x: p1.x + (p.midX - p1.x) * t, y: p1.y };
      } else if (d < seg1 + seg2) {
        const t = seg2 > 0 ? (d - seg1) / seg2 : 0;
        return { x: p.midX, y: p1.y + (p2.y - p1.y) * t };
      } else {
        const t = seg3 > 0 ? (d - seg1 - seg2) / seg3 : 0;
        return { x: p.midX + (p2.x - p.midX) * t, y: p2.y };
      }
    }

    let frame;
    let t = 0;

    function drawOrthoLine(x1, y1, x2, y2, alpha, lw) {
      const midX = (x1 + x2) / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(0,255,0,${alpha})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    const draw = () => {
      t += 0.01;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Grid overlay
      ctx.strokeStyle = 'rgba(0,255,0,0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Soft drift toward target
      for (let i = 0; i < positions.length; i++) {
        if (gwIndex >= 0 && i === gwIndex) continue;
        positions[i].vx += (positions[i].tx - positions[i].x) * 0.003;
        positions[i].vy += (positions[i].ty - positions[i].y) * 0.003;
        positions[i].vx *= 0.95;
        positions[i].vy *= 0.95;
        positions[i].x += positions[i].vx;
        positions[i].y += positions[i].vy;
      }

      // Spawn packets
      if (Math.random() < 0.08) {
        const from = gwIndex >= 0 ? gwIndex : 0;
        const to = Math.floor(Math.random() * nodes.length);
        if (to !== from) spawnPacket(from, to);
      }
      if (Math.random() < 0.04) {
        const a = Math.floor(Math.random() * nodes.length);
        let b = Math.floor(Math.random() * nodes.length);
        if (b === a) b = (a + 1) % nodes.length;
        if (gwIndex < 0 || (a !== gwIndex && b !== gwIndex)) spawnPacket(a, b);
      }

      // Update and expire packets
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].progress += packets[i].speed;
        if (packets[i].progress >= 1) packets.splice(i, 1);
      }

      // Draw connection lines (static + packet glow)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const isGwLink = gwIndex >= 0 && (i === gwIndex || j === gwIndex);
          const hasPacket = packets.some(p => (p.from === i && p.to === j) || (p.from === j && p.to === i));
          const isNeighbor = !isGwLink && Math.abs(i - j) <= 2 && Math.random() > 0.45;
          if (!isGwLink && !isNeighbor && !hasPacket) continue;
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > Math.min(w, h) * 0.7) continue;
          const alpha = hasPacket ? 0.5 + 0.15 * Math.sin(t * 2) : (isGwLink ? 0.25 + 0.1 * Math.sin(t * 1.5 + i * 0.5) : 0.06);
          const lw = hasPacket ? 1.2 : (isGwLink ? 0.8 + 0.3 * Math.sin(t * 1.5 + i) : 0.4);
          drawOrthoLine(positions[i].x, positions[i].y, positions[j].x, positions[j].y, alpha, lw);
        }
      }

      // Draw packets as traveling dots
      for (const p of packets) {
        const pos = getPacketPos(p);
        if (!pos) continue;
        const bright = 0.5 + 0.5 * Math.sin(p.progress * Math.PI);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.8 + bright, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,0,${bright})`;
        ctx.fill();
      }

      // Box nodes
      for (let i = 0; i < nodes.length; i++) {
        const { x, y } = positions[i];
        const isGw = gwIndex >= 0 && i === gwIndex;
        const bw = isGw ? 100 : boxW;
        const bh = isGw ? 36 : boxH;

        ctx.shadowColor = '#0f0';
        ctx.shadowBlur = isGw ? 16 : 8;
        ctx.fillStyle = isGw ? 'rgba(0,20,0,0.85)' : 'rgba(0,12,0,0.65)';
        ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = isGw ? 1.5 : 1;
        ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.shadowBlur = 0;

        // Scan line
        ctx.strokeStyle = `rgba(0,255,0,${0.06 + 0.03 * Math.sin(t * 2 + i)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - bw / 2 + 4, y + 1);
        ctx.lineTo(x + bw / 2 - 4, y + 1);
        ctx.stroke();

        // Active indicator — glows when packets are active on this node
        const hasActive = packets.some(p => p.from === i || p.to === i);
        if (hasActive) {
          ctx.shadowColor = '#0f0';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = 'rgba(0,255,0,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
          ctx.shadowBlur = 0;
        }

        const showHost = nodes[i].hostname && nodes[i].hostname !== '?';
        const label = showHost ? nodes[i].hostname : nodes[i].ip;
        ctx.fillStyle = '#0f0';
        ctx.font = isGw ? 'bold 11px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - 1);
        if (showHost) {
          ctx.fillStyle = 'rgba(0,255,0,0.4)';
          ctx.font = '7px monospace';
          ctx.fillText(nodes[i].ip, x, y + bh / 2 + 8);
        }

        // Blink dots
        ctx.fillStyle = `rgba(0,255,0,${0.08 + 0.06 * Math.sin(t * 3 + i * 1.5)})`;
        ctx.fillRect(x + bw / 2 - 7, y - bh / 2 + 3, 3, 3);
        ctx.fillRect(x + bw / 2 - 7, y + bh / 2 - 6, 3, 3);
      }

      // Gateway label
      if (gwIndex >= 0) {
        ctx.fillStyle = 'rgba(0,255,0,0.25)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GATEWAY', positions[gwIndex].x, positions[gwIndex].y + 30);
      }

      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [devices]);

  if (loading) return <span style={{ color: '#0f0', fontSize: '1rem' }}>Scanning network…</span>;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <span style={{ position: 'absolute', top: 12, left: 16, fontSize: '0.65rem', color: '#0f0', opacity: 0.5 }}>
        {devices.length > 0 ? `${devices.length} hosts` : 'mock network'}
      </span>
    </div>
  );
}

export default function Screensaver({ mode, timeStr, pages, hosts, hostStatus }) {
  const [cycleIdx, setCycleIdx] = useState(0);
  const actualMode = mode === 'cycle' ? MODES[cycleIdx % MODES.length] : mode;

  useEffect(() => {
    if (mode !== 'cycle') return;
    const id = setInterval(() => setCycleIdx((i) => i + 1), 15000);
    return () => clearInterval(id);
  }, [mode]);

  const renderContent = () => {
    switch (actualMode) {
      case 'clock': return <ClockMode timeStr={timeStr} />;
      case 'gradient': return <GradientMode />;
      case 'weather': return <WeatherMode />;
      case 'icons': return <IconSlideshowMode pages={pages} />;
      case 'starfield': return <StarfieldMode />;
      case 'pulse': return <PulseMode hosts={hosts} hostStatus={hostStatus} />;
      case 'datequote': return <DateQuoteMode />;
      case 'photos': return <PhotoSlideshowMode pages={pages} />;
      case 'bounce': return <BounceMode />;
      case 'netdiag': return <NetworkDiagramMode />;
      default: return <ClockMode timeStr={timeStr} />;
    }
  };

  const label = actualMode;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {renderContent()}
      {!['gradient', 'starfield', 'photos', 'netdiag'].includes(actualMode) && (
        <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.65rem', color: '#333', opacity: 0.5 }}>
          {label}
        </span>
      )}
    </div>
  );
}
