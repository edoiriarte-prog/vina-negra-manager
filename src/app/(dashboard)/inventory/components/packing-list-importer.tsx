"use client";

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { useMasterData } from '@/hooks/use-master-data';
import { useToast } from '@/hooks/use-toast';
import { PurchaseOrder, OrderItem } from '@/lib/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de calibres del frigorifico → estándar Viña Negra (sincronizado con page.tsx)
// ─────────────────────────────────────────────────────────────────────────────
const CALIBRE_MAP: Record<string, string> = {
  'MAND_CHICA':    'CHICA',
  'MAND_MED':      'MEDIANA',
  'MAND_GRANDE':   'GRANDE',
  'MAND_SEGUNDA':  'SEGUNDA',
  'MAND_PRIMERA':  'PRIMERA',
  'MAND_EXTRA':    'EXTRA-PRIMERA',
  'MEDIAN':        'MEDIANA',
  'MEDIANA':       'MEDIANA',
  'CHICO':         'CHICA',
  'CHICA':         'CHICA',
  'GRANDE':        'GRANDE',
  'PREC.':         'PRE CALIBRE',
  'PREC':          'PRE CALIBRE',
  'PRE CALIBRE':   'PRE CALIBRE',
  'TC':            'TODO CALIBRE',
  'TODO CALIBRE':  'TODO CALIBRE',
  'QUINTA':        'QUINTA',
  'SEGUNDA':       'SEGUNDA',
  'TERCERA':       'TERCERA',
  'CUARTA':        'CUARTA',
  'EXTRA-PRIMERA': 'EXTRA-PRIMERA',
  'EXTRA PRIMERA': 'EXTRA-PRIMERA',
  '3':  'CAL-3',
  '4':  'CAL-4',
  '4B': 'CAL-4B',
  '5':  'CAL-5',
  '5A': 'CAL-5A',
  '6':  'CAL-6',
};

const normalizeCalibre = (str?: string): string => {
  const upper = (str || '').trim().toUpperCase();
  return CALIBRE_MAP[upper] || upper;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos del importador
// ─────────────────────────────────────────────────────────────────────────────
type PackingRow = {
  no_tarja:        string;
  producto:        string;
  variedad:        string;
  calibreOriginal: string;
  calibreNorm:     string;
  pesoNeto:        number;
  fechaEmbal:      string;
  productor:       string;
  exportador:      string;
  cuartel:         string;
};

type ImportStep = 'idle' | 'preview' | 'saving' | 'done';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const excelDateToISO = (val: unknown): string => {
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string' && val.trim()) return val.trim().split('T')[0];
  return new Date().toISOString().split('T')[0];
};

const formatKg = (n: number) =>
  new Intl.NumberFormat('es-CL').format(Math.round(n)) + ' kg';

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
interface PackingListImporterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export function PackingListImporter({ isOpen, onOpenChange, onImported }: PackingListImporterProps) {
  const { warehouses, contacts } = useMasterData();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('idle');
  const [rows, setRows] = useState<PackingRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Proveedores disponibles
  const suppliers = contacts.filter(c =>
    Array.isArray(c.type)
      ? c.type.includes('supplier')
      : c.type === 'supplier'
  );

  // ── Leer y parsear el Excel ───────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsed: PackingRow[] = [];
        const errs: string[] = [];

        raw.forEach((row, i) => {
          const tarja   = String(row['no_tarja']        || row['NO_TARJA']        || '').trim();
          const especie = String(row['id_especies']     || row['ID_ESPECIES']     || '').trim().toUpperCase();
          const variedad= String(row['nick_variedad']   || row['NICK_VARIEDAD']   || '').trim();
          const calRaw  = String(row['id_grupocalibre'] || row['ID_GRUPOCALIBRE'] || '').trim();
          const pesoRaw = row['peso_neto'] || row['PESO_NETO'] || 0;
          const fecha   = excelDateToISO(row['fecha_embal'] || row['FECHA_EMBAL'] || '');
          const prod    = String(row['nick_productor']  || row['NICK_PRODUCTOR']  || '').trim();
          const expor   = String(row['nick_exportador'] || row['NICK_EXPORTADOR'] || '').trim();
          const cuartel = String(row['des_cuartel']     || row['DES_CUARTEL']     || '').trim();

          if (!tarja)   { errs.push(`Fila ${i + 2}: sin no_tarja`); return; }
          if (!especie) { errs.push(`Fila ${i + 2}: sin producto`); return; }

          const peso = typeof pesoRaw === 'number' ? pesoRaw : parseFloat(String(pesoRaw)) || 0;

          parsed.push({
            no_tarja:        tarja,
            producto:        especie,
            variedad,
            calibreOriginal: calRaw,
            calibreNorm:     normalizeCalibre(calRaw),
            pesoNeto:        peso,
            fechaEmbal:      fecha,
            productor:       prod,
            exportador:      expor,
            cuartel,
          });
        });

        setRows(parsed);
        setErrors(errs);
        setStep('preview');
      } catch (err) {
        toast({
          title: 'Error al leer el archivo',
          description: 'Asegúrate de que sea un .xlsx válido del frigorifico.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Resumen agrupado ──────────────────────────────────────────────────────
  const resumen = rows.reduce((acc, row) => {
    const key = `${row.producto}|${row.calibreNorm}`;
    if (!acc[key]) acc[key] = { producto: row.producto, calibre: row.calibreNorm, tarjas: 0, totalKg: 0 };
    acc[key].tarjas++;
    acc[key].totalKg += row.pesoNeto;
    return acc;
  }, {} as Record<string, { producto: string; calibre: string; tarjas: number; totalKg: number }>);

  const totalKg    = rows.reduce((s, r) => s + r.pesoNeto, 0);
  const totalTarjas = rows.length;

  // ── Guardar en Firestore ──────────────────────────────────────────────────
  const handleImport = async () => {
    if (!selectedWarehouse) {
      toast({ title: 'Selecciona una bodega', variant: 'destructive' });
      return;
    }
    if (!selectedSupplier) {
      toast({ title: 'Selecciona un proveedor', variant: 'destructive' });
      return;
    }

    setStep('saving');
    try {
      // Convertir cada tarja en un OrderItem
      const items: OrderItem[] = rows.map(row => ({
        product:          row.producto,
        caliber:          row.calibreNorm,
        quantity:         row.pesoNeto,
        packagingQuantity: 1,
        price:            0,
        total:            0,
        unit:             'Kilos',
        lotNumber:        row.no_tarja,
        format:           row.variedad || undefined,
        id:               row.no_tarja,
      }));

      const fechaBase = rows[0]?.fechaEmbal || new Date().toISOString().split('T')[0];

      const oc: Omit<PurchaseOrder, 'id'> = {
        date:        fechaBase,
        supplierId:  selectedSupplier,
        status:      'received',
        warehouse:   selectedWarehouse,
        items,
        totalAmount: 0,
        totalKilos:  Math.round(totalKg),
        notes:       `Importado desde packing list: ${fileName}. ${totalTarjas} tarjas / BINs.`,
        orderType:   'packing_import',
        includeVat:  false,
      };

      await addDoc(collection(db, 'purchaseOrders'), oc);

      setStep('done');
      toast({
        title: '✅ Packing list importado',
        description: `${totalTarjas} tarjas · ${formatKg(totalKg)} ingresados a ${selectedWarehouse}`,
      });
      onImported?.();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo crear la OC. Revisa la consola.',
        variant: 'destructive',
      });
      setStep('preview');
    }
  };

  // ── Reset al cerrar ───────────────────────────────────────────────────────
  const handleClose = () => {
    setStep('idle');
    setRows([]);
    setFileName('');
    setSelectedWarehouse('');
    setSelectedSupplier('');
    setErrors([]);
    onOpenChange(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            Importar Packing List del Frigorifico
          </DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: DROP ZONE ── */}
        {step === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50 transition-all"
          >
            <Upload className="h-12 w-12 mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 font-medium text-lg">
              Arrastra el archivo aquí o haz clic para seleccionar
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Archivo .xlsx exportado desde ZC Logistics / Frigorifico
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* ── PASO 2: PREVIEW ── */}
        {step === 'preview' && (
          <div className="space-y-5">
            {/* Nombre archivo */}
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 px-3 py-2 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span className="font-mono">{fileName}</span>
              <span className="ml-auto text-slate-500">{totalTarjas} tarjas · {formatKg(totalKg)}</span>
            </div>

            {/* Errores de parseo */}
            {errors.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 space-y-1">
                <p className="text-amber-400 text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {errors.length} filas ignoradas
                </p>
                {errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-amber-300/70 text-xs">{e}</p>
                ))}
                {errors.length > 5 && (
                  <p className="text-amber-300/50 text-xs">...y {errors.length - 5} más</p>
                )}
              </div>
            )}

            {/* Resumen agrupado */}
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Resumen por calibre</p>
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-800">
                    <TableRow className="border-slate-700 hover:bg-slate-800">
                      <TableHead className="text-slate-400">Producto</TableHead>
                      <TableHead className="text-slate-400">Calibre</TableHead>
                      <TableHead className="text-right text-slate-400">Tarjas</TableHead>
                      <TableHead className="text-right text-slate-400">Total kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(resumen).map((r, i) => (
                      <TableRow key={i} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="text-white font-medium">{r.producto}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs">
                            {r.calibre}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-300">{r.tarjas}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-mono">
                          {formatKg(r.totalKg)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Selección bodega y proveedor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Bodega de destino *</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Seleccionar bodega..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    {warehouses.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Proveedor *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vista detalle tarjas (colapsable) */}
            <details className="group">
              <summary className="text-slate-400 text-sm cursor-pointer hover:text-slate-200 transition-colors list-none flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Ver detalle de las {totalTarjas} tarjas
              </summary>
              <div className="mt-2 rounded-lg border border-slate-700 overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-800 sticky top-0">
                    <TableRow className="border-slate-700 hover:bg-slate-800">
                      <TableHead className="text-slate-400 text-xs">Tarja</TableHead>
                      <TableHead className="text-slate-400 text-xs">Producto</TableHead>
                      <TableHead className="text-slate-400 text-xs">Calibre orig.</TableHead>
                      <TableHead className="text-slate-400 text-xs">Calibre norm.</TableHead>
                      <TableHead className="text-right text-slate-400 text-xs">Kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="text-xs font-mono text-slate-300">{row.no_tarja}</TableCell>
                        <TableCell className="text-xs text-white">{row.producto}</TableCell>
                        <TableCell className="text-xs text-slate-500">{row.calibreOriginal}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            row.calibreOriginal.toUpperCase() !== row.calibreNorm
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-700 text-slate-300 border-slate-600'
                          }`}>
                            {row.calibreNorm}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-emerald-400">
                          {formatKg(row.pesoNeto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </div>
        )}

        {/* ── PASO 3: GUARDANDO ── */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-12 w-12 text-emerald-400 animate-spin" />
            <p className="text-slate-300">Creando OC en Firestore...</p>
            <p className="text-slate-500 text-sm">{totalTarjas} tarjas · {formatKg(totalKg)}</p>
          </div>
        )}

        {/* ── PASO 4: ÉXITO ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            <p className="text-white text-xl font-bold">¡Importación exitosa!</p>
            <p className="text-slate-400 text-sm text-center">
              {totalTarjas} tarjas · {formatKg(totalKg)} ingresados a{' '}
              <span className="text-white font-medium">{selectedWarehouse}</span>
            </p>
            <p className="text-slate-500 text-xs">
              El inventario se actualizará automáticamente.
            </p>
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="gap-2 pt-2">
          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => { setStep('idle'); setRows([]); setErrors([]); }}
              >
                <X className="h-4 w-4 mr-1" /> Cambiar archivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedWarehouse || !selectedSupplier}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {totalTarjas} tarjas al inventario
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button
              onClick={handleClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Cerrar
            </Button>
          )}
          {(step === 'idle' || step === 'saving') && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={handleClose}
              disabled={step === 'saving'}
            >
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
