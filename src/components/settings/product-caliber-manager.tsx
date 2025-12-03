
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Eraser, CheckSquare } from 'lucide-react';
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
         const pId = pName; // Assuming name is the id for now
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
          toast({ title: "Configuración Guardada", description: `Calibres actualizados para el producto.`, variant: "default" });
      }
  };

  const handleRestoreProduct = (productId: string) => {
      const globalData = productCaliberAssociations.find(a => a.id === productId);
      const globalCalibers = globalData ? [...globalData.calibers] : [];
      
      setLocalAssociations(prev => prev.map(item => 
        item.id === productId ? { ...item, calibers: globalCalibers } : item
      ));
      
      toast({ title: "Restaurado", description: `Se han descartado los cambios.` });
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
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            Asociación de Productos y Calibres
        </CardTitle>
        <CardDescription>
          Configura qué calibres están disponibles para cada variedad de fruta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
             <p className="text-muted-foreground mb-2">No hay productos registrados.</p>
             <Button variant="outline" size="sm">Ir a Maestros de Productos</Button>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {products.map((productName) => {
              const productId = productName;
              const changed = hasProductChanged(productId);
              const count = getCountLocal(productId);
              
              return (
                <AccordionItem key={productId} value={productId} className="border rounded-lg bg-card px-2">
                  <AccordionTrigger className="hover:no-underline py-3 px-2">
                    <div className="flex items-center gap-4 w-full">
                      <span className="font-semibold text-lg">{productName}</span>
                      <div className="flex items-center gap-2 ml-auto mr-4">
                        {changed && (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 animate-in fade-in">
                                Sin guardar
                            </Badge>
                        )}
                        <Badge variant={count > 0 ? "secondary" : "outline"}>
                            {count} calibres
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-2">
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-muted/30 rounded-md border">
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleSelectAll(productId)} title="Seleccionar Todos">
                                <CheckSquare className="mr-2 h-3.5 w-3.5" /> Todos
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleClearProduct(productId)} title="Limpiar Selección">
                                <Eraser className="mr-2 h-3.5 w-3.5" /> Ninguno
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" variant="ghost" 
                                onClick={() => handleRestoreProduct(productId)} 
                                disabled={!changed}
                                className="text-muted-foreground"
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Deshacer
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleSaveProduct(productId)} 
                                disabled={!changed}
                                className={cn(changed && "bg-amber-600 hover:bg-amber-700 text-white")}
                            >
                                <Save className="mr-2 h-3.5 w-3.5" /> Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {calibers.map((caliber) => (
                        <div 
                          key={`${productId}-${caliber.name}`} 
                          className={cn(
                              "flex items-start space-x-2 p-2 rounded-md border transition-all",
                              isCaliberSelectedLocal(productId, caliber.name) 
                                ? "bg-primary/5 border-primary/20" 
                                : "bg-background hover:bg-muted/50 border-transparent"
                          )}
                        >
                          <Checkbox 
                            id={`${productId}-${caliber.name}`} 
                            checked={isCaliberSelectedLocal(productId, caliber.name)}
                            onCheckedChange={(checked) => handleToggleCaliber(productId, caliber.name, checked as boolean)}
                          />
                          <Label 
                            htmlFor={`${productId}-${caliber.name}`}
                            className="text-sm cursor-pointer w-full"
                          >
                            <div className="font-medium">{caliber.name}</div>
                            {caliber.code && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{caliber.code}</div>}
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
