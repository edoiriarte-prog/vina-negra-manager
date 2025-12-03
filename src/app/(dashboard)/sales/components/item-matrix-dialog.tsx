"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OrderItem, InventoryItem } from '@/lib/types';
import { useMasterData } from '@/hooks/use-master-data';
import { Package, X, Calculator } from 'lucide-react';

type ItemMatrixDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: Omit<OrderItem, 'id'>[]) => void;
  orderType: 'purchase' | 'sale';
  inventory?: InventoryItem[];
};

const SmartInput = ({ value, onChange, className, placeholder }: { value: number; onChange: (val: number) => void; className?: string; placeholder?: string; }) => {
    const [inputValue, setInputValue] = useState<string>(value === 0 ? '' : value.toString());
    useEffect(() => { if (value !== parseFloat(inputValue || '0')) { setInputValue(value === 0 ? '' : value.toString()); } }, [value]);
    const handleBlur = () => {
        try {
            let expression = inputValue.toLowerCase().replace(/x/g, '*').replace(/,/g, '.');
            if (!expression.trim()) { onChange(0); return; }
            if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(expression)) {
                const result = new Function(`return ${expression}`)();
                if (!isNaN(result) && isFinite(result)) { const finalVal = Math.round(result * 100) / 100; setInputValue(finalVal.toString()); onChange(finalVal); } 
                else { setInputValue(value.toString()); }
            } else {
                const num = parseFloat(expression);
                if(!isNaN(num)) { onChange(num); setInputValue(num.toString()); } else { setInputValue(value.toString()); }
            }
        } catch (e) { setInputValue(value.toString()); }
    };
    return ( <Input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={className} placeholder={placeholder} /> );
};

export function ItemMatrixDialog({ isOpen, onOpenChange, onSave, orderType, inventory = [] }: ItemMatrixDialogProps) {
  const { products, calibers, packagingTypes } = useMasterData();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);

  // --- FILTRADO DE CALIBRES ---
  useEffect(() => {
    if (selectedProduct && calibers && calibers.length > 0) {
        // Obtenemos las primeras 3 letras del producto (ej: MAN de MANDARINAS, PAL de PALTA)
        const prefix = selectedProduct.substring(0, 3).toUpperCase();
        
        const filteredCalibers = calibers.filter((c: any) => 
            // Coincidencia por nombre (ej: MAND_GRANDE empieza con MAN)
            c.name.toUpperCase().startsWith(prefix) || 
            // O coincidencia exacta si la BD tiene el campo
            (c.product === selectedProduct)
        );

        // Si no hay coincidencias, mostramos todos por seguridad
        const finalCalibers = filteredCalibers.length > 0 ? filteredCalibers : calibers;

        const initialRows = finalCalibers.map((c: any) => ({
            caliber: c.name,
            quantity: 0, 
            packagingType: 'CAJA PL 10KG', 
            packagingQuantity: 0, 
            price: 0, 
            grossPrice: 0, 
        }));
        setRows(initialRows);
    } else {
        setRows([]);
    }
  }, [selectedProduct, calibers]);

  const handleRowChange = (index: number, field: string, value: any) => {
    const newRows = [...rows];
    if (field === 'price') {
        const net = Number(value);
        newRows[index].price = net;
        newRows[index].grossPrice = Math.round(net * 1.19);
    } else if (field === 'grossPrice') {
        const gross = Number(value);
        newRows[index].grossPrice = gross;
        newRows[index].price = Math.round(gross / 1.19);
    } else {
        newRows[index][field] = value;
    }
    setRows(newRows);
  };

  const handleSave = () => {
    const itemsToSave = rows.filter(r => r.quantity > 0).map(r => ({
            product: selectedProduct,
            caliber: r.caliber,
            quantity: Number(r.quantity),
            packagingType: r.packagingType,
            packagingQuantity: Number(r.packagingQuantity),
            price: Number(r.price),
            total: Number(r.quantity) * Number(r.price),
            unit: 'Kilos',
            format: r.packagingType || 'Estándar',
            lotNumber: ''
        }));
    if (itemsToSave.length === 0) return;
    onSave(itemsToSave);
    setSelectedProduct('');
    onOpenChange(false);
  };

  const totalKilos = useMemo(() => rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((acc, r) => acc + ((Number(r.quantity) || 0) * (Number(r.price) || 0)), 0), [rows]);
  const darkInput = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 text-right font-mono text-xs h-9 placeholder:text-slate-700";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 bg-slate-950 border-slate-800 text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-100"><Package className="h-5 w-5 text-blue-500" /> Carga Masiva de Productos</DialogTitle>
                    <DialogDescription className="text-slate-400 flex items-center gap-2">Seleccione un producto y complete las cantidades.</DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800"><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-6 max-w-md">
                <Label className={labelClass}>Producto a Ingresar</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-10 border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-500/20"><SelectValue placeholder="Seleccione producto..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {products?.map((p, index) => { const pName = typeof p === 'string' ? p : (p as any).name; return ( <SelectItem key={index} value={pName} className="focus:bg-slate-800 focus:text-white">{pName}</SelectItem> ); })}
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
                            <div className="col-span-2 text-center">Envase</div>
                            <div className="col-span-2 text-center">Cant. Env</div>
                            <div className="col-span-2 text-center text-white">Kilos</div>
                            <div className="col-span-2 text-right text-blue-400 pr-2">P. Neto</div>
                            <div className="col-span-2 text-right text-emerald-400 pr-2">P. c/IVA</div>
                        </div>
                        <div className="divide-y divide-slate-800 max-h-[450px] overflow-y-auto">
                            {rows.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-slate-800/30 transition-colors group">
                                    <div className="col-span-2 font-medium text-sm pl-2 text-slate-300">{row.caliber}</div>
                                    <div className="col-span-2">
                                        <Select value={row.packagingType} onValueChange={(v) => handleRowChange(idx, 'packagingType', v)}>
                                            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-400"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{packagingTypes?.map((pt, i) => ( <SelectItem key={i} value={typeof pt === 'string' ? pt : (pt as any).name || pt}>{typeof pt === 'string' ? pt : (pt as any).name || pt}</SelectItem> ))}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2"><SmartInput className={`${darkInput} text-center text-slate-400`} placeholder="0" value={row.packagingQuantity || 0} onChange={(val) => handleRowChange(idx, 'packagingQuantity', val)} /></div>
                                    <div className="col-span-2"><SmartInput className={`h-9 text-center font-bold text-sm border-slate-800 placeholder:text-slate-700 ${row.quantity > 0 ? 'bg-blue-950/30 border-blue-500/50 text-white' : 'bg-slate-950 text-slate-500'}`} placeholder="0" value={row.quantity || 0} onChange={(val) => handleRowChange(idx, 'quantity', val)} /></div>
                                    <div className="col-span-2"><SmartInput className={`${darkInput} text-blue-400`} placeholder="0" value={row.price || 0} onChange={(val) => handleRowChange(idx, 'price', val)} /></div>
                                    <div className="col-span-2"><SmartInput className={`${darkInput} text-emerald-400`} placeholder="0" value={row.grossPrice || 0} onChange={(val) => handleRowChange(idx, 'grossPrice', val)} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 min-h-[300px]"><Package className="h-16 w-16 mb-4 opacity-20" /><p className="text-sm font-medium">Seleccione un producto arriba para comenzar</p></div>
            )}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex gap-8 text-sm">
                <div><span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Total Kilos</span><span className="font-bold text-xl text-white">{new Intl.NumberFormat('es-CL').format(totalKilos)} <span className="text-sm text-slate-500">kg</span></span></div>
                <div><span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Neto Estimado</span><span className="font-bold text-xl text-blue-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalAmount)}</span></div>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancelar</Button>
                <Button onClick={handleSave} disabled={totalKilos === 0} className="bg-blue-600 text-white hover:bg-blue-500 px-6 shadow-lg shadow-blue-900/20">Confirmar e Insertar</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}