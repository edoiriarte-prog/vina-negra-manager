
"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PurchaseOrder, SalesOrder, FinancialMovement, ServiceOrder, InventoryAdjustment } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';

// --- TYPES ---
export type OperationsContextType = {
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

// --- CONTEXT ---
export const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

// --- HOOK ---
export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider. Check DashboardLayout.');
  }
  return context;
}
