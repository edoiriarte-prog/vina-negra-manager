"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, Query, DocumentReference, setDoc, runTransaction, getDoc, query, orderBy, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect, useRef, useMemo } from "react";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- INICIALIZACIÓN ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db as firestore, auth };

// --- HOOKS ---

export function useFirebase() {
  return { firestore: db, auth };
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, isLoading };
}

// Alias para compatibilidad
export const useUser = useAuth;

// Memoización de Queries para evitar loops infinitos
export function useMemoFirebase(factory: () => any, deps: any[]) {
  const ref = useRef<any>(null);
  const value = useMemo(factory, deps); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    !ref.current ||
    (value && !isEqualFirestoreRef(ref.current, value))
  ) {
    ref.current = value;
  }

  return ref.current;
}

function isEqualFirestoreRef(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b) return false;
  const pathA = a.path || (a._query && JSON.stringify(a._query));
  const pathB = b.path || (b._query && JSON.stringify(b._query));
  return pathA === pathB;
}

// Hook de Colección en Tiempo Real
export function useCollection<T>(queryRef: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(items);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching collection:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef]);

  return { data, isLoading, loading: isLoading, error };
}

// Hook de Documento en Tiempo Real
export function useDoc<T>(docRef: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!docRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return { data, isLoading };
}

// --- HELPERS CRUD ---
export const addDocumentNonBlocking = async (collectionRef: any, data: any) => {
  try { return await addDoc(collectionRef, data); } catch (error) { console.error(error); throw error; }
};
export const updateDocumentNonBlocking = async (docRef: any, data: any) => {
  try { return await updateDoc(docRef, data); } catch (error) { console.error(error); throw error; }
};
export const deleteDocumentNonBlocking = async (docRef: any) => {
  try { return await deleteDoc(docRef); } catch (error) { console.error(error); throw error; }
};
export const setDocumentNonBlocking = async (docRef: any, data: any, options?: any) => {
    try {
        if (options) return await setDoc(docRef, data, options);
        return await setDoc(docRef, data);
    } catch (error) { console.error(error); throw error; }
}