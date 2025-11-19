'use client';

import React, { useMemo, useState } from 'react';
import { usePurchases } from '@/hooks/use-purchases';
import { NewPurchaseOrderSheet } from './components/new-purchase-order-sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Download, Eye, Trash2, AlertTriangle, Clipboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LotLabelPreview } from './components/lot-label-preview';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { cn } from '@/lib/utils';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { LotGenerationContent } from './components/lot-generation-content';

// --- COMPONENTE DE GESTIÓN DE LOTES (Reintegrado) ---
function LotGenerationTab({ allOrders, suppliers, calibers }: any) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedOCs, setSelectedOCs] = useState<Record<string, boolean>>({});
  const [selectedCalibers, setSelectedCalibers] = useState<Record<string, string[]>>({});
  const [previewData, setPreviewData] = useState<any>(null);
  const [isDeleteLotsDialogOpen, setIsDeleteLotsDialogOpen] = useState(false);
  const [newSingleLotId, setNewSingleLotId] = useState<string | null>(null);
  const [isLotPreviewOpen, setIsLotPreviewOpen] = useState(false);

  const ordersWithLotInfo = useMemo(() => allOrders.filter((o: any) => o.status === 'completed').map((order: any) => ({ ...order, hasLots: order.items.some((item: any) => !!item.lotNumber) })), [allOrders]);

  const handleSelectOC = (id: string) => setSelectedOCs(p => { const n = { ...p, [id]: !p[id] }; if (!n[id]) { const c = { ...selectedCalibers }; delete c[id]; setSelectedCalibers(c); } else setSelectedCalibers(prev => ({ ...prev, [id]: [] })); return n; });
  const handleCaliberChange = (id: string, c: string) => setSelectedCalibers(p => { const curr = p[id] || []; return { ...p, [id]: curr.includes(c) ? curr.filter(x => x !== c) : [...curr, c] }; });

  const getNextLotSuffix = () => { let max = 99; allOrders.forEach((o: any) => o.items.forEach((i: any) => { if (i.lotNumber?.startsWith('LT-')) { const s = parseInt(i.lotNumber.split('-').pop(), 10); if (!isNaN(s) && s > max) max = s; } })); return max + 1; };
  const handleGenerateSingleLot = () => { setNewSingleLotId(`LT-${format(new Date(), 'yyyyMMdd')}-${getNextLotSuffix()}`); toast({ title: 'ID Generado' }); };

  const handleGeneratePreview = () => {
    const entries = Object.entries(selectedCalibers).filter(([id]) => selectedOCs[id]).flatMap(([id, cals]) => cals.map(c => ({ ocId: id, caliber: c })));
    if (!entries.length) return toast({ variant: 'destructive', title: 'Seleccione OC y Calibre' });
    let suffix = getNextLotSuffix();
    const items = entries.map(({ ocId, caliber }) => {
      const o = allOrders.find((x: any) => x.id === ocId);
      if (!o) return null;
      const items = o.items.filter((i: any) => i.caliber === caliber);
      const k = items.reduce((s: number, i: any) => s + i.quantity, 0);
      const p = items.reduce((s: number, i: any) => s + (i.packagingQuantity || 0), 0);
      return { lotId: `LT-${format(parseISO(o.date), 'yyyyMMdd')}-${suffix++}`, orderId: o.id, productName: items[0]?.product || 'N/A', supplierName: suppliers.find((s: any) => s.id === o.supplierId)?.name || 'N/A', caliberName: caliber, caliberCode: calibers.find((c: any) => c.name === caliber)?.code || 'N/A', totalKilos: k, totalPackages: p, avgWeight: p > 0 ? k / p : 0 };
    }).filter(Boolean);
    setPreviewData({ creationDate: format(new Date(), 'dd/MM/yyyy HH:mm'), items });
    toast({ title: 'Vista Previa Lista' });
  };

  const handleSaveLots = () => {
    if (!previewData?.items?.length || !firestore) return;
    previewData.items.forEach((l: any) => {
      const o = allOrders.find((x: any) => x.id === l.orderId);
      if (o) updateDocumentNonBlocking(doc(firestore, 'purchaseOrders', o.id), { items: o.items.map((i: any) => i.caliber === l.caliberName ? { ...i, lotNumber: l.lotId } : i) });
    });
    toast({ title: 'Lotes Guardados' });
  };

  const handleDeleteAllLots = () => {
    if (!firestore) return;
    allOrders.forEach((o: any) => { if (o.items.some((i: any) => i.lotNumber)) updateDocumentNonBlocking(doc(firestore, 'purchaseOrders', o.id), { items: o.items.map((i: any) => { const { lotNumber, ...r } = i; return r; }) }); });
    toast({ title: 'Lotes Borrados' }); setIsDeleteLotsDialogOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Módulo de Creación de Lotes</CardTitle>
          <CardDescription>Siga los pasos para generar e imprimir las hojas de lote.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="font-semibold text-lg">Paso 1: Seleccione las Órdenes de Compra (OC)</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
              {ordersWithLotInfo.map((order: any) => (
                <div key={order.id} className="flex items-center space-x-2">
                  <Checkbox id={`oc-${order.id}`} checked={!!selectedOCs[order.id]} onCheckedChange={() => handleSelectOC(order.id)} />
                  <label htmlFor={`oc-${order.id}`} className="text-sm font-medium leading-none">
                    {order.id} - {suppliers.find((s: any) => s.id === order.supplierId)?.name}
                  </label>
                  {order.hasLots && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Con Lote</Badge>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label className="font-semibold text-lg">Paso 2: Especifique el Calibre por OC</Label>
            <div className="mt-2 space-y-4 max-h-60 overflow-y-auto pr-2">
              {Object.keys(selectedOCs).filter(id => selectedOCs[id]).map(ocId => {
                  const order = ordersWithLotInfo.find((o: any) => o.id === ocId);
                  if (!order) return null;
                  const availableCalibers = [...new Set(order.items.map((item: any) => item.caliber))];
                  return (
                    <div key={ocId} className="p-3 border rounded-md">
                      <p className="font-medium text-sm mb-2">{ocId}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {availableCalibers.map((caliber: any) => (
                          <div key={`${ocId}-${caliber}`} className="flex items-center space-x-2">
                            <Checkbox id={`${ocId}-${caliber}`} checked={selectedCalibers[ocId]?.includes(caliber)} onCheckedChange={() => handleCaliberChange(ocId, caliber)} />
                            <label htmlFor={`${ocId}-${caliber}`} className="text-sm font-normal">{caliber}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="pt-4 border-t">
            <Label className="font-semibold text-lg">Generación Individual</Label>
            <Button onClick={handleGenerateSingleLot} variant="outline" className="w-full mt-2">Crear Nuevo ID de Lote</Button>
            {newSingleLotId && (
              <div className="mt-2 flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="font-mono text-sm">{newSingleLotId}</span>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(newSingleLotId); toast({ title: 'Copiado' }); }}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4 pt-6 mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleGeneratePreview} disabled={Object.values(selectedCalibers).every(c => c.length === 0)}>Previsualizar Lotes</Button>
            <Button onClick={handleSaveLots} disabled={!previewData}>Guardar Lotes en O/C</Button>
          </div>
          <Button onClick={() => setIsLotPreviewOpen(true)} disabled={!previewData} variant="outline">Exportar a PDF e Imprimir</Button>
          <Button onClick={() => setIsDeleteLotsDialogOpen(true)} variant="destructive" className="mt-4"><Trash2 className="mr-2 h-4 w-4" /> Borrar Todos los Lotes</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Vista Previa</CardTitle></CardHeader>
        <CardContent className="bg-gray-200 h-[600px] overflow-y-auto p-4">
            {previewData ? <LotGenerationContent lotData={previewData} /> : <p className="text-center text-muted-foreground pt-20">La vista previa aparecerá aquí.</p>}
        </CardContent>
      </Card>
      <AlertDialog open={isDeleteLotsDialogOpen} onOpenChange={setIsDeleteLotsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción borrará los lotes de las órdenes seleccionadas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllLots} className={cn(buttonVariants({ variant: 'destructive' }))}>Borrar Todos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {previewData && <LotLabelPreview isOpen={isLotPreviewOpen} onOpenChange={setIsLotPreviewOpen} lotData={previewData} />}
    </div>
  );
}

// --- PÁGINA PRINCIPAL ACTIVA ---
export default function PurchasesPage() {
  const {
    purchaseOrders, suppliers, calibers, regularPurchaseOrders, internalTransferOrders, filteredCreatedLots, isLoading,
    editingOrder, setEditingOrder, deletingOrder, setDeletingOrder, isSheetOpen, setIsSheetOpen,
    previewingOrder, setPreviewingOrder, previewLotData, lotFilter, setLotFilter, isLotPreviewOpen, setIsLotPreviewOpen,
    printComponentRef, handlePrint, handleSaveOrder, confirmDelete, handleExportExcel, handlePreviewLot
  } = usePurchases();

  const purchaseColumns = useMemo(() => getColumns({
    onEdit: (order) => { setEditingOrder(order); setIsSheetOpen(true); },
    onDelete: (order) => setDeletingOrder(order),
    onPreview: (order) => setPreviewingOrder(order),
    suppliers
  }), [suppliers, setEditingOrder, setIsSheetOpen, setDeletingOrder, setPreviewingOrder]);

  return (
    <>
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Listado O/C</TabsTrigger>
          <TabsTrigger value="transfers">Traspasos</TabsTrigger>
          <TabsTrigger value="lots">Generar Lotes</TabsTrigger>
          <TabsTrigger value="created-lots">Lotes Creados</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1"><CardTitle className="text-2xl font-bold">Compras</CardTitle><CardDescription>Gestión de adquisiciones</CardDescription></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4"/> Exportar</Button>
                {/* Botón Nueva Compra HABILITADO */}
                <Button onClick={() => { setEditingOrder(null); setIsSheetOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/> Nueva</Button>
              </div>
            </CardHeader>
            <CardContent>{isLoading ? <Skeleton className="h-96 w-full" /> : <DataTable columns={purchaseColumns} data={regularPurchaseOrders} searchKey="supplierId" />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader><CardTitle>Traspasos Internos</CardTitle></CardHeader>
            <CardContent>{isLoading ? <Skeleton className="h-96 w-full" /> : <DataTable columns={purchaseColumns} data={internalTransferOrders} searchKey="supplierId" />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lots"><LotGenerationTab allOrders={purchaseOrders} suppliers={suppliers} calibers={calibers} /></TabsContent>

        <TabsContent value="created-lots">
          <Card>
            <CardHeader><CardTitle>Lotes Creados</CardTitle><Input placeholder="Filtrar lotes..." value={lotFilter} onChange={e => setLotFilter(e.target.value)} className="max-w-sm" /></CardHeader>
            <CardContent><div className="rounded-md border overflow-hidden"><Table><TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Prod</TableHead><TableHead>Kg</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{filteredCreatedLots.map((lot:any) => (<TableRow key={lot.lotNumber}><TableCell><Badge variant="secondary">{lot.lotNumber}</Badge></TableCell><TableCell>{lot.product}</TableCell><TableCell>{lot.totalKilos}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handlePreviewLot(lot)}><Eye className="h-4 w-4"/></Button></TableCell></TableRow>))}</TableBody></Table></div></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewPurchaseOrderSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} onSave={handleSaveOrder} order={editingOrder} suppliers={suppliers} />
      <AlertDialog open={!!deletingOrder} onOpenChange={(o) => !o && setDeletingOrder(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar Orden?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {previewingOrder && <PurchaseOrderPreview isOpen={!!previewingOrder} onOpenChange={() => setPreviewingOrder(null)} order={previewingOrder} supplier={suppliers.find(s => s.id === previewingOrder.supplierId) || null} onPrintRequest={handlePrint} />}
      {previewLotData && isLotPreviewOpen && <LotLabelPreview isOpen={isLotPreviewOpen} onOpenChange={setIsLotPreviewOpen} lotData={previewLotData} />}
    </>
  );
}