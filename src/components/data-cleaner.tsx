"use client";

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileSpreadsheet, CheckCheck } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DataCleaner() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [stats, setStats] = useState({ found: 0, missing: 0 });

  const analyzeData = async () => {
    if (!firestore || !pasteData) return;
    setLoading(true);
    try {
        const snap = await getDocs(collection(firestore, 'financialMovements'));
        const systemMoves = snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data()
        }));

        const lines = pasteData.split(/\n/).filter(l => l.trim() !== "");
        const matches: any[] = [];
        let foundCount = 0;
        let missingCount = 0;

        lines.forEach((line) => {
            const parts = line.split(/[\t]/); // Excel usa tabulaciones al copiar
            
            // Buscamos números (montos) limpiando puntos, comas y símbolos de peso
            const possibleAmounts = parts.map(p => {
                const clean = p.replace(/[^\d-]/g, '');
                return clean !== "" ? parseInt(clean) : null;
            }).filter(n => n !== null);

            const amount = possibleAmounts.length > 0 ? possibleAmounts[possibleAmounts.length - 1] : 0;

            if (amount !== 0) {
                // Buscamos en el sistema el monto exacto (o su inverso si es egreso)
                const match = systemMoves.find((sys: any) => 
                    Math.abs(sys.amount) === Math.abs(amount as number)
                );

                if (match) {
                    matches.push({ line, matchId: match.id, status: 'OK', amount });
                    foundCount++;
                } else {
                    matches.push({ line, status: 'MISSING', amount });
                    missingCount++;
                }
            }
        });

        setPreview(matches);
        setStats({ found: foundCount, missing: missingCount });
    } catch (e) {
        toast({ title: "Error", description: "No se pudo leer el Excel" });
    } finally {
        setLoading(false);
    }
  };

  const reconcile = async () => {
      if (!firestore) return;
      setLoading(true);
      const batch = writeBatch(firestore);
      const TARGET_BANK = { id: "BA-CHILE-REC", name: "BANCO CHILE" }; // Puedes cambiarlo según la cartola

      preview.filter(i => i.status === 'OK').forEach(item => {
          const ref = doc(firestore, 'financialMovements', item.matchId);
          batch.update(ref, {
              accountId: TARGET_BANK.id,
              bankAccount: TARGET_BANK,
              bankId: TARGET_BANK.id,
              status: 'Pagada'
          });
      });

      await batch.commit();
      toast({ title: "Hecho", description: "Movimientos vinculados correctamente" });
      setTimeout(() => window.location.reload(), 2000);
  };

  return (
    <Card className="border-blue-500/50 bg-slate-900 mb-6">
        <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5"/> Pegar Cartola de Excel
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {!preview.length ? (
                <>
                    <Textarea 
                        value={pasteData}
                        onChange={e => setPasteData(e.target.value)}
                        placeholder="Pega aquí las filas de tu Excel..."
                        className="h-48 bg-slate-950 border-slate-700 font-mono text-xs"
                    />
                    <Button onClick={analyzeData} disabled={loading || !pasteData} className="w-full bg-blue-600">
                        {loading ? <Loader2 className="animate-spin"/> : "Analizar Excel"}
                    </Button>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <p className="text-blue-300 text-sm">Se encontraron <b>{stats.found}</b> coincidencias en el sistema.</p>
                        <p className="text-slate-400 text-xs mt-1">Hay {stats.missing} filas que no coinciden con ningún registro previo.</p>
                    </div>
                    <Button onClick={reconcile} className="w-full bg-emerald-600 font-bold h-12">
                        VINCULAR {stats.found} MOVIMIENTOS AHORA
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
  );
}