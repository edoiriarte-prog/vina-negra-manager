"use client";

import { useMemo } from "react";
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { PlannedOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function usePlanning() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Consultar pedidos ordenados por fecha de entrega
  const planningQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'plannedOrders'), orderBy('deliveryDate', 'asc'));
  }, [firestore]);

  const { data: plannedOrders, isLoading } = useCollection<PlannedOrder>(planningQuery);

  // CRUD
  const createPlan = async (order: Omit<PlannedOrder, 'id'>) => {
    if (!firestore) return;
    await addDocumentNonBlocking(collection(firestore, 'plannedOrders'), order);
    toast({ title: "Pedido Planificado", description: "Se ha guardado la proyección de venta." });
  };

  const updatePlan = async (id: string, data: Partial<PlannedOrder>) => {
    if (!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'plannedOrders', id), data);
    toast({ title: "Plan Actualizado", description: "Cambios guardados correctamente." });
  };

  const deletePlan = async (id: string) => {
    if (!firestore) return;
    if(confirm("¿Borrar esta planificación?")) {
        await deleteDocumentNonBlocking(doc(firestore, 'plannedOrders', id));
        toast({ variant: "destructive", title: "Plan Eliminado" });
    }
  };

  return {
    plannedOrders: plannedOrders || [],
    isLoading,
    createPlan,
    updatePlan,
    deletePlan
  };
}