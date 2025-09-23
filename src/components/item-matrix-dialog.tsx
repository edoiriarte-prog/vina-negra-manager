
"use client";

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMasterData } from '@/hooks/use-master-data';
import { OrderItem, InventoryItem } from '@/lib/types';
import { productCaliberMatrix } from '@/lib/master-data';
import { Badge } from '@/components/ui/badge';

type ItemMatrixDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (items: Omit<OrderItem, 'id'>[]) => void;
  orderType: 'sale' | 'purchase';
  inventory?: InventoryItem[];
};

type MatrixRow = {
  product: string;
  caliber: string;
  quantity: number;
  price: number;
  unit: 'Kilos' | 'Cajas';
  packagingType: string;
  packagingQuantity: number;
  stock: number;
};

export function ItemMatrixDialog({ isOpen, onOpenChange, onSave, orderType, inventory = [] }: ItemMatrixDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const { products, units, packagingTypes } = useMasterData();

  const handleProductSelect = (product: string) => {
    setSelectedProduct(product);
    const calibersForProduct = productCaliberMatrix[product] || [];
    setMatrixData(calibersForProduct.map(caliber => {
        const inventoryItem = inventory.find(i => i.caliber === caliber && i.product === product);
        return {
            product: product,
            caliber: caliber,
            quantity: 0,
            price: 0,
            unit: 'Kilos',
            packagingType: '',
            packagingQuantity: 0,
            stock: inventoryItem?.stock || 0,
        }
    }));
  };

  const handleMatrixChange = (index: number, field: keyof MatrixRow, value: string | number) => {
    const newData = [...matrixData];
    (newData[index] as any)[field] = value;
    setMatrixData(newData);
  };
  
  const handleSaveMatrix = () => {
    const itemsToAdd = matrixData
      .filter(row => row.quantity > 0)
      .map(row => ({
          product: row.product,
          caliber: row.caliber,
          quantity: Number(row.quantity),
          price: Number(row.price),
          unit: row.unit,
          packagingType: row.packagingType,
          packagingQuantity: Number(row.packagingQuantity),
      }));
    onSave(itemsToAdd);
    reset();
  };

  const reset = () => {
      setSelectedProduct('');
      setMatrixData([]);
  }

  const handleOpenChange = (open: boolean) => {
      if (!open) {
          reset();
      }
      onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agregar Ítems por Matriz de Calibres</DialogTitle>
          <DialogDescription>
            Seleccione un producto para ver sus calibres y agregar cantidades rápidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 items-center gap-4 my-4">
            <Label htmlFor="product-matrix" className="text-right">
                Producto
            </Label>
            <Select onValueChange={handleProductSelect} value={selectedProduct}>
                <SelectTrigger id="product-matrix" className="col-span-3">
                <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                {products.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>

        {selectedProduct && (
          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Calibre</TableHead>
                  {orderType === 'sale' && <TableHead className="w-[120px]">Stock Disp.</TableHead>}
                  <TableHead className='w-[100px]'>Cantidad</TableHead>
                  <TableHead className='w-[120px]'>Unidad</TableHead>
                  <TableHead className='w-[120px]'>Precio</TableHead>
                  {orderType === 'sale' && (
                      <>
                        <TableHead className='w-[150px]'>Tipo Envase</TableHead>
                        <TableHead className='w-[100px]'>Cant. Envases</TableHead>
                      </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.caliber}</TableCell>
                     {orderType === 'sale' && (
                        <TableCell>
                            <Badge variant={row.stock > 0 ? 'secondary' : 'destructive'}>
                                {row.stock.toLocaleString('es-CL')} kg
                            </Badge>
                        </TableCell>
                     )}
                    <TableCell>
                      <Input
                        type="number"
                        value={row.quantity || ''}
                        onChange={(e) => handleMatrixChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className={orderType === 'sale' && row.quantity > row.stock ? 'border-destructive' : ''}
                      />
                    </TableCell>
                     <TableCell>
                      <Select
                        value={row.unit}
                        onValueChange={(value: 'Kilos' | 'Cajas') => handleMatrixChange(index, 'unit', value)}
                      >
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.price || ''}
                        onChange={(e) => handleMatrixChange(index, 'price', e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    {orderType === 'sale' && (
                        <>
                        <TableCell>
                           <Select
                                value={row.packagingType}
                                onValueChange={(value) => handleMatrixChange(index, 'packagingType', value)}
                            >
                                <SelectTrigger><SelectValue placeholder="Envase"/></SelectTrigger>
                                <SelectContent>
                                 {packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                            <Input
                                type="number"
                                value={row.packagingQuantity || ''}
                                onChange={(e) => handleMatrixChange(index, 'packagingQuantity', e.target.value)}
                                placeholder="0"
                            />
                        </TableCell>
                        </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSaveMatrix} disabled={!selectedProduct || matrixData.every(row => row.quantity === 0)}>
            Agregar y Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
