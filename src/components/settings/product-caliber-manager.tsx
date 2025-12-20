
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Eraser, CheckSquare, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; 

type ProductCaliberAssociation = {
  id: string;
  calibers: string[];
}

export function ProductCaliberManager() {
  const { products, calibers, productCaliberAssociations, updateProductCalibers } = useMasterData();
  const [localAssociations, setLocalAssociations] = useState<ProductCaliberAssociation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (products.length > 0) {
       const initialMap = products.map(pName => {
         const pId = pName; 
         const existing = productCaliberAssociations.find(a => a.id === pId);
         return existing ? { ...existing, calibers: [...existing.calibers] } : { id: pId, calibers: [] };
       });
       setLocalAssociations(initialMap);
    }
  }, [products, productCaliberAssociations]);


  const handleToggleCaliber = useCallback((productId: string, caliberName: string, isChecked: boolean) => {
    setLocalAssociations(prev => prev.map(item => {
      if (item.id !== productId) return item;
      
      const newCalibers = isChecked 
        ? [...item.calibers, caliberName]
        : item.calibers.filter(c => c !== caliberName);
      
      return { ...item, calibers: newCalibers };
    }));
  }, []);

  const handleSelectAll = (productId: string) => {
    const allCaliberNames = calibers.map(c => c.name);
    setLocalAssociations(prev => prev.map(item => 
      item.id === productId ? { ...item, calibers: allCaliberNames } : item
    ));
  };

  const handleClearProduct = (productId: string) => {
    setLocalAssociations(prev => prev.map(item => 
      item.id === productId ? { ...item, calibers: [] } : item
    ));
  };

  const handleSaveProduct = (productId: string) => {
      const localData = localAssociations.find(a => a.id === productId);
      if (localData) {
          updateProductCalibers(productId, localData.calibers);
          toast({ title: "Configuración Guardada", description: `Calibres actualizados para ${productId}.`, variant: "default" });
      }
  };

  const handleRestoreProduct = (productId: string) => {
      const globalData = productCaliberAssociations.find(a => a.id === productId);
      const globalCalibers = globalData ? [...globalData.calibers] : [];
      
      setLocalAssociations(prev => prev.map(item => 
        item.id === productId ? { ...item, calibers: globalCalibers } : item
      ));
      
      toast({ title: "Restaurado", description: `Se han descartado los cambios para ${productId}.` });
  };

  const isCaliberSelectedLocal = (productId: string, caliberName: string) => {
    return localAssociations.find(a => a.id === productId)?.calibers.includes(caliberName) || false;
  };

  const getCountLocal = (productId: string) => {
    return localAssociations.find(a => a.id === productId)?.calibers.length || 0;
  };

  const hasProductChanged = (productId: string) => {
      const local = localAssociations.find(a => a.id === productId)?.calibers || [];
      const globalData = productCaliberAssociations.find(a => a.id === productId);
      const global = globalData?.calibers || [];
      
      if (local.length !== global.length) return true;
      
      const sortedLocal = [...local].sort().join(',');
      const sortedGlobal = [...global].sort().join(',');
      
      return sortedLocal !== sortedGlobal;
  };

  return (
    <Card className="shadow-md bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-400">
            <LinkIcon className="h-5 w-5"/>
            Asociación de Calibres
        </CardTitle>
        <CardDescription className="text-slate-400">
          Activa los calibres correspondientes para cada producto. Los cambios deben guardarse individualmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-lg">
             <p className="text-slate-500 mb-2">No hay productos registrados.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {products.map((productName) => {
              const productId = productName;
              const changed = hasProductChanged(productId);
              const count = getCountLocal(productId);
              
              return (
                <AccordionItem key={productId} value={productId} className="border border-slate-800 rounded-lg bg-slate-950/50 px-2 data-[state=open]:bg-slate-900">
                  <AccordionTrigger className="hover:no-underline py-3 px-2">
                    <div className="flex items-center gap-4 w-full">
                      <span className="font-semibold text-lg text-slate-100">{productName}</span>
                      <div className="flex items-center gap-2 ml-auto mr-4">
                        {changed && (
                            <Badge variant="outline" className="text-amber-400 border-amber-500/40 bg-amber-950/30">
                                Sin guardar
                            </Badge>
                        )}
                        <Badge variant={count > 0 ? "secondary" : "outline"} className="border-slate-700 bg-slate-800 text-slate-300">
                            {count} calibres
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-2">
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-slate-950/50 rounded-md border border-slate-800">
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleSelectAll(productId)} title="Seleccionar Todos" className="text-slate-300 hover:bg-slate-800">
                                <CheckSquare className="mr-2 h-3.5 w-3.5" /> Todos
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleClearProduct(productId)} title="Limpiar Selección" className="text-slate-300 hover:bg-slate-800">
                                <Eraser className="mr-2 h-3.5 w-3.5" /> Ninguno
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" variant="ghost" 
                                onClick={() => handleRestoreProduct(productId)} 
                                disabled={!changed}
                                className="text-slate-400 hover:bg-slate-800"
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Deshacer
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleSaveProduct(productId)} 
                                disabled={!changed}
                                className={cn("bg-slate-700 hover:bg-slate-600", changed && "bg-amber-600 hover:bg-amber-700 text-white")}
                            >
                                <Save className="mr-2 h-3.5 w-3.5" /> Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
                      {calibers.map((caliber) => (
                        <div 
                          key={`${productId}-${caliber.name}`} 
                          className={cn(
                              "flex items-start space-x-2 p-3 rounded-md border transition-all cursor-pointer",
                              isCaliberSelectedLocal(productId, caliber.name) 
                                ? "bg-indigo-950/50 border-indigo-500/40" 
                                : "bg-slate-900 border-slate-800 hover:bg-slate-800/50"
                          )}
                          onClick={() => handleToggleCaliber(productId, caliber.name, !isCaliberSelectedLocal(productId, caliber.name))}
                        >
                          <Checkbox 
                            id={`${productId}-${caliber.name}`} 
                            checked={isCaliberSelectedLocal(productId, caliber.name)}
                            className="mt-0.5"
                          />
                          <Label 
                            htmlFor={`${productId}-${caliber.name}`}
                            className="text-sm cursor-pointer w-full"
                          >
                            <div className="font-medium text-slate-100">{caliber.name}</div>
                            {caliber.code && <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{caliber.code}</div>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
