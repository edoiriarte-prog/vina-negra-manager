
"use client";

import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, writeBatch, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { PlannedOrder, SalesOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useOperations } from "./use-operations";

export function usePlanning() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { salesOrders } = useOperations(); 

  const planningQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'plannedOrders'), orderBy('deliveryDate', 'asc'));
  }, [firestore]);

  const { data: plannedOrders, isLoading } = useCollection<PlannedOrder>(planningQuery);

  const calculateTotals = (items: PlannedOrder['items']) => {
    const totalKilos = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
    return { totalKilos, totalAmount };
  };

  const createPlan = async (orderData: Partial<Omit<PlannedOrder, 'id'>>) => {
    if (!firestore) return;
    const { totalKilos, totalAmount } = calculateTotals(orderData.items || []);
    const newPlan = {
        ...orderData,
        status: 'borrador',
        deliveryDate: orderData.date, // Compatibilidad del sheet
        totalKilos,
        totalAmount,
    };
    await addDoc(collection(firestore, 'plannedOrders'), newPlan);
    toast({ title: "Pedido Planificado", description: "Se ha guardado la proyección de venta." });
  };

  const updatePlan = async (id: string, data: Partial<PlannedOrder>) => {
    if (!firestore) return;
    const updateData = { ...data };
    if (data.items) {
      const { totalKilos, totalAmount } = calculateTotals(data.items);
      updateData.totalKilos = totalKilos;
      updateData.totalAmount = totalAmount;
    }
    if(data.date) {
        updateData.deliveryDate = data.date;
    }
    await updateDoc(doc(firestore, 'plannedOrders', id), updateData);
    toast({ title: "Plan Actualizado", description: "Cambios guardados correctamente." });
  };

  const deletePlan = async (id: string) => {
    if (!firestore) return;
    if (confirm("¿Estás seguro de eliminar esta planificación?")) {
        await deleteDoc(doc(firestore, 'plannedOrders', id));
        toast({ variant: "destructive", title: "Plan Eliminado" });
    }
  };

  const promoteToSale = async (plan: PlannedOrder) => {
    if (!firestore) return;

    if (!confirm(`¿Convertir el plan para ${plan.clientId} en una Orden de Venta real?`)) return;

    const batch = writeBatch(firestore);

    // 1. Crear la nueva Orden de Venta
    const salesOrderRef = doc(collection(firestore, 'salesOrders'));
    
    // Generar un nuevo número de OV
    const existingIds = (salesOrders || [])
        .map(o => o.number ? parseInt(o.number.replace(/OV-|\D/g, ''), 10) : 0)
        .filter(n => !isNaN(n) && n > 0);
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 2100;
    const nextNum = maxId < 2100 ? 2101 : maxId + 1;
    const newSaleNumber = `OV-${nextNum}`;

    const newSale: Omit<SalesOrder, 'id'> = {
        number: newSaleNumber,
        clientId: plan.clientId,
        date: new Date().toISOString().split('T')[0], // Fecha de hoy
        status: 'pending',
        items: plan.items,
        totalAmount: plan.totalAmount,
        totalKilos: plan.totalKilos,
        includeVat: true, 
        notes: `Convertido desde planificación. ${plan.notes || ''}`.trim(),
        paymentMethod: 'Contado',
        saleType: 'Venta en Firme',
        orderType: 'sale',
    };
    batch.set(salesOrderRef, newSale);

    // 2. Actualizar el estado del plan
    const planRef = doc(firestore, 'plannedOrders', plan.id);
    batch.update(planRef, { status: 'entregado' });

    try {
        await batch.commit();
        toast({ title: "¡Éxito!", description: `Plan convertido a Orden de Venta ${newSaleNumber}.` });
    } catch (error) {
        console.error("Error al convertir plan a venta:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo completar la operación." });
    }
  };

  return {
    plannedOrders: plannedOrders || [],
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
    promoteToSale
  };
}
