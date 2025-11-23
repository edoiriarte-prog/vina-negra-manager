
import { firestore as db } from "@/firebase";
import { PurchaseOrder, SalesOrder } from "@/lib/types";
import { collection, doc, runTransaction, query, where, getDocs } from "firebase/firestore";

/**
 * Actualiza el inventario basado en una orden y el cambio de estado.
 * Maneja automáticamente sumas y restas (incluyendo reversiones).
 */
export async function processOrderStockMovement(
  order: PurchaseOrder | SalesOrder,
  newStatus: string,
  oldStatus: string
) {
  // 1. Determinar la dirección del movimiento
  // Purchase: 'add' (sumar), Sale: 'subtract' (restar)
  const isPurchase = order.orderType === 'purchase';
  let multiplier = 0;

  // CASO A: Se COMPLETA la orden (Entra stock o Sale stock)
  if (newStatus === 'completed' && oldStatus !== 'completed') {
    multiplier = isPurchase ? 1 : -1; 
  }
  // CASO B: Se DESHACE una orden completada (Estaba completed y pasa a pending/cancelled)
  // Debemos revertir el movimiento anterior.
  else if (oldStatus === 'completed' && newStatus !== 'completed') {
    multiplier = isPurchase ? -1 : 1;
  }
  
  // Si no hay cambio de stock (ej: de pending a cancelled), salimos.
  if (multiplier === 0) return;

  const inventoryRef = collection(db, 'inventory');

  // Ejecutamos una transacción para asegurar que los datos no se corrompan si hay concurrencia
  try {
    await runTransaction(db, async (transaction) => {
      for (const item of order.items) {
        // Generamos un ID Determinístico para encontrar el ítem fácil: BODEGA_PRODUCTO_CALIBRE
        // Esto evita duplicados.
        const rawId = `${order.warehouse}_${item.product}_${item.caliber}`;
        // Limpiamos el ID para que sea válido en Firestore (sin espacios raros)
        const itemId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
        
        const itemDocRef = doc(inventoryRef, itemId);
        const itemDoc = await transaction.get(itemDocRef);

        const quantityChange = (item.quantity || 0) * multiplier;
        const packageChange = (item.packagingQuantity || 0) * multiplier;

        if (!itemDoc.exists()) {
          // SI NO EXISTE EL ÍTEM EN EL INVENTARIO: Lo creamos
          // Solo tiene sentido crear si estamos sumando (compra). 
          // Si estamos restando algo que no existe, igual lo creamos con stock negativo para alertar.
          transaction.set(itemDocRef, {
            id: itemId,
            product: item.product,
            caliber: item.caliber,
            warehouse: order.warehouse,
            stock: quantityChange,
            packagingQuantity: packageChange,
            packagingType: item.packagingType || '',
            updatedAt: new Date().toISOString()
          });
        } else {
          // SI YA EXISTE: Actualizamos
          const currentData = itemDoc.data();
          const newStock = (currentData.stock || 0) + quantityChange;
          const newPackages = (currentData.packagingQuantity || 0) + packageChange;

          transaction.update(itemDocRef, {
            stock: newStock,
            packagingQuantity: newPackages,
            updatedAt: new Date().toISOString()
          });
        }
      }
    });
    console.log(`Inventario actualizado correctamente para orden ${order.id}`);
  } catch (error) {
    console.error("Error actualizando inventario:", error);
    throw error; // Re-lanzamos para que la UI sepa que falló
  }
}
