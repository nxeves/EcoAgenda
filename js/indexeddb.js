// ══════════════════════════════════════════
// indexeddb.js — Offline-first storage
// ══════════════════════════════════════════

const DB_NAME = 'EcoAgendaDB';
const DB_VERSION = 1;

const STORES = {
  tasks: { keyPath: 'id', indexes: ['userId', 'fecha', 'synced'] },
  schedule: { keyPath: 'id', indexes: ['userId', 'day', 'synced'] },
  reminders: { keyPath: 'id', indexes: ['userId', 'taskId', 'sent'] },
  syncQueue: { keyPath: 'id', indexes: ['userId', 'type', 'timestamp'] },
  notificationQueue: { keyPath: 'id', indexes: ['userId', 'timestamp', 'sent'] }
};

let db = null;

export async function initDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB no soportado');
      resolve(null);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => {
      console.error('❌ Error abriendo IndexedDB:', req.error);
      reject(req.error);
    };

    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: config.keyPath, autoIncrement: true });
          config.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
          console.log(`✅ Tienda '${storeName}' creada en IndexedDB`);
        }
      }
    };

    req.onsuccess = () => {
      db = req.result;
      console.log('✅ IndexedDB inicializado correctamente');
      resolve(db);
    };
  });
}

// ── Tasks (Tareas) ────────────────────
export async function saveTasks(userId, tasks) {
  if (!db) return false;
  try {
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');

    // Limpiar tareas viejas del usuario
    const index = store.index('userId');
    const range = IDBKeyRange.only(userId);
    const allRec = await new Promise((res, rej) => {
      index.getAll(range).onsuccess = (e) => res(e.target.result);
    });
    allRec.forEach(t => store.delete(t.id));

    // Guardar nuevas tareas
    tasks.forEach(t => {
      store.put({
        id: t.id || `task_${Date.now()}_${Math.random()}`,
        userId,
        titulo: t.titulo || t.title,
        descripcion: t.descripcion || t.description,
        fecha: t.fecha || t.dueDate,
        prioridad: t.prioridad || t.priority,
        estado: t.estado || t.status || 'pendiente',
        done: t.done || false,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: true
      });
    });

    await new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });

    console.log(`✅ ${tasks.length} tareas guardadas offline`);
    return true;
  } catch (err) {
    console.error('❌ Error guardando tareas:', err);
    return false;
  }
}

export async function getTasks(userId) {
  if (!db) return [];
  try {
    const store = db.transaction('tasks', 'readonly').objectStore('tasks');
    const index = store.index('userId');
    return new Promise((res, rej) => {
      index.getAll(userId).onsuccess = (e) => res(e.target.result);
    });
  } catch (err) {
    console.error('❌ Error obteniendo tareas:', err);
    return [];
  }
}

export async function addTask(userId, task) {
  if (!db) return false;
  try {
    const store = db.transaction('tasks', 'readwrite').objectStore('tasks');
    const id = task.id || `task_${Date.now()}_${Math.random()}`;
    store.put({
      id,
      userId,
      titulo: task.titulo || task.title,
      descripcion: task.descripcion || task.description,
      fecha: task.fecha || task.dueDate,
      prioridad: task.prioridad || task.priority || 'normal',
      estado: task.estado || 'pendiente',
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false // Marcar para sincronizar
    });
    console.log(`✅ Tarea guardada offline: ${id}`);
    return id;
  } catch (err) {
    console.error('❌ Error añadiendo tarea:', err);
    return false;
  }
}

// ── Schedule (Horario) ────────────────
export async function saveSchedule(userId, scheduleItems) {
  if (!db) return false;
  try {
    const tx = db.transaction('schedule', 'readwrite');
    const store = tx.objectStore('schedule');

    // Limpiar horario viejo
    const index = store.index('userId');
    const range = IDBKeyRange.only(userId);
    const allRec = await new Promise((res, rej) => {
      index.getAll(range).onsuccess = (e) => res(e.target.result);
    });
    allRec.forEach(s => store.delete(s.id));

    // Guardar nuevo horario
    scheduleItems.forEach(s => {
      store.put({
        id: s.id || `schedule_${Date.now()}_${Math.random()}`,
        userId,
        materia: s.materia || s.subject,
        dia: s.dia || s.day,
        inicio: s.inicio || s.time || s.start,
        fin: s.fin || s.end,
        salon: s.salon || s.room,
        profesor: s.profesor || s.teacher,
        createdAt: s.createdAt || new Date().toISOString(),
        synced: true
      });
    });

    await new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });

    console.log(`✅ ${scheduleItems.length} clases guardadas offline`);
    return true;
  } catch (err) {
    console.error('❌ Error guardando horario:', err);
    return false;
  }
}

export async function getSchedule(userId) {
  if (!db) return [];
  try {
    const store = db.transaction('schedule', 'readonly').objectStore('schedule');
    const index = store.index('userId');
    return new Promise((res, rej) => {
      index.getAll(userId).onsuccess = (e) => res(e.target.result);
    });
  } catch (err) {
    console.error('❌ Error obteniendo horario:', err);
    return [];
  }
}

// ── Sync Queue (Cola de sincronización) ────
export async function addToSyncQueue(userId, type, data) {
  if (!db) return false;
  try {
    const store = db.transaction('syncQueue', 'readwrite').objectStore('syncQueue');
    store.put({
      userId,
      type, // 'add_task', 'update_task', 'delete_task', etc.
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    });
    console.log(`✅ Operación añadida a cola de sync: ${type}`);
    return true;
  } catch (err) {
    console.error('❌ Error añadiendo a sync queue:', err);
    return false;
  }
}

export async function getSyncQueue(userId) {
  if (!db) return [];
  try {
    const store = db.transaction('syncQueue', 'readonly').objectStore('syncQueue');
    const index = store.index('userId');
    return new Promise((res, rej) => {
      index.getAll(userId).onsuccess = (e) => res(e.target.result);
    });
  } catch (err) {
    console.error('❌ Error obteniendo sync queue:', err);
    return [];
  }
}

export async function clearSyncQueueItem(itemId) {
  if (!db) return false;
  try {
    const store = db.transaction('syncQueue', 'readwrite').objectStore('syncQueue');
    store.delete(itemId);
    return true;
  } catch (err) {
    console.error('❌ Error borrando de sync queue:', err);
    return false;
  }
}

// ── Notification Queue (Cola de notificaciones) ────
export async function addNotification(userId, title, body, tag) {
  if (!db) return false;
  try {
    const store = db.transaction('notificationQueue', 'readwrite').objectStore('notificationQueue');
    store.put({
      userId,
      title,
      body,
      tag,
      timestamp: new Date().toISOString(),
      sent: false
    });
    console.log(`✅ Notificación encolada: ${title}`);
    return true;
  } catch (err) {
    console.error('❌ Error encolando notificación:', err);
    return false;
  }
}

export async function getPendingNotifications(userId) {
  if (!db) return [];
  try {
    const store = db.transaction('notificationQueue', 'readonly').objectStore('notificationQueue');
    const index = store.index('userId');
    const range = IDBKeyRange.only(userId);
    return new Promise((res, rej) => {
      index.getAll(range).onsuccess = (e) => res(e.target.result.filter(n => !n.sent));
    });
  } catch (err) {
    console.error('❌ Error obteniendo notificaciones pendientes:', err);
    return [];
  }
}

export async function markNotificationSent(id) {
  if (!db) return false;
  try {
    const tx = db.transaction('notificationQueue', 'readwrite');
    const store = tx.objectStore('notificationQueue');
    const req = store.get(id);
    req.onsuccess = () => {
      const notif = req.result;
      if (notif) {
        notif.sent = true;
        store.put(notif);
      }
    };
    return true;
  } catch (err) {
    console.error('❌ Error marcando notificación como enviada:', err);
    return false;
  }
}

// ── Check offline status ────────────────
export function isOffline() {
  return !navigator.onLine;
}

export function isOnline() {
  return navigator.onLine;
}

// ── Clear all data (logout) ─────────────
export async function clearAllData(userId) {
  if (!db) return false;
  try {
    for (const storeName of Object.keys(STORES)) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('userId');
      const range = IDBKeyRange.only(userId);
      const allRec = await new Promise((res, rej) => {
        index.getAll(range).onsuccess = (e) => res(e.target.result);
      });
      allRec.forEach(r => store.delete(r.id));
    }
    console.log('✅ Datos offline limpiados para usuario:', userId);
    return true;
  } catch (err) {
    console.error('❌ Error limpiando datos:', err);
    return false;
  }
}
