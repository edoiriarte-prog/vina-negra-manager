"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
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
  // salesOrders is now handled by useSalesOrdersCRUD
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

export const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [financialMovements, setFinancialMovements] = useState<FinancialMovement[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  
  const [loadingStates, setLoadingStates] = useState({
    purchases: true,
    // sales is removed
    financials: true,
    services: true,
    adjustments: true,
  });

  const isLoading = Object.values(loadingStates).some(state => state);

  useEffect(() => {
    if (!db) {
        Object.keys(loadingStates).forEach(key => setLoadingStates(prev => ({...prev, [key as keyof typeof loadingStates]: false})));
        return;
    };

    const fetchDataOnce = async (collectionName: string, setter: Function, loadingKey: keyof typeof loadingStates) => {
      try {
        const q = query(collection(db, collectionName), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data);
      } catch (error) {
         console.error(`Error fetching ${collectionName}:`, error);
      } finally {
        setLoadingStates(prev => ({...prev, [loadingKey]: false}));
      }
    };
    
    fetchDataOnce('purchaseOrders', setPurchaseOrders, 'purchases');
    // We don't fetch salesOrders here anymore
    fetchDataOnce('financialMovements', setFinancialMovements, 'financials');
    
    const unsubServices = onSnapshot(query(collection(db, 'serviceOrders'), orderBy('date', 'desc')), (snapshot) => {
      setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
      setLoadingStates(prev => ({...prev, services: false}));
    }, (error) => {
      console.error(`Error loading serviceOrders:`, error);
      setLoadingStates(prev => ({...prev, services: false}));
    });

    const unsubAdjustments = onSnapshot(query(collection(db, 'inventoryAdjustments'), orderBy('date', 'desc')), (snapshot) => {
      setInventoryAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryAdjustment)));
      setLoadingStates(prev => ({...prev, adjustments: false}));
    }, (error) => {
      console.error(`Error loading inventoryAdjustments:`, error);
      setLoadingStates(prev => ({...prev, adjustments: false}));
    });


    return () => {
      unsubServices();
      unsubAdjustments();
    };
  }, []);

  const value = {
    purchaseOrders,
    financialMovements,
    serviceOrders,
    inventoryAdjustments,
    isLoading
  };
  
  // salesOrders is removed from the provider value
  return <OperationsContext.Provider value={value as any}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}
