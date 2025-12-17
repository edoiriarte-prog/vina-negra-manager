"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/init'; 
import { 
  PurchaseOrder, 
  SalesOrder, 
  FinancialMovement, 
  ServiceOrder, 
  InventoryAdjustment 
} from '@/lib/types';

export type OperationsContextType = {
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

export const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [financialMovements, setFinancialMovements] = useState<FinancialMovement[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  
  const [loadingStates, setLoadingStates] = useState({
    purchases: true,
    sales: true,
    financials: true,
    services: true,
    adjustments: true,
  });

  const isLoading = Object.values(loadingStates).some(state => state);

  useEffect(() => {
    if (!db) {
        Object.keys(loadingStates).forEach(key => setLoadingStates(prev => ({...prev, [key]: false})));
        return;
    };

    const subscribe = (collectionName: string, setter: Function, loadingKey: keyof typeof loadingStates) => {
      const q = query(collection(db, collectionName), orderBy('date', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingStates(prev => ({...prev, [loadingKey]: false}));
      }, (error) => {
        console.error(`Error loading ${collectionName}:`, error);
        setLoadingStates(prev => ({...prev, [loadingKey]: false}));
      });
    };

    const unsubPurchases = subscribe('purchaseOrders', setPurchaseOrders, 'purchases');
    const unsubSales = subscribe('salesOrders', setSalesOrders, 'sales');
    const unsubFinancials = subscribe('financialMovements', setFinancialMovements, 'financials');
    const unsubServices = subscribe('serviceOrders', setServiceOrders, 'services');
    const unsubAdjustments = subscribe('inventoryAdjustments', setInventoryAdjustments, 'adjustments');

    return () => {
      unsubPurchases();
      unsubSales();
      unsubFinancials();
      unsubServices();
      unsubAdjustments();
    };
  }, []);

  const value = {
    purchaseOrders,
    salesOrders,
    financialMovements,
    serviceOrders,
    inventoryAdjustments,
    isLoading
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}
