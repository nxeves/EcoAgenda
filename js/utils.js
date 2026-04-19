// ══════════════════════════════════════════
//  utils.js — Shared utilities
// ══════════════════════════════════════════

// ── Toast Notifications ──────────────────
export function toast(msg, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(t);

  setTimeout(() => {
    t.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => t.remove(), 280);
  }, duration);
}

// ── Rank system ────────────────────────
const RANKS = [
  { name: 'Semilla',  icon: '🌱', minPts: 0,    class: 'rank-seed'     },
  { name: 'Planta',   icon: '🌿', minPts: 200,  class: 'rank-plant'    },
  { name: 'Árbol',    icon: '🌳', minPts: 600,  class: 'rank-tree'     },
  { name: 'Guardián', icon: '🌍', minPts: 1500, class: 'rank-guardian' }
];

export function getRank(points) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (points >= r.minPts) rank = r; }
  return rank;
}

export function getNextRank(points) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points < RANKS[i].minPts) return RANKS[i];
  }
  return null;
}

export function getRankProgress(points) {
  const current  = getRank(points);
  const next     = getNextRank(points);
  if (!next) return 100;
  const range = next.minPts - current.minPts;
  const prog  = points - current.minPts;
  return Math.round((prog / range) * 100);
}

// ── Date helpers ───────────────────────
export function formatDate(d) {
  return new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function formatTime(d) {
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
export function isToday(d) {
  const t = new Date(); const dd = new Date(d);
  return t.getFullYear() === dd.getFullYear() && t.getMonth() === dd.getMonth() && t.getDate() === dd.getDate();
}
export function isTomorrow(d) {
  const t = new Date(); t.setDate(t.getDate() + 1);
  const dd = new Date(d);
  return t.getFullYear() === dd.getFullYear() && t.getMonth() === dd.getMonth() && t.getDate() === dd.getDate();
}

// ── Particle background ────────────────
export function initParticles(canvasId = 'bg-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.1,
      r:  Math.random() * 2 + 0.5,
      a:  Math.random()
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${p.a * 0.6})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Generate room code ────────────────
export function generateCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

// ── Format file size ──────────────────
export function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`;
  return `${(bytes/1048576).toFixed(1)}MB`;
}

// ── Schedule reminder check ───────────
export function checkReminders(tasks) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  tasks.forEach(t => {
    if (isTomorrow(t.dueDate) && !t.reminded) {
      new Notification('📚 EcoAgenda — Recordatorio', {
        body: `"${t.title}" vence mañana`,
        icon: '/assets/img/logo.png'
      });
    }
  });
}

// ── Request notification permission ──
export async function requestNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ── Avatar from initials ──────────────
export function avatarURL(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b5022&color=86efac&bold=true`;
}
