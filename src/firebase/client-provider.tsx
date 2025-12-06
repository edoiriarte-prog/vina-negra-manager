"use client";

import React from 'react';
import { FirebaseProvider } from './provider';
// CAMBIO CLAVE: Importamos desde './init' (el archivo limpio) en vez de './index'
import { firebaseApp, auth, firestore } from './init'; 

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
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