
"use client";

import { 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useFirebase,
  useMemoFirebase // <--- IMPORTANTE: Agregamos este import
} from "@/firebase"; 
import { PurchaseOrder } from "@/lib/types";
import { collection, doc, orderBy, query, setDoc } from "firebase/firestore";
// Ya no necesitamos 'useMemo' de React, usamos el de Firebase

export function usePurchases() {
  const { firestore } = useFirebase();

  // 1. Definir la consulta (Query) usando el hook correcto
  const ordersQuery = useMemoFirebase(() => { // <--- CAMBIO AQUÍ
    if (!firestore) return null;
    return query(collection(firestore, "purchaseOrders"), orderBy("date", "desc"));
  }, [firestore]);

  // 2. Obtener datos
  // Capturamos como 'any' para validar loading/isLoading sin errores de tipo
  const result = useCollection<PurchaseOrder>(ordersQuery) as any;
  
  const data = result.data;
  const error = result.error;
  const loading = result.loading !== undefined ? result.loading : result.isLoading;

  // 3. CRUD Actions
  const createOrder = async (order: Omit<PurchaseOrder, "id"> & { id?: string }) => {
    if (!firestore) return;
    
    if (order.id) {
        const { id, ...dataToSave } = order;
        await setDoc(doc(firestore, "purchaseOrders", id), dataToSave);
    } else {
        await addDocumentNonBlocking(collection(firestore, "purchaseOrders"), order);
    }
  };

  const updateOrder = async (order: PurchaseOrder) => {
    if (!firestore) return;
    const docRef = doc(firestore, "purchaseOrders", order.id);
    const { id, ...dataToUpdate } = order; 
    await updateDocumentNonBlocking(docRef, dataToUpdate);
  };

  const deleteOrder = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "purchaseOrders", id);
    await deleteDocumentNonBlocking(docRef);
  };

  return {
    orders: data || [], 
    loading: !!loading, 
    error,
    createOrder,
    updateOrder,
    deleteOrder
  };
}
