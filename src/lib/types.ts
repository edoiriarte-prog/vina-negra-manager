// src/lib/types.ts

// --- 0. TIPOS PRIMITIVOS Y GLOBALES ---
export type ContactType = 'client' | 'supplier' | 'carrier' | 'other_income' | 'other_expense';
export type InteractionType = 'Llamada' | 'Reunión' | 'Email' | 'Acuerdo' | 'Cotizacion';
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'received' | 'dispatched' | 'invoiced' | 'draft';
export type MovementType = 'income' | 'expense' | 'traspaso';
export type Category = 'fruit' | 'supply' | 'service';
export type Unit = 'Kilos' | 'Cajas' | 'Unidades' | 'Litros' | string;
export type PlanningStatus = 'borrador' | 'confirmado' | 'entregado' | 'cancelado';


// --- 1. DATOS MAESTROS Y CONFIGURACIÓN ---
export interface BankAccount {
    id: string;
    name: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    initialBalance: number;
    owner?: string;
    ownerRUT?: string;
    ownerEmail?: string;
    status: 'Activa' | 'Inactiva';
    // --- CAMPOS LEGACY / ALIAS ---
    bank?: string; // Para compatibilidad
    type?: string; // Para compatibilidad
    currency?: 'CLP' | 'USD';
}

export interface Interaction {
  id: string;
  date: string;
  type: InteractionType;
  notes: string;
}

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

// --- 2. ÓRDENES Y TRANSACCIONES ---

export interface OrderItem {
  product: string; 
  caliber: string; 
  quantity: number; 
  packagingQuantity?: number; 
  price: number;
  total?: number; // Calculado en cliente, opcional aquí
  unit?: string;
  lotNumber?: string; 
  format?: string; 
  packagingType?: string;
  id?: string; // Id temporal para el cliente
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplierId: string;
  status: OrderStatus;
  warehouse: string; 
  items: OrderItem[];
  totalAmount: number;
  // Campos opcionales y calculados
  number?: string;
  totalKilos?: number; 
  totalPackages?: number;
  notes?: string;
  includeVat?: boolean;
  orderType?: string;
  // Financiero
  paymentMethod?: string;
  creditDays?: number;
  advancePercentage?: number;
  advanceDueDate?: string | null;
  balanceDueDate?: string | null;
  paymentCondition?: string;
}

export interface ServiceOrder {
    id: string;
    supplierId: string;
    date: string;
    cost: number;
    description?: string; 
    provider?: string;    
    relatedPurchaseId?: string;
}

export interface FinancialMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MovementType;
  category?: string;
  // Relaciones
  contactId?: string;
  relatedDocument?: { 
      id: string; 
      type: 'OV' | 'OC' | 'OS'; 
  } | null;
  // Tesorería Avanzada
  paymentMethod?: string | null;
  sourceAccountId?: string | null;      
  destinationAccountId?: string | null; 
  reference?: string;            
  internalConcept?: string;
  // Nuevos campos del formulario
  voucherNumber?: string | null;
  costCenter?: string;
  manualDteType?: string | null;
  manualDteFolio?: string | null;
  notes?: string | null;
  items?: { concept: string; amount: number; }[];
}

export interface PlannedOrder {
  id: string;
  clientId: string;
  deliveryDate: string;
  status: 'borrador' | 'confirmado' | 'entregado';
  items: OrderItem[];
  totalAmount: number;
  totalKilos: number;
  notes?: string;
  // Campos de compatibilidad con SalesOrder para el sheet
  date: string;
}


// --- 3. ÓRDENES DE VENTA (Más complejo, depende de otros tipos) ---

export interface SalesOrder {
  id: string;
  date: string;
  clientId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  
  // Campos opcionales y calculados
  number?: string;
  warehouse?: string; 
  destinationWarehouse?: string; 
  totalKilos?: number; 
  totalPackages?: number; 
  notes?: string;
  
  // Configuración de Venta
  saleType?: string;       // Ej: 'Venta en Firme', 'Consignación'
  includeVat?: boolean; 
  paymentStatus?: string; 
  orderType?: 'sale' | 'dispatch'; 

  // Campos Financieros
  paymentMethod?: string;  // Ej: 'Contado', 'Crédito'
  creditDays?: number;     // Días de crédito
  paymentDueDate?: string; // Fecha de vencimiento calculada
  advanceAmount?: number;  // Monto anticipo
  bankAccountId?: string;  // ID de la cuenta bancaria seleccionada

  // Campos Logísticos
  transport?: string;      // Empresa de transporte
  driver?: string;         // Nombre del chofer
  plate?: string;          // Patente

  // Campos de Trazabilidad
  dispatchedDate?: string; // Fecha ISO
  invoicedDate?: string;   // Fecha ISO
  invoiceNumber?: string;  // N° Documento

  // Campos opcionales para visualización en PDF/Vistas (Expandidos)
  customer?: Contact;
  bankAccount?: BankAccount;
}
