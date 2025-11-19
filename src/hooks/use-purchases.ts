import { useState, useMemo, useCallback, useRef } from 'react';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { PurchaseOrder, Contact, OrderItem, FinancialMovement } from '@/lib/types';
import { useMasterData } from '@/hooks/use-master-data';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function usePurchases() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { calibers } = useMasterData();

  // 1. Referencias y Estados de UI
  const printComponentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printComponentRef.current });
  
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewingOrder, setPreviewingOrder] = useState<PurchaseOrder | null>(null);
  const [previewLotData, setPreviewLotData] = useState<any>(null);
  const [lotFilter, setLotFilter] = useState('');
  const [isLotPreviewOpen, setIsLotPreviewOpen] = useState(false);

  // 2. Carga de Datos (Firebase)
  const purchaseOrdersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'purchaseOrders') : null), [firestore]);
  const { data: purchaseOrders, isLoading: loadingPurchases } = useCollection<PurchaseOrder>(purchaseOrdersQuery);
  
  const contactsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'contacts') : null), [firestore]);
  const { data: contacts, isLoading: loadingContacts } = useCollection<Contact>(contactsQuery);

  const financialMovementsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'financialMovements') : null), [firestore]);
  const { data: financialMovements, isLoading: loadingFinancials } = useCollection<FinancialMovement>(financialMovementsQuery);

  const isLoading = loadingPurchases || loadingContacts || loadingFinancials;

  // 3. Datos Derivados (Cálculos)
  const suppliers = useMemo(() => contacts?.filter(c => Array.isArray(c.type) && c.type.includes('supplier')) || [], [contacts]);

  const { regularPurchaseOrders, internalTransferOrders } = useMemo(() => {
    if (!purchaseOrders) return { regularPurchaseOrders: [], internalTransferOrders: [] };
    const regular: PurchaseOrder[] = [];
    const transfers: PurchaseOrder[] = [];
    
    purchaseOrders.forEach(order => {
      const payments = financialMovements?.filter(m => m.relatedDocument?.id === order.id && m.type === 'expense') || [];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      let paymentStatus: PurchaseOrder['paymentStatus'] = 'Pendiente';
      
      if (order.status === 'cancelled') paymentStatus = undefined;
      else if (totalPaid >= order.totalAmount) paymentStatus = 'Pagado';
      else if (totalPaid > 0) paymentStatus = 'Abonado';
      
      const orderWithStatus = { ...order, paymentStatus };
      
      if (order.id.startsWith('OC-T-')) transfers.push(orderWithStatus);
      else regular.push(orderWithStatus);
    });
    return { regularPurchaseOrders: regular, internalTransferOrders: transfers };
  }, [purchaseOrders, financialMovements]);

  const createdLots = useMemo(() => {
    if (!purchaseOrders) return [];
    const lotsMap = new Map<string, any>();
    purchaseOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.lotNumber) {
          const existing = lotsMap.get(item.lotNumber) || {
            lotNumber: item.lotNumber, orderId: order.id, date: order.date, supplierId: order.supplierId,
            supplierName: suppliers.find(s => s.id === order.supplierId)?.name || 'N/A', product: item.product,
            caliber: item.caliber, caliberCode: calibers.find(c => c.name === item.caliber)?.code || 'N/A',
            totalKilos: 0, totalPackages: 0,
          };
          existing.totalKilos += item.quantity;
          existing.totalPackages += item.packagingQuantity || 0;
          lotsMap.set(item.lotNumber, existing);
        }
      });
    });
    return Array.from(lotsMap.values()).sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
  }, [purchaseOrders, suppliers, calibers]);

  const filteredCreatedLots = useMemo(() => {
    if (!lotFilter) return createdLots;
    return createdLots.filter(l => l.lotNumber.toLowerCase().includes(lotFilter.toLowerCase()));
  }, [createdLots, lotFilter]);

  // 4. Acciones (Handlers)
  const handleSaveOrder = useCallback((order: any, newItems: any[] = []) => {
    if(!firestore) return;
    const allItems = order.id ? [...order.items.map((i:any) => newItems.find(n=>n.id===i.id)||i), ...newItems.filter(n=>!order.items.find((i:any)=>i.id===n.id))] : [...(order.items||[]), ...newItems];
    const totalAmount = allItems.reduce((s:number, i:any) => s + (i.quantity * i.price), 0);
    const totalKilos = allItems.reduce((s:number, i:any) => i.unit === 'Kilos' ? s + Number(i.quantity || 0) : s, 0);
    const totalPackages = allItems.reduce((s:number, i:any) => s + (Number(i.packagingQuantity || 0)), 0);

    const finalOrder = { ...order, items: allItems, totalAmount, totalKilos, totalPackages };
    
    if (finalOrder.id) {
        updateDocumentNonBlocking(doc(firestore, 'purchaseOrders', finalOrder.id), finalOrder);
        toast({ title: 'Actualizado' });
    } else {
        addDocumentNonBlocking(collection(firestore, 'purchaseOrders'), { ...finalOrder, paymentStatus: 'Pendiente' });
        toast({ title: 'Creado' });
    }
    setIsSheetOpen(false); setEditingOrder(null);
  }, [firestore, toast]);

  const confirmDelete = useCallback(() => {
    if (deletingOrder && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'purchaseOrders', deletingOrder.id));
      toast({ variant: 'destructive', title: 'Eliminado' });
      setDeletingOrder(null);
    }
  }, [deletingOrder, firestore, toast]);

  const handleExportExcel = useCallback(() => {
    if (!purchaseOrders?.length) return;
    const allItems: any[] = [];
    purchaseOrders.forEach(order => {
      const supplier = suppliers.find(s => s.id === order.supplierId);
      order.items.forEach(item => {
        allItems.push({ 'O/C': order.id, Fecha: format(new Date(order.date), 'dd-MM-yyyy'), Proveedor: supplier?.name, Estado: order.status, Producto: item.product, Calibre: item.caliber, Cantidad: item.quantity, Precio: item.price, Total: item.quantity * item.price, Lote: item.lotNumber || '' });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordenes');
    XLSX.writeFile(workbook, `Ordenes_de_Compra.xlsx`);
  }, [purchaseOrders, suppliers]);

  const handlePreviewLot = useCallback((lot: any) => {
    setPreviewLotData({ creationDate: format(new Date(), 'dd/MM/yyyy HH:mm'), items: [{ ...lot, avgWeight: lot.totalPackages > 0 ? lot.totalKilos/lot.totalPackages : 0 }] });
    setIsLotPreviewOpen(true);
  }, []);

  return {
    // Datos
    purchaseOrders,
    suppliers,
    calibers,
    regularPurchaseOrders,
    internalTransferOrders,
    filteredCreatedLots,
    isLoading,
    // Estados
    editingOrder, setEditingOrder,
    deletingOrder, setDeletingOrder,
    isSheetOpen, setIsSheetOpen,
    previewingOrder, setPreviewingOrder,
    previewLotData,
    lotFilter, setLotFilter,
    isLotPreviewOpen, setIsLotPreviewOpen,
    printComponentRef,
    // Acciones
    handlePrint,
    handleSaveOrder,
    confirmDelete,
    handleExportExcel,
    handlePreviewLot
  };
}