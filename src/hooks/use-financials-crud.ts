
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { FinancialMovement } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

export function useFinancialsCRUD() {
  const { firestore } = useFirebase();

  const createMovement = async (movement: Omit<FinancialMovement, 'id'>) => {
    if (!firestore) return;
    await addDocumentNonBlocking(collection(firestore, 'financialMovements'), movement);
  };
  
  const createMovements = async (movements: Omit<FinancialMovement, 'id'>[]) => {
    if (!firestore) return;
    for (const movement of movements) {
      await addDocumentNonBlocking(collection(firestore, 'financialMovements'), movement);
    }
  };

  const updateMovement = async (id: string, data: Partial<FinancialMovement>) => {
    if (!firestore) return;
    const movementRef = doc(firestore, 'financialMovements', id);
    const { id: _, ...dataToUpdate } = data;
    await updateDocumentNonBlocking(movementRef, dataToUpdate);
  };

  const deleteMovement = async (id: string) => {
    if (!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'financialMovements', id));
  };

  return {
    createMovement,
    createMovements,
    updateMovement,
    deleteMovement,
  };
}

    