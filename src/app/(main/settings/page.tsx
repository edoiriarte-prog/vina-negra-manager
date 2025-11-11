

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { CaliberMaster } from '@/hooks/use-master-data';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Download, Edit, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BankAccount, Contact, FinancialMovement, InventoryAdjustment, PurchaseOrder, SalesOrder, ServiceOrder } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { Checkbox } from '@/components/ui/checkbox';


function MasterDataEditor({ title, data, collectionName }: { title: string, data: {id: string, name: string}[], collectionName: string }) {
    const { firestore } = useFirebase();
    const [newItem, setNewItem] = useState('');
    const { toast } = useToast();

    const handleAddItem = () => {
        if (!firestore) return;
        if (newItem && !data.find(d => d.name === newItem)) {
            addDocumentNonBlocking(collection(firestore, collectionName), { name: newItem });
            setNewItem('');
            toast({ title: `${title} - Ítem Agregado`, description: `Se agregó "${newItem}".` });
        } else if (data.find(d => d.name === newItem)) {
             toast({ variant: "destructive", title: 'Error', description: 'Este ítem ya existe.' });
        }
    };

    const handleRemoveItem = (itemToRemove: {id: string, name: string}) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, collectionName, itemToRemove.id));
        toast({ title: `${title} - Ítem Eliminado`, description: `Se eliminó "${itemToRemove.name}".` });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">{title}</CardTitle>
                <CardDescription>Gestiona los valores disponibles para este campo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input 
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={`Nuevo ${title.slice(0, -1)}...`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <Button onClick={handleAddItem}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar
                    </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {data.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span>{item.name}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function CaliberMasterEditor() {
    const { firestore } = useFirebase();
    const calibersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'calibers') : null, [firestore]);
    const { data: calibers } = useCollection<CaliberMaster>(calibersQuery);
    const [newItem, setNewItem] = useState({ name: '', code: '' });
    const { toast } = useToast();

    const handleAddItem = () => {
        if (!firestore) return;
        if (newItem.name && newItem.code && !calibers?.find(c => c.name === newItem.name)) {
            addDocumentNonBlocking(collection(firestore, 'calibers'), newItem);
            setNewItem({ name: '', code: '' });
            toast({ title: `Calibre Agregado`, description: `Se agregó "${newItem.name} (${newItem.code})".` });
        } else if (calibers?.find(c => c.name === newItem.name)) {
             toast({ variant: "destructive", title: 'Error', description: 'Este calibre ya existe.' });
        }
    };

    const handleRemoveItem = (itemToRemove: {id: string, name: string}) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'calibers', itemToRemove.id));
        toast({ title: `Calibre Eliminado`, description: `Se eliminó "${itemToRemove.name}".` });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Calibres</CardTitle>
                <CardDescription>Gestiona los calibres y sus códigos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input 
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({...prev, name: e.target.value}))}
                        placeholder="Nuevo Calibre (ej: JUMBO)"
                    />
                     <Input 
                        value={newItem.code}
                        onChange={(e) => setNewItem(prev => ({...prev, code: e.target.value}))}
                        placeholder="Código (ej: 40)"
                    />
                    <Button onClick={handleAddItem}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar
                    </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {calibers?.map((item, index) => (
                        <div key={`caliber-${item.name}-${item.code}-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span>{`${item.name} (${item.code})`}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

const emptyAccount: Omit<BankAccount, 'id'> = { name: '', accountType: 'Cuenta Corriente', initialBalance: 0, status: 'Activa', owner: '', ownerRUT: '', ownerEmail: '', bankName: '', accountNumber: '' };

function BankAccountsEditor() {
    const { firestore } = useFirebase();
    const bankAccountsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
    const { data: bankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
    const [formData, setFormData] = useState<Omit<BankAccount, 'id'>>(emptyAccount);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (editingAccountId) {
            const accountToEdit = bankAccounts?.find(acc => acc.id === editingAccountId);
            if (accountToEdit) {
                setFormData(accountToEdit);
            }
        } else {
            setFormData(emptyAccount);
        }
    }, [editingAccountId, bankAccounts]);

    const handleSaveAccount = () => {
        if (!firestore) return;
        if (!formData.name) {
             toast({ variant: "destructive", title: 'Error', description: 'El nombre de la cuenta es requerido.' });
            return;
        }

        if (editingAccountId) {
            updateDocumentNonBlocking(doc(firestore, 'bankAccounts', editingAccountId), formData);
            toast({ title: 'Cuenta Actualizada', description: `Se actualizó la cuenta "${formData.name}".` });
        } else {
            addDocumentNonBlocking(collection(firestore, 'bankAccounts'), formData);
            toast({ title: 'Cuenta Agregada', description: `Se agregó la cuenta "${formData.name}".` });
        }
        
        setEditingAccountId(null);
        setFormData(emptyAccount);
    };

    const handleRemoveAccount = (id: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'bankAccounts', id));
        toast({ title: 'Cuenta Eliminada' });
    };

    const handleCancelEdit = () => {
        setEditingAccountId(null);
        setFormData(emptyAccount);
    };
    
    return (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Cuentas Bancarias</CardTitle>
                <CardDescription>Configure las cuentas bancarias y de efectivo de la empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end p-4 border rounded-md", editingAccountId ? "bg-muted/30" : "bg-muted/10")}>
                    <div className='lg:col-span-4 text-sm font-medium mb-2 flex justify-between items-center'>
                        <span>{editingAccountId ? `Editando: ${formData.name}` : 'Nueva Cuenta'}</span>
                        {editingAccountId && <Button size="sm" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4 mr-2" /> Cancelar Edición</Button>}
                    </div>
                    <div><Label>Nombre Cuenta</Label><Input placeholder="Nombre de la Cuenta" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}/></div>
                    <div><Label>Titular</Label><Input placeholder="Nombre Titular" value={formData.owner || ''} onChange={e => setFormData(p => ({...p, owner: e.target.value}))}/></div>
                    <div><Label>RUT Titular</Label><Input placeholder="RUT Titular" value={formData.ownerRUT || ''} onChange={e => setFormData(p => ({...p, ownerRUT: e.target.value}))}/></div>
                    <div><Label>Email Titular</Label><Input type="email" placeholder="Email Titular" value={formData.ownerEmail || ''} onChange={e => setFormData(p => ({...p, ownerEmail: e.target.value}))}/></div>
                    
                    <div>
                        <Label>Tipo de Cuenta</Label>
                        <Select value={formData.accountType} onValueChange={(value: BankAccount['accountType']) => setFormData(p => ({...p, accountType: value}))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                                <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                                <SelectItem value="Línea de Crédito">Línea de Crédito</SelectItem>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div><Label>Banco</Label><Input placeholder="Nombre del Banco" value={formData.bankName || ''} onChange={e => setFormData(p => ({...p, bankName: e.target.value}))}/></div>
                     <div><Label>Número de Cuenta</Label><Input placeholder="Número de Cuenta" value={formData.accountNumber || ''} onChange={e => setFormData(p => ({...p, accountNumber: e.target.value}))}/></div>
                     <div><Label>Saldo Inicial</Label><Input type="number" placeholder="Saldo Inicial" value={formData.initialBalance || ''} onChange={e => setFormData(p => ({...p, initialBalance: Number(e.target.value)}))}/></div>
                    
                    <div className="lg:col-start-4">
                        <Button onClick={handleSaveAccount} className="w-full">
                            {editingAccountId ? 'Guardar Cambios' : <><PlusCircle className="mr-2 h-4 w-4" /> Agregar</>}
                        </Button>
                    </div>
                </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {bankAccounts?.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <div>
                                <span className='font-semibold'>{acc.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">({acc.accountType})</span>
                                {acc.owner && <span className="text-xs text-muted-foreground ml-2">Titular: {acc.owner}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className='text-sm font-mono'>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.initialBalance)}</span>
                                <Button variant="ghost" size="icon" onClick={() => setEditingAccountId(acc.id)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveAccount(acc.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function DataManagement() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const handleExport = () => {
        // This functionality needs to be adapted for Firestore
        toast({
            title: 'Funcionalidad en Desarrollo',
            description: 'La exportación de datos desde Firestore se implementará próximamente.',
        });
    };

    const handleReset = async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: 'Error', description: 'No se pudo conectar a la base de datos.' });
            return;
        }

        const collectionsToDelete = [
            'contacts', 
            'purchaseOrders', 
            'salesOrders', 
            'serviceOrders', 
            'financialMovements',
            'inventoryAdjustments'
        ];

        try {
            const batch = writeBatch(firestore);
            for (const collectionName of collectionsToDelete) {
                const querySnapshot = await getDocs(collection(firestore, collectionName));
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
            }
            await batch.commit();
            toast({ title: 'Datos Restablecidos', description: 'Todos los datos transaccionales han sido eliminados.' });
        } catch (error) {
            console.error("Error resetting data: ", error);
            toast({ variant: "destructive", title: 'Error', description: 'No se pudieron restablecer los datos.' });
        }

        setIsResetDialogOpen(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Gestión de Datos</CardTitle>
                <CardDescription>Realiza copias de seguridad o restablece los datos de la aplicación.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                 <div className="flex gap-4">
                    <Button onClick={handleExport} disabled>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Base de Datos
                    </Button>
                    <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Restablecer Datos
                    </Button>
                 </div>
                <p className="text-xs text-muted-foreground mt-2">
                    La exportación crea un archivo .xlsx. El restablecimiento borrará todos los datos transaccionales (contactos, órdenes, etc.). Los datos maestros (productos, calibres) no se verán afectados.
                </p>
                 <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción es irreversible. Se borrarán todos los datos transaccionales de la base de datos, incluyendo contactos, órdenes y movimientos financieros.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset} className={cn(buttonVariants({ variant: "destructive" }))}>Sí, Borrar Todo</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

type Association = {
    id: string;
    calibers: string[];
}
function ProductCaliberAssociation() {
    const { firestore } = useFirebase();
    const { products, calibers } = useMasterData();
    const associationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'productCaliberAssociations') : null, [firestore]);
    const { data: associations, isLoading } = useCollection<Association>(associationsQuery);

    const [selectedProduct, setSelectedProduct] = useState('');
    
    const handleAssociationChange = (productName: string, caliberName: string, isChecked: boolean) => {
        if (!firestore) return;

        const currentAssociation = associations?.find(a => a.id === productName) || { id: productName, calibers: [] };
        let updatedCalibers;

        if (isChecked) {
            updatedCalibers = [...currentAssociation.calibers, caliberName];
        } else {
            updatedCalibers = currentAssociation.calibers.filter(c => c !== caliberName);
        }

        const docRef = doc(firestore, 'productCaliberAssociations', productName);
        setDoc(docRef, { calibers: updatedCalibers }, { merge: true });
    };

    const currentAssociatedCalibers = useMemo(() => {
        if (!selectedProduct || !associations) return [];
        return associations.find(a => a.id === selectedProduct)?.calibers || [];
    }, [selectedProduct, associations]);
    
    const sortedCalibers = useMemo(() => {
        return [...calibers].sort((a,b) => a.name.localeCompare(b.name));
    }, [calibers]);


    if (isLoading) {
        return <p>Cargando asociaciones...</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Asociar Calibres a Productos</CardTitle>
                <CardDescription>Seleccione un producto y marque los calibres que le corresponden.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Label>Producto</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un producto" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-2">
                    {selectedProduct && (
                        <div className="space-y-3">
                            <h4 className="font-medium">Calibres para {selectedProduct}</h4>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md max-h-60 overflow-y-auto">
                                {sortedCalibers.map(caliber => (
                                    <div key={caliber.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${selectedProduct}-${caliber.name}`}
                                            checked={currentAssociatedCalibers.includes(caliber.name)}
                                            onCheckedChange={(checked) => handleAssociationChange(selectedProduct, caliber.name, !!checked)}
                                        />
                                        <label
                                            htmlFor={`${selectedProduct}-${caliber.name}`}
                                            className="text-sm font-medium leading-none"
                                        >
                                            {caliber.name} ({caliber.code})
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    const { firestore } = useFirebase();
    const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
    const { data: products } = useCollection<{name: string}>(productsQuery);

    const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: units } = useCollection<{name: string}>(unitsQuery);

    const packagingTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'packagingTypes') : null, [firestore]);
    const { data: packagingTypes } = useCollection<{name: string}>(packagingTypesQuery);

    const warehousesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'warehouses') : null, [firestore]);
    const { data: warehouses } = useCollection<{name: string}>(warehousesQuery);
    
    const internalConceptsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'internalConcepts') : null, [firestore]);
    const { data: internalConcepts } = useCollection<{name: string}>(internalConceptsQuery);
    
    const costCentersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'costCenters') : null, [firestore]);
    const { data: costCenters } = useCollection<{name: string}>(costCentersQuery);

    return (
        <div className="flex flex-col gap-6">
             <div>
                <h1 className="font-headline text-3xl">Configuración</h1>
                <p className="text-muted-foreground">Administra los datos maestros y otras configuraciones de la aplicación.</p>
            </div>

            <DataManagement />
            
            <Tabs defaultValue="masters" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="masters">Datos Maestros</TabsTrigger>
                    <TabsTrigger value="associations">Asociaciones</TabsTrigger>
                    <TabsTrigger value="accounts">Cuentas Bancarias</TabsTrigger>
                </TabsList>
                <TabsContent value="masters">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <MasterDataEditor title="Productos" data={products?.map(p => ({id: p.id, name: p.name})) || []} collectionName="products" />
                        <CaliberMasterEditor />
                        <MasterDataEditor title="Unidades" data={units?.map(u => ({id: u.id, name: u.name})) || []} collectionName="units" />
                        <MasterDataEditor title="Tipos de Envase" data={packagingTypes?.map(pt => ({id: pt.id, name: pt.name})) || []} collectionName="packagingTypes" />
                        <MasterDataEditor title="Bodegas" data={warehouses?.map(w => ({id: w.id, name: w.name})) || []} collectionName="warehouses" />
                        <MasterDataEditor title="Conceptos Internos" data={internalConcepts?.map(ic => ({id: ic.id, name: ic.name})) || []} collectionName="internalConcepts" />
                        <MasterDataEditor title="Centros de Costos" data={costCenters?.map(cc => ({id: cc.id, name: cc.name})) || []} collectionName="costCenters" />
                    </div>
                </TabsContent>
                 <TabsContent value="associations">
                    <div className='mt-6'>
                      <ProductCaliberAssociation />
                    </div>
                </TabsContent>
                <TabsContent value="accounts">
                    <div className='mt-6'>
                      <BankAccountsEditor />
                    </div>
                </TabsContent>
            </Tabs>

        </div>
    );
}
