
"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderItem, PurchaseOrder, SalesOrder, Contact, InventoryAdjustment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';

type LotSelectionDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (item: OrderItem) => void;
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  warehouse: string;
  contacts: Contact[];
};

type AvailableLot = {
  purchaseOrderId: string;
  lotNumber: string;
  product: string;
  caliber: string;
  supplierId: string;
  purchaseDate: string;
  originalQuantity: number;
  availableQuantity: number;
  originalPackagingQuantity: number;
  availablePackagingQuantity: number;
  avgWeight: number;
};

type LotInputs = {
    packages: number;
    kilos: number;
    price: number;
}

export function LotSelectionDialog({ 
    isOpen, onOpenChange, onSave, purchaseOrders, salesOrders, 
    inventoryAdjustments, warehouse, contacts 
}: LotSelectionDialogProps) {
  const [filter, setFilter] = useState('');
  const [lotInputs, setLotInputs] = useState<Record<string, LotInputs>>({});
  const { toast } = useToast();

  const availableLots = useMemo(() => {
    const lotMap = new Map<string, AvailableLot>();

    // Step 1: Aggregate all lot entries from all purchase orders (completed)
    purchaseOrders.forEach(po => {
        if (po.status === 'completed') {
            po.items.forEach(item => {
                if (item.lotNumber && item.unit === 'Kilos') {
                    const existingLot = lotMap.get(item.lotNumber) || {
                        purchaseOrderId: po.id,
                        lotNumber: item.lotNumber,
                        product: item.product,
                        caliber: item.caliber,
                        supplierId: po.supplierId,
                        purchaseDate: po.date,
                        originalQuantity: 0,
                        availableQuantity: 0,
                        originalPackagingQuantity: 0,
                        availablePackagingQuantity: 0,
                        avgWeight: 0,
                    };
                    
                    existingLot.originalQuantity += item.quantity;
                    existingLot.originalPackagingQuantity += (item.packagingQuantity || 0);

                    lotMap.set(item.lotNumber, existingLot);
                }
            });
        }
    });
    
    // Step 2: Recalculate average weight
    lotMap.forEach(lot => {
       if (lot.originalPackagingQuantity > 0) {
         lot.avgWeight = lot.originalQuantity / lot.originalPackagingQuantity;
       }
       // Initialize available quantities
       lot.availableQuantity = lot.originalQuantity;
       lot.availablePackagingQuantity = lot.originalPackagingQuantity;
    });

    // Step 3: Process all warehouse movements (sales, dispatches, adjustments)
    const allMovements = [
        ...salesOrders.flatMap(so => so.status !== 'cancelled' ? so.items.map(i => ({ ...i, warehouse: so.warehouse })) : []),
        ...inventoryAdjustments.map(adj => ({...adj, quantity: adj.type === 'increase' ? -adj.quantity : adj.quantity }))
    ];

    allMovements.forEach(item => {
        if (item.lotNumber && lotMap.has(item.lotNumber)) {
            const lot = lotMap.get(item.lotNumber)!;
            // We only care about movements OUT of the current warehouse
            if (item.warehouse === warehouse) {
                lot.availableQuantity -= item.quantity;
                lot.availablePackagingQuantity -= (item.packagingQuantity || 0);
            }
        }
    });

    // Step 4: Filter lots that are currently in the selected warehouse.
    const lotsInWarehouse = new Set<string>();
    // A lot is in a warehouse if it was purchased into it...
    purchaseOrders.forEach(po => {
      if (po.status === 'completed' && po.warehouse === warehouse) {
        po.items.forEach(item => {
          if (item.lotNumber) lotsInWarehouse.add(item.lotNumber);
        });
      }
    });
    
    // ... or transferred into it.
    salesOrders.forEach(so => {
        if(so.movementType === 'Traslado Bodega Interna' && so.destinationWarehouse === warehouse) {
            const transferPO = purchaseOrders.find(po => po.description?.includes(so.id));
            if(transferPO) {
                 transferPO.items.forEach(item => {
                    if (item.lotNumber) lotsInWarehouse.add(item.lotNumber);
                 });
            }
        }
    })

    const finalLots = Array.from(lotMap.values())
        .filter(lot => lotsInWarehouse.has(lot.lotNumber) && lot.availableQuantity > 0.1 && lot.availablePackagingQuantity > 0)
        .sort((a,b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    return finalLots;

  }, [purchaseOrders, salesOrders, inventoryAdjustments, warehouse]);

   useEffect(() => {
    if (isOpen) {
      // Pre-fill inputs when dialog opens
      const initialInputs: Record<string, LotInputs> = {};
      availableLots.forEach(lot => {
        initialInputs[lot.lotNumber] = { packages: 0, kilos: 0, price: 0 };
      });
      setLotInputs(initialInputs);
    }
  }, [isOpen, availableLots]);
  
  const filteredLots = useMemo(() => {
    if (!filter) return availableLots;
    const lowerFilter = filter.toLowerCase();
    return availableLots.filter(lot => 
        lot.lotNumber.toLowerCase().includes(lowerFilter) ||
        lot.product.toLowerCase().includes(lowerFilter) ||
        lot.caliber.toLowerCase().includes(lowerFilter) ||
        (contacts.find(c => c.id === lot.supplierId)?.name || '').toLowerCase().includes(lowerFilter)
    );
  }, [availableLots, filter, contacts])

  const handleAddLot = (lot: AvailableLot) => {
    const inputs = lotInputs[lot.lotNumber] || { packages: 0, kilos: 0, price: 0 };
    if (inputs.packages <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'La cantidad de envases debe ser mayor a 0.'});
      return;
    }
    if (inputs.packages > lot.availablePackagingQuantity) {
      toast({ variant: 'destructive', title: 'Error de Stock', description: 'La cantidad de envases supera el stock disponible del lote.'});
      return;
    }
     if (inputs.kilos <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Los kilos a cargar deben ser mayor a 0.'});
      return;
    }
    if (inputs.price <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'El precio debe ser mayor a 0.'});
      return;
    }

    const item: OrderItem = {
      id: `lot-item-${lot.lotNumber}`, // temporary id
      product: lot.product,
      caliber: lot.caliber,
      quantity: inputs.kilos,
      packagingQuantity: inputs.packages,
      unit: 'Kilos',
      price: inputs.price,
      lotNumber: lot.lotNumber,
    };
    onSave(item);
    
    // Reset inputs for this lot after adding
    setLotInputs(prev => ({
      ...prev,
      [lot.lotNumber]: { packages: 0, kilos: 0, price: 0 },
    }));
    
    toast({ title: 'Lote Agregado', description: `${inputs.packages} envases del lote ${lot.lotNumber} agregados a la orden.`});
  };

  const getSupplierName = (id: string) => {
    return contacts.find(c => c.id === id)?.name || 'Desconocido';
  }

  const handleInputChange = (lotNumber: string, field: keyof LotInputs, value: string) => {
      const numValue = Number(value);
      setLotInputs(prev => {
          const newInputs = { ...prev };
          const currentLotInputs = newInputs[lotNumber] || { packages: 0, kilos: 0, price: 0 };
          
          if (field === 'packages') {
              const lot = availableLots.find(l => l.lotNumber === lotNumber);
              const calculatedKilos = lot ? numValue * lot.avgWeight : 0;
              newInputs[lotNumber] = { ...currentLotInputs, packages: numValue, kilos: parseFloat(calculatedKilos.toFixed(2)) };
          } else {
              newInputs[lotNumber] = { ...currentLotInputs, [field]: numValue };
          }

          return newInputs;
      });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>Seleccionar Lote de Inventario</DialogTitle>
          <DialogDescription>
            Busque y agregue ítems desde lotes de compra existentes en la bodega '{warehouse}'. Los lotes se muestran del más antiguo al más nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <Input 
            placeholder="Buscar por lote, producto o calibre..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Stock Disp.</TableHead>
                  <TableHead className="w-[140px]">Envases a Cargar</TableHead>
                  <TableHead className="w-[140px]">Kg a Cargar</TableHead>
                  <TableHead className="w-[120px]">Precio</TableHead>
                  <TableHead className="w-[100px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">No hay lotes disponibles en esta bodega.</TableCell>
                  </TableRow>
                )}
                {filteredLots.map(lot => {
                   const inputs = lotInputs[lot.lotNumber] || { packages: 0, kilos: 0, price: 0 };
                   return (
                  <TableRow key={lot.purchaseOrderId + '-' + lot.lotNumber}>
                    <TableCell><Badge variant="outline">{lot.lotNumber}</Badge></TableCell>
                    <TableCell>{lot.product}</TableCell>
                    <TableCell>{lot.caliber}</TableCell>
                    <TableCell className="text-xs">{getSupplierName(lot.supplierId)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {lot.availablePackagingQuantity.toLocaleString('es-CL')} env.
                      <br/>
                      <span className="text-xs text-muted-foreground">({lot.availableQuantity.toFixed(2)} kg)</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={inputs.packages || ''}
                        onChange={e => handleInputChange(lot.lotNumber, 'packages', e.target.value)}
                        max={lot.availablePackagingQuantity}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={inputs.kilos || ''}
                        onChange={e => handleInputChange(lot.lotNumber, 'kilos', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={inputs.price || ''}
                        onChange={e => handleInputChange(lot.lotNumber, 'price', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleAddLot(lot)}>Agregar</Button>
                    </TableCell>
                  </TableRow>
                   )
                })}
              </TableBody>
            </Table>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
