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
  packagingType?: string; 
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
  totalPackages?: number;
  notes?: string;
  number?: string;
  
  // Financiero
  paymentMethod?: string;
  creditDays?: number;
  advancePercentage?: number;
  advanceDueDate?: string | null;
  balanceDueDate?: string | null;
  paymentCondition?: string;
  includeVat?: boolean;
  orderType?: string;
}

// --- ACTUALIZACIÓN PRINCIPAL AQUÍ ---
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
  totalPackages?: number; 
  notes?: string;
  number?: string;
  
  // Configuración de Venta
  saleType?: string;       // Ej: 'Venta en Firme', 'Consignación'
  includeVat?: boolean; 
  paymentStatus?: string; 
  orderType?: 'sale' | 'dispatch'; 

  // Nuevos Campos Financieros (Soluciona errores del formulario)
  paymentMethod?: string;  // Ej: 'Contado', 'Crédito'
  creditDays?: number;     // Días de crédito
  paymentDueDate?: string; // Fecha de vencimiento calculada
  advanceAmount?: number;  // Monto anticipo
  bankAccountId?: string;  // ID de la cuenta bancaria seleccionada

  // Nuevos Campos Logísticos (Soluciona errores de Chofer/Patente)
  transport?: string;      // Empresa de transporte
  driver?: string;         // Nombre del chofer
  plate?: string;          // Patente
  driverName?: string;     // Alias para compatibilidad
  licensePlate?: string;   // Alias para compatibilidad

  // Campos opcionales para visualización en PDF/Vistas (Expandidos)
  customer?: Contact;
  bankAccount?: BankAccount;
}

// --- 4. FINANZAS Y SERVICIOS ---

export interface ServiceOrder {
    id: string;
    supplierId: string;
    date: string;
    cost: number;
    description?: string; 
    provider?: string;    
}

export type MovementType = 'income' | 'expense' | 'traspaso';

export interface FinancialMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MovementType;
  category?: string;
  
  // Relaciones
  relatedOrderId?: string;
  contactId?: string;
  relatedDocument?: { 
      id: string; 
      type: 'OV' | 'OC' | 'OS'; 
  };

  status?: 'paid' | 'pending';

  // Tesorería Avanzada
  paymentMethod?: string;
  sourceAccountId?: string;      
  destinationAccountId?: string; 
  reference?: string;            
  internalConcept?: string;
  productId?: string;
}

// --- 5. CONFIGURACIÓN Y BANCAS ---
export interface BankAccount {
    id: string;
    name: string;
    bank: string;
    accountNumber: string;
    type: 'Corriente' | 'Vista' | 'Ahorro';
    currency: 'CLP' | 'USD';
    initialBalance: number;
    status?: 'Activa' | 'Inactiva';
    bankName?: string; 
    accountType?: string; // Alias agregado para compatibilidad con PDF
}

// --- 6. PLANIFICACIÓN COMERCIAL ---
export type PlanningStatus = 'borrador' | 'confirmado' | 'entregado' | 'cancelado';

export interface PlannedOrder {
  id: string;
  date: string;           
  deliveryDate: string;   
  clientId: string;
  status: PlanningStatus;
  items: OrderItem[];     
  totalAmount: number;
  totalKilos: number;
  notes?: string;
  createdBy?: string;     
}