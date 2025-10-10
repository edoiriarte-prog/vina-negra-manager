
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryAdjustment } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';
import { productCaliberMatrix } from '@/lib/master-data';

type NewAdjustmentSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (adjustment: (InventoryAdjustment | Omit<InventoryAdjustment, 'id'>)[] | InventoryAdjustment | Omit<InventoryAdjustment, 'id'>) => void;
  adjustment: InventoryAdjustment | null;
};

type MatrixRow = {
  caliber: string;
  quantity: number;
  packagingQuantity: number;
};

const getInitialFormData = (adjustment: InventoryAdjustment | null): Omit<InventoryAdjustment, 'id'> => {
    if (adjustment) {
        return {
            ...adjustment,
            date: format(new Date(adjustment.date), 'yyyy-MM-dd'),
        }
    }
    return {
        date: format(new Date(), 'yyyy-MM-dd'),
        product: '',
        caliber: '',
        warehouse: '',
        type: 'decrease',
        quantity: 0,
        packagingQuantity: 0,
        reason: '',
    };
}


export function NewAdjustmentSheet({ isOpen, onOpenChange, onSave, adjustment }: NewAdjustmentSheetProps) {
  const [formData, setFormData] = useState<Omit<InventoryAdjustment, 'id'>>(getInitialFormData(adjustment));
  const { products, calibers, warehouses } = useMasterData();
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');


  useEffect(() => {
    if (adjustment) {
      setFormData(getInitialFormData(adjustment));
      setSelectedProduct(adjustment.product);
      setMatrixData([]); // Editing is for a single item, no matrix needed
    } else {
      setFormData(getInitialFormData(null));
      setSelectedProduct('');
      setMatrixData([]);
    }
  }, [adjustment, isOpen]);
  
  const handleProductSelect = (product: string) => {
    setSelectedProduct(product);
    setFormData(prev => ({...prev, product}));
    
    if (adjustment) return; // Don't build matrix if editing

    const calibersForProduct = productCaliberMatrix[product] || [];
    
    const sortedCalibers = calibersForProduct.sort((a, b) => {
        const indexA = calibers.findIndex(c => c.name === a);
        const indexB = calibers.findIndex(c => c.name === b);
        return indexA - indexB;
    });

    setMatrixData(sortedCalibers.map(caliberName => ({
        caliber: caliberName,
        quantity: 0,
        packagingQuantity: 0,
    })));
  };

  const handleMatrixChange = (index: number, field: keyof MatrixRow, value: string | number) => {
    const newData = [...matrixData];
    (newData[index] as any)[field] = value;
    setMatrixData(newData);
  };


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'quantity' || name === 'packagingQuantity' ? Number(value) : value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adjustment) { // Single item edit mode
        onSave({ ...formData, id: adjustment.id });
    } else { // Batch create mode
        const adjustmentsToSave = matrixData
            .filter(row => row.quantity > 0 || row.packagingQuantity > 0)
            .map(row => ({
                date: formData.date,
                product: selectedProduct,
                caliber: row.caliber,
                warehouse: formData.warehouse,
                type: formData.type,
                reason: formData.reason,
                quantity: Number(row.quantity) || 0,
                packagingQuantity: Number(row.packagingQuantity) || 0,
            }));
        
        if (adjustmentsToSave.length > 0) {
            onSave(adjustmentsToSave);
        }
    }
  };
  
  const title = adjustment ? 'Editar Ajuste' : 'Crear Ajuste de Inventario';
  const description = adjustment 
    ? 'Actualice la información del ajuste.'
    : 'Complete los campos comunes y luego ingrese las cantidades a ajustar por calibre.';
    
  const getCaliberDisplayName = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? `${caliber.name} (${caliber.code})` : caliberName;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                 <div>
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} required />
                 </div>
                 <div>
                    <Label htmlFor="warehouse">Bodega</Label>
                     <Select required onValueChange={(value) => handleSelectChange('warehouse', value)} value={formData.warehouse}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una bodega" /></SelectTrigger>
                        <SelectContent>
                            {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Label htmlFor="type">Tipo de Ajuste</Label>
                    <Select required onValueChange={(value: 'increase' | 'decrease') => handleSelectChange('type', value)} value={formData.type}>
                        <SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="decrease">Disminución</SelectItem>
                        <SelectItem value="increase">Aumento</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="md:col-span-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Textarea id="reason" name="reason" value={formData.reason} onChange={handleInputChange} required />
                 </div>
              </div>

              {/* Adjustment Details */}
              {adjustment ? (
                // Single Edit Mode
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                     <div>
                        <Label htmlFor="product">Producto</Label>
                         <Select required onValueChange={(value) => handleSelectChange('product', value)} value={formData.product}>
                            <SelectTrigger><SelectValue placeholder="Seleccione un producto" /></SelectTrigger>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <Label htmlFor="caliber">Calibre</Label>
                         <Select required onValueChange={(value) => handleSelectChange('caliber', value)} value={formData.caliber}>
                            <SelectTrigger><SelectValue placeholder="Seleccione un calibre" /></SelectTrigger>
                            <SelectContent>
                                {calibers.map(c => <SelectItem key={c.name} value={c.name}>{`${c.name} (${c.code})`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <Label htmlFor="quantity">Cantidad (kg)</Label>
                        <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} required min="0" />
                     </div>
                     <div>
                        <Label htmlFor="packagingQuantity">Cant. Envases</Label>
                        <Input id="packagingQuantity" name="packagingQuantity" type="number" value={formData.packagingQuantity || ''} onChange={handleInputChange} placeholder="Opcional" min="0" />
                    </div>
                </div>
              ) : (
                // Batch Create Mode
                <div className="border p-4 rounded-md">
                  <div className="mb-4">
                    <Label htmlFor="product-matrix">Producto</Label>
                    <Select onValueChange={handleProductSelect} value={selectedProduct}>
                        <SelectTrigger id="product-matrix">
                        <SelectValue placeholder="Seleccione un producto para ver sus calibres" />
                        </SelectTrigger>
                        <SelectContent>
                        {products.map(product => (
                            <SelectItem key={product} value={product}>{product}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedProduct && (
                      <div className="max-h-[40vh] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Calibre</TableHead>
                              <TableHead className='w-[150px]'>Ajuste Kilos</TableHead>
                              <TableHead className='w-[150px]'>Ajuste Envases</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {matrixData.map((row, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{getCaliberDisplayName(row.caliber)}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={row.quantity || ''}
                                    onChange={(e) => handleMatrixChange(index, 'quantity', e.target.value)}
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={row.packagingQuantity || ''}
                                    onChange={(e) => handleMatrixChange(index, 'packagingQuantity', e.target.value)}
                                    placeholder="0"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                </div>
              )}
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit">Guardar</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
