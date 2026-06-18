import React from 'react';

export default function KeyButton({ keyData, disabled, onExecute, iconSize }) {
  if (!keyData) return null;

  const { symbol, name, icon, bgColor } = keyData;
  const size = iconSize || 64;

  const handleClick = (e) => {
    const el = e.currentTarget;
    el.style.transform = 'scale(0.88)';
    setTimeout(() => { el.style.transform = ''; }, 120);
    onExecute?.();
  };

  return (
    <div style={styles.wrapper}>
      <button
        style={{
          ...styles.icon,
          width: size,
          height: size,
          opacity: disabled ? 0.3 : 1,
          background: bgColor || '#2a2a2a',
        }}
        disabled={disabled}
        onClick={handleClick}
      >
        {icon ? (
          <img src={icon} alt="" style={styles.img} />
        ) : symbol ? (
          <span style={styles.emoji}>{symbol}</span>
        ) : null}
      </button>
      {name && <span style={styles.name}>{name}</span>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    border: 'none',
    borderRadius: '22%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s',
    outline: 'none',
    padding: 0,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  emoji: {
    fontSize: 'clamp(1.2rem, 3.5vw, 2rem)',
    lineHeight: 1,
  },
  name: {
    fontSize: 'clamp(0.45rem, 1.2vw, 0.65rem)',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 1.15,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 80,
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    pointerEvents: 'none',
  },
};
