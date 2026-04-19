// ══════════════════════════════════════════
//  auth.js — Authentication helpers
// ══════════════════════════════════════════
import { auth, db, provider } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Current user reactive store
export let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    window.dispatchEvent(new CustomEvent('userReady', { detail: user }));
  }
});

export async function loginEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginGoogle() {
  const cred = await signInWithPopup(auth, provider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function registerEmail(email, password, displayName, photoURL) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user, { displayName, photoURL });
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  window.location.href = '/index.html';
}

async function ensureUserDoc(user, extra = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: extra.displayName || user.displayName || 'EcoUsuario',
      photoURL:    extra.photoURL    || user.photoURL    || '',
      puntos:      0,
      nivel:       'semilla',
      accesorios:  [],
      createdAt:   serverTimestamp()
    });
  }
}

export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = '/index.html';
  });
}
