"use client";

import { useState } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { useMasterData } from '@/hooks/use-master-data';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Loader2, AlertOctagon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";

export function DataCleaner() {
  const { firestore } = useFirebase();
  const { addBankAccount, bankAccounts } = useMasterData();
  const { toast } = useToast();
  const [isCleaning, setIsCleaning] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const potentialCollections = ['financials', 'Financials', 'financialMovements', 'movements', 'treasury', 'transactions'];
  const RESCUE_ACCOUNT_ID = "BA-RESCATE-FINAL";
  const rescueAccount = {
      id: RESCUE_ACCOUNT_ID,
      name: "CUENTA DE RESCATE",
      bankName: "BANCO SISTEMA",
      accountType: "Corriente",
      accountNumber: "999999999",
      initialBalance: 0,
      status: 'Activa',
  };

  const findAndLinkFinancials = async () => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Error", description: "Conexión con Firebase no disponible." });
        return;
    }
    
    setIsCleaning(true);
    setReport("Iniciando sondeo de colecciones financieras...");

    let foundCollectionName = '';
    let docsToUpdate: any[] = [];

    for (const name of potentialCollections) {
      try {
        setReport(`Sondeando colección: '${name}'...`);
        const querySnapshot = await getDocs(collection(firestore, name));
        if (!querySnapshot.empty) {
          foundCollectionName = name;
          docsToUpdate = querySnapshot.docs;
          setReport(`¡Éxito! Se encontraron ${docsToUpdate.length} documentos en '${name}'.`);
          break; 
        }
      } catch (error) {
        console.warn(`No se pudo acceder a la colección '${name}'. Puede que no exista.`, error);
      }
    }

    if (!foundCollectionName) {
      setReport("⚠️ No se encontraron datos en ninguna de las colecciones financieras probables.");
      setIsCleaning(false);
      return;
    }

    // --- Inicia la operación de rescate ---
    try {
        setReport("Preparando vinculación de rescate...");
        const batch = writeBatch(firestore);

        // 1. Asegurar que la cuenta de rescate exista en el maestro
        const rescueAccountExists = bankAccounts.some(b => b.id === RESCUE_ACCOUNT_ID);
        if (!rescueAccountExists) {
            await addBankAccount(rescueAccount);
            toast({ title: "Maestro Actualizado", description: "Se creó la 'CUENTA DE RESCATE'."});
        }

        // 2. Actualizar cada documento financiero para vincularlo
        docsToUpdate.forEach(docSnap => {
            const docRef = doc(firestore, foundCollectionName, docSnap.id);
            batch.update(docRef, { 
                sourceAccountId: RESCUE_ACCOUNT_ID,
                destinationAccountId: RESCUE_ACCOUNT_ID
            });
        });

        // 3. Ejecutar el batch
        await batch.commit();

        const successMsg = `VINCULACIÓN COMPLETA: ${docsToUpdate.length} movimientos en '${foundCollectionName}' han sido asignados a la CUENTA DE RESCATE.`;
        setReport(successMsg);
        toast({
            title: "Operación Exitosa",
            description: "Los datos financieros han sido recuperados. Recargando en 5s...",
            duration: 5000,
        });

        setTimeout(() => window.location.reload(), 5000);

    } catch (error: any) {
        const errorMsg = `ERROR CRÍTICO: ${error.message}`;
        console.error(errorMsg, error);
        setReport(errorMsg);
        toast({ variant: 'destructive', title: "Error en la operación de rescate", description: errorMsg });
    } finally {
        setIsCleaning(false);
    }
  };

  return (
    <Card className="border-orange-500/50 bg-orange-950/20 mb-6">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-orange-400 font-bold flex items-center gap-2">
                    <AlertOctagon className={`h-5 w-5 ${isCleaning ? 'animate-pulse' : ''}`}/> 
                    HERRAMIENTA DE RECUPERACIÓN DE TESORERÍA
                </h3>
                <div className="text-sm text-slate-400 max-w-lg">
                    Busca en la base de datos la colección de movimientos financieros y los re-asigna a una "CUENTA DE RESCATE" para que aparezcan en Tesorería.
                </div>
                {report && <p className="text-white font-mono text-xs mt-2 bg-black/40 p-2 rounded-md">{report}</p>}
            </div>
            <Button 
                onClick={findAndLinkFinancials} 
                disabled={isCleaning} 
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-900/20 min-w-[180px]"
            >
                {isCleaning ? <Loader2 className="h-4 w-4 animate-spin"/> : "INICIAR ANÁLISIS"}
            </Button>
        </CardContent>
    </Card>
  );
}
