
"use client";

import { useFirebase } from "@/firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrder } from "@/lib/types";

export function usePurchasesCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id'>) => {
    if (!firestore) return;
    try {
        const docRef = await addDoc(collection(firestore, 'purchaseOrders'), order);
        toast({ title: "Compra Creada", description: "La orden se ha registrado exitosamente." });
        return docRef;
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de compra.' });
        throw e; // Re-throw para que el bloque catch en la página lo maneje
    }
  };

  const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
    if (!firestore) return;
    try {
        await setDoc(doc(firestore, 'purchaseOrders', id), data, { merge: true });
        toast({ title: "Compra Actualizada", description: "Los cambios se han guardado." });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la orden de compra.' });
        throw e; // Re-throw para que el bloque catch en la página lo maneje
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    if (!firestore) return;
     try {
        await doc(firestore, 'purchaseOrders', id).delete();
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la orden de compra.' });
        throw e; // Re-throw para que el bloque catch en la página lo maneje
    }
  };

  return {
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
  };
}
