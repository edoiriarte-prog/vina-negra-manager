
"use client";

import { useState, useMemo } from 'react';
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
import { OrderItem, PurchaseOrder, SalesOrder, Contact } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type LotSelectionDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (item: OrderItem) => void;
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  warehouse: string;
  contacts: Contact[];
};

type AvailableLot = {
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  lotNumber: string;
  product: string;
  caliber: string;
  supplierId: string;
  originalQuantity: number;
  availableQuantity: number;
};

export function LotSelectionDialog({ isOpen, onOpenChange, onSave, purchaseOrders, salesOrders, warehouse, contacts }: LotSelectionDialogProps) {
  const [filter, setFilter] = useState('');
  const [quantitiesToLoad, setQuantitiesToLoad] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const availableLots = useMemo(() => {
    const lots: AvailableLot[] = [];

    // 1. Get all items from completed purchase orders that have a lot number and match the warehouse
    purchaseOrders.forEach(po => {
      if (po.status === 'completed' && po.warehouse === warehouse) {
        po.items.forEach(item => {
          if (item.lotNumber && item.unit === 'Kilos') {
            lots.push({
              purchaseOrderId: po.id,
              purchaseOrderItemId: item.id,
              lotNumber: item.lotNumber,
              product: item.product,
              caliber: item.caliber,
              supplierId: po.supplierId,
              originalQuantity: item.quantity,
              availableQuantity: item.quantity, // Will be reduced in the next step
            });
          }
        });
      }
    });

    // 2. Subtract quantities from existing sales orders
    salesOrders.forEach(so => {
      so.items.forEach(item => {
        if (item.sourceLot) {
          const lot = lots.find(l => 
            l.purchaseOrderId === item.sourceLot.purchaseOrderId && 
            l.purchaseOrderItemId === item.sourceLot.purchaseOrderItemId
          );
          if (lot) {
            lot.availableQuantity -= item.quantity;
          }
        }
      });
    });

    return lots.filter(l => l.availableQuantity > 0);
  }, [purchaseOrders, salesOrders, warehouse]);
  
  const filteredLots = useMemo(() => {
    if (!filter) return availableLots;
    return availableLots.filter(lot => 
        lot.lotNumber.toLowerCase().includes(filter.toLowerCase()) ||
        lot.product.toLowerCase().includes(filter.toLowerCase()) ||
        lot.caliber.toLowerCase().includes(filter.toLowerCase())
    );
  }, [availableLots, filter])

  const handleAddLot = (lot: AvailableLot) => {
    const quantityToLoad = quantitiesToLoad[lot.lotNumber] || 0;
    if (quantityToLoad <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'La cantidad debe ser mayor a 0.'});
      return;
    }
    if (quantityToLoad > lot.availableQuantity) {
      toast({ variant: 'destructive', title: 'Error de Stock', description: 'La cantidad a cargar supera el stock disponible del lote.'});
      return;
    }

    const item: OrderItem = {
      id: `lot-item-${lot.lotNumber}`, // temporary id
      product: lot.product,
      caliber: lot.caliber,
      quantity: quantityToLoad,
      unit: 'Kilos',
      price: 0, // Price should be set in the sales order form
      lotNumber: lot.lotNumber,
      sourceLot: {
        purchaseOrderId: lot.purchaseOrderId,
        purchaseOrderItemId: lot.purchaseOrderItemId,
      }
    };
    onSave(item);
    // Reset quantity for this lot after adding
    setQuantitiesToLoad(prev => ({ ...prev, [lot.lotNumber]: 0 }));
    toast({ title: 'Lote Agregado', description: `${quantityToLoad} kg del lote ${lot.lotNumber} agregados a la orden.`});
  };

  const getSupplierName = (id: string) => {
    return contacts.find(c => c.id === id)?.name || 'Desconocido';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Seleccionar Lote de Inventario</DialogTitle>
          <DialogDescription>
            Busque y agregue ítems desde lotes de compra existentes en la bodega '{warehouse}'.
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
                  <TableHead className="w-[120px]">Cant. a Cargar</TableHead>
                  <TableHead className="w-[100px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No hay lotes disponibles en esta bodega.</TableCell>
                  </TableRow>
                )}
                {filteredLots.map(lot => (
                  <TableRow key={lot.lotNumber}>
                    <TableCell><Badge variant="outline">{lot.lotNumber}</Badge></TableCell>
                    <TableCell>{lot.product}</TableCell>
                    <TableCell>{lot.caliber}</TableCell>
                    <TableCell className="text-xs">{getSupplierName(lot.supplierId)}</TableCell>
                    <TableCell className="text-right font-medium">{lot.availableQuantity.toLocaleString('es-CL')} kg</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quantitiesToLoad[lot.lotNumber] || ''}
                        onChange={e => setQuantitiesToLoad(prev => ({ ...prev, [lot.lotNumber]: Number(e.target.value)}))}
                        max={lot.availableQuantity}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleAddLot(lot)}>Agregar</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
