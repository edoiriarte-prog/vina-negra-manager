"use client";

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";

export function DataCleaner() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isCleaning, setIsCleaning] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const cleanData = async () => {
    if (!firestore) return;
    setIsCleaning(true);
    setReport("Analizando base de datos...");
    
    let fixedCount = 0;
    let errorsFound = 0;
    const batch = writeBatch(firestore);

    try {
      // ---------------------------------------------------------
      // 1. LIMPIEZA DE COMPRAS (Purchase Orders)
      // ---------------------------------------------------------
      const poRef = collection(firestore, 'purchaseOrders');
      const poSnap = await getDocs(poRef);
      
      poSnap.docs.forEach((d) => {
        const data = d.data();
        let needsFix = false;
        
        // Revisar cada ítem dentro de la orden de compra
        const newItems = (data.items || []).map((item: any) => {
            // CASO A: Dice "PALTA HASS" pero el calibre es de "MANDARINA" (contiene "MAND")
            if (item.product === 'PALTA HASS' && item.caliber && item.caliber.includes('MAND')) {
                needsFix = true;
                return { ...item, product: 'MANDARINAS' };
            }
            // CASO B: Dice "MANDARINAS" pero el calibre es de "PALTA" (contiene "PAL" o es numérico típico)
            if (item.product === 'MANDARINAS' && item.caliber && (item.caliber.includes('PAL') || !isNaN(Number(item.caliber)))) {
                needsFix = true;
                return { ...item, product: 'PALTA HASS' };
            }
            return item;
        });

        if (needsFix) {
            batch.update(doc(firestore, 'purchaseOrders', d.id), { items: newItems });
            fixedCount++;
            errorsFound++;
        }
      });

      // ---------------------------------------------------------
      // 2. LIMPIEZA DE AJUSTES DE INVENTARIO (Inventory Adjustments)
      // ---------------------------------------------------------
      const adjRef = collection(firestore, 'inventoryAdjustments');
      const adjSnap = await getDocs(adjRef);

      adjSnap.docs.forEach((d) => {
          const data = d.data();
          let newProduct = data.product;
          let needsFix = false;

          // CASO A: Producto PALTA con calibre MANDARINA
          if (data.product === 'PALTA HASS' && data.caliber && data.caliber.includes('MAND')) {
              newProduct = 'MANDARINAS';
              needsFix = true;
          } 
          // CASO B: Producto MANDARINA con calibre PALTA
          else if (data.product === 'MANDARINAS' && data.caliber && (data.caliber.includes('PAL') || !isNaN(Number(data.caliber)))) {
              newProduct = 'PALTA HASS';
              needsFix = true;
          }

          if (needsFix) {
              batch.update(doc(firestore, 'inventoryAdjustments', d.id), { product: newProduct });
              fixedCount++;
              errorsFound++;
          }
      });

      // ---------------------------------------------------------
      // 3. EJECUTAR CAMBIOS
      // ---------------------------------------------------------
      if (fixedCount > 0) {
          await batch.commit();
          const msg = `Se corrigieron ${fixedCount} registros con productos mezclados.`;
          setReport(msg);
          toast({ title: "Limpieza Exitosa", description: msg, variant: "default" });
          
          // Recargar la página después de 2 segundos para ver los cambios
          setTimeout(() => {
            window.location.reload();
          }, 2000);
      } else {
          setReport("✅ Base de datos limpia. No se encontraron errores.");
          toast({ title: "Todo en orden", description: "No hay datos corruptos que arreglar." });
      }

    } catch (error) {
        console.error(error);
        setReport("❌ Error al ejecutar la limpieza. Revisa la consola.");
        toast({ title: "Error Crítico", description: "Falló la limpieza.", variant: "destructive" });
    } finally {
        setIsCleaning(false);
    }
  };

  return (
    <Card className="border-yellow-600/50 bg-yellow-950/10 mb-6">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-yellow-500 font-bold flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 ${isCleaning ? 'animate-spin' : ''}`}/> 
                    Herramienta de Limpieza de Datos
                </h3>
                <p className="text-sm text-yellow-200/70 max-w-xl">
                    Esta herramienta escanea todas tus Compras y Ajustes. Si encuentra una "Palta" con calibre de "Mandarina", la corregirá automáticamente.
                </p>
                {report && (
                    <p className="text-sm font-mono text-emerald-400 mt-2 bg-black/20 p-2 rounded inline-block">
                        {report}
                    </p>
                )}
            </div>
            <Button 
                onClick={cleanData} 
                disabled={isCleaning} 
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold shadow-lg shadow-yellow-900/20"
            >
                {isCleaning ? "Corrigiendo..." : "Ejecutar Limpieza Ahora"}
            </Button>
        </CardContent>
    </Card>
  );
}AYU