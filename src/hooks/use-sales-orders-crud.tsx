"use client";

import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { SalesOrder } from "@/lib/types";

export function useSalesOrdersCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const createSalesOrder = async (order: Omit<SalesOrder, 'id'>) => {
    if (!firestore) return;
    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'salesOrders'), order);
      return docRef;
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de venta.' });
    }
  };

  const updateSalesOrder = (id: string, data: Partial<SalesOrder>) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'salesOrders', id), data, { merge: true });
  };

  const deleteSalesOrder = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'salesOrders', id));
  };

  return {
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
  };
}
