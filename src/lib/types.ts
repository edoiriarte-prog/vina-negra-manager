

export type Interaction = {
  id: string;
  date: string;
  type: 'Llamada' | 'Reunión' | 'Email' | 'Acuerdo' | 'Cotizacion';
  notes: string;
};

export type ContactType = 'client' | 'supplier' | 'other_income' | 'other_expense';

export type Contact = {
  id: string;
  name: string;
  rut: string;
  address: string;
  commune: string;
  email: string;
  contactPerson: string;
  type: ContactType[] | 'client' | 'supplier' | 'both'; // `both` is for backwards compatibility
  tags?: string[];
  interactions?: Interaction[];
};

export type OrderItem = {
  id: string;
  product: string;
  caliber: string;
  quantity: number;
  unit: 'Kilos' | 'Cajas';
  price: number;
  packagingType?: string;
  packagingQuantity?: number;
  lotNumber?: string;
};

export type PackagingItem = {
  id: string;
  type: string;
  quantity: number;
};

export type PaymentInstallment = {
  id: string;
  salesOrderId: string;
  type: 'advance' | 'balance';
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
};

export type SalesOrder = {
  id: string;
  clientId: string;
  date: string;
  items: OrderItem[];
  totalKilos: number;
  totalPackages: number;
  totalAmount: number;
  relatedPurchaseIds: string[];
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: 'Contado' | 'Crédito' | 'Pago con Anticipo y Saldo';
  advancePercentage?: number;
  advanceDueDate?: string;
  balanceDueDate?: string;
  warehouse?: string;
  paymentStatus?: 'Pendiente' | 'Abonado' | 'Pagado';
  purchaseOrder?: string;
  saleType?: 'Venta Firme' | 'Consignación' | 'Mínimo Garantizado';
  movementType?: 'Venta Directa' | 'Traslado a Bodega Externa';
  destinationWarehouse?: string;
  carrierId?: string;
  driverName?: string;
  licensePlate?: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  date: string;
  items: OrderItem[];
  totalAmount: number;
  totalKilos: number;
  totalPackages: number;
  status: 'pending' | 'completed' | 'cancelled';
  warehouse: string;
  paymentStatus?: 'Pendiente' | 'Abonado' | 'Pagado';
};

export type ServiceOrder = {
  id: string;
  provider: string;
  date: string;
  serviceType: string;
  cost: number;
  relatedPurchaseId?: string;
  description: string;
  paymentStatus?: 'Pendiente' | 'Abonado' | 'Pagado';
};

export type FinancialMovement = {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'traspaso';
  description: string;
  amount: number;
  paymentMethod: 'Transferencia' | 'Efectivo' | 'Depósito Bancario' | 'Cheque';
  
  // For income and traspasos
  destinationAccountId?: string; 
  
  // For expenses and traspasos
  sourceAccountId?: string;

  contactId?: string;
  relatedDocument?: {
    type: 'OV' | 'OC' | 'OS';
    id: string;
  };
  internalConcept?: 'Retiro de Socios' | 'Pago de Impuestos' | 'Comisión Bancaria' | 'Préstamo Interno' | 'Otro';
  productId?: string;
  reference?: string;
};

export type InventoryItem = {
  key: string;
  product: string;
  caliber: string;
  warehouse: string;
  kilosPurchased: number;
  kilosSold: number;
  stock: number;
};

export type InventoryAdjustment = {
  id: string;
  date: string;
  product: string;
  caliber: string;
  warehouse: string;
  type: 'increase' | 'decrease';
  quantity: number; // Kilos
  packagingQuantity?: number; // Packages
  reason: string;
};

export type BankAccount = {
    id: string;
    name: string;
    accountType: 'Cuenta Corriente' | 'Cuenta Vista' | 'Línea de Crédito' | 'Efectivo';
    accountNumber?: string;
    bankName?: string;
    initialBalance: number;
    status: 'Activa' | 'Inactiva';
    owner?: string;
}

    

    
