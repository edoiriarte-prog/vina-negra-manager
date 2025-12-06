import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- VERIFICACIÓN DE SEGURIDAD ---
// Esto imprimirá un error en la consola del navegador si falta la configuración.
// Así sabrás de inmediato si el archivo .env está mal ubicado.
if (!firebaseConfig.apiKey) {
  console.error("🚨 ERROR CRÍTICO DE FIREBASE: No se han encontrado las API KEYS.");
  console.error("Asegúrate de que el archivo .env (o .env.local) esté en la RAÍZ del proyecto, NO en /src.");
} else {
  console.log("✅ Firebase conectado exitosamente a:", firebaseConfig.projectId);
}

// Inicialización limpia (Patrón Singleton)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportación de servicios
export const firebaseApp = app; // Alias
export const db = getFirestore(app);
export const firestore = db;    // Alias
export const auth = getAuth(app);
export const storage = getStorage(app);