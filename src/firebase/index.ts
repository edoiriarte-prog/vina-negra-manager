"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- 1. TUS CREDENCIALES REALES ---
const firebaseConfig = {
  apiKey: "AIzaSyBg9y45BP2hD4C1VxRujKpMlspMxt-yyDE",
  authDomain: "studio-1617125356-dde41.firebaseapp.com",
  projectId: "studio-1617125356-dde41",
  storageBucket: "studio-1617125356-dde41.firebasestorage.app",
  messagingSenderId: "856243097775",
  appId: "1:856243097775:web:42c472ad506fc5766f845a"
};

// --- 2. INICIALIZACIÓN (Singleton para no repetir conexión) ---
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- 3. EXPORTAR LAS INSTANCIAS ---
export const firebaseApp = app; 
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// --- 4. EXPORTAR LOS MÓDULOS DE AYUDA (CORREGIDO) ---
export { FirebaseProvider, useFirebase, useAuth, useFirestore, useFirebaseApp, useMemoFirebase, useUser } from './provider'; 
export * from './non-blocking-updates';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
