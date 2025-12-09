
"use client";

import { collection, doc, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrder } from "@/lib/types";
import { db } from "@/firebase/init"; // CORRECCIÓN: Importar 'db' desde init

export function usePurchasesCRUD() {
  const { toast } = useToast();

  const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id'>) => {
    if (!db) return;
    try {
        const docRef = await addDoc(collection(db, 'purchaseOrders'), order);
        toast({ title: "Compra Creada", description: "La orden se ha registrado exitosamente." });
        return docRef;
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de compra.' });
        throw e; // Re-throw para que el bloque catch en la página lo maneje
    }
  };

  const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'purchaseOrders', id), data, { merge: true });
        toast({ title: "Compra Actualizada", description: "Los cambios se han guardado." });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la orden de compra.' });
        throw e; // Re-throw para que el bloque catch en la página lo maneje
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    if (!db) return;
     try {
        await deleteDoc(doc(db, 'purchaseOrders', id));
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
