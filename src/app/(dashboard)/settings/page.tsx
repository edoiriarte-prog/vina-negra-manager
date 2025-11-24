"use client";

import { useState } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Package, Scale, Warehouse, Tags } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const {
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType
  } = useMasterData();

  // Estados locales para los inputs
  const [newProduct, setNewProduct] = useState("");
  const [newCaliber, setNewCaliber] = useState("");
  const [newWarehouse, setNewWarehouse] = useState("");
  const [newPackaging, setNewPackaging] = useState("");

  // Handlers simples
  const handleAddProduct = () => { if(newProduct) { addProduct(newProduct); setNewProduct(""); } };
  const handleAddCaliber = () => { if(newCaliber) { addCaliber({ name: newCaliber, code: newCaliber.substring(0,3).toUpperCase() }); setNewCaliber(""); } };
  const handleAddWarehouse = () => { if(newWarehouse) { addWarehouse(newWarehouse); setNewWarehouse(""); } };
  const handleAddPackaging = () => { if(newPackaging) { addPackagingType(newPackaging); setNewPackaging(""); } };

  // Clases de estilo Enterprise
  const cardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const inputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const buttonClass = "bg-blue-600 hover:bg-blue-500 text-white";
  const listClass = "flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition-colors";

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Configuración Maestra</h2>
        <p className="text-slate-400 mt-1">Administra los catálogos globales del sistema.</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200">Productos</TabsTrigger>
            <TabsTrigger value="calibers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200">Calibres</TabsTrigger>
            <TabsTrigger value="warehouses" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200">Bodegas</TabsTrigger>
            <TabsTrigger value="packaging" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200">Envases</TabsTrigger>
        </TabsList>

        {/* 1. PRODUCTOS */}
        <TabsContent value="products">
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Package className="h-5 w-5 text-blue-500"/> Catálogo de Productos</CardTitle>
                    <CardDescription className="text-slate-400">Define las frutas o verduras que comercializas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-3">
                        <Input placeholder="Ej: Palta Hass" value={newProduct} onChange={e => setNewProduct(e.target.value)} className={inputClass} />
                        <Button onClick={handleAddProduct} className={buttonClass}><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* TIPADO AGREGADO AQUÍ: (item: string) */}
                        {products.map((item: string) => (
                            <div key={item} className={listClass}>
                                <span className="font-medium text-slate-200">{item}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeProduct(item)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* 2. CALIBRES */}
        <TabsContent value="calibers">
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Scale className="h-5 w-5 text-emerald-500"/> Calibres y Tamaños</CardTitle>
                    <CardDescription className="text-slate-400">Define los calibres disponibles para la matriz de precios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-3">
                        <Input placeholder="Ej: PAL_EXTRA (50)" value={newCaliber} onChange={e => setNewCaliber(e.target.value)} className={inputClass} />
                        <Button onClick={handleAddCaliber} className={`bg-emerald-600 hover:bg-emerald-500 text-white`}><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* TIPADO AGREGADO AQUÍ: (item: {name:string, code:string}) */}
                        {calibers.map((item: { name: string; code: string }) => (
                            <div key={item.name} className={listClass}>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-200">{item.name}</span>
                                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">{item.code}</Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeCaliber(item.name)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* 3. BODEGAS */}
        <TabsContent value="warehouses">
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Warehouse className="h-5 w-5 text-orange-500"/> Ubicaciones / Bodegas</CardTitle>
                    <CardDescription className="text-slate-400">Lugares físicos donde almacenas inventario.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-3">
                        <Input placeholder="Ej: Bodega Ovalle" value={newWarehouse} onChange={e => setNewWarehouse(e.target.value)} className={inputClass} />
                        <Button onClick={handleAddWarehouse} className={`bg-orange-600 hover:bg-orange-500 text-white`}><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {warehouses.map((item) => (
                            <div key={item.id} className={listClass}>
                                <span className="font-medium text-slate-200">{item.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeWarehouse(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* 4. ENVASES */}
        <TabsContent value="packaging">
            <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Tags className="h-5 w-5 text-purple-500"/> Tipos de Envase</CardTitle>
                    <CardDescription className="text-slate-400">Cajas, bins, mallas, etc.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-3">
                        <Input placeholder="Ej: CAJA PL 10KG" value={newPackaging} onChange={e => setNewPackaging(e.target.value)} className={inputClass} />
                        <Button onClick={handleAddPackaging} className={`bg-purple-600 hover:bg-purple-500 text-white`}><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {packagingTypes.map((item) => (
                            <div key={item.id} className={listClass}>
                                <span className="font-medium text-slate-200">{item.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => removePackagingType(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
    
    