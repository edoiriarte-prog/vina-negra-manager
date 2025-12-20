"use client";

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/init';
import { useToast } from '@/hooks/use-toast';

// 1. Tipado de la Orden
export interface Order {
  id: string;
  clientName: string;
  deliveryDate: string; // Formato YYYY-MM-DD
  totalKilos: number;
  status: 'pending' | 'delivered';
  notes?: string;
  createdAt: Timestamp;
}

// 2. Funcionalidades del Hook
export function usePlanning() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      console.error("Firestore (db) no está inicializado.");
      setLoading(false);
      return;
    }

    // Query para obtener las órdenes, ordenadas por fecha de creación descendente
    const q = query(collection(db, "plannedOrders"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener las órdenes:", error);
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "No se pudieron cargar los datos de planificación.",
      });
      setLoading(false);
    });

    // Limpieza al desmontar el componente
    return () => unsubscribe();
  }, [toast]);

  // Función para agregar una nueva orden
  const addOrder = async (newOrderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "plannedOrders"), {
        ...newOrderData,
        status: 'pending', // Estado por defecto
        createdAt: serverTimestamp() // Fecha de creación del servidor
      });
      toast({
        title: "Éxito",
        description: "El pedido ha sido planificado correctamente.",
      });
    } catch (error) {
      console.error("Error al agregar la orden:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo agregar el nuevo pedido.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar el estado de una orden
  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'delivered') => {
    if (!db) return;
    const orderRef = doc(db, "plannedOrders", orderId);
    try {
      await updateDoc(orderRef, {
        status: newStatus
      });
      toast({
        title: "Estado Actualizado",
        description: `El pedido ahora está como '${newStatus === 'delivered' ? 'Entregado' : 'Pendiente'}'.`,
      });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: "No se pudo cambiar el estado del pedido.",
      });
    }
  };

  // 3. Exportación de funcionalidades
  return {
    orders,
    loading,
    addOrder,
    updateOrderStatus
  };
}
