
"use client";

import { useState } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, ShieldCheck, Warehouse, Package, Landmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterDataManager } from "@/components/settings/master-data-manager";
import { ProductCaliberManager } from "@/components/settings/product-caliber-manager";

// Componente simple para listas maestras
function MasterListManager({ title, items, onAdd, onRemove }: { title: string, items: string[], onAdd: (item: string) => void, onRemove: (item: string) => void }) {
    const [newItem, setNewItem] = useState("");

    const handleAdd = () => {
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem("");
        }
    };
    
    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-300">{title}</h4>
            <div className="flex gap-2">
                <Input placeholder="Nuevo valor..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="bg-slate-950 border-slate-700"/>
                <Button onClick={handleAdd} size="icon"><Plus className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {items.map(item => (
                    <div key={item} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-md text-sm">
                        <span>{item}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-red-500" onClick={() => onRemove(item)}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SettingsPage() {
  const { 
    products, addProduct, removeProduct,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType,
    isLoading
  } = useMasterData();

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full"/></div>;

  const cardClass = "bg-slate-900 border-slate-800";

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-500"/> Maestros y Configuración
        </h2>
        <p className="text-slate-400">Administración central de los datos fundamentales de la aplicación.</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="products"><ShieldCheck className="mr-2 h-4 w-4"/> Productos y Calibres</TabsTrigger>
          <TabsTrigger value="logistics"><Warehouse className="mr-2 h-4 w-4"/> Logística</TabsTrigger>
          <TabsTrigger value="banking"><Landmark className="mr-2 h-4 w-4"/> Cuentas Bancarias</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
            <ProductCaliberManager />
        </TabsContent>

        <TabsContent value="logistics" className="grid md:grid-cols-2 gap-6">
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5 text-slate-400"/> Bodegas</CardTitle>
                    <CardDescription>Ubicaciones de almacenamiento de inventario.</CardDescription>
                </CardHeader>
                <CardContent>
                    <MasterListManager title="Bodegas Disponibles" items={warehouses} onAdd={addWarehouse} onRemove={removeWarehouse} />
                </CardContent>
            </Card>
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-slate-400"/> Tipos de Envase</CardTitle>
                    <CardDescription>Formatos de empaque para productos.</CardDescription>
                </CardHeader>
                <CardContent>
                     <MasterListManager title="Envases Disponibles" items={packagingTypes} onAdd={addPackagingType} onRemove={removePackagingType} />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="banking">
            <MasterDataManager />
        </TabsContent>

      </Tabs>
    </div>
  );
}

