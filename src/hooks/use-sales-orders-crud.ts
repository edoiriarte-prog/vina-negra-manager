
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { SalesOrder } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { useOperations } from './use-operations';

export function useSalesOrdersCRUD() {
  const { firestore } = useFirebase();
  const { salesOrders } = useOperations(); // Para obtener el último ID

  const createOrder = async (order: Omit<SalesOrder, 'id'>) => {
    if (!firestore) return;
    
    // Generar nuevo ID
    const existingIds = (salesOrders || [])
        .map(o => {
            const match = o.id.match(/OV-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 2099;
    const nextNum = maxId < 2099 ? 2100 : maxId + 1;
    const newId = `OV-${nextNum}`;

    const orderWithId = { ...order, id: newId };
    
    await setDocumentNonBlocking(doc(firestore, "salesOrders", newId), order);
    console.log("Orden de venta creada exitosamente con ID:", newId);
  };

  const updateOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'salesOrders', id);
    const { id: _, ...dataToUpdate } = data;
    await updateDocumentNonBlocking(orderRef, dataToUpdate);
    console.log(`Orden de venta ${id} actualizada exitosamente.`);
  };

  const deleteOrder = async (id: string) => {
    if (!firestore) return;
    await deleteDocumentNonBlocking(doc(firestore, 'salesOrders', id));
    console.log(`Orden de venta ${id} eliminada exitosamente.`);
  };

  return {
    createOrder,
    updateOrder,
    deleteOrder,
  };
}

    