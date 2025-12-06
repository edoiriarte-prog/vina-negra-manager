import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from './config';

// 1. INICIALIZACIÓN DE FIREBASE (SINGLETON)
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
firestore = getFirestore(app);
storage = getStorage(app);
const db = firestore; // Alias para compatibilidad

// 2. EXPORTACIÓN DE INSTANCIAS CORE
// Se exportan directamente para que otros módulos puedan importarlas sin causar ciclos.
export { 
  app as firebaseApp, // Alias clave para el provider
  app, 
  auth, 
  firestore,
  db, 
  storage 
};

// 3. EXPORTACIONES DEL BARRIL (BARREL EXPORTS)
// Ahora que las instancias están disponibles, exportamos el resto de utilidades.
export * from './provider';                
export * from './non-blocking-updates';  
export * from './non-blocking-login';    
export * from './errors';                
export * from './error-emitter';
