"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PurchaseOrder, SalesOrder, FinancialMovement, ServiceOrder, InventoryAdjustment } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';

// --- 1. TIPOS ---
export type OperationsContextType = {
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

// --- 2. CONTEXTO ---
// Lo creamos aquí mismo para exportarlo
export const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

// --- 3. PROVIDER (El componente que enviaste) ---
export function OperationsProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  // 1. Órdenes de Compra
  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'purchaseOrders'), orderBy('date', 'desc'));
  }, [firestore]);
  const { data: purchaseOrders, isLoading: l1 } = useCollection<PurchaseOrder>(purchasesQuery);

  // 2. Órdenes de Venta
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'salesOrders'), orderBy('date', 'desc'));
  }, [firestore]);
  const { data: salesOrders, isLoading: l2 } = useCollection<SalesOrder>(salesQuery);

  // 3. Movimientos Financieros
  const financeQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financialMovements'), orderBy('date', 'desc'));
  }, [firestore]);
  const { data: financialMovements, isLoading: l3 } = useCollection<FinancialMovement>(financeQuery);

  // 4. Órdenes de Servicio
  const servicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'serviceOrders'), orderBy('date', 'desc'));
  }, [firestore]);
  const { data: serviceOrders, isLoading: l4 } = useCollection<ServiceOrder>(servicesQuery);

  // 5. Ajustes de Inventario
  const adjustmentsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'inventoryAdjustments'), orderBy('date', 'desc'));
  }, [firestore]);
  const { data: inventoryAdjustments, isLoading: l5 } = useCollection<InventoryAdjustment>(adjustmentsQuery);

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const value: OperationsContextType = {
    purchaseOrders: purchaseOrders || [],
    salesOrders: salesOrders || [],
    financialMovements: financialMovements || [],
    serviceOrders: serviceOrders || [],
    inventoryAdjustments: inventoryAdjustments || [],
    isLoading
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

// --- 4. HOOK PERSONALIZADO ---
// Esto es lo que usas en tus páginas: const { salesOrders } = useOperations();
export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider. Check DashboardLayout.');
  }
  return context;
}