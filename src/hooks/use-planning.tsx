"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase/init';
import { useToast } from '@/hooks/use-toast';
import { PlannedOrder, SalesOrder } from '@/lib/types';

export function usePlanning() {
  const [plannedOrders, setPlannedOrders] = useState<PlannedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      console.error("Firestore (db) no está inicializado.");
      setLoading(false);
      return;
    }

    const q = query(collection(db, "plannedOrders"), orderBy("deliveryDate", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PlannedOrder));
      setPlannedOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener las órdenes de planificación:", error);
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "No se pudieron cargar los datos de planificación.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const createPlan = useCallback(async (planData: Partial<Omit<PlannedOrder, 'id'>>) => {
    if (!db) return;
    
    const totalKilos = (planData.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = (planData.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);

    try {
      await addDoc(collection(db, "plannedOrders"), {
        ...planData,
        totalKilos,
        totalAmount,
        status: 'borrador',
        createdAt: serverTimestamp(),
      });
      toast({ title: "Plan Creado", description: "El nuevo plan de entrega ha sido guardado." });
    } catch (e) {
      console.error("Error creando plan:", e);
    }
  }, [toast]);
  
  const updatePlan = useCallback(async (id: string, planData: Partial<Omit<PlannedOrder, 'id'>>) => {
    if (!db) return;
    
    const dataToUpdate: Partial<PlannedOrder> = { ...planData };
    if (planData.items) {
      dataToUpdate.totalKilos = (planData.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      dataToUpdate.totalAmount = (planData.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    }

    try {
      await updateDoc(doc(db, "plannedOrders", id), dataToUpdate);
      toast({ title: "Plan Actualizado" });
    } catch (e) {
      console.error("Error actualizando plan:", e);
    }
  }, [toast]);

  const deletePlan = useCallback(async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "plannedOrders", id));
      toast({ variant: 'destructive', title: "Plan Eliminado" });
    } catch (e) {
      console.error("Error eliminando plan:", e);
    }
  }, [toast]);

  const promoteToSale = useCallback(async (plan: PlannedOrder) => {
    if (!db) return;
    
    const batch = writeBatch(db);
    
    const salesOrderRef = doc(collection(db, 'salesOrders'));
    const planRef = doc(db, 'plannedOrders', plan.id);
    
    const salesOrderData: Omit<SalesOrder, 'id'> = {
      clientId: plan.clientId,
      date: new Date().toISOString().split('T')[0],
      deliveryDate: plan.deliveryDate,
      items: plan.items,
      totalAmount: plan.totalAmount,
      totalKilos: plan.totalKilos,
      notes: plan.notes,
      status: 'pending',
      paymentMethod: 'Contado',
      saleType: 'Venta en Firme',
      includeVat: true,
      warehouse: 'Bodega Central', 
    };

    batch.set(salesOrderRef, salesOrderData);
    batch.update(planRef, { status: 'entregado' });

    try {
      await batch.commit();
      toast({ title: "¡Éxito!", description: `Plan ${plan.id} convertido a Orden de Venta.` });
    } catch (e) {
      console.error("Error al promover a venta:", e);
      toast({ variant: 'destructive', title: "Error", description: "No se pudo convertir el plan a venta." });
    }
  }, [toast]);

  return {
    plannedOrders,
    isLoading: loading,
    createPlan,
    updatePlan,
    deletePlan,
    promoteToSale,
  };
}
