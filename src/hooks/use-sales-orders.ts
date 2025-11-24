
"use client";

import { 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useFirebase,
  useMemoFirebase
} from "@/firebase"; 
import { SalesOrder, OrderItem } from "@/lib/types";
import { collection, doc, orderBy, query, setDoc } from "firebase/firestore";

export function useSalesOrders() {
  const { firestore } = useFirebase();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "salesOrders"), orderBy("date", "desc"));
  }, [firestore]);

  const result = useCollection<SalesOrder>(ordersQuery) as any;
  
  const data = result.data;
  const error = result.error;
  const loading = result.loading !== undefined ? result.loading : result.isLoading;

  const createOrder = async (order: Omit<SalesOrder, "id"> & { id?: string }) => {
    if (!firestore) return;

    if (order.id) {
        // If an ID is provided (like our custom OV-2100), use it to create the document.
        const docRef = doc(firestore, "salesOrders", order.id);
        const { id, ...dataToSave } = order;
        await setDoc(docRef, dataToSave);
    } else {
        // Fallback for cases where no ID is given (shouldn't happen with the new logic, but safe to keep)
        const colRef = collection(firestore, "salesOrders");
        await addDocumentNonBlocking(colRef, order);
    }
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
