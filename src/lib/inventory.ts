
import { PurchaseOrder, SalesOrder, InventoryAdjustment, InventoryItem } from './types';
import { parseISO, isBefore, isAfter } from 'date-fns';

/**
 * Calculates the current inventory based on purchase orders, sales orders, and adjustments.
 * An optional 'excludeOrder' can be passed to calculate stock as if that order never happened,
 * useful for checking availability when editing an existing order.
 */
export function getInventory(
  purchaseOrders: PurchaseOrder[],
  salesOrders: SalesOrder[],
  inventoryAdjustments: InventoryAdjustment[],
  excludeOrder?: SalesOrder | PurchaseOrder | null,
): InventoryItem[] {

  const inventoryMap = new Map<string, InventoryItem>();

  const processItem = (
    item: any, // Can be from PO or SO
    warehouse: string,
    multiplier: 1 | -1,
    date: string,
  ) => {
    // Generate a unique key for each product/caliber/warehouse combination
    const key = `${item.product}-${item.caliber}-${warehouse}`;
    
    if (!inventoryMap.has(key)) {
      inventoryMap.set(key, {
        id: key,
        product: item.product,
        caliber: item.caliber,
        warehouse: warehouse,
        stock: 0,
        packagingQuantity: 0,
        packagingType: item.packagingType || '',
      });
    }

    const inventoryItem = inventoryMap.get(key)!;
    inventoryItem.stock += (item.quantity || 0) * multiplier;
    inventoryItem.packagingQuantity += (item.packagingQuantity || 0) * multiplier;
  };

  // 1. Process Purchase Orders (Inflows)
  purchaseOrders.forEach(po => {
    // Exclude if it's the order being edited
    if (excludeOrder && excludeOrder.id === po.id && excludeOrder.orderType === 'purchase') return;

    if (po.status === 'completed' || po.status === 'received') {
      po.items.forEach(item => {
        processItem(item, po.warehouse, 1, po.date);
      });
    }
  });

  // 2. Process Sales Orders (Outflows and Transfers)
  salesOrders.forEach(so => {
    // Exclude if it's the order being edited
    if (excludeOrder && excludeOrder.id === so.id && excludeOrder.orderType === 'sale') return;
    
    if (so.status !== 'cancelled' && so.status !== 'draft') {
        so.items.forEach(item => {
            // Outflow from source warehouse
            processItem(item, so.warehouse, -1, so.date);
            // Inflow to destination warehouse for transfers
            if (so.saleType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
                processItem(item, so.destinationWarehouse, 1, so.date);
            }
        });
    }
  });

  // 3. Process Adjustments
  inventoryAdjustments.forEach(adj => {
    const multiplier = adj.type === 'increase' ? 1 : -1;
    processItem({
        product: adj.product,
        caliber: adj.caliber,
        quantity: adj.quantity,
        packagingQuantity: adj.packagingQuantity || 0,
        packagingType: '' // Not relevant for stock calculation itself
    }, adj.warehouse, multiplier, adj.date);
  });

  return Array.from(inventoryMap.values());
}
