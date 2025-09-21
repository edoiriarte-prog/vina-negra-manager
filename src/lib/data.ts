import { Contact, PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, InventoryItem } from './types';

export const contacts: Contact[] = [
  { id: '1', name: 'Agrícola Santa Cruz', rut: '76.123.456-7', address: 'Fundo El Sol, Parcela 4', commune: 'Santa Cruz', email: 'contacto@agrisc.cl', contactPerson: 'Juan Pérez', type: 'supplier' },
  { id: '2', name: 'Exportadora Frutillar', rut: '78.987.654-3', address: 'Av. Las Condes 1234', commune: 'Las Condes', email: 'compras@frutillar.com', contactPerson: 'Maria Rodriguez', type: 'client' },
  { id: '3', name: 'Supermercados del Sur', rut: '80.456.789-1', address: 'Ruta 5 Sur, Km 180', commune: 'Curicó', email: 'adquisiciones@sds.cl', contactPerson: 'Carlos Soto', type: 'client' },
  { id: '4', name: 'Transportes Rapido', rut: '77.555.444-K', address: 'Calle Larga 567', commune: 'Rancagua', email: 'fletes@transrapido.cl', contactPerson: 'Ana Gomez', type: 'supplier' },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: 'OC-1001', supplierId: '1', date: '2023-10-01', items: [{ id: 'p1', product: 'UVAS', caliber: 'PRIMERA', quantity: 5000, unit: 'Kilos', price: 3000 }, { id: 'p2', product: 'UVAS', caliber: 'SEGUNDA', quantity: 3000, unit: 'Kilos', price: 2500 }], totalAmount: 22500000, totalKilos: 8000, status: 'completed' },
  { id: 'OC-1002', supplierId: '1', date: '2023-10-08', items: [{ id: 'p3', product: 'PALTAS', caliber: 'EXTRA', quantity: 6000, unit: 'Kilos', price: 4000 }, { id: 'p4', product: 'PALTAS', caliber: 'PRIMERA', quantity: 4000, unit: 'Kilos', price: 3500 }], totalAmount: 38000000, totalKilos: 10000, status: 'completed' },
  { id: 'OC-1003', supplierId: '1', date: '2023-10-15', items: [{ id: 'p5', product: 'DURAZNOS', caliber: 'EXTRA', quantity: 7000, unit: 'Kilos', price: 2000 }, { id: 'p6', product: 'DURAZNOS', caliber: 'PRIMERA', quantity: 2000, unit: 'Kilos', price: 1500 }], totalAmount: 17000000, totalKilos: 9000, status: 'completed' },
];

export const salesOrders: SalesOrder[] = [
  { id: 'OV-001', clientId: '2', date: '2023-10-05', items: [{ id: 's1', product: 'Cereza', caliber: 'Large', quantity: 4000, unit: 'Kilos', price: 4500 }, { id: 's2', product: 'Cereza', caliber: 'Jumbo', quantity: 2000, unit: 'Kilos', price: 5000 }], totalKilos: 6000, totalAmount: 28000000, relatedPurchaseIds: ['OC-1001'], status: 'completed', paymentMethod: 'Contado' },
  { id: 'OV-002', clientId: '3', date: '2023-10-12', items: [{ id: 's3', product: 'Cereza', caliber: 'Large', quantity: 5000, unit: 'Kilos', price: 4500 }, { id: 's4', product: 'Cereza', caliber: 'Jumbo', quantity: 3000, unit: 'Kilos', price: 5000 }], totalKilos: 8000, totalAmount: 37500000, relatedPurchaseIds: ['OC-1002'], status: 'completed', paymentMethod: 'Pago con Anticipo y Saldo', advancePercentage: 50, advanceDueDate: '2023-10-20', balanceDueDate: '2023-11-20' },
  { id: 'OV-003', clientId: '2', date: '2023-10-20', items: [{ id: 's5', product: 'Cereza', caliber: 'Jumbo', quantity: 6000, unit: 'Kilos', price: 5500 }], totalKilos: 6000, totalAmount: 33000000, relatedPurchaseIds: ['OC-1003'], status: 'pending', paymentMethod: 'Crédito' },
];

export const serviceOrders: ServiceOrder[] = [
  { id: 'OS-001', provider: 'Transportes Rapido', date: '2023-10-01', serviceType: 'Flete', cost: 300000, relatedPurchaseId: 'OC-1001', description: 'Flete OC-1001 desde Santa Cruz a planta' },
  { id: 'OS-002', provider: 'Personal Externo', date: '2023-10-03', serviceType: 'Selección de fruta', cost: 800000, relatedPurchaseId: 'OC-1001', description: 'Selección y embalaje para OV-001' },
  { id: 'OS-003', provider: 'Transportes Rapido', date: '2023-10-08', serviceType: 'Flete', cost: 350000, relatedPurchaseId: 'OC-1002', description: 'Flete OC-1002 desde Santa Cruz a planta' },
];

export const financialMovements: FinancialMovement[] = [
  { id: 'M-001', date: '2023-10-07', type: 'income', description: 'Pago OV-001 - Exportadora Frutillar', amount: 28000000, relatedOrder: { type: 'OV', id: 'OV-001' } },
  { id: 'M-002', date: '2023-10-02', type: 'expense', description: 'Pago 50% OC-1001 - Agrícola Santa Cruz', amount: 11250000, relatedOrder: { type: 'OC', id: 'OC-1001' } },
  { id: 'M-003', date: '2023-10-02', type: 'expense', description: 'Pago OS-001 - Transportes Rapido', amount: 300000, relatedOrder: { type: 'OS', id: 'OS-001' } },
  { id: 'M-004', date: '2023-10-04', type: 'expense', description: 'Pago OS-002 - Personal Externo', amount: 800000, relatedOrder: { type: 'OS', id: 'OS-002' } },
  { id: 'M-005', date: '2023-10-14', type: 'income', description: 'Pago OV-002 - Supermercados del Sur', amount: 37500000, relatedOrder: { type: 'OV', id: 'OV-002' } },
  { id: 'M-006', date: '2023-10-09', type: 'expense', description: 'Pago 50% OC-1002 - Agrícola Santa Cruz', amount: 19000000, relatedOrder: { type: 'OC', id: 'OC-1002' } },
];

export const getInventory = (
  currentPurchaseOrders?: PurchaseOrder[],
  currentSalesOrders?: SalesOrder[]
): InventoryItem[] => {
  const inventoryMap = new Map<string, { purchased: number, sold: number }>();
  const purchases = currentPurchaseOrders || [];
  const sales = currentSalesOrders || [];

  purchases.forEach(po => {
    if (po.status === 'completed') {
      po.items.forEach(item => {
        if (item.unit === 'Kilos') {
          const key = `${item.product} - ${item.caliber}`;
          const existing = inventoryMap.get(key) || { purchased: 0, sold: 0 };
          existing.purchased += item.quantity;
          inventoryMap.set(key, existing);
        }
      });
    }
  });

  sales.forEach(so => {
     if (so.status === 'completed') {
      so.items.forEach(item => {
        if (item.unit === 'Kilos') {
          const key = `${item.product} - ${item.caliber}`;
          const existing = inventoryMap.get(key) || { purchased: 0, sold: 0 };
          existing.sold += item.quantity;
          inventoryMap.set(key, existing);
        }
      });
    }
  });

  const inventory: InventoryItem[] = [];
  inventoryMap.forEach((value, key) => {
    inventory.push({
      caliber: key,
      kilosPurchased: value.purchased,
      kilosSold: value.sold,
      stock: value.purchased - value.sold,
    });
  });

  return inventory;
};
