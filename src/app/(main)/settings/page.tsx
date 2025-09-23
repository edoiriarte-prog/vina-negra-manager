
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMasterData } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

function MasterDataEditor({ title, data, setData }: { title: string, data: string[], setData: React.Dispatch<React.SetStateAction<string[]>> }) {
    const [newItem, setNewItem] = useState('');
    const { toast } = useToast();

    const sortedData = useMemo(() => [...data].sort(), [data]);

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
                    {sortedData.map(item => (
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

function DataExport() {
    const { toast } = useToast();

    const handleExport = () => {
        try {
            const keys = ['contacts', 'purchaseOrders', 'salesOrders', 'serviceOrders', 'financialMovements', 'inventoryAdjustments'];
            const workbook = XLSX.utils.book_new();

            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData = JSON.parse(data);
                    // Flatten complex objects like items or relatedOrder for better CSV/Excel readability
                    const flattenedData = parsedData.map((row: any) => {
                        const newRow = {...row};
                        if (row.items) {
                            newRow.items = JSON.stringify(row.items);
                        }
                        if (row.packaging) {
                            newRow.packaging = JSON.stringify(row.packaging);
                        }
                        if (row.relatedOrder) {
                            newRow.relatedOrder = `${row.relatedOrder.type}-${row.relatedOrder.id}`;
                        }
                        if(row.relatedPurchaseIds){
                            newRow.relatedPurchaseIds = row.relatedPurchaseIds.join(', ');
                        }
                        return newRow;
                    });
                    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, key);
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
                    Esto creará un archivo .xlsx con hojas para contactos, compras, ventas, servicios y movimientos financieros.
                </p>
            </CardContent>
        </Card>
    );
}


export default function SettingsPage() {
    const { products, setProducts, calibers, setCalibers, units, setUnits, packagingTypes, setPackagingTypes } = useMasterData();
    
    return (
        <div className="flex flex-col gap-6">
             <div>
                <h1 className="font-headline text-3xl">Configuración</h1>
                <p className="text-muted-foreground">Administra los datos maestros y otras configuraciones de la aplicación.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MasterDataEditor title="Productos" data={products} setData={setProducts} />
                <MasterDataEditor title="Calibres" data={calibers} setData={setCalibers} />
                <MasterDataEditor title="Unidades" data={units} setData={setUnits} />
                <MasterDataEditor title="Tipos de Envase" data={packagingTypes} setData={setPackagingTypes} />
            </div>

            <div className='mt-6'>
                <DataExport />
            </div>
        </div>
    );
}
