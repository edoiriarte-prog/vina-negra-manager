"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMasterData, ProductCaliberAssociation } from '@/hooks/use-master-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Eraser, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // Asegúrate de tener esta utilidad, si no, usa clases normales

export function ProductCaliberManager() {
  const { products, calibers, productCaliberAssociations, updateProductCalibers } = useMasterData();
  const [localAssociations, setLocalAssociations] = useState<ProductCaliberAssociation[]>([]);
  const { toast } = useToast();

  // 1. Sincronización robusta: Solo inicializa, no sobrescribe trabajo en curso sin querer
  useEffect(() => {
    if (products.length > 0 && productCaliberAssociations.length > 0) {
      setLocalAssociations(prev => {
        // Si ya tenemos datos locales, verificamos si faltan productos nuevos
        const currentIds = new Set(prev.map(a => a.id));
        const missingProducts = products.filter(p => !currentIds.has(p));

        if (missingProducts.length === 0 && prev.length > 0) {
          return prev; // No hay cambios estructurales, no tocamos nada
        }

        const newAssoc = [...prev];
        
        // Agregamos solo lo que falta
        products.forEach(p => {
          if (!currentIds.has(p)) {
            const existingGlobal = productCaliberAssociations.find(ga => ga.id === p);
            newAssoc.push(existingGlobal 
              ? { ...existingGlobal, calibers: [...existingGlobal.calibers] } // Shallow copy es suficiente aquí
              : { id: p, calibers: [] }
            );
          }
        });

        return newAssoc;
      });
    } else if (products.length > 0 && localAssociations.length === 0) {
       // Inicialización en frío (primera carga)
       const initialMap = products.map(p => {
         const existing = productCaliberAssociations.find(a => a.id === p);
         return existing ? { ...existing, calibers: [...existing.calibers] } : { id: p, calibers: [] };
       });
       setLocalAssociations(initialMap);
    }
  }, [products, productCaliberAssociations, localAssociations.length]); // Dependencias optimizadas


  // Toggle Individual
  const handleToggleCaliber = useCallback((product: string, caliberName: string, isChecked: boolean) => {
    setLocalAssociations(prev => prev.map(item => {
      if (item.id !== product) return item;
      
      const newCalibers = isChecked 
        ? [...item.calibers, caliberName]
        : item.calibers.filter(c => c !== caliberName);
      
      return { ...item, calibers: newCalibers };
    }));
  }, []);

  // Seleccionar TODOS los calibres para un producto
  const handleSelectAll = (productName: string) => {
    const allCaliberNames = calibers.map(c => c.name);
    setLocalAssociations(prev => prev.map(item => 
      item.id === productName ? { ...item, calibers: allCaliberNames } : item
    ));
  };

  // Limpiar selección (Deseleccionar todos)
  const handleClearProduct = (productName: string) => {
    setLocalAssociations(prev => prev.map(item => 
      item.id === productName ? { ...item, calibers: [] } : item
    ));
  };

  // Guardar
  const handleSaveProduct = (productName: string) => {
      const localData = localAssociations.find(a => a.id === productName);
      if (localData) {
          updateProductCalibers(productName, localData.calibers);
          toast({ title: "Configuración Guardada", description: `Calibres actualizados para ${productName}.`, variant: "default" });
      }
  };

  // Restaurar
  const handleRestoreProduct = (productName: string) => {
      const globalData = productCaliberAssociations.find(a => a.id === productName);
      const globalCalibers = globalData ? [...globalData.calibers] : [];
      
      setLocalAssociations(prev => prev.map(item => 
        item.id === productName ? { ...item, calibers: globalCalibers } : item
      ));
      
      toast({ title: "Restaurado", description: `Se han descartado los cambios en ${productName}.` });
  };

  // Helpers visuales
  const isCaliberSelectedLocal = (product: string, caliberName: string) => {
    return localAssociations.find(a => a.id === product)?.calibers.includes(caliberName) || false;
  };

  const getCountLocal = (product: string) => {
    return localAssociations.find(a => a.id === product)?.calibers.length || 0;
  };

  // Detección de cambios (Optimizada)
  const hasProductChanged = (productName: string) => {
      const local = localAssociations.find(a => a.id === productName)?.calibers || [];
      const globalData = productCaliberAssociations.find(a => a.id === productName);
      const global = globalData?.calibers || [];
      
      if (local.length !== global.length) return true;
      
      // Comparación rápida de arrays ordenados
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
            {products.map((product) => {
              const changed = hasProductChanged(product);
              const count = getCountLocal(product);
              
              return (
                <AccordionItem key={product} value={product} className="border rounded-lg bg-card px-2">
                  <AccordionTrigger className="hover:no-underline py-3 px-2">
                    <div className="flex items-center gap-4 w-full">
                      <span className="font-semibold text-lg">{product}</span>
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
                    
                    {/* BARRA DE ACCIONES */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-muted/30 rounded-md border">
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleSelectAll(product)} title="Seleccionar Todos">
                                <CheckSquare className="mr-2 h-3.5 w-3.5" /> Todos
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleClearProduct(product)} title="Limpiar Selección">
                                <Eraser className="mr-2 h-3.5 w-3.5" /> Ninguno
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" variant="ghost" 
                                onClick={() => handleRestoreProduct(product)} 
                                disabled={!changed}
                                className="text-muted-foreground"
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Deshacer
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleSaveProduct(product)} 
                                disabled={!changed}
                                className={cn(changed && "bg-amber-600 hover:bg-amber-700 text-white")}
                            >
                                <Save className="mr-2 h-3.5 w-3.5" /> Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    {/* GRILLA DE CALIBRES */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {calibers.map((caliber) => (
                        <div 
                          key={`${product}-${caliber.name}`} 
                          className={cn(
                              "flex items-start space-x-2 p-2 rounded-md border transition-all",
                              isCaliberSelectedLocal(product, caliber.name) 
                                ? "bg-primary/5 border-primary/20" 
                                : "bg-background hover:bg-muted/50 border-transparent"
                          )}
                        >
                          <Checkbox 
                            id={`${product}-${caliber.name}`} 
                            checked={isCaliberSelectedLocal(product, caliber.name)}
                            onCheckedChange={(checked) => handleToggleCaliber(product, caliber.name, checked as boolean)}
                          />
                          <Label 
                            htmlFor={`${product}-${caliber.name}`}
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