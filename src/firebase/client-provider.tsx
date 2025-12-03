"use client";

import React from 'react';
import { FirebaseProvider } from './provider';
import { firebaseApp, auth, firestore } from './index'; // Import the initialized instances

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {

  // This component ensures that the Firebase services are only passed to the provider on the client side.
  // It takes the singleton instances from index.ts and provides them to the context.
  
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
