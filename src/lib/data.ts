import { Contact, PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, InventoryItem } from './types';

export const contacts: Contact[] = [
  { id: '1', name: 'Agrícola Santa Cruz', rut: '76.123.456-7', address: 'Fundo El Sol, Parcela 4', commune: 'Santa Cruz', email: 'contacto@agrisc.cl', contactPerson: 'Juan Pérez', type: 'supplier' },
  { id: '2', name: 'Exportadora Frutillar', rut: '78.987.654-3', address: 'Av. Las Condes 1234', commune: 'Las Condes', email: 'compras@frutillar.com', contactPerson: 'Maria Rodriguez', type: 'client' },
  { id: '3', name: 'Supermercados del Sur', rut: '80.456.789-1', address: 'Ruta 5 Sur, Km 180', commune: 'Curicó', email: 'adquisiciones@sds.cl', contactPerson: 'Carlos Soto', type: 'client' },
  { id: '4', name: 'Transportes Rapido', rut: '77.555.444-K', address: 'Calle Larga 567', commune: 'Rancagua', email: 'fletes@transrapido.cl', contactPerson: 'Ana Gomez', type: 'supplier' },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: 'OC-001', supplierId: '1', date: '2023-10-01', items: [{ id: 'p1', product: 'Cereza', caliber: 'Large', quantity: 5000 }, { id: 'p2', product: 'Cereza', caliber: 'Jumbo', quantity: 3000 }], totalKilos: 8000, totalAmount: 24000000, status: 'completed' },
  { id: 'OC-002', supplierId: '1', date: '2023-10-08', items: [{ id: 'p3', product: 'Cereza', caliber: 'Large', quantity: 6000 }, { id: 'p4', product: 'Cereza', caliber: 'Jumbo', quantity: 4000 }], totalKilos: 10000, totalAmount: 30000000, status: 'completed' },
  { id: 'OC-003', supplierId: '1', date: '2023-10-15', items: [{ id: 'p5', product: 'Cereza', caliber: 'Jumbo', quantity: 7000 }, { id: 'p6', product: 'Cereza', caliber: 'Extra Jumbo', quantity: 2000 }], totalKilos: 9000, totalAmount: 31500000, status: 'completed' },
];

export const salesOrders: SalesOrder[] = [
  { id: 'OV-001', clientId: '2', date: '2023-10-05', items: [{ id: 's1', product: 'Cereza', caliber: 'Large', quantity: 4000 }, { id: 's2', product: 'Cereza', caliber: 'Jumbo', quantity: 2000 }], totalKilos: 6000, totalAmount: 27000000, relatedPurchaseIds: ['OC-001'], status: 'completed' },
  { id: 'OV-002', clientId: '3', date: '2023-10-12', items: [{ id: 's3', product: 'Cereza', caliber: 'Large', quantity: 5000 }, { id: 's4', product: 'Cereza', caliber: 'Jumbo', quantity: 3000 }], totalKilos: 8000, totalAmount: 36000000, relatedPurchaseIds: ['OC-002'], status: 'completed' },
  { id: 'OV-003', clientId: '2', date: '2023-10-20', items: [{ id: 's5', product: 'Cereza', caliber: 'Jumbo', quantity: 6000 }], totalKilos: 6000, totalAmount: 30000000, relatedPurchaseIds: ['OC-003'], status: 'pending' },
];

export const serviceOrders: ServiceOrder[] = [
  { id: 'OS-001', provider: 'Transportes Rapido', date: '2023-10-01', serviceType: 'Flete', cost: 300000, relatedPurchaseId: 'OC-001', description: 'Flete OC-001 desde Santa Cruz a planta' },
  { id: 'OS-002', provider: 'Personal Externo', date: '2023-10-03', serviceType: 'Selección de fruta', cost: 800000, relatedPurchaseId: 'OC-001', description: 'Selección y embalaje para OV-001' },
  { id: 'OS-003', provider: 'Transportes Rapido', date: '2023-10-08', serviceType: 'Flete', cost: 350000, relatedPurchaseId: 'OC-002', description: 'Flete OC-002 desde Santa Cruz a planta' },
];

export const financialMovements: FinancialMovement[] = [
  { id: 'M-001', date: '2023-10-07', type: 'income', description: 'Pago OV-001 - Exportadora Frutillar', amount: 27000000, relatedOrder: { type: 'OV', id: 'OV-001' } },
  { id: 'M-002', date: '2023-10-02', type: 'expense', description: 'Pago 50% OC-001 - Agrícola Santa Cruz', amount: 12000000, relatedOrder: { type: 'OC', id: 'OC-001' } },
  { id: 'M-003', date: '2023-10-02', type: 'expense', description: 'Pago OS-001 - Transportes Rapido', amount: 300000, relatedOrder: { type: 'OS', id: 'OS-001' } },
  { id: 'M-004', date: '2023-10-04', type: 'expense', description: 'Pago OS-002 - Personal Externo', amount: 800000, relatedOrder: { type: 'OS', id: 'OS-002' } },
  { id: 'M-005', date: '2023-10-14', type: 'income', description: 'Pago OV-002 - Supermercados del Sur', amount: 36000000, relatedOrder: { type: 'OV', id: 'OV-002' } },
  { id: 'M-006', date: '2023-10-09', type: 'expense', description: 'Pago 50% OC-002 - Agrícola Santa Cruz', amount: 15000000, relatedOrder: { type: 'OC', id: 'OC-002' } },
];

export const getInventory = (): InventoryItem[] => {
  const inventoryMap = new Map<string, { purchased: number, sold: number }>();

  purchaseOrders.forEach(po => {
    po.items.forEach(item => {
      const existing = inventoryMap.get(item.caliber) || { purchased: 0, sold: 0 };
      existing.purchased += item.quantity;
      inventoryMap.set(item.caliber, existing);
    });
  });

  salesOrders.forEach(so => {
    so.items.forEach(item => {
      const existing = inventoryMap.get(item.caliber) || { purchased: 0, sold: 0 };
      existing.sold += item.quantity;
      inventoryMap.set(item.caliber, existing);
    });
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
