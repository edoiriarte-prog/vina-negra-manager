// --- BARREL FILE PARA EXPORTACIÓN CENTRALIZADA ---

// 1. Exportaciones principales de inicialización
export * from './init';

// 2. Exportaciones del Provider y Hooks de Contexto
export { 
    FirebaseProvider, 
    FirebaseClientProvider,
    useFirebase,
    useAuth,
    useFirestore,
    useFirebaseApp,
    useUser,
    useMemoFirebase
} from './provider';

// 3. Exportaciones de Hooks de Datos
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// 4. Exportaciones de funciones de escritura no bloqueantes
export {
    setDocumentNonBlocking,
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from './non-blocking-updates';
