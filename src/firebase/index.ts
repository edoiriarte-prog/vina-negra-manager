import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  Query, 
  DocumentData 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { useState, useEffect, useMemo } from "react";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- VERIFICACIÓN DE SEGURIDAD ---
if (!firebaseConfig.apiKey) {
  console.error("🚨 ERROR CRÍTICO DE FIREBASE: No se han encontrado las API KEYS.");
} 

// Inicialización limpia (Patrón Singleton)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportación de servicios básicos
export const firebaseApp = app; 
export const db = getFirestore(app);
export const firestore = db;    
export const auth = getAuth(app);
export const storage = getStorage(app);

// --- HOOKS Y UTILIDADES ---

// 1. Hook de Autenticación
export const useAuth = () => {
  return auth;
};

// 2. Hook de Usuario (ESTE ES EL QUE FALTABA)
export const useUser = () => {
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, isUserLoading };
};

// 3. Hook para acceder a las instancias
export const useFirebase = () => {
  return { db, auth, storage, app };
};

// 4. Hook para leer colecciones en tiempo real
export function useCollection<T = DocumentData>(queryRef: Query<DocumentData>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(queryRef, 
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error en useCollection:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef]);

  return { data, loading, error };
}

// 5. Wrapper para useMemo
export const useMemoFirebase = <T>(factory: () => T, deps: any[]): T => {
    return useMemo(factory, deps);
};

// --- FUNCIONES CRUD (PROMESAS) ---

export const addDocumentNonBlocking = async (collectionName: string, data: any) => {
  try {
    const colRef = collection(db, collectionName);
    return await addDoc(colRef, data);
  } catch (error) {
    console.error(`Error agregando a ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocumentNonBlocking = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    return await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Error actualizando ${id}:`, error);
    throw error;
  }
};

export const setDocumentNonBlocking = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    return await setDoc(docRef, data, { merge: true }); 
  } catch (error) {
    console.error(`Error estableciendo documento ${id}:`, error);
    throw error;
  }
};

export const deleteDocumentNonBlocking = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    return await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error eliminando ${id}:`, error);
    throw error;
  }
};