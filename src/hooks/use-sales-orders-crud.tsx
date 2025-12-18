"use client";

import { useFirebase } from "@/firebase";
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { SalesOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // 1. IMPORTAR ESTO

export function useSalesOrdersCRUD() {
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter(); // 2. INICIALIZAR ESTO

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
      
      router.refresh(); // 3. EL SECRETO: FORZAR RECARGA
      
      return newDocRef;
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) return;
    try {
      const docRef = doc(db, "salesOrders", id);
      await updateDoc(docRef, data);
      
      toast({ title: "Actualizado", description: "Estado cambiado correctamente." });
      
      router.refresh(); // 3. EL SECRETO: FORZAR RECARGA AQUÍ TAMBIÉN
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Falló la actualización." });
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "salesOrders", id));
      toast({ title: "Eliminado", description: "Orden borrada." });
      router.refresh(); // 3. Y AQUÍ
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return { createSalesOrder, updateSalesOrder, deleteSalesOrder };
}