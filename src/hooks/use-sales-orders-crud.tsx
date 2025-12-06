"use client";

import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { SalesOrder } from "@/lib/types";

export function useSalesOrdersCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const createSalesOrder = async (order: Omit<SalesOrder, 'id'>) => {
    if (!firestore) return;
    try {
      const docRef = await addDocumentNonBlocking('salesOrders', order);
      return docRef;
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de venta.' });
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!firestore) return;
    try {
      await updateDocumentNonBlocking('salesOrders', id, data);
      toast({ title: "Orden Actualizada", description: "Los cambios se han guardado." });
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la orden de venta.' });
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDocumentNonBlocking('salesOrders', id);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la orden de venta.' });
    }
  };

  return {
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
  };
}
