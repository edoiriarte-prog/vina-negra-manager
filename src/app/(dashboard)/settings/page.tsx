"use client";

import { useState } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Package, Warehouse, Database, ShieldCheck, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { 
    products, addProduct, removeProduct,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType,
    bankAccounts, addBankAccount, removeBankAccount,
    getCalibersForProduct, updateProductCalibers,
    isLoading
  } = useMasterData();

  // Estados
  const [newProduct, setNewProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [newCaliberInput, setNewCaliberInput] = useState(""); // Input para agregar calibre específico

  // Estados simples
  const [newWarehouse, setNewWarehouse] = useState("");
  const [newPackaging, setNewPackaging] = useState("");
  // ... (Estados de Banco omitidos por brevedad, usar los mismos de antes)

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full"/></div>;

  const handleAddCaliberToProduct = () => {
      if (!selectedProduct || !newCaliberInput) return;
      const currentCalibers = getCalibersForProduct(selectedProduct);
      if (currentCalibers.includes(newCaliberInput)) return;
      
      updateProductCalibers(selectedProduct, [...currentCalibers, newCaliberInput.toUpperCase()]);
      setNewCaliberInput("");
  };

  const handleRemoveCaliberFromProduct = (cal: string) => {
      if (!selectedProduct) return;
      const currentCalibers = getCalibersForProduct(selectedProduct);
      updateProductCalibers(selectedProduct, currentCalibers.filter(c => c !== cal));
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-emerald-500"/> Maestros & Trazabilidad
        </h2>
        <p className="text-slate-400">Configuración centralizada de productos y sus atributos válidos.</p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="products">Productos y Calibres</TabsTrigger>
          <TabsTrigger value="warehouses">Bodegas</TabsTrigger>
          <TabsTrigger value="packaging">Envases</TabsTrigger>
          <TabsTrigger value="banking">Bancos</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA UNIFICADA: PRODUCTOS + CALIBRES --- */}
        <TabsContent value="products" className="grid md:grid-cols-12 gap-6">
            
            {/* IZQUIERDA: LISTA DE PRODUCTOS */}
            <div className="md:col-span-4 space-y-4">
                <Card className="bg-slate-900 border-slate-800 h-full">
                    <CardHeader>
                        <CardTitle className="text-blue-400">1. Mis Productos</CardTitle>
                        <div className="flex gap-2">
                            <Input placeholder="Nuevo Producto..." value={newProduct} onChange={e => setNewProduct(e.target.value)} className="bg-slate-950 border-slate-800"/>
                            <Button onClick={() => {if(newProduct){addProduct(newProduct); setNewProduct("")}}} size="icon" className="bg-blue-600"><Plus className="h-4 w-4"/></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                        {products.map(p => (
                            <div 
                                key={p} 
                                onClick={() => setSelectedProduct(p)}
                                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${selectedProduct === p ? 'bg-blue-900/30 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                            >
                                <span className="font-medium">{p}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-800 text-xs">{getCalibersForProduct(p).length} cal.</Badge>
                                    <Trash2 className="h-4 w-4 text-slate-600 hover:text-red-500" onClick={(e) => {e.stopPropagation(); removeProduct(p)}}/>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* DERECHA: CONFIGURACIÓN DEL PRODUCTO SELECCIONADO */}
            <div className="md:col-span-8">
                <Card className="bg-slate-900 border-slate-800 h-full">
                    <CardHeader className="border-b border-slate-800 pb-4">
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                            {selectedProduct ? (
                                <>Configuración de: <span className="text-blue-400">{selectedProduct}</span></>
                            ) : (
                                <span className="text-slate-500">Selecciona un producto para configurar</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {selectedProduct ? (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-slate-300 mb-2 block">Definir Calibres Válidos</Label>
                                    <div className="flex gap-2 mb-4">
                                        <Input 
                                            placeholder={`Ej: 50, JUMBO, CAT 1 (para ${selectedProduct})`} 
                                            value={newCaliberInput}
                                            onChange={e => setNewCaliberInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddCaliberToProduct()}
                                            className="bg-slate-950 border-slate-800"
                                        />
                                        <Button onClick={handleAddCaliberToProduct} className="bg-emerald-600 hover:bg-emerald-500">
                                            <Plus className="h-4 w-4 mr-2"/> Agregar Calibre
                                        </Button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-950 rounded-lg border border-slate-800 min-h-[100px] content-start">
                                        {getCalibersForProduct(selectedProduct).length === 0 && (
                                            <p className="text-slate-600 text-sm italic w-full text-center py-4">
                                                No hay calibres definidos. Agrega uno arriba.
                                            </p>
                                        )}
                                        {getCalibersForProduct(selectedProduct).map(cal => (
                                            <Badge key={cal} className="bg-blue-900/40 text-blue-200 border-blue-700/50 pl-3 pr-1 py-1 text-sm flex gap-2">
                                                {cal}
                                                <button onClick={() => handleRemoveCaliberFromProduct(cal)} className="hover:bg-blue-800 rounded-full p-0.5"><X className="h-3 w-3"/></button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        * Estos serán los únicos calibres disponibles al comprar o vender {selectedProduct}.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                                <Package className="h-16 w-16 mb-4 opacity-20"/>
                                <p>Selecciona un producto de la izquierda para gestionar sus calibres.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        {/* ... (Aquí van los TabsContent de Bodegas, Envases y Bancos igual que antes) ... */}
        {/* Solo asegúrate de incluir el código de las otras pestañas si lo necesitas completo */}
      </Tabs>
    </div>
  );
}