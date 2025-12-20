
"use client";

import { useFirebase } from "@/firebase";
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { SalesOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 

export function useSalesOrdersCRUD() {
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter(); 

  const createSalesOrder = async (data: Omit<SalesOrder, "id">) => {
    if (!db) {
        toast({ variant: "destructive", title: "Error", description: "Sin conexión." });
        return;
    }
    try {
      const newDocRef = doc(collection(db, "salesOrders"));
      await setDoc(newDocRef, {
        ...data,
        id: newDocRef.id,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Orden Creada", description: "Venta registrada exitosamente." });
      
      router.refresh(); 
      
      return newDocRef;
    } catch (error: any) {
      console.error("Error al crear la orden de venta:", error);
      toast({ variant: "destructive", title: "Error de Creación", description: error.message });
      throw error; // Re-lanza el error para que el componente que llama pueda manejarlo si es necesario
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) {
      toast({ variant: "destructive", title: "Error", description: "Sin conexión." });
      return;
    };
    try {
      const docRef = doc(db, "salesOrders", id);
      await updateDoc(docRef, data);
      
      toast({ title: "Actualizado", description: "Los cambios se han guardado correctamente." });
      
      router.refresh();
      
    } catch (error: any) {
      console.error("Error al actualizar la orden de venta:", error);
      toast({ variant: "destructive", title: "Error de Actualización", description: "No se pudieron guardar los cambios. " + error.message });
      throw error; // Re-lanza el error
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "salesOrders", id));
      toast({ title: "Eliminado", description: "Orden borrada." });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return { createSalesOrder, updateSalesOrder, deleteSalesOrder };
}
