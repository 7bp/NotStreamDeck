import React, { useState, useEffect, useRef } from 'react';

const MODES = ['clock', 'gradient', 'weather', 'icons', 'pulse', 'datequote', 'photos'];

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
      case 'pulse': return <PulseMode hosts={hosts} hostStatus={hostStatus} />;
      case 'datequote': return <DateQuoteMode />;
      case 'photos': return <PhotoSlideshowMode pages={pages} />;
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
      {!['gradient', 'photos'].includes(actualMode) && (
        <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.65rem', color: '#333', opacity: 0.5 }}>
          {label}
        </span>
      )}
    </div>
  );
}
