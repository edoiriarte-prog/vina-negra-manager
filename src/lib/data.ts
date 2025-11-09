import { Contact, PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, InventoryItem, Interaction, BankAccount, InventoryAdjustment } from './types';
import { format } from 'date-fns';

export const contacts: Contact[] = [];
export const purchaseOrders: PurchaseOrder[] = [];
export const salesOrders: SalesOrder[] = [];
export const serviceOrders: ServiceOrder[] = [];
export const financialMovements: FinancialMovement[] = [];
export const inventoryAdjustments: InventoryAdjustment[] = [];


export const getInventory = (
  currentPurchaseOrders: PurchaseOrder[] = [],
  currentSalesOrders: SalesOrder[] = [],
  currentAdjustments: InventoryAdjustment[] = [],
  orderBeingEdited?: SalesOrder | null
): InventoryItem[] => {
  const inventoryMap = new Map<string, { purchased: number; sold: number; adjusted: number }>();

  // Process purchases and internal transfers from purchases
  currentPurchaseOrders.forEach(po => {
    if (po.status === 'completed' && po.warehouse) {
      po.items.forEach(item => {
        if (item.unit === 'Kilos') {
          // Stock always enters the source warehouse first
          const sourceKey = `${item.product} - ${item.caliber} - ${po.warehouse}`;
          const sourceExisting = inventoryMap.get(sourceKey) || { purchased: 0, sold: 0, adjusted: 0 };
          sourceExisting.purchased += item.quantity;
          inventoryMap.set(sourceKey, sourceExisting);
          
          // If there's a destination warehouse, it's a transfer.
          // The stock is "sold" from the source and "purchased" at the destination.
          if (po.destinationWarehouse) {
            sourceExisting.sold += item.quantity; // Decrease from source
            inventoryMap.set(sourceKey, sourceExisting);
            
            const destKey = `${item.product} - ${item.caliber} - ${po.destinationWarehouse}`;
            const destExisting = inventoryMap.get(destKey) || { purchased: 0, sold: 0, adjusted: 0 };
            destExisting.purchased += item.quantity; // Increase at destination
            inventoryMap.set(destKey, destExisting);
          }
        }
      });
    }
  });

  // Process sales and internal transfers from sales
  currentSalesOrders.forEach(so => {
    if (orderBeingEdited && so.id === orderBeingEdited.id) {
      return; // Exclude the order being edited from stock calculation
    }
    if ((so.status === 'completed' || so.status === 'pending') && so.warehouse) {
      so.items.forEach(item => {
        if (item.unit === 'Kilos') {
          // Always decrease stock from the source warehouse
          const sourceKey = `${item.product} - ${item.caliber} - ${so.warehouse}`;
          const sourceExisting = inventoryMap.get(sourceKey) || { purchased: 0, sold: 0, adjusted: 0 };
          sourceExisting.sold += item.quantity;
          inventoryMap.set(sourceKey, sourceExisting);

          // If it is an internal warehouse transfer, it must be added to the destination
          if (so.movementType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
            const destKey = `${item.product} - ${item.caliber} - ${so.destinationWarehouse}`;
            const destExisting = inventoryMap.get(destKey) || { purchased: 0, sold: 0, adjusted: 0 };
            destExisting.purchased += item.quantity; // Treat as a "purchase" for the destination
            inventoryMap.set(destKey, destExisting);
          }
        }
      });
    }
  });

  // Process adjustments
  if (currentAdjustments) {
    currentAdjustments.forEach(adj => {
      const key = `${adj.product} - ${adj.caliber} - ${adj.warehouse}`;
      const existing = inventoryMap.get(key) || { purchased: 0, sold: 0, adjusted: 0 };
      if (adj.type === 'increase') {
        existing.adjusted += adj.quantity;
      } else {
        existing.adjusted -= adj.quantity;
      }
      inventoryMap.set(key, existing);
    });
  }

  const inventory: InventoryItem[] = [];
  inventoryMap.forEach((value, key) => {
    const [product, caliber, warehouse] = key.split(' - ');
    inventory.push({
      key,
      product,
      caliber,
      warehouse,
      kilosPurchased: value.purchased,
      kilosSold: value.sold,
      stock: value.purchased - value.sold + value.adjusted,
    });
  });

  return inventory.sort((a,b) => a.key.localeCompare(b.key));
};
