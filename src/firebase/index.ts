"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- 1. TUS CREDENCIALES ---
const firebaseConfig = {
  apiKey: "AIzaSyBg9y45BP2hD4C1VxRujKpMlspMxt-yyDE",
  authDomain: "studio-1617125356-dde41.firebaseapp.com",
  projectId: "studio-1617125356-dde41",
  storageBucket: "studio-1617125356-dde41.firebasestorage.app",
  messagingSenderId: "856243097775",
  appId: "1:856243097775:web:42c472ad506fc5766f845a"
};

// --- 2. INICIALIZACIÓN ---
// Usamos singleton para evitar reinicializar si ya existe
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- 3. EXPORTAR INSTANCIAS ---
export const firebaseApp = app; 
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Exportamos 'app' también por compatibilidad si algún archivo viejo lo busca
export { app }; 

// --- 4. EXPORTAR MÓDULOS (Provider y Hooks) ---
// Aquí agregamos 'useMemoFirebase' y 'useUser' que estaban faltando
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useFirebaseApp,
  useMemoFirebase, // <--- Agregado para solucionar tu error
  useUser          // <--- Agregado por si lo necesitas (ya existe en tu provider)
} from './provider'; 

// Exportaciones adicionales
export * from './non-blocking-updates';
export * from './firestore/use-collection';
export * from './firestore/use-doc';