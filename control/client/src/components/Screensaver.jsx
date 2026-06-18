import React, { useState, useEffect, useRef } from 'react';

const MODES = ['clock', 'gradient', 'weather', 'icons', 'starfield', 'pulse', 'datequote', 'photos', 'bounce', 'fireworks', 'aurora', 'rainbow', 'plasma'];

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

function FireworksMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    const rockets = [];
    const sparks = [];
    const colors = ['#ff0040', '#ff6600', '#ffcc00', '#00ff88', '#00ccff', '#8844ff', '#ff44ff'];

    function spawnRocket() {
      const x = Math.random() * w;
      rockets.push({ x, y: h, vy: -3 - Math.random() * 5 });
    }

    function explode(x, y) {
      const count = 60 + Math.floor(Math.random() * 40);
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1.5 + Math.random() * 3;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, decay: 0.008 + Math.random() * 0.012 });
      }
    }

    let frame;
    let tick = 0;
    spawnRocket();
    const draw = () => {
      tick++;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);

      if (tick % 30 === 0 && rockets.length < 4) spawnRocket();
      if (Math.random() < 0.02) spawnRocket();

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(r.x - 1, r.y - 3, 2, 6);
        if (r.vy < 0) r.vy -= 0.05;
        if (r.vy >= 0 || r.y < h * 0.15 + Math.random() * h * 0.3) {
          explode(r.x, r.y);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
        ctx.globalAlpha = 1;
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
}

function AuroraMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    let t = 0;
    const layers = [
      { y: 0.15, height: 0.2, speed: 0.3, color: [0, 180, 255], amp: 60 },
      { y: 0.25, height: 0.25, speed: 0.5, color: [120, 255, 120], amp: 80 },
      { y: 0.35, height: 0.2, speed: 0.4, color: [200, 100, 255], amp: 50 },
      { y: 0.45, height: 0.15, speed: 0.6, color: [255, 80, 150], amp: 70 },
    ];

    let frame;
    const draw = () => {
      t += 0.005;
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      ctx.fillRect(0, 0, w, h);

      for (const layer of layers) {
        const yBase = h * layer.y;
        const hRange = h * layer.height;
        for (let x = 0; x < w; x += 2) {
          const val = Math.sin(x * 0.008 + t * layer.speed) * layer.amp
            + Math.sin(x * 0.015 + t * layer.speed * 0.7) * layer.amp * 0.5
            + Math.sin(x * 0.003 + t * layer.speed * 0.4) * layer.amp * 0.3;
          const alpha = Math.max(0, 1 - Math.abs(val) / (layer.amp * 2));
          if (alpha < 0.05) continue;
          const yOff = val;
          const [r, g, b] = layer.color;
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
          ctx.fillRect(x, yBase + yOff - hRange / 2, 2, hRange);
        }
      }

      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(0, 0, w, h * 0.5);

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
}

function RainbowMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    let t = 0;
    let frame;
    const draw = () => {
      t += 0.02;
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);

      const bands = 7;
      for (let i = 0; i < bands; i++) {
        const hue = ((i / bands) * 360 + t * 20) % 360;
        const yBase = (h / (bands + 1)) * (i + 1);
        const amp = 20 + Math.sin(t * 0.5 + i) * 10;
        for (let x = 0; x < w; x += 3) {
          const yOff = Math.sin(x * 0.02 + t * 2 + i) * amp;
          ctx.fillStyle = `hsla(${hue}, 80%, 55%, 0.15)`;
          ctx.fillRect(x, yBase + yOff - 4, 3, 8);
        }
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function PlasmaMode() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    let t = 0;
    let frame;
    const draw = () => {
      t += 0.02;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const v = Math.sin(x * 0.01 + t)
            + Math.sin(y * 0.01 + t * 0.6)
            + Math.sin((x + y) * 0.008 + t * 0.8)
            + Math.sin(Math.sqrt(x * x + y * y) * 0.008 + t);
          const hue = (v * 60 + t * 40) % 360;
          const sat = 80 + Math.sin(t + x * 0.01) * 10;
          const light = 30 + Math.sin(v + t) * 15;

          const rgb = hslToRgb(hue / 360, sat / 100, light / 100);
          const idx = (y * w + x) * 4;
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
          // Fill adjacent pixel for performance
          if (x + 1 < w) {
            data[idx + 4] = rgb[0];
            data[idx + 5] = rgb[1];
            data[idx + 6] = rgb[2];
            data[idx + 7] = 255;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />;
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
      case 'fireworks': return <FireworksMode />;
      case 'aurora': return <AuroraMode />;
      case 'rainbow': return <RainbowMode />;
      case 'plasma': return <PlasmaMode />;
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
      {!['gradient', 'starfield', 'photos', 'fireworks', 'aurora', 'rainbow', 'plasma'].includes(actualMode) && (
        <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.65rem', color: '#333', opacity: 0.5 }}>
          {label}
        </span>
      )}
    </div>
  );
}
