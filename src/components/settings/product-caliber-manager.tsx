"use client";

import { useState, useEffect } from 'react';
import { useMasterData, ProductCaliberAssociation } from '@/hooks/use-master-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Eraser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProductCaliberManager() {
  const { products, calibers, productCaliberAssociations, updateProductCalibers } = useMasterData();
  const [localAssociations, setLocalAssociations] = useState<ProductCaliberAssociation[]>([]);
  const { toast } = useToast();

  // 1. Sincronizar estado local con el global al cargar y detectar nuevos productos
  useEffect(() => {
      if (products.length > 0) {
          setLocalAssociations(prev => {
              // Si es la primera carga, copiamos todo
              if (prev.length === 0 && productCaliberAssociations.length > 0) {
                  return JSON.parse(JSON.stringify(productCaliberAssociations));
              }

              // Si ya hay datos locales, solo nos aseguramos de que existan entradas para todos los productos
              const newAssoc = [...prev];
              let changed = false;
              products.forEach(p => {
                  if (!newAssoc.find(a => a.id === p)) {
                      // Si hay un producto nuevo en maestros que no está en local, lo agregamos
                      // Intentamos ver si ya tiene datos guardados globalmente, si no, vacío.
                      const existingGlobal = productCaliberAssociations.find(ga => ga.id === p);
                      newAssoc.push(existingGlobal ? JSON.parse(JSON.stringify(existingGlobal)) : { id: p, calibers: [] });
                      changed = true;
                  }
              });
              return changed ? newAssoc : prev;
          })
      }
  }, [products, productCaliberAssociations]);


  // Manejar cambios en los checkboxes (Solo memoria Local)
  const handleToggleCaliber = (product: string, caliberName: string, isChecked: boolean) => {
    setLocalAssociations(prev => {
      const index = prev.findIndex(a => a.id === product);
      let newAssociations = [...prev];
      
      if (index === -1) {
          newAssociations.push({ id: product, calibers: isChecked ? [caliberName] : [] });
          return newAssociations;
      }

      const currentCalibers = newAssociations[index].calibers;
      let newCalibersList: string[];
      
      if (isChecked) {
        newCalibersList = [...currentCalibers, caliberName];
      } else {
        newCalibersList = currentCalibers.filter(c => c !== caliberName);
      }

      newAssociations[index] = { ...newAssociations[index], calibers: newCalibersList };
      return newAssociations;
    });
  };

  // Limpiar selección de un producto (Local)
  const handleClearProduct = (productName: string) => {
    setLocalAssociations(prev => {
        const index = prev.findIndex(a => a.id === productName);
        if (index === -1) return prev;
        const newAssociations = [...prev];
        newAssociations[index] = { ...newAssociations[index], calibers: [] };
        return newAssociations;
    });
  };

  // Guardar UN producto específico
  const handleSaveProduct = (productName: string) => {
      const localData = localAssociations.find(a => a.id === productName);
      if (localData) {
          updateProductCalibers(productName, localData.calibers);
          toast({ title: "Guardado", description: `Configuración de ${productName} actualizada.` });
      }
  };

  // Restaurar UN producto específico
  const handleRestoreProduct = (productName: string) => {
      const globalData = productCaliberAssociations.find(a => a.id === productName);
      const globalCalibers = globalData ? [...globalData.calibers] : [];
      
      setLocalAssociations(prev => {
          const index = prev.findIndex(a => a.id === productName);
          const newAssociations = [...prev];
          if (index >= 0) {
              newAssociations[index] = { ...newAssociations[index], calibers: globalCalibers };
          } else {
              newAssociations.push({ id: productName, calibers: globalCalibers });
          }
          return newAssociations;
      });
      
      toast({ title: "Restaurado", description: `Cambios en ${productName} descartados.` });
  };

  // Helpers visuales
  const isCaliberSelectedLocal = (product: string, caliberName: string) => {
    const association = localAssociations.find(a => a.id === product);
    return association?.calibers.includes(caliberName) || false;
  };

  const getCountLocal = (product: string) => {
    return localAssociations.find(a => a.id === product)?.calibers.length || 0;
  };

  // Detectar si hay cambios pendientes para un producto (comparando local vs global)
  const hasProductChanged = (productName: string) => {
      const local = localAssociations.find(a => a.id === productName)?.calibers || [];
      const globalData = productCaliberAssociations.find(a => a.id === productName);
      const global = globalData?.calibers || [];
      
      if (local.length !== global.length) return true;
      
      const sortedLocal = [...local].sort();
      const sortedGlobal = [...global].sort();
      
      return JSON.stringify(sortedLocal) !== JSON.stringify(sortedGlobal);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asociación de Productos y Calibres</CardTitle>
        <CardDescription>
          Define qué calibres corresponden a cada producto. <strong>Guarda los cambios individualmente</strong> por cada producto modificado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-md">
             Primero debes agregar <strong>Productos</strong> en la pestaña "Datos Maestros".
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full border rounded-lg overflow-hidden">
            {products.map((product) => {
              const changed = hasProductChanged(product);
              return (
                <AccordionItem key={product} value={product} className="px-4 bg-card hover:bg-accent/5 transition-colors">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 w-full">
                      <span className="font-semibold text-lg">{product}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getCountLocal(product) > 0 ? "default" : "secondary"} className="text-xs font-normal">
                            {getCountLocal(product)} hab.
                        </Badge>
                        {changed && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Modificado</Badge>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {/* BARRA DE HERRAMIENTAS DEL PRODUCTO */}
                    <div className="flex flex-wrap justify-between items-center mb-4 border-b pb-2 gap-2 bg-muted/20 p-2 rounded">
                        <span className="text-sm text-muted-foreground hidden sm:block pl-2">Acciones:</span>
                        <div className="flex gap-2 ml-auto">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleClearProduct(product)}
                                title="Desmarcar todos"
                                className="text-muted-foreground hover:text-destructive h-8"
                            >
                                <Eraser className="mr-2 h-3 w-3" /> Limpiar
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRestoreProduct(product)}
                                disabled={!changed}
                                className="h-8"
                            >
                                <RotateCcw className="mr-2 h-3 w-3" /> Restaurar
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleSaveProduct(product)}
                                disabled={!changed}
                                className={`h-8 ${changed ? "animate-pulse ring-2 ring-primary/20" : ""}`}
                            >
                                <Save className="mr-2 h-3 w-3" /> Guardar
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                      {calibers.length === 0 && (
                         <p className="text-sm text-muted-foreground col-span-full text-center">
                           No hay calibres registrados en el sistema.
                         </p>
                      )}
                      {calibers.map((caliber) => (
                        <div 
                          key={`${product}-${caliber.name}`} 
                          className="flex items-center space-x-3 p-2 rounded hover:bg-background transition-colors border border-transparent hover:border-border"
                        >
                          <Checkbox 
                            id={`${product}-${caliber.name}`} 
                            checked={isCaliberSelectedLocal(product, caliber.name)}
                            onCheckedChange={(checked) => handleToggleCaliber(product, caliber.name, checked as boolean)}
                          />
                          <Label 
                            htmlFor={`${product}-${caliber.name}`}
                            className="text-sm font-medium leading-none cursor-pointer flex flex-col"
                          >
                            <span>{caliber.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-1">Cód: {caliber.code}</span>
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