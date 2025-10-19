

import { Contact, PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, InventoryItem, Interaction, BankAccount, InventoryAdjustment } from './types';
import { initialCalibers } from './master-data';
import { format } from 'date-fns';

export const contacts: Contact[] = [
  { id: '1', name: 'Agrícola Santa Cruz', rut: '76.123.456-7', address: 'Fundo El Sol, Parcela 4', commune: 'Santa Cruz', email: 'contacto@agrisc.cl', contactPerson: 'Juan Pérez', type: ['supplier'], tags: ['Proveedor Estratégico', 'Uva'], interactions: [
    { id: 'int-1', date: '2023-09-15', type: 'Llamada', notes: 'Conversación inicial sobre precios de la temporada.' },
    { id: 'int-2', date: '2023-09-20', type: 'Acuerdo', notes: 'Acuerdo de compra de 10,000 kg de Cerezas a $5000/kg.' },
  ]},
  { id: '2', name: 'Exportadora Frutillar', rut: '78.987.654-3', address: 'Av. Las Condes 1234', commune: 'Las Condes', email: 'compras@frutillar.com', contactPerson: 'Maria Rodriguez', type: ['client'], tags: ['Cliente Premium', 'Exportación'] },
  { id: '3', name: 'Supermercados del Sur', rut: '80.456.789-1', address: 'Ruta 5 Sur, Km 180', commune: 'Curicó', email: 'adquisiciones@sds.cl', contactPerson: 'Carlos Soto', type: ['client'], tags: ['Retail'] },
  { id: '4', name: 'Transportes Rapido', rut: '77.555.444-K', address: 'Calle Larga 567', commune: 'Rancagua', email: 'fletes@transrapido.cl', contactPerson: 'Ana Gomez', type: ['supplier'], tags: ['Logística'] },
  { id: '5', name: 'Productor de Paltas de Quillota', rut: '79.111.222-3', address: 'Hijuela Larga s/n', commune: 'Quillota', email: 'palta.quillota@email.com', contactPerson: 'Miguel Angel', type: ['supplier'], tags: [] },
  { id: '6', name: 'Fruits & Co. SpA', rut: '81.222.333-4', address: 'Av. del Mar 4500', commune: 'La Serena', email: 'hello@fruits.co', contactPerson: 'Sofia Lopez', type: ['client'], tags: ['Exportación', 'Asia'] },
];

const rawPurchaseOrders: Omit<PurchaseOrder, 'items'> & { items: Omit<PurchaseOrder['items'][0], 'lotNumber'>[] }[] = [
  { id: 'OC-1001', supplierId: '1', date: '2023-10-01', items: [{ id: 'p1', product: 'UVAS', caliber: 'PRIMERA', quantity: 5000, unit: 'Kilos', price: 3000, packagingQuantity: 250, packagingType: 'CAJAS' }, { id: 'p2', product: 'UVAS', caliber: 'SEGUNDA', quantity: 3000, unit: 'Kilos', price: 2500, packagingQuantity: 150, packagingType: 'CAJAS' }], totalAmount: 22500000, totalKilos: 8000, totalPackages: 400, status: 'completed', warehouse: 'Bodega Principal', paymentStatus: 'Abonado' },
  { id: 'OC-1002', supplierId: '5', date: '2023-10-08', items: [{ id: 'p3', product: 'PALTAS', caliber: 'EXTRA', quantity: 6000, unit: 'Kilos', price: 4000, packagingQuantity: 300, packagingType: 'CAJAS' }, { id: 'p4', product: 'PALTAS', caliber: 'PRIMERA', quantity: 4000, unit: 'Kilos', price: 3500, packagingQuantity: 200, packagingType: 'CAJAS' }], totalAmount: 38000000, totalKilos: 10000, totalPackages: 500, status: 'completed', warehouse: 'Bodega Principal', paymentStatus: 'Abonado' },
  { id: 'OC-1003', supplierId: '1', date: '2023-10-15', items: [{ id: 'p5', product: 'DURAZNOS', caliber: 'EXTRA', quantity: 7000, unit: 'Kilos', price: 2000, packagingQuantity: 350, packagingType: 'CAJAS' }, { id: 'p6', product: 'DURAZNOS', caliber: 'PRIMERA', quantity: 2000, unit: 'Kilos', price: 1500, packagingQuantity: 100, packagingType: 'CAJAS' }], totalAmount: 17000000, totalKilos: 9000, totalPackages: 450, status: 'completed', warehouse: 'Bodega Principal', paymentStatus: 'Pendiente' },
];

export const purchaseOrders: PurchaseOrder[] = rawPurchaseOrders.map(order => ({
  ...order,
  items: order.items.map((item, index) => {
    const datePart = format(new Date(order.date), 'ddMMyy');
    return {
      ...item,
      lotNumber: `LOTE-${datePart}-${order.supplierId}-${index}`
    };
  })
}));


export const salesOrders: SalesOrder[] = [
  { id: 'OV-2001', clientId: '2', date: '2023-10-05', items: [{ id: 's1', product: 'UVAS', caliber: 'PRIMERA', quantity: 4000, unit: 'Kilos', price: 4500, packagingQuantity: 200, lotNumber: 'LOTE-011023-1-0' }, { id: 's2', product: 'UVAS', caliber: 'SEGUNDA', quantity: 2000, unit: 'Kilos', price: 5000, packagingQuantity: 100, lotNumber: 'LOTE-011023-1-1' }], totalKilos: 6000, totalPackages: 300, totalAmount: 28000000, relatedPurchaseIds: ['OC-1001'], status: 'completed', paymentMethod: 'Contado', warehouse: 'Bodega Principal', paymentStatus: 'Pagado', orderType: 'sales', includeVat: true },
  { id: 'OV-2002', clientId: '3', date: '2023-10-12', items: [{ id: 's3', product: 'PALTAS', caliber: 'EXTRA', quantity: 5000, unit: 'Kilos', price: 4500, packagingQuantity: 250, lotNumber: 'LOTE-081023-5-0' }, { id: 's4', product: 'PALTAS', caliber: 'PRIMERA', quantity: 3000, unit: 'Kilos', price: 5000, packagingQuantity: 150, lotNumber: 'LOTE-081023-5-1' }], totalKilos: 8000, totalPackages: 400, totalAmount: 37500000, relatedPurchaseIds: ['OC-1002'], status: 'completed', paymentMethod: 'Pago con Anticipo y Saldo', advancePercentage: 50, advanceDueDate: '2023-10-20', balanceDueDate: '2023-11-20', warehouse: 'Cámara de Frío 1', paymentStatus: 'Pagado', orderType: 'sales', includeVat: true },
  { id: 'OV-2003', clientId: '2', date: '2023-10-20', items: [{ id: 's5', product: 'DURAZNOS', caliber: 'EXTRA', quantity: 6000, unit: 'Kilos', price: 5500, packagingQuantity: 300, lotNumber: 'LOTE-151023-1-0' }], totalKilos: 6000, totalPackages: 300, totalAmount: 33000000, relatedPurchaseIds: ['OC-1003'], status: 'pending', paymentMethod: 'Crédito', warehouse: 'Bodega Principal', paymentStatus: 'Pendiente', orderType: 'sales', includeVat: true },
];

export const serviceOrders: ServiceOrder[] = [
  { id: 'OS-001', provider: 'Transportes Rapido', date: '2023-10-01', serviceType: 'Flete', cost: 300000, relatedPurchaseId: 'OC-1001', description: 'Flete OC-1001 desde Santa Cruz a planta', paymentStatus: 'Pagado' },
  { id: 'OS-002', provider: 'Personal Externo', date: '2023-10-03', serviceType: 'Selección de fruta', cost: 800000, relatedPurchaseId: 'OC-1001', description: 'Selección y embalaje para OV-001', paymentStatus: 'Pagado' },
  { id: 'OS-003', provider: 'Transportes Rapido', date: '2023-10-08', serviceType: 'Flete', cost: 350000, relatedPurchaseId: 'OC-1002', description: 'Flete OC-1002 desde Santa Cruz a planta', paymentStatus: 'Pendiente' },
];

export const financialMovements: FinancialMovement[] = [
  { id: 'M-001', date: '2023-10-07', type: 'income', description: 'Pago OV-001 - Exportadora Frutillar', amount: 28000000, paymentMethod: 'Transferencia', destinationAccountId: 'acc-1', contactId: '2', relatedDocument: { type: 'OV', id: 'OV-2001' } },
  { id: 'M-002', date: '2023-10-02', type: 'expense', description: 'Pago 50% OC-1001 - Agrícola Santa Cruz', amount: 11250000, paymentMethod: 'Transferencia', sourceAccountId: 'acc-1', contactId: '1', relatedDocument: { type: 'OC', id: 'OC-1001' } },
  { id: 'M-003', date: '2023-10-02', type: 'expense', description: 'Pago OS-001 - Transportes Rapido', amount: 300000, paymentMethod: 'Efectivo', sourceAccountId: 'acc-2', relatedDocument: { type: 'OS', id: 'OS-001' } },
  { id: 'M-004', date: '2023-10-04', type: 'expense', description: 'Pago OS-002 - Personal Externo', amount: 800000, paymentMethod: 'Transferencia', sourceAccountId: 'acc-1', relatedDocument: { type: 'OS', id: 'OS-002' } },
  { id: 'M-005', date: '2023-10-14', type: 'income', description: 'Pago OV-002 - Supermercados del Sur', amount: 37500000, paymentMethod: 'Transferencia', destinationAccountId: 'acc-1', contactId: '3', relatedDocument: { type: 'OV', id: 'OV-2002' } },
  { id: 'M-006', date: '2023-10-09', type: 'expense', description: 'Pago 50% OC-1002 - Agrícola Santa Cruz', amount: 19000000, paymentMethod: 'Transferencia', sourceAccountId: 'acc-1', contactId: '5', relatedDocument: { type: 'OC', id: 'OC-1002' } },
];

export const inventoryAdjustments: InventoryAdjustment[] = [
  { id: 'ADJ-1', date: '2023-10-10', product: 'UVAS', caliber: 'PRIMERA', warehouse: 'Bodega Principal', type: 'decrease', quantity: 50, packagingQuantity: 2, reason: 'Merma por manipulación' },
];


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
          const sourceKey = `${item.product} - ${item.caliber} - ${po.warehouse}`;
          const sourceExisting = inventoryMap.get(sourceKey) || { purchased: 0, sold: 0, adjusted: 0 };
          sourceExisting.purchased += item.quantity;
          inventoryMap.set(sourceKey, sourceExisting);

          if (po.destinationWarehouse && po.destinationWarehouse !== po.warehouse) {
            sourceExisting.sold += item.quantity; // Decrease from source
            inventoryMap.set(sourceKey, sourceExisting);

            const destKey = `${item.product} - ${item.caliber} - ${po.destinationWarehouse}`;
            const destExisting = inventoryMap.get(destKey) || { purchased: 0, sold: 0, adjusted: 0 };
            destExisting.purchased += item.quantity; // Increase in destination
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
          // Always decrease stock from the source warehouse for any sale/dispatch
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
