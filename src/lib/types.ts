export type Interaction = {
  id: string;
  date: string;
  type: 'Llamada' | 'Reunión' | 'Email' | 'Acuerdo';
  notes: string;
};

export type Contact = {
  id: string;
  name: string;
  rut: string;
  address: string;
  commune: string;
  email: string;
  contactPerson: string;
  type: 'client' | 'supplier';
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
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  date: string;
  items: OrderItem[];
  totalAmount: number;
  totalKilos: number;
  status: 'pending' | 'completed' | 'cancelled';
};

export type ServiceOrder = {
  id: string;
  provider: string;
  date: string;
  serviceType: string;
  cost: number;
  relatedPurchaseId?: string;
  description: string;
};

export type FinancialMovement = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  contactId?: string;
  relatedOrder?: {
    type: 'OV' | 'OC' | 'OS';
    id: string;
  };
};

export type InventoryItem = {
  caliber: string;
  kilosPurchased: number;
  kilosSold: number;
  stock: number;
};
