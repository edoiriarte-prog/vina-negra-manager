"use client";

import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { InventoryAdjustment } from "@/lib/types";

export function useAdjustmentsCRUD() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const createAdjustment = async (adjustment: Omit<InventoryAdjustment, 'id'>) => {
    if (!firestore) return;
    try {
      await addDocumentNonBlocking(collection(firestore, 'inventoryAdjustments'), adjustment);
      toast({ title: "Ajuste Creado", description: "El ajuste de inventario ha sido registrado." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el ajuste.' });
    }
  };

  const createAdjustments = async (adjustments: Omit<InventoryAdjustment, 'id'>[]) => {
    if (!firestore) return;
    try {
      // Idealmente, esto debería ser una transacción/batch write, pero lo hacemos simple por ahora.
      for (const adjustment of adjustments) {
        await addDocumentNonBlocking(collection(firestore, 'inventoryAdjustments'), adjustment);
      }
      toast({ title: `${adjustments.length} Ajustes Creados`, description: "Los ajustes de inventario han sido registrados." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron crear los ajustes.' });
    }
  };

  const updateAdjustment = (id: string, data: Partial<InventoryAdjustment>) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'inventoryAdjustments', id), data, { merge: true });
  };

  const deleteAdjustment = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'inventoryAdjustments', id));
    toast({ variant: 'destructive', title: 'Ajuste Eliminado' });
  };

  return {
    createAdjustment,
    createAdjustments,
    updateAdjustment,
    deleteAdjustment,
  };
}
