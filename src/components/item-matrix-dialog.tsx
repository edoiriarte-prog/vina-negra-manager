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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useMasterData } from '@/hooks/use-master-data';
import { OrderItem, InventoryItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ItemMatrixDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (items: Omit<OrderItem, 'id'>[]) => void;
  orderType: 'purchase' | 'sale';
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);

export function ItemMatrixDialog({ isOpen, onOpenChange, onSave, inventory = [], orderType }: ItemMatrixDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const { products, units, packagingTypes, calibers, productCaliberAssociations } = useMasterData();

  useEffect(() => {
    if (selectedProduct) {
      const associatedCaliberNames = productCaliberAssociations.find(a => a.id === selectedProduct)?.calibers || [];
      const calibersForProduct = calibers.filter(c => associatedCaliberNames.includes(c.name));

      const sortedCalibers = calibersForProduct.sort((a, b) => {
        const indexA = calibers.findIndex(c => c.name === a.name);
        const indexB = calibers.findIndex(c => c.name === b.name);
        return indexA - indexB;
      });

      setMatrixData(sortedCalibers.map(caliber => {
          const inventoryItem = inventory.find(i => i.caliber === caliber.name && i.product === selectedProduct);
          return {
              product: selectedProduct,
              caliber: caliber.name,
              quantity: 0,
              price: 0,
              unit: 'Kilos',
              packagingType: '',
              packagingQuantity: 0,
              stock: inventoryItem?.stock || 0,
          }
      }));
    } else {
        setMatrixData((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [selectedProduct, productCaliberAssociations, calibers, inventory]);


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
      onOpenChange(false);
  }

  const handleOpenChange = (open: boolean) => {
      if (!open) {
          reset();
      }
      onOpenChange(open);
  }
  
  const getCaliberDisplayName = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? `${caliber.name} (${caliber.code})` : caliberName;
  }
  
  const totals = useMemo(() => {
    return matrixData.reduce((acc, row) => {
        acc.totalKilos += row.unit === 'Kilos' ? Number(row.quantity || 0) : 0;
        acc.totalPackages += Number(row.packagingQuantity || 0);
        acc.totalAmount += (Number(row.quantity || 0) * Number(row.price || 0));
        return acc;
    }, { totalKilos: 0, totalPackages: 0, totalAmount: 0});
  }, [matrixData]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Agregar Ítems por Matriz de Calibres</DialogTitle>
          <DialogDescription className="text-slate-400">
            Seleccione un producto para ver sus calibres y agregar cantidades rápidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 items-center gap-4 my-4">
            <Label htmlFor="product-matrix" className="text-right text-slate-300">
                Producto
            </Label>
            <Select onValueChange={setSelectedProduct} value={selectedProduct}>
                <SelectTrigger id="product-matrix" className="col-span-3 bg-slate-900 border-slate-700 text-slate-100">
                <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                {products.map((product) => (
                    <SelectItem key={product} value={product} className="focus:bg-slate-800">{product}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>

        {selectedProduct && (
          <ScrollArea className="max-h-[50vh] overflow-y-auto border border-slate-800 rounded-md">
            <Table>
              <TableHeader className="bg-slate-900 sticky top-0">
                <TableRow className="border-b-slate-800">
                  <TableHead className="text-slate-300">Calibre</TableHead>
                  {orderType === 'sale' && <TableHead className="w-[120px] text-slate-300">Stock Disp.</TableHead>}
                  <TableHead className='w-[100px] text-slate-300'>Cantidad</TableHead>
                  <TableHead className='w-[120px] text-slate-300'>Unidad</TableHead>
                  <TableHead className='w-[120px] text-slate-300'>Precio</TableHead>
                  <TableHead className='w-[150px] text-slate-300'>Tipo Envase</TableHead>
                  <TableHead className='w-[100px] text-slate-300'>Cant. Envases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((row, index) => (
                  <TableRow key={index} className="border-b-slate-800">
                    <TableCell className="font-medium text-slate-200">{getCaliberDisplayName(row.caliber)}</TableCell>
                    {orderType === 'sale' && 
                        <TableCell>
                            <Badge variant={row.stock > 0 ? 'secondary' : 'destructive'} className="border-slate-700">
                                {row.stock.toLocaleString('es-CL')} kg
                            </Badge>
                        </TableCell>
                    }
                    <TableCell>
                      <Input
                        type="number"
                        value={row.quantity || ''}
                        onChange={(e) => handleMatrixChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className={`bg-slate-900 border-slate-700 ${row.quantity > row.stock && orderType === 'sale' ? 'border-destructive' : ''}`}
                      />
                    </TableCell>
                     <TableCell>
                      <Select
                        value={row.unit}
                        onValueChange={(value: 'Kilos' | 'Cajas') => handleMatrixChange(index, 'unit', value)}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          {units.map(u => <SelectItem key={u} value={u} className="focus:bg-slate-800">{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.price || ''}
                        onChange={(e) => handleMatrixChange(index, 'price', e.target.value)}
                        placeholder="0"
                        className="bg-slate-900 border-slate-700"
                      />
                    </TableCell>
                    <TableCell>
                       <Select
                            value={row.packagingType}
                            onValueChange={(value) => handleMatrixChange(index, 'packagingType', value)}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-700"><SelectValue placeholder="Envase"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                             {packagingTypes.map(p => <SelectItem key={p} value={p} className="focus:bg-slate-800">{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                        <Input
                            type="number"
                            value={row.packagingQuantity || ''}
                            onChange={(e) => handleMatrixChange(index, 'packagingQuantity', e.target.value)}
                            placeholder="0"
                            className="bg-slate-900 border-slate-700"
                        />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-slate-900">
                  <TableRow className="border-t-slate-800">
                      <TableCell colSpan={orderType === 'sale' ? 6 : 5} className="text-right font-bold text-slate-300">Subtotales:</TableCell>
                      <TableCell className="text-right font-bold text-slate-200">{formatPackages(totals.totalPackages)}</TableCell>
                  </TableRow>
                   <TableRow>
                      <TableCell colSpan={6} className="text-right font-bold text-lg text-slate-300">Monto Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-emerald-400">{formatCurrency(totals.totalAmount)}</TableCell>
                  </TableRow>
              </TableFooter>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSaveMatrix} disabled={!selectedProduct || matrixData.every(row => row.quantity === 0)} className="bg-blue-600 hover:bg-blue-500 text-white">
            Agregar y Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
