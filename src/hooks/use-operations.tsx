"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/init'; // Usamos la conexión limpia
import { 
  PurchaseOrder, 
  SalesOrder, 
  FinancialMovement, 
  ServiceOrder, 
  InventoryAdjustment 
} from '@/lib/types';

// --- DEFINICIÓN DEL CONTEXTO ---
export type OperationsContextType = {
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  financialMovements: FinancialMovement[];
  serviceOrders: ServiceOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  isLoading: boolean;
};

// Lo creamos aquí mismo para exportarlo
export const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

// --- PROVIDER ---
export function OperationsProvider({ children }: { children: ReactNode }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [financialMovements, setFinancialMovements] = useState<FinancialMovement[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    setLoading(true);

    // Función auxiliar para suscribirse y mapear datos
    const subscribe = (coll: string, setter: Function, orderField: string = 'date') => {
      const q = query(collection(db, coll), orderBy(orderField, 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setter(data);
      }, (error) => {
        console.error(`Error loading ${coll}:`, error);
      });
    };

    // 1. Órdenes de Compra
    const unsubPurchases = subscribe('purchaseOrders', setPurchaseOrders);

    // 2. Órdenes de Venta
    const unsubSales = subscribe('salesOrders', setSalesOrders);

    // 3. Movimientos Financieros (Tesorería)
    const unsubFinancials = subscribe('financialMovements', setFinancialMovements);

    // 4. Órdenes de Servicio
    const unsubServices = subscribe('serviceOrders', setServiceOrders);

    // 5. Ajustes de Inventario
    const unsubAdjustments = subscribe('inventoryAdjustments', setInventoryAdjustments);

    setLoading(false);

    // Cleanup al desmontar
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
    isLoading: loading
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

// --- HOOK EXPORTADO ---
export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}