"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterData } from "@/hooks/use-master-data";
import { Package, Calculator, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemMatrixDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: any[]) => void;
}

// Tipo interno para la fila de carga
type RowData = {
    caliber: string;
    packagingType: string;
    packagingQuantity: string;
    kilos: string;
    netPrice: string;
    grossPrice: string;
};

export function ItemMatrixDialog({ isOpen, onOpenChange, onSave }: ItemMatrixDialogProps) {
  const { products, calibers, packagingTypes, productCaliberAssociations } = useMasterData();
  
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [rows, setRows] = useState<RowData[]>([]);

  // Al abrir o cambiar producto, generamos las filas según los calibres asociados (o todos si no hay asociación)
  useEffect(() => {
    if (isOpen && products.length > 0 && !selectedProduct) {
        setSelectedProduct(products[0]);
    }
  }, [isOpen, products]);

  useEffect(() => {
      if (!selectedProduct) return;
      
      // Buscar calibres asociados a este producto
      const assoc = productCaliberAssociations.find(a => a.id === selectedProduct);
      const activeCalibers = assoc ? assoc.calibers : calibers.map(c => c.name); // Si no hay asociación, usa todos

      // Crear filas vacías para cada calibre
      const newRows = activeCalibers.map(cal => ({
          caliber: cal,
          packagingType: packagingTypes[0] || "",
          packagingQuantity: "0",
          kilos: "0",
          netPrice: "0",
          grossPrice: "0"
      }));
      
      setRows(newRows);
  }, [selectedProduct, isOpen]);

  // --- HANDLERS ---

  const updateRow = (index: number, field: keyof RowData, value: string) => {
      const newRows = [...rows];
      const row = { ...newRows[index] };
      
      // Lógica de cálculo inteligente
      if (field === 'packagingQuantity') {
          row.packagingQuantity = value;
          // Si cambia envases, estimar kilos (ej: x 10) - Ajustar lógica según necesites
          // row.kilos = (parseFloat(value || '0') * 10).toString(); 
      } else if (field === 'netPrice') {
          row.netPrice = value;
          // Calcular Bruto automático
          const net = parseFloat(value || '0');
          row.grossPrice = Math.round(net * 1.19).toString();
      } else if (field === 'grossPrice') {
          row.grossPrice = value;
          // Calcular Neto automático
          const gross = parseFloat(value || '0');
          row.netPrice = Math.round(gross / 1.19).toString();
      } else {
          // @ts-ignore
          row[field] = value;
      }

      newRows[index] = row;
      setRows(newRows);
  };

  // Totales en vivo
  const totals = useMemo(() => {
      return rows.reduce((acc, row) => {
          const kilos = parseFloat(row.kilos) || 0;
          const net = parseFloat(row.netPrice) || 0;
          return {
              kilos: acc.kilos + kilos,
              amount: acc.amount + (kilos * net)
          };
      }, { kilos: 0, amount: 0 });
  }, [rows]);

  const handleConfirm = () => {
      // Convertir filas a items de orden
      const itemsToSave = rows
        .filter(r => parseFloat(r.kilos) > 0) // Solo guardar si tiene kilos
        .map(r => ({
            product: selectedProduct,
            caliber: r.caliber,
            packagingType: r.packagingType,
            packagingQuantity: parseFloat(r.packagingQuantity) || 0,
            quantity: parseFloat(r.kilos) || 0,
            price: parseFloat(r.netPrice) || 0,
            total: (parseFloat(r.kilos) || 0) * (parseFloat(r.netPrice) || 0),
            unit: 'Kilos'
        }));
      
      onSave(itemsToSave);
      onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="text-blue-500" /> Carga Masiva de Productos
          </DialogTitle>
          <DialogDescription className="text-slate-400 flex items-center gap-2">
            Seleccione un producto y complete las cantidades. 
            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                💡 Tip: Puedes escribir fórmulas simples
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
            {/* SELECTOR PRODUCTO */}
            <div className="w-1/3">
                <Label className="text-xs text-slate-500 uppercase mb-1.5 block">Producto a Ingresar</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-10 text-lg font-semibold"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* TABLA DE CARGA */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/20">
                <div className="grid grid-cols-12 gap-1 bg-slate-900 p-2 text-xs font-bold text-slate-500 uppercase text-center">
                    <div className="col-span-2 text-left pl-2">Calibre</div>
                    <div className="col-span-3">Envase</div>
                    <div className="col-span-1">Cant. Env</div>
                    <div className="col-span-2">Kilos</div>
                    <div className="col-span-2">P. Neto</div>
                    <div className="col-span-2 text-emerald-500">P. c/IVA</div>
                </div>
                
                <ScrollArea className="h-[300px]">
                    <div className="divide-y divide-slate-800/50">
                        {rows.map((row, idx) => (
                            <div key={row.caliber} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-slate-800/30 transition-colors">
                                <div className="col-span-2 font-bold text-slate-200 pl-2 truncate" title={row.caliber}>
                                    {row.caliber}
                                </div>
                                <div className="col-span-3">
                                    <Select value={row.packagingType} onValueChange={(v) => updateRow(idx, 'packagingType', v)}>
                                        <SelectTrigger className="h-8 bg-slate-950 border-slate-800 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {packagingTypes.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1">
                                    <Input 
                                        className="h-8 text-center bg-slate-950 border-slate-800 focus:border-blue-500" 
                                        value={row.packagingQuantity}
                                        onChange={(e) => updateRow(idx, 'packagingQuantity', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        className="h-8 text-center bg-slate-950 border-slate-800 font-bold text-white focus:border-blue-500" 
                                        value={row.kilos}
                                        onChange={(e) => updateRow(idx, 'kilos', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        className="h-8 text-right bg-slate-950 border-slate-800 text-blue-300" 
                                        value={row.netPrice}
                                        onChange={(e) => updateRow(idx, 'netPrice', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        className="h-8 text-right bg-slate-950 border-slate-800 text-emerald-400 font-bold" 
                                        value={row.grossPrice}
                                        onChange={(e) => updateRow(idx, 'grossPrice', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>

        <div className="bg-slate-900 border-t border-slate-800 p-4 -mx-6 -mb-6 flex justify-between items-center">
            <div className="flex gap-8">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">Total Kilos</p>
                    <p className="text-2xl font-bold text-white">{totals.kilos.toLocaleString('es-CL')} <span className="text-sm text-slate-500 font-normal">kg</span></p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">Neto Estimado</p>
                    <p className="text-2xl font-bold text-blue-400">${totals.amount.toLocaleString('es-CL')}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-500 text-white w-48">Confirmar e Insertar</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}