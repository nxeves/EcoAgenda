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
