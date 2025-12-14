"use client";

import { useFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { SalesOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function useSalesOrdersCRUD() {
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const createSalesOrder = async (data: Omit<SalesOrder, "id">) => {
    if (!db) {
        toast({ variant: "destructive", title: "Error", description: "Sin conexión a base de datos." });
        return;
    }
    try {
      const docRef = await addDoc(collection(db, "salesOrders"), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Orden Creada", description: "Venta registrada exitosamente." });
      router.refresh();
      return docRef;
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la orden." });
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) {
        console.error("Intento de actualizar sin conexión a DB");
        toast({ variant: "destructive", title: "Error", description: "Sin conexión a base de datos." });
        return;
    }
    try {
      const docRef = doc(db, "salesOrders", id);
      await updateDoc(docRef, data);
      
      // Ya no necesitamos router.refresh() porque onSnapshot se encargará.
      // Solo mostramos la confirmación.
      toast({ 
          title: "Orden Actualizada", 
          description: "Los cambios se han guardado correctamente en la base de datos." 
      });
      
    } catch (error) {
      console.error("Error actualizando:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la orden." });
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "salesOrders", id));
      toast({ title: "Orden Eliminada" });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return {
    createSalesOrder,
    updateSalesOrder,
    deleteSalesOrder
  };
}
