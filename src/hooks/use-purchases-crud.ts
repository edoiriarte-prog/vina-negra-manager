
import { useFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { PurchaseOrder } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { useOperations } from './use-operations';

export function usePurchasesCRUD() {
  const { firestore } = useFirebase();
  const { purchaseOrders } = useOperations();

  const createOrder = async (order: Omit<PurchaseOrder, 'id'>) => {
    if (!firestore) return;

    const existingIds = (purchaseOrders || [])
        .map(o => {
            const match = o.id.match(/OC-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1099;
    const nextNum = maxId < 1099 ? 1100 : maxId + 1;
    const newId = `OC-${nextNum}`;

    await setDocumentNonBlocking(doc(firestore, "purchaseOrders", newId), order);
    console.log("Orden de compra creada exitosamente con ID:", newId);
  };

  const updateOrder = async (id: string, data: Partial<PurchaseOrder>) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'purchaseOrders', id);
    const { id: _, ...dataToUpdate } = data;
    await updateDocumentNonBlocking(orderRef, dataToUpdate);
    console.log(`Orden de compra ${id} actualizada exitosamente.`);
  };

  const deleteOrder = async (id: string) => {
    if (!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'purchaseOrders', id));
    console.log(`Orden de compra ${id} eliminada exitosamente.`);
  };

  return {
    createOrder,
    updateOrder,
    deleteOrder,
  };
}

    