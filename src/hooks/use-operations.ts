"use client";

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PurchaseOrder, SalesOrder, FinancialMovement } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export function useOperations() {
  const { firestore } = useFirebase();

  // 1. Colección de Órdenes de Compra (Ordenadas por fecha)
  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'purchaseOrders'), orderBy('date', 'desc'));
  }, [firestore]);
  
  const { data: purchaseOrders, isLoading: l1 } = useCollection<PurchaseOrder>(purchasesQuery);

  // 2. Colección de Órdenes de Venta
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

  const isLoading = l1 || l2 || l3;

  return {
    purchaseOrders: purchaseOrders || [],
    salesOrders: salesOrders || [],
    financialMovements: financialMovements || [],
    isLoading
  };
}