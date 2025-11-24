
"use client";

import { createContext, useContext } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PurchaseOrder, SalesOrder, FinancialMovement, ServiceOrder, InventoryAdjustment } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';

// --- TYPES ---
type OperationsContextType = {
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

// --- CONTEXT ---
// The context is defined here, but the Provider is now in layout.tsx
const OperationsContext = createContext<OperationsContextType | undefined>(undefined);


// --- HOOK ---
// This hook remains here to be used by other components
export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider. Check DashboardLayout.');
  }
  return context;
}
