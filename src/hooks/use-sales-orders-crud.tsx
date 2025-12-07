"use client";

import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore"; // Agregamos setDoc y addDoc
import { useToast } from "@/hooks/use-toast";
import { SalesOrder } from "@/lib/types";

export function useSalesOrdersCRUD() {
  // CORRECCIÓN 1: Usamos 'db' en lugar de 'firestore' para que coincida con tu hook
  const { db } = useFirebase();
  const { toast } = useToast();

  const createSalesOrder = async (order: SalesOrder | Omit<SalesOrder, 'id'>) => {
    if (!db) {
        console.error("No hay conexión a la base de datos (db is undefined)");
        return;
    }

    try {
      // CORRECCIÓN 2: Lógica para respetar tu ID personalizado (OV-XXXX)
      // Si la orden ya trae un ID (como 'OV-2101'), usamos setDoc para que el documento se llame igual.
      if ('id' in order && order.id) {
        await setDoc(doc(db, 'salesOrders', order.id), order);
      } else {
        // Si no trae ID, dejamos que Firestore invente uno (fallback)
        await addDoc(collection(db, 'salesOrders'), order);
      }
      
      // El toast de éxito ya lo manejas en la página principal, pero este catch es vital.
    } catch (e) {
      console.error("Error en createSalesOrder:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de venta.' });
      throw e; // Re-lanzamos el error para que el formulario sepa que falló
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) return;
    try {
      await updateDocumentNonBlocking('salesOrders', id, data);
      // Opcional: toast aquí o en la vista principal
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la orden de venta.' });
      throw e;
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!db) return;
    try {
      await deleteDocumentNonBlocking('salesOrders', id);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la orden de venta.' });
      throw e;
    }
  };

  return {
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
  };
}