"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Package, Ruler, Warehouse, Database, Link as LinkIcon, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { 
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType,
    productCaliberAssociations, updateProductCalibers,
    bankAccounts, addBankAccount, removeBankAccount,
    isLoading
  } = useMasterData();

  // Estados para inputs simples
  const [newProduct, setNewProduct] = useState("");
  const [newWarehouse, setNewWarehouse] = useState("");
  const [newPackaging, setNewPackaging] = useState("");
  
  // Estados para Calibres
  const [newCaliberName, setNewCaliberName] = useState("");
  const [newCaliberCode, setNewCaliberCode] = useState("");

  // Estados para Cuentas Bancarias
  const [newBankName, setNewBankName] = useState("");
  const [newBankAlias, setNewBankAlias] = useState("");
  const [newBankAccountNumber, setNewBankAccountNumber] = useState("");
  const [newBankType, setNewBankType] = useState<"Corriente" | "Vista" | "Ahorro">("Corriente");

  // Estado para Asociación
  const [selectedAssocProduct, setSelectedAssocProduct] = useState<string>("");

  // --- LOGICA ASOCIACIÓN ---
  const activeCalibersForProduct = useMemo(() => {
    if (!selectedAssocProduct) return [];
    const assoc = productCaliberAssociations.find(a => a.id === selectedAssocProduct);
    return assoc ? assoc.calibers : [];
  }, [selectedAssocProduct, productCaliberAssociations]);

  const toggleCaliberForProduct = (caliberName: string) => {
    if (!selectedAssocProduct) return;
    const current = activeCalibersForProduct;
    const isSelected = current.includes(caliberName);
    
    let newSelection;
    if (isSelected) {
        newSelection = current.filter(c => c !== caliberName);
    } else {
        newSelection = [...current, caliberName];
    }
    updateProductCalibers(selectedAssocProduct, newSelection);
  };


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

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Productos</TabsTrigger>
          <TabsTrigger value="calibers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Calibres</TabsTrigger>
          <TabsTrigger value="warehouses" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Bodegas</TabsTrigger>
          <TabsTrigger value="packaging" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Envases</TabsTrigger>
          <TabsTrigger value="banking" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Bancos</TabsTrigger>
        </TabsList>

        {/* --- 1. PRODUCTOS & ASOCIACIÓN --- */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
             {/* A. Lista de Productos */}
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

             {/* B. Asociación Producto -> Calibres */}
             <Card className={cardClass}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-400"><LinkIcon className="h-5 w-5"/> Asociación de Calibres</CardTitle>
                    <CardDescription className="text-slate-400">Selecciona qué calibres aplican a cada producto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Seleccionar Producto</Label>
                        <Select value={selectedAssocProduct} onValueChange={setSelectedAssocProduct}>
                            <SelectTrigger className={inputClass}>
                                <SelectValue placeholder="Elige un producto..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAssocProduct ? (
                        <div className="space-y-3">
                            <Label className="text-slate-300">Activar Calibres para {selectedAssocProduct}</Label>
                            <div className="flex flex-wrap gap-2 border border-slate-800 p-4 rounded-lg bg-slate-950/50">
                                {calibers.length === 0 && <span className="text-slate-500 text-xs">No hay calibres creados. Ve a la pestaña Calibres.</span>}
                                {calibers.map(c => {
                                    const isActive = activeCalibersForProduct.includes(c.name);
                                    return (
                                        <div 
                                            key={c.name}
                                            onClick={() => toggleCaliberForProduct(c.name)}
                                            className={cn(
                                                "cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-2 select-none",
                                                isActive 
                                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20" 
                                                    : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300"
                                            )}
                                        >
                                            {c.name} ({c.code})
                                            {isActive && <Check className="h-3 w-3" />}
                                        </div>
                                    )
                                })}
                            </div>
                            <p className="text-xs text-slate-500 text-right">Los cambios se guardan automáticamente.</p>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-600 text-sm">
                            Selecciona un producto arriba para configurar.
                        </div>
                    )}
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* --- 2. CALIBRES --- */}
        <TabsContent value="calibers">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400"><Ruler className="h-5 w-5"/> Definición de Calibres</CardTitle>
              <CardDescription className="text-slate-400">Estándares de tamaño para clasificación.</CardDescription>
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
              
              <Separator className="bg-slate-800 my-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </TabsContent>

        {/* --- 3. BODEGAS --- */}
        <TabsContent value="warehouses">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400"><Warehouse className="h-5 w-5"/> Gestión de Bodegas</CardTitle>
              <CardDescription className="text-slate-400">Ubicaciones físicas para el inventario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Ej: Cámara de Frío 1" value={newWarehouse} onChange={(e) => setNewWarehouse(e.target.value)} className={inputClass}/>
                <Button onClick={() => { if(newWarehouse) { addWarehouse(newWarehouse); setNewWarehouse(""); }}} className="bg-amber-600 hover:bg-amber-500 text-white"><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
              </div>
              <div className="grid gap-2 mt-4">
                {warehouses.map((w) => (
                  <div key={w} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-900/20 rounded text-amber-500"><Warehouse className="h-4 w-4"/></div>
                        <span className="text-slate-200 font-medium">{w}</span>
                    </div>
                    <button onClick={() => removeWarehouse(w)} className="text-slate-600 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- 4. ENVASES --- */}
        <TabsContent value="packaging">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400"><Database className="h-5 w-5"/> Tipos de Envase</CardTitle>
              <CardDescription className="text-slate-400">Formatos de empaque (Cajas, Bins, Totes).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Ej: Caja 5kg" value={newPackaging} onChange={(e) => setNewPackaging(e.target.value)} className={inputClass}/>
                <Button onClick={() => { if(newPackaging) { addPackagingType(newPackaging); setNewPackaging(""); }}} className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="h-4 w-4 mr-2"/> Agregar</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {packagingTypes.map((p) => (
                  <Badge key={p} variant="outline" className="border-emerald-500/30 bg-emerald-950/10 text-emerald-400 px-3 py-1.5 text-sm flex gap-2 items-center">
                    {p}
                    <button onClick={() => removePackagingType(p)} className="hover:text-red-400 ml-1"><Trash2 className="h-3 w-3"/></button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- 5. CUENTAS BANCARIAS --- */}
        <TabsContent value="banking">
          <Card className={cardClass}>
             <CardHeader>
                <CardTitle className="text-slate-200">Cuentas Bancarias</CardTitle>
                <CardDescription className="text-slate-400">Cuentas para registrar ingresos y egresos de tesorería.</CardDescription>
             </CardHeader>
             <CardContent className="grid md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-4 border-r border-slate-800 pr-6">
                    <h4 className="font-medium text-white mb-2">Nueva Cuenta</h4>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Alias / Nombre</Label>
                            <Input placeholder="Ej: Banco Estado Principal" value={newBankAlias} onChange={e => setNewBankAlias(e.target.value)} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Banco</Label>
                            <Input placeholder="Ej: Banco Estado" value={newBankName} onChange={e => setNewBankName(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Tipo Cuenta</Label>
                                <Select value={newBankType} onValueChange={(v: any) => setNewBankType(v)}>
                                    <SelectTrigger className={inputClass}><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="Corriente">Cta. Corriente</SelectItem>
                                        <SelectItem value="Vista">Cta. Vista</SelectItem>
                                        <SelectItem value="Ahorro">Cta. Ahorro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">N° Cuenta</Label>
                                <Input placeholder="12345678" value={newBankAccountNumber} onChange={e => setNewBankAccountNumber(e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <Button 
                            onClick={() => {
                                if(newBankAlias && newBankName) {
                                    addBankAccount({
                                        id: Math.random().toString(36).substr(2, 9),
                                        name: newBankAlias,
                                        bank: newBankName,
                                        accountNumber: newBankAccountNumber,
                                        type: newBankType,
                                        currency: 'CLP',
                                        initialBalance: 0,
                                        status: 'Activa'
                                    });
                                    setNewBankAlias(""); setNewBankName(""); setNewBankAccountNumber("");
                                }
                            }}
                            className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold mt-2"
                        >
                            Guardar Cuenta
                        </Button>
                    </div>
                </div>
                
                <div className="md:col-span-7 space-y-3">
                    <h4 className="font-medium text-white mb-2">Cuentas Registradas</h4>
                    {bankAccounts.length === 0 && <div className="text-slate-500 text-sm italic">No hay cuentas registradas.</div>}
                    {bankAccounts.map(acc => (
                        <div key={acc.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center group">
                            <div>
                                <div className="font-bold text-slate-200">{acc.name}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{acc.bank} - {acc.type}</div>
                                <div className="text-xs text-slate-600 font-mono mt-1">{acc.accountNumber}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-emerald-500 font-bold text-lg">$0</div>
                                <div className="text-[10px] text-slate-600">Saldo Inicial</div>
                                <button onClick={() => removeBankAccount(acc.id)} className="text-red-500 text-xs hover:underline mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                            </div>
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