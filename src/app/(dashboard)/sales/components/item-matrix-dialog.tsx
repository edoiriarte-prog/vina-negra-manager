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

// Eliminamos la dependencia de mathjs y usamos una evaluación segura interna simple
// para mantener el bundle ligero.

type ItemMatrixDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: Omit<OrderItem, 'id'>[]) => void;
  orderType: 'purchase' | 'sale';
  inventory?: InventoryItem[];
};

// --- COMPONENTE INPUT INTELIGENTE (CALCULADORA) ---
const SmartInput = ({ 
    value, 
    onChange, 
    className, 
    placeholder 
}: { 
    value: number; 
    onChange: (val: number) => void; 
    className?: string;
    placeholder?: string;
}) => {
    // Estado local como string para permitir escribir fórmulas
    const [inputValue, setInputValue] = useState<string>(value === 0 ? '' : value.toString());

    // Sincronizar si el valor externo cambia (por ejemplo al cambiar de producto o resetear)
    useEffect(() => {
        // Solo actualizamos si el valor numérico es diferente al interpretado actualmente
        // para no interrumpir la escritura si el usuario está en medio de una fórmula compleja
        // pero sí reseteamos si viene un 0 o un valor nuevo desde fuera
        if (value !== parseFloat(inputValue || '0')) {
            setInputValue(value === 0 ? '' : value.toString());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleBlur = () => {
        try {
            // Normalizamos: 'x' por '*', comas por puntos
            let expression = inputValue.toLowerCase().replace(/x/g, '*').replace(/,/g, '.');
            
            // Si está vacío, es 0
            if (!expression.trim()) {
                onChange(0);
                return;
            }

            // Validación de seguridad: solo permitimos números y operadores matemáticos básicos
            if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(expression)) {
                // Evaluamos de forma segura (new Function es más seguro que eval en este contexto restringido)
                // eslint-disable-next-line no-new-func
                const result = new Function(`return ${expression}`)();
                
                if (!isNaN(result) && isFinite(result)) {
                    // Redondeamos a 2 decimales para evitar problemas de coma flotante
                    const finalVal = Math.round(result * 100) / 100; 
                    setInputValue(finalVal.toString());
                    onChange(finalVal);
                } else {
                    // Si el resultado no es un número válido, revertimos al valor original
                    setInputValue(value.toString());
                }
            } else {
                // Si hay caracteres inválidos pero es un número simple, lo intentamos parsear
                const num = parseFloat(expression);
                if(!isNaN(num)) {
                    onChange(num);
                    setInputValue(num.toString());
                } else {
                    setInputValue(value.toString()); 
                }
            }
        } catch (e) {
            // Error de sintaxis en la fórmula, revertimos
            setInputValue(value.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur(); // Forzar blur para disparar el cálculo
        }
    };

    return (
        <Input
            type="text" // Texto para permitir escribir fórmulas
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            placeholder={placeholder}
        />
    );
};

export function ItemMatrixDialog({ isOpen, onOpenChange, onSave, orderType, inventory = [] }: ItemMatrixDialogProps) {
  const { products, calibers, packagingTypes } = useMasterData();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProduct && calibers.length > 0) {
        const initialRows = calibers.map(caliber => ({
            caliber: caliber.name,
            quantity: 0, 
            packagingType: 'CAJA PL 10KG', 
            packagingQuantity: 0, 
            price: 0, 
            grossPrice: 0, 
        }));
        setRows(initialRows);
    } else {
        setRows((prev) => prev.length > 0 ? [] : prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

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
    const itemsToSave = rows
        .filter(r => r.quantity > 0)
        .map(r => ({
            product: selectedProduct,
            caliber: r.caliber,
            quantity: Number(r.quantity),
            packagingType: r.packagingType,
            packagingQuantity: Number(r.packagingQuantity),
            price: Number(r.price),
            unit: 'Kilos'
        }));
    
    onSave(itemsToSave);
    setSelectedProduct('');
    onOpenChange(false);
  };

  const totalKilos = useMemo(() => rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((acc, r) => acc + ((Number(r.quantity) || 0) * (Number(r.price) || 0)), 0), [rows]);

  // Estilos
  const darkInput = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 text-right font-mono text-xs h-9 placeholder:text-slate-700";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 bg-slate-950 border-slate-800 text-slate-100">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-100">
                        <Package className="h-5 w-5 text-blue-500" />
                        Carga Masiva de Productos
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 flex items-center gap-2">
                        Seleccione un producto y complete las cantidades.
                        <span className="inline-flex items-center gap-1 bg-blue-900/30 px-2 py-0.5 rounded text-blue-300 text-[10px]">
                            <Calculator className="h-3 w-3" />
                            Celdas Inteligentes: Escribe fórmulas (ej: 100+50, 20*5)
                        </span>
                    </DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="mt-6 max-w-md">
                <Label className={labelClass}>Producto a Ingresar</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-10 border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-500/20"><SelectValue placeholder="Seleccione producto..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {products.map(p => <SelectItem key={p.id} value={p.name} className="focus:bg-slate-800 focus:text-white">{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
            {selectedProduct ? (
                <div className="space-y-6">
                    
                    {/* --- TABLA DE MATRIZ --- */}
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
                                <div key={row.caliber} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-slate-800/30 transition-colors group">
                                    <div className="col-span-2 font-medium text-sm pl-2 text-slate-300">{row.caliber}</div>
                                    
                                    <div className="col-span-2">
                                        <Select value={row.packagingType} onValueChange={(v) => handleRowChange(idx, 'packagingType', v)}>
                                            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-400"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{packagingTypes.map(pt => <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-2">
                                        {/* INPUT INTELIGENTE PARA CANTIDAD ENVASES */}
                                        <SmartInput 
                                            className={`${darkInput} text-center text-slate-400`}
                                            placeholder="0"
                                            value={row.packagingQuantity || 0}
                                            onChange={(val) => handleRowChange(idx, 'packagingQuantity', val)}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        {/* INPUT INTELIGENTE PARA KILOS */}
                                        <SmartInput 
                                            className={`h-9 text-center font-bold text-sm border-slate-800 placeholder:text-slate-700 ${row.quantity > 0 ? 'bg-blue-950/30 border-blue-500/50 text-white' : 'bg-slate-950 text-slate-500'}`}
                                            placeholder="0"
                                            value={row.quantity || 0}
                                            onChange={(val) => handleRowChange(idx, 'quantity', val)}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        {/* INPUT INTELIGENTE PARA PRECIO NETO */}
                                        <SmartInput 
                                            className={`${darkInput} text-blue-400`}
                                            placeholder="0"
                                            value={row.price || 0}
                                            onChange={(val) => handleRowChange(idx, 'price', val)}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        {/* INPUT INTELIGENTE PARA PRECIO BRUTO */}
                                        <SmartInput 
                                            className={`${darkInput} text-emerald-400`}
                                            placeholder="0"
                                            value={row.grossPrice || 0}
                                            onChange={(val) => handleRowChange(idx, 'grossPrice', val)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 min-h-[300px]">
                    <Package className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Seleccione un producto arriba para comenzar</p>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex gap-8 text-sm">
                <div>
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Total Kilos</span>
                    <span className="font-bold text-xl text-white">{new Intl.NumberFormat('es-CL').format(totalKilos)} <span className="text-sm text-slate-500">kg</span></span>
                </div>
                <div>
                    <span className="text-slate-500 text-xs uppercase font-bold mr-2 block">Neto Estimado</span>
                    <span className="font-bold text-xl text-blue-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalAmount)}</span>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancelar</Button>
                <Button onClick={handleSave} disabled={totalKilos === 0} className="bg-blue-600 text-white hover:bg-blue-500 px-6 shadow-lg shadow-blue-900/20">
                    Confirmar e Insertar
                </Button>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
