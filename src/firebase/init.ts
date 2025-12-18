import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Usamos la configuración de firebaseConfig que ya tienes
import { firebaseConfig } from "./config";

// --- VERIFICACIÓN DE SEGURIDAD ---
// Esto imprimirá un error en la consola del navegador si falta la configuración.
if (!firebaseConfig.apiKey) {
  console.error("🚨 ERROR CRÍTICO DE FIREBASE: No se han encontrado las API KEYS.");
  console.error("Asegúrate de que el archivo .env (o .env.local) esté en la RAÍZ del proyecto, NO en /src.");
}

// Inicialización limpia (Patrón Singleton)
// Esto asegura que la app de Firebase solo se inicialice una vez.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportación de servicios
export const firebaseApp = app; // Alias
export const db = getFirestore(app);
export const firestore = db;    // Alias
export const auth = getAuth(app);
export const storage = getStorage(app);
