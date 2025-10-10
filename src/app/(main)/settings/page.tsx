

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMasterData, CaliberMaster } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Download, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BankAccount } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function MasterDataEditor({ title, data, setData }: { title: string, data: string[], setData: React.Dispatch<React.SetStateAction<string[]>> }) {
    const [newItem, setNewItem] = useState('');
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleAddItem = () => {
        if (newItem && !data.includes(newItem)) {
            setData(prev => [...prev, newItem]);
            setNewItem('');
            toast({ title: `${title} - Ítem Agregado`, description: `Se agregó "${newItem}".` });
        } else if (data.includes(newItem)) {
             toast({ variant: "destructive", title: 'Error', description: 'Este ítem ya existe.' });
        }
    };

    const handleRemoveItem = (itemToRemove: string) => {
        setData(prev => prev.filter(item => item !== itemToRemove));
        toast({ title: `${title} - Ítem Eliminado`, description: `Se eliminó "${itemToRemove}".` });
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
                    {isClient && data.map(item => (
                        <div key={item} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span>{item}</span>
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
    const { calibers, setCalibers } = useMasterData();
    const [newItem, setNewItem] = useState({ name: '', code: '' });
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleAddItem = () => {
        if (newItem.name && newItem.code && !calibers.find(c => c.name === newItem.name)) {
            setCalibers(prev => [...prev, newItem]);
            setNewItem({ name: '', code: '' });
            toast({ title: `Calibre Agregado`, description: `Se agregó "${newItem.name} (${newItem.code})".` });
        } else if (calibers.find(c => c.name === newItem.name)) {
             toast({ variant: "destructive", title: 'Error', description: 'Este calibre ya existe.' });
        }
    };

    const handleRemoveItem = (itemToRemove: CaliberMaster) => {
        setCalibers(prev => prev.filter(item => item.name !== itemToRemove.name));
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
                    {isClient && calibers.map(item => (
                        <div key={`${item.name}-${item.code}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
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

const emptyAccount: Omit<BankAccount, 'id'> = { name: '', accountType: 'Cuenta Corriente', initialBalance: 0, status: 'Activa', owner: '' };

function BankAccountsEditor() {
    const { bankAccounts, setBankAccounts } = useMasterData();
    const [formData, setFormData] = useState<Omit<BankAccount, 'id'>>(emptyAccount);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (editingAccountId) {
            const accountToEdit = bankAccounts.find(acc => acc.id === editingAccountId);
            if (accountToEdit) {
                setFormData(accountToEdit);
            }
        } else {
            setFormData(emptyAccount);
        }
    }, [editingAccountId, bankAccounts]);

    const handleSaveAccount = () => {
        if (!formData.name) {
             toast({ variant: "destructive", title: 'Error', description: 'El nombre de la cuenta es requerido.' });
            return;
        }

        if (editingAccountId) {
            // Update
            setBankAccounts(prev => prev.map(acc => acc.id === editingAccountId ? { ...formData, id: editingAccountId } : acc));
            toast({ title: 'Cuenta Actualizada', description: `Se actualizó la cuenta "${formData.name}".` });
        } else {
            // Add
            setBankAccounts(prev => [...prev, { ...formData, id: `acc-${Date.now()}` }]);
            toast({ title: 'Cuenta Agregada', description: `Se agregó la cuenta "${formData.name}".` });
        }
        
        setEditingAccountId(null);
        setFormData(emptyAccount);
    };

    const handleRemoveAccount = (id: string) => {
        setBankAccounts(prev => prev.filter(acc => acc.id !== id));
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-4 items-end p-4 border rounded-md">
                    <div className='lg:col-span-5 text-sm font-medium mb-2'>{editingAccountId ? `Editando: ${formData.name}` : 'Nueva Cuenta'}</div>
                    <Input placeholder="Nombre de la Cuenta" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}/>
                    <Input placeholder="Titular" value={formData.owner || ''} onChange={e => setFormData(p => ({...p, owner: e.target.value}))}/>
                    <Select value={formData.accountType} onValueChange={(value: BankAccount['accountType']) => setFormData(p => ({...p, accountType: value}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                            <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                            <SelectItem value="Línea de Crédito">Línea de Crédito</SelectItem>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                        </SelectContent>
                    </Select>
                     <Input type="number" placeholder="Saldo Inicial" value={formData.initialBalance || ''} onChange={e => setFormData(p => ({...p, initialBalance: Number(e.target.value)}))}/>
                    <div className="flex gap-2">
                        {editingAccountId && <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>}
                        <Button onClick={handleSaveAccount} className="flex-1">
                            {editingAccountId ? 'Guardar' : <><PlusCircle className="mr-2 h-4 w-4" /> Agregar</>}
                        </Button>
                    </div>
                </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {isClient && bankAccounts.map(acc => (
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

function DataExport() {
    const { toast } = useToast();

    const handleExport = () => {
        try {
            const keys = ['contacts', 'purchaseOrders', 'salesOrders', 'serviceOrders', 'financialMovements', 'master-products', 'master-calibers', 'master-units', 'master-packaging-types', 'master-warehouses', 'master-bank-accounts'];
            const workbook = XLSX.utils.book_new();

            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData = JSON.parse(data);
                    
                    const dataToSheet = Array.isArray(parsedData) 
                        ? parsedData.map((row: any) => {
                            const newRow = {...row};
                            if (row.items) newRow.items = JSON.stringify(row.items);
                            if (row.packaging) newRow.packaging = JSON.stringify(row.packaging);
                            if (row.relatedOrder) newRow.relatedOrder = `${row.relatedOrder.type}-${row.relatedOrder.id}`;
                            if (row.relatedDocument) newRow.relatedDocument = `${row.relatedDocument.type}-${row.relatedDocument.id}`;
                            if (row.relatedPurchaseIds) newRow.relatedPurchaseIds = row.relatedPurchaseIds.join(', ');
                            return newRow;
                          })
                        : [parsedData];
                    
                    const worksheet = XLSX.utils.json_to_sheet(dataToSheet);
                    XLSX.utils.book_append_sheet(workbook, worksheet, key.replace('master-',''));
                }
            });

            XLSX.writeFile(workbook, 'vina-negra-data.xlsx');
            toast({ title: 'Exportación Exitosa', description: 'Los datos han sido exportados a Excel.' });

        } catch (error) {
            console.error("Failed to export data:", error);
            toast({ variant: 'destructive', title: 'Error de Exportación', description: 'No se pudo exportar los datos.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Exportar Datos</CardTitle>
                <CardDescription>Descarga toda la información de la aplicación como un archivo de Excel.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Base de Datos
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Esto creará un archivo .xlsx con hojas para cada tipo de dato en la aplicación.
                </p>
            </CardContent>
        </Card>
    );
}


export default function SettingsPage() {
    const { products, setProducts, units, setUnits, packagingTypes, setPackagingTypes, warehouses, setWarehouses } = useMasterData();
    
    return (
        <div className="flex flex-col gap-6">
             <div>
                <h1 className="font-headline text-3xl">Configuración</h1>
                <p className="text-muted-foreground">Administra los datos maestros y otras configuraciones de la aplicación.</p>
            </div>

            <DataExport />
            
            <Tabs defaultValue="masters" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="masters">Datos Maestros</TabsTrigger>
                    <TabsTrigger value="accounts">Cuentas Bancarias</TabsTrigger>
                </TabsList>
                <TabsContent value="masters">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <MasterDataEditor title="Productos" data={products} setData={setProducts} />
                        <CaliberMasterEditor />
                        <MasterDataEditor title="Unidades" data={units} setData={setUnits} />
                        <MasterDataEditor title="Tipos de Envase" data={packagingTypes} setData={setPackagingTypes} />
                        <MasterDataEditor title="Bodegas" data={warehouses} setData={setWarehouses} />
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
