
"use client";

import { 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useFirebase,
  useMemoFirebase
} from "@/firebase"; 
import { SalesOrder } from "@/lib/types";
import { collection, doc, orderBy, query, setDoc } from "firebase/firestore";

export function useSalesOrders() {
  const { firestore } = useFirebase();

  // 1. Consulta (Query) con useMemoFirebase
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "salesOrders"), orderBy("date", "desc"));
  }, [firestore]);

  // 2. Obtener datos
  const result = useCollection<SalesOrder>(ordersQuery) as any;
  
  const data = result.data;
  const error = result.error;
  const loading = result.loading !== undefined ? result.loading : result.isLoading;

  // 3. CRUD Actions
  const createOrder = async (order: Omit<SalesOrder, "id">) => {
    if (!firestore) return;
    const colRef = collection(firestore, "salesOrders");
    await addDocumentNonBlocking(colRef, order);
  };

  const updateOrder = async (order: SalesOrder) => {
    if (!firestore) return;
    const docRef = doc(firestore, "salesOrders", order.id);
    const { id, ...dataToUpdate } = order; 
    await updateDocumentNonBlocking(docRef, dataToUpdate);
  };

  const deleteOrder = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "salesOrders", id);
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
