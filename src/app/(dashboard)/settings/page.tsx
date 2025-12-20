"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Package, Ruler, Warehouse, Database, Landmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCaliberManager } from "@/components/settings/product-caliber-manager";
import { MasterDataManager } from "@/components/settings/master-data-manager";

export default function SettingsPage() {
  const { 
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType,
    isLoading
  } = useMasterData();

  // Estados para inputs simples
  const [newProduct, setNewProduct] = useState("");
  const [newWarehouse, setNewWarehouse] = useState("");
  const [newPackaging, setNewPackaging] = useState("");
  
  // Estados para Calibres
  const [newCaliberName, setNewCaliberName] = useState("");
  const [newCaliberCode, setNewCaliberCode] = useState("");


  if (isLoading) {
      return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-96 w-full"/></div>;
  }

  const cardClass = "bg-slate-900 border-slate-800";
  const inputClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-600";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Configuración Maestra</h2>
        <p className="text-slate-400 mt-1">Administra los catálogos globales de la aplicación.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Columna Izquierda: Maestros Independientes */}
        <div className="space-y-6">
          <Card className={cardClass}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400"><Package className="h-5 w-5"/> Catálogo de Productos</CardTitle>
                <CardDescription className="text-slate-400">Define las frutas o items que comercializas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Nombre (ej: Cerezas)" 
                        value={newProduct} 
                        onChange={(e) => setNewProduct(e.target.value)} 
                        className={inputClass}
                    />
                    <Button onClick={() => { if(newProduct) { addProduct(newProduct); setNewProduct(""); }}} className="bg-blue-600 hover:bg-blue-500 text-white">
                        <Plus className="h-4 w-4"/>
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {products.length === 0 && <span className="text-slate-600 italic text-sm">Lista vacía.</span>}
                    {products.map((p) => (
                        <Badge key={p} variant="outline" className="pl-3 pr-1 py-1 border-blue-500/30 text-blue-200 bg-blue-950/20 text-sm flex items-center gap-2">
                            {p}
                            <button onClick={() => removeProduct(p)} className="hover:bg-blue-900/50 rounded-full p-1 text-blue-400 hover:text-red-400 transition-colors">
                                <Trash2 className="h-3 w-3"/>
                            </button>
                        </Badge>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400"><Ruler className="h-5 w-5"/> Catálogo de Calibres</CardTitle>
              <CardDescription className="text-slate-400">Estándares de tamaño para clasificación. Estos estarán disponibles para ser asociados a productos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <Label className="text-xs text-slate-500">Nombre</Label>
                    <Input placeholder="Ej: Super Jumbo" value={newCaliberName} onChange={(e) => setNewCaliberName(e.target.value)} className={inputClass}/>
                </div>
                <div className="w-24 space-y-1">
                    <Label className="text-xs text-slate-500">Código</Label>
                    <Input placeholder="Ej: SJ" value={newCaliberCode} onChange={(e) => setNewCaliberCode(e.target.value)} className={inputClass}/>
                </div>
                <Button onClick={() => { 
                    if(newCaliberName) { 
                        addCaliber({name: newCaliberName, code: newCaliberCode || newCaliberName.substring(0,2).toUpperCase()}); 
                        setNewCaliberName(""); setNewCaliberCode(""); 
                    }
                }} className="bg-purple-600 hover:bg-purple-500 text-white">
                    <Plus className="h-4 w-4"/> Agregar
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {calibers.map((c) => (
                  <div key={c.name} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800 group hover:border-purple-500/50 transition-colors">
                    <div>
                        <div className="font-bold text-slate-200 text-sm">{c.name}</div>
                        <div className="text-xs text-purple-400 font-mono">{c.code}</div>
                    </div>
                    <button onClick={() => removeCaliber(c.name)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-400"><Warehouse className="h-5 w-5"/> Bodegas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Ej: Cámara 1" value={newWarehouse} onChange={(e) => setNewWarehouse(e.target.value)} className={inputClass}/>
                    <Button onClick={() => { if(newWarehouse) { addWarehouse(newWarehouse); setNewWarehouse(""); }}} className="bg-amber-600 hover:bg-amber-500 text-white"><Plus className="h-4 w-4"/></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {warehouses.map((w) => ( <Badge key={w} variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-950/20">{w}</Badge> ))}
                  </div>
                </CardContent>
            </Card>

            <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400"><Database className="h-5 w-5"/> Envases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex gap-2">
                    <Input placeholder="Ej: Caja 5kg" value={newPackaging} onChange={(e) => setNewPackaging(e.target.value)} className={inputClass}/>
                    <Button onClick={() => { if(newPackaging) { addPackagingType(newPackaging); setNewPackaging(""); }}} className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="h-4 w-4"/></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {packagingTypes.map((p) => ( <Badge key={p} variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-950/20">{p}</Badge> ))}
                  </div>
                </CardContent>
            </Card>
          </div>
          
          {/* Cuentas Bancarias */}
          <MasterDataManager />
        </div>

        {/* Columna Derecha: Asociaciones */}
        <div className="sticky top-24">
            <ProductCaliberManager />
        </div>
      </div>
    </div>
  );
}
