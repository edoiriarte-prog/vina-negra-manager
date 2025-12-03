
// Barrel file for Firebase services and hooks

// Core Firebase initialization and instances
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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
export { initiateAnonymousSignIn, initiateEmailSignUp, initiateEmailSignIn, signOut } from './non-blocking-login';

// Export Firestore-related hooks and functions
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { 
  addDocumentNonBlocking, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from './non-blocking-updates';
