'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PurchaseOrder, SalesOrder, FinancialMovement, ServiceOrder, InventoryAdjustment } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { MasterDataProvider } from "@/hooks/use-master-data"; 
import { MainNav } from "./main-nav";
import { AuthGuard } from '../auth-guard';
import { FirebaseClientProvider } from '@/firebase/client-provider';

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
const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

// --- PROVIDER ---
function OperationsProvider({ children }: { children: ReactNode }) {
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

  const value = {
    purchaseOrders: purchaseOrders || [],
    salesOrders: salesOrders || [],
    financialMovements: financialMovements || [],
    serviceOrders: serviceOrders || [],
    inventoryAdjustments: inventoryAdjustments || [],
    isLoading
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

// --- HOOK ---
export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}

// --- LAYOUT ---
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <OperationsProvider>
          <MasterDataProvider>
            <div className="flex min-h-screen bg-slate-950 text-slate-100">
              <MainNav />
              <main className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
                <div className="flex-1 p-3 md:p-6">{children}</div>
              </main>
            </div>
          </MasterDataProvider>
        </OperationsProvider>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}
