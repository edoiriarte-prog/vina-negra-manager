"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useMasterData } from '@/hooks/use-master-data';
import { OrderItem, InventoryItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Calculator, X } from 'lucide-react';

const SmartInput = ({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string; }) => {
    const [inputValue, setInputValue] = useState<string>(value === 0 ? '' : value.toString());
    useEffect(() => {
        const numericValue = parseFloat(inputValue) || 0;
        if (value !== numericValue) {
            setInputValue(value === 0 ? '' : value.toString());
        }
    }, [value]);

    const handleBlur = () => {
        try {
            let expression = inputValue.toLowerCase().replace(/x/g, '*').replace(/,/g, '.');
            if (!expression.trim()) { onChange(0); return; }
            if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(expression)) {
                // Use a safe evaluation method
                const result = new Function(`try { return ${expression} } catch { return NaN; }`)();
                if (!isNaN(result) && isFinite(result)) {
                    onChange(result); // Pass the precise value
                    setInputValue(result.toString());
                } else {
                    setInputValue(value.toString());
                }
            } else {
                const num = parseFloat(expression);
                if(!isNaN(num)) { 
                    onChange(num); 
                    setInputValue(num.toString()); 
                } else { 
                    setInputValue(value.toString()); 
                }
            }
        } catch (e) {
            setInputValue(value.toString());
        }
    };

    return ( <Input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={className} placeholder={placeholder} /> );
};


type ItemMatrixDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: Omit<OrderItem, 'id'>[]) => void;
  orderType: 'purchase' | 'sale';
  inventory?: InventoryItem[];
};

type MatrixRow = {
  caliber: string;
  packagingType: string;
  packagingQuantity: number;
  quantity: number; // Kilos
  price: number; // Net Price
  grossPrice: number; // Price with VAT
};


export function ItemMatrixDialog({ isOpen, onOpenChange, onSave, orderType, inventory = [] }: ItemMatrixDialogProps) {
  const { products, calibers, packagingTypes, productCaliberAssociations } = useMasterData();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [rows, setRows] = useState<MatrixRow[]>([]);

  useEffect(() => {
    if (selectedProduct && calibers) {
        const assoc = productCaliberAssociations.find(a => a.id === selectedProduct);
        const activeCalibers = assoc ? assoc.calibers : [];
        const calibersToDisplay = calibers.filter(c => activeCalibers.includes(c.name));
        
        const newRows = calibersToDisplay.map(cal => ({
            caliber: cal.name,
            packagingType: packagingTypes[0] || "",
            packagingQuantity: 0,
            quantity: 0,
            price: 0,
            grossPrice: 0,
        }));
        setRows(newRows);
    } else {
        setRows([]);
    }
  }, [selectedProduct, isOpen, calibers, productCaliberAssociations, packagingTypes]);


  const handleRowChange = (index: number, field: keyof MatrixRow, value: any) => {
      const newRows = [...rows];
      const row = newRows[index];

      if (field === 'price') {
          const net = Number(value);
          row.price = net;
          row.grossPrice = net * 1.19;
      } else if (field === 'grossPrice') {
          const gross = Number(value);
          row.grossPrice = gross;
          row.price = gross / 1.19;
      } else {
          (row as any)[field] = value;
      }

      newRows[index] = row;
      setRows(newRows);
  };
  
  const getAvailableStock = (caliber: string) => {
    if (!inventory || orderType !== 'sale' || !selectedProduct) return null;
    
    // DEBUG: Console log para verificar datos de entrada.
    console.log('Buscando stock para:', selectedProduct, 'Calibre:', caliber);

    const normalizedSelectedProduct = selectedProduct.trim().toUpperCase();

    const stock = inventory
        .filter(item => 
            item &&
            item.name &&
            item.caliber &&
            item.name.trim().toUpperCase() === normalizedSelectedProduct && 
            item.caliber === caliber
        )
        .reduce((sum, item) => sum + (item.stock || 0), 0);
        
    return stock;
  }

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => {
        const kilos = Number(row.quantity) || 0;
        const netPrice = Number(row.price) || 0;
        const lineTotal = kilos * netPrice;
        
        acc.kilos += kilos;
        acc.net += lineTotal;
        
        return acc;
    }, { kilos: 0, net: 0 });
  }, [rows]);

  const totalVat = totals.net * 0.19;
  const totalGross = totals.net + totalVat;


  const handleConfirm = () => {
      const itemsToSave = rows
        .filter(r => r.quantity > 0)
        .map(r => ({
            product: selectedProduct,
            caliber: r.caliber,
            packagingType: r.packagingType,
            packagingQuantity: Number(r.packagingQuantity) || 0,
            quantity: Number(r.quantity) || 0,
            price: Number(r.price) || 0,
            total: (Number(r.quantity) || 0) * (Number(r.price) || 0),
            unit: 'Kilos'
        }));
      
      onSave(itemsToSave);
      onOpenChange(false);
  };
  
  const darkInput = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 text-right font-mono text-xs h-9 placeholder:text-slate-700";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col gap-0 p-0 bg-slate-950 border-slate-800 text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-100"><Package className="h-5 w-5 text-blue-500" /> Carga Masiva de Productos</DialogTitle>
                    <DialogDescription className="text-slate-400 flex items-center gap-2">Seleccione un producto y complete las cantidades.
                      <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800 flex items-center gap-1">
                          <Calculator className="h-3 w-3"/> Puedes usar fórmulas simples (ej. 10*5+2)
                      </span>
                    </DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800"><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-6 max-w-md">
                <Label className={labelClass}>Producto a Ingresar</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-10 border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-500/20"><SelectValue placeholder="Seleccione producto..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {products.map((p) => (
                           <SelectItem key={p} value={p} className="focus:bg-slate-800 focus:text-white">{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
            {selectedProduct ? (
                <div className="space-y-6">
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 items-center tracking-wider">
                            <div className="col-span-2 pl-2">Calibre</div>
                            {orderType === 'sale' && <div className="col-span-1 text-center text-white">Stock Disp.</div>}
                            <div className="col-span-3 text-center">Envase</div>
                            <div className="col-span-1 text-center">Cant. Env</div>
                            <div className="col-span-1 text-center text-white">Kilos</div>
                            <div className="col-span-2 text-right text-blue-400 pr-2">P. Neto</div>
                            <div className="col-span-2 text-right text-emerald-400 pr-2">P. c/IVA</div>
                        </div>
                        <ScrollArea className="max-h-[400px]">
                            <div className="divide-y divide-slate-800">
                                {rows.map((row, idx) => {
                                    const stock = getAvailableStock(row.caliber);
                                    return (
                                    <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-slate-800/30 transition-colors group">
                                        <div className="col-span-2 font-medium text-sm pl-2 text-slate-300">{row.caliber}</div>
                                        {orderType === 'sale' && (
                                            <div className="col-span-1 text-center font-mono">
                                                {stock !== null ? (
                                                    <span className={stock > 0 ? 'text-emerald-400' : 'text-red-500'}>
                                                        {new Intl.NumberFormat('es-CL').format(stock)} kg
                                                    </span>
                                                ) : '-'}
                                            </div>
                                        )}
                                        <div className="col-span-3">
                                            <Select value={row.packagingType} onValueChange={(v) => handleRowChange(idx, 'packagingType', v)}>
                                                <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-400"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{packagingTypes.map((pt) => ( <SelectItem key={pt} value={pt}>{pt}</SelectItem> ))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1"><SmartInput className={`${darkInput} text-center text-slate-400`} placeholder="0" value={row.packagingQuantity} onChange={(val) => handleRowChange(idx, 'packagingQuantity', val)} /></div>
                                        <div className="col-span-1"><SmartInput className={`h-9 text-center font-bold text-sm border-slate-800 placeholder:text-slate-700 ${row.quantity > 0 ? 'bg-blue-950/30 border-blue-500/50 text-white' : 'bg-slate-950 text-slate-500'}`} placeholder="0" value={row.quantity} onChange={(val) => handleRowChange(idx, 'quantity', val)} /></div>
                                        <div className="col-span-2"><SmartInput className={`${darkInput} text-blue-400`} placeholder="0" value={row.price} onChange={(val) => handleRowChange(idx, 'price', val)} /></div>
                                        <div className="col-span-2"><SmartInput className={`${darkInput} text-emerald-400 font-bold`} placeholder="0" value={row.grossPrice} onChange={(val) => handleRowChange(idx, 'grossPrice', val)} /></div>
                                    </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 min-h-[300px]"><Package className="h-16 w-16 mb-4 opacity-20" /><p className="text-sm font-medium">Seleccione un producto arriba para comenzar</p></div>
            )}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex gap-6 text-sm">
                <div>
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Total Kilos</span>
                    <span className="font-bold text-xl text-white">{new Intl.NumberFormat('es-CL').format(totals.kilos)} <span className="text-sm text-slate-500">kg</span></span>
                </div>
                <div className="border-l border-slate-800 pl-6">
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Subtotal Neto</span>
                    <span className="font-bold text-md text-blue-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totals.net)}</span>
                </div>
                 <div className="border-l border-slate-800 pl-6">
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">IVA (19%)</span>
                    <span className="font-bold text-md text-slate-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalVat)}</span>
                </div>
                <div className="border-l border-slate-800 pl-6">
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Total c/IVA</span>
                    <span className="font-bold text-xl text-emerald-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalGross)}</span>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancelar</Button>
                <Button onClick={handleConfirm} disabled={totals.kilos === 0} className="bg-blue-600 text-white hover:bg-blue-500 px-6 shadow-lg shadow-blue-900/20">Confirmar e Insertar</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
