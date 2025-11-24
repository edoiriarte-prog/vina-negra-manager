// src/lib/types.ts

// --- 1. CONTACTOS ---
export type InteractionType = 'Llamada' | 'Reunión' | 'Email' | 'Acuerdo' | 'Cotizacion';

export interface Interaction {
  id: string;
  date: string;
  type: InteractionType;
  notes: string;
}

export type ContactType = 'client' | 'supplier' | 'carrier' | 'other_income' | 'other_expense';

export interface Contact {
  id: string;
  rut: string;
  name: string;
  email: string;
  type: ContactType[] | string[]; 
  tags?: string[];
  address?: string;
  commune?: string;
  contactPerson?: string;
  businessLine?: string; 
  interactions?: Interaction[];
}

// --- 2. PRODUCTOS E INVENTARIO ---
export type Category = 'fruit' | 'supply' | 'service';
export type Unit = 'Kilos' | 'Cajas' | 'Unidades' | 'Litros' | string;

export interface InventoryItem {
  id: string;
  name: string;
  category?: Category;
  stock: number; 
  unit: Unit;
  minStock?: number;
  cost?: number;
  price?: number;
  location?: string;
  caliber?: string;
  warehouse?: string;
}

export interface InventoryAdjustment {
    id: string;
    date: string;
    product: string;
    caliber: string;
    warehouse: string;
    type: 'increase' | 'decrease';
    quantity: number; 
    packagingQuantity?: number; 
    reason: string;
    lotNumber?: string;
    notes?: string;
}

// --- 3. ÓRDENES (COMPRAS Y VENTAS) ---

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'received' | 'dispatched' | 'invoiced' | 'draft';

export interface OrderItem {
  product: string; 
  caliber: string; 
  quantity: number; 
  packagingQuantity?: number; 
  price: number;
  total: number; 
  unit?: string;
  lotNumber?: string; 
  format?: string; 
  packagingType?: string; // Alias para format
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplierId: string;
  status: OrderStatus;
  warehouse: string; 
  destinationWarehouse?: string; 
  items: OrderItem[];
  totalAmount: number;
  totalKilos?: number; 
  notes?: string;
  number?: string;
  paymentCondition?: string;
  includeVat?: boolean; // <--- PROPIEDAD AGREGADA
}

export interface SalesOrder {
  id: string;
  date: string;
  clientId: string;
  status: OrderStatus;
  warehouse?: string; 
  destinationWarehouse?: string; 
  items: OrderItem[];
  totalAmount: number;
  totalKilos?: number; 
  totalPackages?: number; // <--- PROPIEDAD AGREGADA
  notes?: string;
  number?: string;
  saleType?: string; 
  includeVat?: boolean; // <--- PROPIEDAD AGREGADA
  paymentStatus?: string; // <--- PROPIEDAD AGREGADA
  orderType?: 'sale' | 'dispatch'; // Para diferenciar en lógica interna
}

// Servicos (Placeholder)
export interface ServiceOrder {
    id: string;
    supplierId: string;
    date: string;
    cost: number;
}

// --- 4. FINANZAS ---
export type MovementType = 'income' | 'expense';

export interface FinancialMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MovementType;
  category: string;
  relatedOrderId?: string;
  contactId?: string;
  status?: 'paid' | 'pending';
  relatedDocument?: { id: string };
}

// --- 5. CONFIGURACIÓN Y OTROS ---
export interface BankAccount {
    id: string;
    name: string;
    bank: string;
    accountNumber: string;
    type: 'Corriente' | 'Vista' | 'Ahorro';
    currency: 'CLP' | 'USD';
    initialBalance: number;
}