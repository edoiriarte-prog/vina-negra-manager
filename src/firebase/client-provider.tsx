"use client";

import React from 'react';
import { FirebaseProvider } from './provider';
// Importamos las instancias que acabamos de exportar en index.ts
import { firebaseApp, auth, firestore } from './index'; 

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Este componente conecta las instancias singleton con el contexto de React
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}