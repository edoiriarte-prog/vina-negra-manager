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
  type: ContactType[] | string[]; // Array para soportar múltiples roles
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

// Item maestro de inventario
export interface InventoryItem {
  id: string;
  name: string;
  category?: Category;
  stock: number; // Stock total calculado
  unit: Unit;
  minStock?: number;
  cost?: number;
  price?: number;
  location?: string;
  // Campos auxiliares para lógica de fruta
  caliber?: string;
  warehouse?: string;
}

// Ajustes manuales de inventario (Mermas, correcciones)
export interface InventoryAdjustment {
    id: string;
    date: string;
    product: string;
    caliber: string;
    warehouse: string;
    type: 'increase' | 'decrease';
    quantity: number; // Kilos
    packagingQuantity?: number; // Cajas/Envases
    reason: string;
    lotNumber?: string;
    notes?: string;
}

// --- 3. ÓRDENES (COMPRAS Y VENTAS) ---

// Estados ampliados para soportar el flujo real
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'received' | 'dispatched' | 'invoiced' | 'draft';

// Item dentro de una orden (Detalle)
export interface OrderItem {
  product: string; // ID o Nombre del producto
  caliber: string; // Importante para fruta
  quantity: number; // Cantidad principal (ej: Kilos)
  packagingQuantity?: number; // Cantidad secundaria (ej: Cajas)
  price: number;
  total: number; // quantity * price
  unit?: string;
  lotNumber?: string; // Para trazabilidad
  format?: string; // Tipo de envase
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplierId: string;
  status: OrderStatus;
  warehouse: string; // Bodega de recepción
  destinationWarehouse?: string; // Por si acaso
  items: OrderItem[];
  totalAmount: number;
  totalKilos?: number; // Opcional, calculado
  notes?: string;
  number?: string;
  paymentCondition?: string;
}

export interface SalesOrder {
  id: string;
  date: string;
  clientId: string;
  status: OrderStatus;
  warehouse?: string; // Bodega de origen
  destinationWarehouse?: string; // Para traslados internos
  items: OrderItem[];
  totalAmount: number;
  totalKilos?: number; // Opcional, calculado
  notes?: string;
  number?: string;
  saleType?: string; // 'Venta Nacional', 'Exportación', 'Traslado Bodega Interna'
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