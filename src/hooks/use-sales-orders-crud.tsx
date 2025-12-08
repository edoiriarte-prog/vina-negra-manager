
"use client";

import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore"; // Agregamos setDoc y addDoc
import { useToast } from "@/hooks/use-toast";
import { SalesOrder } from "@/lib/types";

export function useSalesOrdersCRUD() {
  // CORRECCIÓN 1: Usamos 'firestore' y lo renombramos a 'db' para que coincida con el resto del hook
  const { firestore: db } = useFirebase();
  const { toast } = useToast();

  const createSalesOrder = async (order: SalesOrder | Omit<SalesOrder, 'id'>) => {
    if (!db) {
        console.error("No hay conexión a la base de datos (db is undefined)");
        // No devuelvas una promesa si no hay db, simplemente sal.
        return; 
    }

    try {
      // CORRECCIÓN 2: Lógica para respetar tu ID personalizado (OV-XXXX)
      // Si la orden ya trae un ID (como 'OV-2101'), usamos setDoc para que el documento se llame igual.
      if ('id' in order && order.id) {
        // Devolvemos la promesa directamente
        return setDoc(doc(db, 'salesOrders', order.id), order);
      } else {
        // Si no trae ID, dejamos que Firestore invente uno y devolvemos la promesa de addDoc
        return addDoc(collection(db, 'salesOrders'), order);
      }
      
    } catch (e) {
      console.error("Error en createSalesOrder:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la orden de venta.' });
      throw e; // Re-lanzamos el error para que el formulario sepa que falló
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) return;
    try {
      await updateDocumentNonBlocking(doc(db, 'salesOrders', id), data);
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
      await deleteDocumentNonBlocking(doc(db, 'salesOrders', id));
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
