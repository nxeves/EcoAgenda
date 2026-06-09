/* Firebase Cloud Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAJNJeZg6ZeD4nIGs54meiy71I-Otg3eKM",
  authDomain: "ecoagenda-6571a.firebaseapp.com",
  projectId: "ecoagenda-6571a",
  storageBucket: "ecoagenda-6571a.firebasestorage.app",
  messagingSenderId: "819093084784",
  appId: "1:819093084784:web:caefb42f6005096e72b2b5",
  databaseURL: "https://ecoagenda-6571a-default-rtdb.firebaseio.com"
});

const messaging = firebase.messaging();

// ── IndexedDB Logic for SW ──────────────────
const DB_NAME = 'EcoAgendaDB';
const DB_VERSION = 1;

async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function checkOfflineReminders() {
  try {
    const db = await getDB();
    const now = new Date();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    // 1. Check Schedule (Horario)
    const scheduleStore = db.transaction('schedule', 'readonly').objectStore('schedule');
    const scheduleRequest = scheduleStore.getAll();
    
    scheduleRequest.onsuccess = () => {
      const schedule = scheduleRequest.result;
      schedule.forEach(item => {
        // Notificar 5 minutos antes de la clase
        if (item.dia === currentDay && item.inicio) {
          const [h, m] = item.inicio.split(':');
          const classTime = new Date();
          classTime.setHours(parseInt(h), parseInt(m) - 5, 0); // 5 mins antes
          
          const timeStr = classTime.getHours().toString().padStart(2, '0') + ':' + classTime.getMinutes().toString().padStart(2, '0');
          if (timeStr === currentTime) {
            showStrictNotification('📅 Próxima clase', `En 5 min: ${item.materia} en ${item.salon || 'tu salón'}`);
          }
        }
      });
    };

    // 2. Check Tasks (Tareas)
    const taskStore = db.transaction('tasks', 'readonly').objectStore('tasks');
    const taskRequest = taskStore.getAll();
    
    taskRequest.onsuccess = () => {
      const tasks = taskRequest.result;
      tasks.forEach(task => {
        if (task.done) return;
        const due = new Date(task.fecha);
        if (isNaN(due.getTime())) return;

        const diff = due.getTime() - now.getTime();
        const diffHours = diff / (1000 * 60 * 60);

        // Notificar si vence en 1 hora o 24 horas
        if (diffHours > 0.9 && diffHours < 1.1) {
          showStrictNotification('📚 Tarea próxima', `"${task.titulo}" vence en 1 hora.`);
        } else if (diffHours > 23.9 && diffHours < 24.1) {
          showStrictNotification('📚 Recordatorio', `"${task.titulo}" vence mañana.`);
        }
      });
    };
  } catch (err) {
    console.error('SW: Error checking reminders:', err);
  }
}

function showStrictNotification(title, body) {
  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'eco-reminder-' + Date.now(),
    renotify: true,
    requireInteraction: true, // "Estricta" - se queda hasta que el usuario la vea
    data: { url: '/pages/agenda.html' }
  };
  self.registration.showNotification(title, options);
}

// Check reminders periodically while SW is active
setInterval(checkOfflineReminders, 60000); // Cada minuto

// Handle Periodic Sync if supported
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkOfflineReminders());
  }
});

// Handle Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkOfflineReminders());
  }
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_REMINDERS') {
    checkOfflineReminders();
  }
});

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || '🔔 EcoAgenda';
  const options = {
    body: payload?.notification?.body || 'Tienes una nueva notificación.',
    icon: '/favicon.ico',
    data: payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/pages/agenda.html'));
});
