"use client";

import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { FinancialMovement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useFinancialsCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // CREAR MOVIMIENTO (Soporta Uno o Varios en Lote)
  const createFinancialMovement = async (data: Omit<FinancialMovement, "id"> | Omit<FinancialMovement, "id">[]) => {
    if (!firestore) return;

    try {
      if (Array.isArray(data)) {
        // Lógica para Lote (Batch) - Más eficiente
        const batch = writeBatch(firestore);
        data.forEach((movement) => {
          const ref = doc(collection(firestore, "financialMovements"));
          batch.set(ref, { ...movement, createdAt: new Date().toISOString() });
        });
        await batch.commit();
        toast({ title: "Movimientos Registrados", description: `${data.length} registros guardados correctamente.` });
      } else {
        // Lógica Individual
        await addDocumentNonBlocking(collection(firestore, "financialMovements"), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Movimiento Registrado", description: "Se ha guardado el ingreso/egreso." });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el movimiento." });
    }
  };

  // ACTUALIZAR MOVIMIENTO
  const updateFinancialMovement = async (id: string, data: Partial<FinancialMovement>) => {
    if (!firestore) return;
    try {
      await updateDocumentNonBlocking(doc(firestore, "financialMovements", id), data);
      toast({ title: "Movimiento Actualizado" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." });
    }
  };

  // ELIMINAR MOVIMIENTO
  const deleteFinancialMovement = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, "financialMovements", id));
      toast({ title: "Movimiento Eliminado" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return {
    createFinancialMovement,
    updateFinancialMovement,
    deleteFinancialMovement
  };
}