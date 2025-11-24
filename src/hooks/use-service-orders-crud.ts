
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { ServiceOrder } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

export function useServiceOrdersCRUD() {
  const { firestore } = useFirebase();

  const createOrder = async (order: Omit<ServiceOrder, 'id'>) => {
    if (!firestore) return;
    await addDocumentNonBlocking(collection(firestore, 'serviceOrders'), order);
  };

  const updateOrder = async (id: string, data: Partial<ServiceOrder>) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'serviceOrders', id);
    const { id: _, ...dataToUpdate } = data;
    await updateDocumentNonBlocking(orderRef, dataToUpdate);
  };

  const deleteOrder = async (id: string) => {
    if (!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'serviceOrders', id));
  };

  return {
    createOrder,
    updateOrder,
    deleteOrder,
  };
}

    