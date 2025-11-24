
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { InventoryAdjustment } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

export function useAdjustmentsCRUD() {
  const { firestore } = useFirebase();

  const createAdjustment = async (adjustment: Omit<InventoryAdjustment, 'id'>) => {
    if (!firestore) return;
    await addDocumentNonBlocking(collection(firestore, 'inventoryAdjustments'), adjustment);
  };
  
  const createAdjustments = async (adjustments: Omit<InventoryAdjustment, 'id'>[]) => {
    if (!firestore) return;
    for (const adjustment of adjustments) {
      await addDocumentNonBlocking(collection(firestore, 'inventoryAdjustments'), adjustment);
    }
  };

  const updateAdjustment = async (id: string, data: Partial<InventoryAdjustment>) => {
    if (!firestore) return;
    const adjustmentRef = doc(firestore, 'inventoryAdjustments', id);
    const { id: _, ...dataToUpdate } = data;
    await updateDocumentNonBlocking(adjustmentRef, dataToUpdate);
  };

  const deleteAdjustment = async (id: string) => {
    if (!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'inventoryAdjustments', id));
  };

  return {
    createAdjustment,
    createAdjustments,
    updateAdjustment,
    deleteAdjustment,
  };
}

    