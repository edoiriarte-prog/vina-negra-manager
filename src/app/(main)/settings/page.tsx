"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMasterData } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function MasterDataEditor({ title, data, setData }: { title: string, data: string[], setData: React.Dispatch<React.SetStateAction<string[]>> }) {
    const [newItem, setNewItem] = useState('');
    const { toast } = useToast();

    const handleAddItem = () => {
        if (newItem && !data.includes(newItem)) {
            setData(prev => [...prev, newItem].sort());
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
                <CardTitle className="font-headline text-2xl">{title}</CardTitle>
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


export default function SettingsPage() {
    const { products, setProducts, calibers, setCalibers, units, setUnits } = useMasterData();
    
    return (
        <div className="flex flex-col gap-6">
             <div>
                <h1 className="font-headline text-3xl">Configuración de Maestros</h1>
                <p className="text-muted-foreground">Administra los datos maestros utilizados en los formularios de la aplicación.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MasterDataEditor title="Productos" data={products} setData={setProducts} />
                <MasterDataEditor title="Calibres" data={calibers} setData={setCalibers} />
                <MasterDataEditor title="Unidades" data={units} setData={setUnits} />
            </div>
        </div>
    );
}
