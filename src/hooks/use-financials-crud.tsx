"use client";

import { useFirebase } from "@/firebase";
import { collection, doc, writeBatch, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { FinancialMovement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useFinancialsCRUD() {
  // CORRECCIÓN DEFINITIVA DE TIPO:
  // TypeScript nos confirmó que la propiedad se llama 'firestore'.
  // Usamos ': db' para renombrarla localmente y que el resto del código funcione.
  const { firestore: db } = useFirebase(); 
  const { toast } = useToast();

  // CREAR MOVIMIENTO (Soporta Uno o Varios en Lote)
  const createFinancialMovement = async (data: Omit<FinancialMovement, "id"> | Omit<FinancialMovement, "id">[]) => {
    // Verificación de seguridad
    if (!db) {
        console.error("❌ ERROR: La conexión 'firestore' (db) es undefined. Verifica que Firebase esté inicializado.");
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se detectó conexión con la base de datos." });
        return;
    }

    try {
      if (Array.isArray(data)) {
        // Lógica para Lote (Batch)
        const batch = writeBatch(db);
        data.forEach((movement) => {
          const ref = doc(collection(db, "financialMovements"));
          batch.set(ref, { ...movement, createdAt: new Date().toISOString() });
        });
        await batch.commit();
        toast({ title: "Movimientos Registrados", description: `${data.length} registros guardados correctamente.` });
      } else {
        // Lógica Individual
        await addDoc(collection(db, "financialMovements"), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Movimiento Registrado", description: "Se ha guardado el ingreso/egreso." });
      }
    } catch (error) {
      console.error("Error al crear movimiento:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el movimiento." });
    }
  };

  // ACTUALIZAR MOVIMIENTO
  const updateFinancialMovement = async (id: string, data: Partial<FinancialMovement>) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "financialMovements", id), data);
      toast({ title: "Movimiento Actualizado" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." });
    }
  };

  // ELIMINAR MOVIMIENTO
  const deleteFinancialMovement = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "financialMovements", id));
      toast({ title: "Movimiento Eliminado" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  return {
    createFinancialMovement,
    updateFinancialMovement,
    deleteFinancialMovement
  };
}