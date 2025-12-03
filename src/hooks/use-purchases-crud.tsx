
"use client";

import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrder } from "@/lib/types";

export function usePurchasesCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id'>) => {
    if (!firestore) return;
    try {
        const docRef = await addDocumentNonBlocking(collection(firestore, 'purchaseOrders'), order);
        toast({ title: "Compra Creada", description: "La orden se ha registrado exitosamente." });
        return docRef;
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de compra.' });
    }
  };

  const updatePurchaseOrder = (id: string, data: Partial<PurchaseOrder>) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'purchaseOrders', id), data, { merge: true });
    toast({ title: "Compra Actualizada", description: "Los cambios se han guardado." });
  };

  const deletePurchaseOrder = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'purchaseOrders', id));
  };

  return {
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
  };
}
