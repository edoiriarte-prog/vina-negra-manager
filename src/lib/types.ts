// --- 1. TIPOS DE CONTACTOS (LO NUEVO) ---
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
  // Aceptamos array de ContactType o string[] para evitar conflictos con formularios antiguos
  type: ContactType[] | string[]; 
  tags?: string[];
  address?: string;
  commune?: string;
  contactPerson?: string;
  // Agregamos businessLine porque un error en tu consola decía que faltaba
  businessLine?: string; 
  interactions?: Interaction[];
}

// --- 2. TIPOS DE INVENTARIO Y PRODUCTOS ---
export type Category = 'fruit' | 'supply' | 'service';
export type Unit = 'kg' | 'un' | 'l' | 'm3';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  stock: number;
  unit: Unit;
  minStock: number;
  cost: number;
  price?: number;
  location?: string;
}

// --- 3. TIPOS DE ORDENES (COMPRAS Y VENTAS) ---
// Restauramos esto para que la página de Compras y Ventas no falle
export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string; // ID del producto
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplierId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  number?: string; // Número de orden
}

export interface SalesOrder {
  id: string;
  date: string;
  clientId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  number?: string;
}

// --- 4. FINANZAS ---
// Restauramos esto para que la Cuenta Corriente no falle
export type MovementType = 'income' | 'expense';

export interface FinancialMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MovementType;
  category: string;
  relatedOrderId?: string; // Para vincular con compra/venta
  contactId?: string;
}