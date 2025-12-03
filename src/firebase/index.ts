
// Barrel file for Firebase services and hooks

// Core Firebase initialization and instances
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { firebaseConfig } from "./config";

function initializeFirebase(): { firebaseApp: FirebaseApp; firestore: Firestore; auth: Auth } {
  const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  return { firebaseApp, firestore, auth };
}

const { firebaseApp, firestore, auth } = initializeFirebase();
export { firebaseApp, firestore, auth };


// Export providers and core hooks
export { FirebaseProvider, useFirebase, useAuth, useFirestore, useFirebaseApp, useMemoFirebase } from './provider';
export { FirebaseClientProvider } from './client-provider';

// Export auth-related hooks and functions
export { useUser } from './provider';

// Export Firestore-related hooks and functions
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { 
  addDocumentNonBlocking, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from './non-blocking-updates';
