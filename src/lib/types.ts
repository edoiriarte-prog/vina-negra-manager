export interface OrderItem {
  id?: string;
  product: string;
  caliber: string;
  packagingType?: string;
  packagingQuantity?: number;
  quantity: number;
  price?: number;
  unit?: string;
  lotNumber?: string; // For traceability
}

// --- PURCHASE ORDER (Compras) ---
export interface PurchaseOrder {
  id: string;
  date: string;
  supplierId: string;
  warehouse: string;
  items: OrderItem[];
  totalPackages: number;
  totalKilos: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  orderType: 'purchase';
  
  // Optional fields
  notes?: string | null;
  advanceDueDate?: string | null;
  balanceDueDate?: string | null;
  creditDays?: number;
  advancePercentage?: number;
  receivedAt?: string; // For traceability
}

// --- SALES ORDER (Ventas) ---
export interface SalesOrder {
  id: string;
  date: string;
  clientId: string;
  warehouse: string;
  items: OrderItem[];
  totalPackages: number;
  totalKilos: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  saleType: string; // 'Venta Firme', 'Consignación', etc.
  orderType: 'sales';

  // Logistics
  destinationWarehouse?: string | null;
  carrierId?: string | null;
  driverName?: string | null;
  licensePlate?: string | null;

  // Financials
  notes?: string | null;
  advanceDueDate?: string | null;
  balanceDueDate?: string | null;
  creditDays?: number;
  advancePercentage?: number;
  destinationAccountId?: string | null;
  relatedPurchaseIds?: string[]; 
  dispatchedAt?: string;
}

// --- MASTER DATA ENTITIES ---
export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderRut: string;
  email?: string;
}

export interface Contact {
  id: string;
  name: string;
  rut: string;
  type: 'client' | 'supplier' | 'carrier' | 'both';
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
  commune?: string;
  businessLine?: string;
  contactPerson?: string;
}

export interface InventoryItem {
  id: string;
  product: string;
  caliber: string;
  warehouse: string;
  stock: number;
  packagingType?: string;
  packagingQuantity?: number;
  averageCost?: number;
  updatedAt?: string;
}