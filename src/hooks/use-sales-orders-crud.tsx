
"use client";

import { useState, useCallback, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { SalesOrder } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 

const PAGE_SIZE = 50;

export function useSalesOrdersCRUD() {
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter(); 

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitialSalesOrders = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);

    try {
      const first = query(collection(db, "salesOrders"), orderBy("date", "desc"), limit(PAGE_SIZE));
      const documentSnapshots = await getDocs(first);

      const firstBatch = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOrder));
      setSalesOrders(firstBatch);

      const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(lastDoc);

      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching initial sales orders:", error);
      toast({ variant: "destructive", title: "Error de Carga", description: "No se pudieron cargar las órdenes de venta." });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    fetchInitialSalesOrders();
  }, [fetchInitialSalesOrders]);

  const loadMore = useCallback(async () => {
    if (!db || !lastVisible) return;
    setIsLoadingMore(true);

    try {
      const next = query(collection(db, "salesOrders"), orderBy("date", "desc"), startAfter(lastVisible), limit(PAGE_SIZE));
      const documentSnapshots = await getDocs(next);

      const nextBatch = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOrder));
      setSalesOrders(prev => [...prev, ...nextBatch]);

      const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(lastDoc);

      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more sales orders:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar más órdenes." });
    } finally {
      setIsLoadingMore(false);
    }
  }, [db, lastVisible, toast]);

  const createSalesOrder = async (data: Omit<SalesOrder, "id">) => {
    if (!db) {
      toast({ variant: "destructive", title: "Error", description: "Sin conexión." });
      return;
    }
    try {
      const newDocRef = doc(collection(db, "salesOrders"));
      await setDoc(newDocRef, {
        ...data,
        id: newDocRef.id,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Orden Creada", description: "Venta registrada exitosamente." });
      
      // Refresh data after creation
      fetchInitialSalesOrders(); 
      
      return newDocRef;
    } catch (error: any) {
      console.error("Error al crear la orden de venta:", error);
      toast({ variant: "destructive", title: "Error de Creación", description: error.message });
      throw error;
    }
  };

  const updateSalesOrder = async (id: string, data: Partial<SalesOrder>) => {
    if (!db) {
      toast({ variant: "destructive", title: "Error", description: "Sin conexión." });
      return;
    };
    try {
      const docRef = doc(db, "salesOrders", id);
      await updateDoc(docRef, data);
      
      toast({ title: "Actualizado", description: "Los cambios se han guardado correctamente." });
      
      // Update local state instead of full reload for better UX
      setSalesOrders(prev => prev.map(order => order.id === id ? { ...order, ...data } : order));
      
    } catch (error: any) {
      console.error("Error al actualizar la orden de venta:", error);
      toast({ variant: "destructive", title: "Error de Actualización", description: "No se pudieron guardar los cambios. " + error.message });
      throw error;
    }
  };

  const deleteSalesOrder = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "salesOrders", id));
      toast({ title: "Eliminado", description: "Orden borrada." });
      setSalesOrders(prev => prev.filter(order => order.id !== id));
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return { 
    salesOrders, 
    isLoading, 
    isLoadingMore,
    hasMore,
    loadMore,
    createSalesOrder, 
    updateSalesOrder, 
    deleteSalesOrder 
  };
}
