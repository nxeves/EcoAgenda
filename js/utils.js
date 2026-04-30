import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as messagingSupported
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// ── Theme system (dark / light) ─────────
const THEME_KEY = 'eco_theme';

export function applyTheme(theme = 'dark') {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', safeTheme);
  localStorage.setItem(THEME_KEY, safeTheme);
  return safeTheme;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  return applyTheme(current === 'dark' ? 'light' : 'dark');
}

export function initThemeToggle() {
  const stored = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(stored);

  // Inject a shared toggle so we do not duplicate markup in every HTML file.
  if (document.getElementById('theme-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'theme-toggle-btn';
  btn.className = 'theme-toggle-btn';
  btn.type = 'button';
  btn.title = 'Cambiar tema';
  btn.textContent = stored === 'dark' ? '☀️' : '🌙';
  btn.onclick = () => {
    const next = toggleTheme();
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
    toast(`Tema ${next === 'dark' ? 'oscuro' : 'claro'} activado`, 'info', 1600);
  };

  const navUser = document.querySelector('.nav-user');
  if (navUser) {
    navUser.prepend(btn);
  } else {
    btn.classList.add('floating');
    document.body.appendChild(btn);
  }
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
  initThemeToggle();
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

function parseTaskDate(rawDate) {
  if (!rawDate) return null;
  const d = new Date(rawDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

function localNotify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, renotify: false });
  } catch (_) {}
}

function canSendReminder(key) {
  return !localStorage.getItem(key);
}

function markReminderSent(key) {
  localStorage.setItem(key, String(Date.now()));
}

// ── Smart reminders (1 día, 1 hora, 7am) ───────────
export function runSmartReminders(tasks = []) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const activeTasks = tasks.filter(t => !t.done && t.fecha);
  activeTasks.forEach((t) => {
    const due = parseTaskDate(t.fecha);
    if (!due) return;
    const msLeft = due.getTime() - now;
    const title = t.titulo || 'Tarea sin título';

    // Window around 24h reminder
    if (msLeft <= day + hour && msLeft >= day - hour) {
      const key = `eco_reminder_1d_${t.id || title}_${due.toDateString()}`;
      if (canSendReminder(key)) {
        localNotify('📚 EcoAgenda', `Tu tarea "${title}" vence mañana.`, key);
        markReminderSent(key);
      }
    }

    // Window around 1h reminder
    if (msLeft <= 70 * 60 * 1000 && msLeft >= 50 * 60 * 1000) {
      const key = `eco_reminder_1h_${t.id || title}_${due.toDateString()}`;
      if (canSendReminder(key)) {
        localNotify('⏰ EcoAgenda', `Tu tarea "${title}" vence en aproximadamente 1 hora.`, key);
        markReminderSent(key);
      }
    }
  });

  // Daily schedule notification at ~7:00am (once per day)
  const nowDate = new Date();
  const dayKey = nowDate.toISOString().slice(0, 10);
  const morningKey = `eco_morning_${dayKey}`;
  const isSevenAM = nowDate.getHours() === 7 && nowDate.getMinutes() < 20;
  if (isSevenAM && canSendReminder(morningKey)) {
    const todaysTasks = activeTasks.filter(t => {
      const d = parseTaskDate(t.fecha);
      return d &&
        d.getFullYear() === nowDate.getFullYear() &&
        d.getMonth() === nowDate.getMonth() &&
        d.getDate() === nowDate.getDate();
    });
    const count = todaysTasks.length;
    localNotify(
      '🌅 EcoAgenda',
      count ? `Buenos días. Hoy tienes ${count} tarea(s) programada(s).` : 'Buenos días. Hoy no tienes tareas pendientes.',
      morningKey
    );
    markReminderSent(morningKey);
  }
}

// ── Firebase Cloud Messaging bootstrap ─────────────
export async function initPushNotifications({ app, db, uid, onForegroundMessage } = {}) {
  if (!app || !uid || !('serviceWorker' in navigator)) return { enabled: false, reason: 'missing-context' };

  let supported = false;
  try {
    supported = await messagingSupported();
  } catch (_) {
    supported = false;
  }
  if (!supported) return { enabled: false, reason: 'unsupported' };

  await requestNotifications();

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const vapidKey = window.ECO_VAPID_KEY || localStorage.getItem('eco_vapid_key') || undefined;
    const token = vapidKey
      ? await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
      : await getToken(messaging, { serviceWorkerRegistration: registration });

    if (token && db) {
      await setDoc(doc(db, 'users', uid), {
        fcmToken: token,
        fcmUpdatedAt: serverTimestamp()
      }, { merge: true });
    }

    onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || '🔔 EcoAgenda';
      const body = payload?.notification?.body || 'Tienes una nueva notificación.';
      localNotify(title, body, `fcm_${Date.now()}`);
      if (typeof onForegroundMessage === 'function') onForegroundMessage(payload);
    });

    return { enabled: true, token: token || null };
  } catch (error) {
    console.warn('FCM init warning:', error);
    return { enabled: false, reason: 'init-error', error: error?.message || String(error) };
  }
}

// ── Avatar from initials ──────────────
export function avatarURL(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b5022&color=86efac&bold=true`;
}
