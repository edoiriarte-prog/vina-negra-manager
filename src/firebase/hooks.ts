"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  onSnapshot, 
  Query, 
  DocumentReference, 
  DocumentData, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  SetOptions,
  CollectionReference
} from 'firebase/firestore';

// --- 1. HOOKS DE LECTURA ---

export function useCollection<T = DocumentData>(query: Query<DocumentData> | CollectionReference<DocumentData> | null) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      query,
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
  }, [query]);

  return { data, isLoading, error };
}

export function useDoc<T = DocumentData>(ref: DocumentReference<DocumentData> | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          setData(undefined);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching doc:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, isLoading, error };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}

// --- 2. HELPERS DE ESCRITURA ---

export const addDocumentNonBlocking = async (ref: any, data: any) => {
  return addDoc(ref, data);
};

export const setDocumentNonBlocking = async (ref: any, data: any, options?: SetOptions) => {
  if (options) {
    return setDoc(ref, data, options);
  }
  return setDoc(ref, data);
};

export const updateDocumentNonBlocking = async (ref: any, data: any) => {
  return updateDoc(ref, data);
};

export const deleteDocumentNonBlocking = async (ref: any) => {
  return deleteDoc(ref);
};