import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAJNJeZg6ZeD4nIGs54meiy71I-Otg3eKM",
  authDomain:        "ecoagenda-6571a.firebaseapp.com",
  projectId:         "ecoagenda-6571a",
  storageBucket:     "ecoagenda-6571a.firebasestorage.app",
  messagingSenderId: "819093084784",
  appId:             "1:819093084784:web:caefb42f6005096e72b2b5",
  databaseURL:       "https://ecoagenda-6571a-default-rtdb.firebaseio.com"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const rtdb     = getDatabase(app);
const storage  = getStorage(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, rtdb, storage, provider };
