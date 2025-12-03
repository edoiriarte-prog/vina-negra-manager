"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from './config'; // Import the correct config

// --- INICIALIZACIÓN ---
// Usamos singleton para evitar reinicializar si ya existe
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- EXPORTAR INSTANCIAS ---
export const firebaseApp = app; 
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Exportamos 'app' también por compatibilidad si algún archivo viejo lo busca
export { app }; 

// --- EXPORTAR MÓDULOS (Provider y Hooks) ---
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useFirebaseApp,
  useMemoFirebase,
  useUser
} from './provider'; 

// Exportaciones adicionales
export * from './non-blocking-updates';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
