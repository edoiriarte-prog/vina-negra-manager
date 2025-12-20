
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { generateFinancialSummary } from '@/ai/flows/generate-financial-summary';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AiSummary({ financialData }: { financialData: string }) {
  const [summary, setSummary] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    if (!userPrompt) {
        toast({
            variant: 'destructive',
            title: 'Consulta Vacía',
            description: 'Por favor, escribe una pregunta o tema a analizar.',
        });
        return;
    }
    setIsLoading(true);
    setIsDialogOpen(true);
    try {
      const result = await generateFinancialSummary({ financialData, userPrompt });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo generar el resumen. Por favor, inténtelo de nuevo.',
      });
      setIsDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-4">
        <Textarea 
            placeholder="Ej: Analiza el stock de Cerezas y sugiere un precio de venta considerando un margen del 25% sobre el costo de compra..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="bg-blue-950/40 border-blue-800/50 text-blue-100 placeholder:text-blue-300/40 min-h-[80px]"
        />
        <Button onClick={handleGenerateSummary} disabled={isLoading} variant="outline" className="w-full border-blue-500/30 bg-blue-950/30 text-blue-300 hover:bg-blue-950/80 hover:text-blue-200">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Consultar a la IA
        </Button>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Análisis por Inteligencia Artificial
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="ml-4 text-slate-400">Analizando datos...</p>
                  </div>
                ) : (
                  <div className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed border-l-2 border-blue-500 pl-4 py-2 bg-slate-950/50 rounded-r-md">
                      {summary}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
