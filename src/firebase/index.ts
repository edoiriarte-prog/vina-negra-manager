"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    Query, 
    DocumentReference, 
    setDoc, 
    runTransaction, 
    getDoc, 
    query, 
    orderBy, 
    where,
    Firestore
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, Auth } from "firebase/auth";
import { useState, useEffect, useRef, useMemo } from "react";
import { firebaseConfig } from "./config";
import { useUser, useAuth as useFirebaseAuth, useFirebase, useFirestore as useFs, useFirebaseApp, FirebaseProvider, useMemoFirebase } from './provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

// --- INICIALIZACIÓN ---
function initializeFirebase() {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    return { firebaseApp: app, firestore: db, auth };
}


// --- HOOKS Y HELPERS ---

// Exporta la función de inicialización
export { initializeFirebase };

// Exporta los hooks del provider
export { useUser, useFirebaseAuth as useAuth, useFirebase, useFs as useFirestore, useFirebaseApp, FirebaseProvider, useMemoFirebase };

// Exporta los hooks de data
export { useCollection, useDoc };


// --- HELPERS CRUD (Non-blocking) ---
// Estos ya están en su propio archivo, pero los exportamos desde aquí para un único punto de entrada
export { 
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    setDocumentNonBlocking 
} from './non-blocking-updates';
