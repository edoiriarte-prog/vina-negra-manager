"use client";

import { useState } from "react";
import { useMasterData } from "@/hooks/use-master-data";
// ✅ IMPORTACIÓN CORREGIDA (Asegúrate de mover el archivo a src/components)
import { DataCleaner } from "@/components/data-cleaner"; 

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trash2, Plus, Package, Warehouse, Database, ShieldCheck, X, Banknote, 
  AlertTriangle, ArrowRight 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { 
    products, addProduct, removeProduct,
    warehouses, addWarehouse, removeWarehouse,
    packagingTypes, addPackagingType, removePackagingType,
    bankAccounts, addBankAccount, removeBankAccount,
    getCalibersForProduct, updateProductCalibers,
    isLoading
  } = useMasterData();

  const [newProduct, setNewProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [newCaliberInput, setNewCaliberInput] = useState(""); 
  
  const [newWarehouse, setNewWarehouse] = useState("");
  const [newPackaging, setNewPackaging] = useState("");

  const [newBankName, setNewBankName] = useState("");
  const [newBankAlias, setNewBankAlias] = useState("");
  const [newBankAccountNumber, setNewBankAccountNumber] = useState("");
  const [newBankType, setNewBankType] = useState<"Corriente" | "Vista" | "Ahorro">("Corriente");

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-96 w-full"/></div>;

  const handleAddCaliberToProduct = () => {
      if (!selectedProduct || !newCaliberInput) return;
      const currentCalibers = getCalibersForProduct(selectedProduct);
      const val = newCaliberInput.trim().toUpperCase();
      if (currentCalibers.includes(val)) return;
      updateProductCalibers(selectedProduct, [...currentCalibers, val]);
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
        <p className="text-slate-400">Configuración centralizada. Los calibres son exclusivos por producto.</p>
      </div>

      {/* Herramienta de limpieza */}
      <DataCleaner />

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-600">Productos y Calibres</TabsTrigger>
          <TabsTrigger value="warehouses" className="data-[state=active]:bg-amber-600">Bodegas</TabsTrigger>
          <TabsTrigger value="packaging" className="data-[state=active]:bg-emerald-600">Envases</TabsTrigger>
          <TabsTrigger value="banking" className="data-[state=active]:bg-purple-600">Bancos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-4">
                <Card className="bg-slate-900 border-slate-800 h-full shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-blue-400 text-lg">1. Mis Productos</CardTitle>
                        <CardDescription>Selecciona uno para editar sus reglas.</CardDescription>
                        <div className="flex gap-2 mt-2">
                            <Input placeholder="Nuevo (ej: Uva de Mesa)" value={newProduct} onChange={e => setNewProduct(e.target.value)} className="bg-slate-950 border-slate-800"/>
                            <Button onClick={() => {if(newProduct){addProduct(newProduct); setNewProduct("")}}} size="icon" className="bg-blue-600 hover:bg-blue-500"><Plus className="h-4 w-4"/></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {products.map(p => {
                            const calCount = getCalibersForProduct(p).length;
                            return (
                                <div 
                                    key={p} 
                                    onClick={() => setSelectedProduct(p)}
                                    className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${selectedProduct === p ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700'}`}
                                >
                                    <span className="font-medium">{p}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={`text-[10px] border-0 ${calCount === 0 ? 'bg-red-500/20 text-red-300' : 'bg-black/20 text-white'}`}>
                                            {calCount} calibres
                                        </Badge>
                                        <Trash2 className="h-4 w-4 opacity-30 hover:opacity-100 hover:text-red-300" onClick={(e) => {e.stopPropagation(); removeProduct(p)}}/>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-8">
                <Card className="bg-slate-900 border-slate-800 h-full shadow-lg">
                    <CardHeader className="border-b border-slate-800 pb-4">
                        <CardTitle className="text-slate-200 flex items-center gap-2 text-xl">
                            {selectedProduct ? (
                                <>Configurando: <span className="text-blue-400 font-bold underline decoration-blue-500/30">{selectedProduct}</span></>
                            ) : (
                                <span className="text-slate-500">Selecciona un producto a la izquierda</span>
                            )}
                        </CardTitle>
                        <CardDescription>Define los calibres válidos ÚNICAMENTE para este producto.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {selectedProduct ? (
                            <div className="space-y-6">
                                <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                                    <Label className="text-slate-300 mb-3 block text-sm font-medium">Agregar Nuevo Calibre</Label>
                                    <div className="flex gap-3 mb-6">
                                        <Input 
                                            placeholder={`Ej: 50, JUMBO, CAT 1... (Solo para ${selectedProduct})`} 
                                            value={newCaliberInput}
                                            onChange={e => setNewCaliberInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddCaliberToProduct()}
                                            className="bg-slate-900 border-slate-700 focus-visible:ring-blue-500"
                                        />
                                        <Button onClick={handleAddCaliberToProduct} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 shadow-lg shadow-emerald-900/20">
                                            <Plus className="h-4 w-4 mr-2"/> Agregar
                                        </Button>
                                    </div>
                                    
                                    <Label className="text-slate-400 mb-3 block text-xs uppercase tracking-wider flex justify-between">
                                        <span>Calibres Activos</span>
                                        <span className="text-blue-400">{getCalibersForProduct(selectedProduct).length} definidos</span>
                                    </Label>
                                    
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-950 rounded-lg border border-slate-800 min-h-[120px] content-start">
                                        {getCalibersForProduct(selectedProduct).length === 0 && (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-4">
                                                <AlertTriangle className="h-8 w-8 opacity-50 text-amber-500"/>
                                                <p className="text-sm italic">Este producto no tiene calibres.</p>
                                                <p className="text-xs">No podrás seleccionarlo en Ventas/Compras sin calibres.</p>
                                            </div>
                                        )}
                                        {getCalibersForProduct(selectedProduct).map(cal => (
                                            <Badge key={cal} className="bg-blue-500/10 text-blue-200 border-blue-500/30 pl-3 pr-1 py-1 text-sm flex gap-2 hover:bg-blue-500/20 transition-colors group">
                                                {cal}
                                                <button onClick={() => handleRemoveCaliberFromProduct(cal)} className="hover:bg-blue-900 rounded-full p-0.5 text-blue-400 hover:text-red-400 transition-colors group-hover:scale-110"><X className="h-3 w-3"/></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-600 space-y-4">
                                <div className="p-6 bg-slate-900 rounded-full border border-slate-800">
                                    <Package className="h-16 w-16 opacity-20"/>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <ArrowRight className="h-4 w-4 animate-pulse"/>
                                    <p>Selecciona un producto a la izquierda para gestionar sus calibres.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="warehouses">
             <Card className="bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-amber-400 flex gap-2"><Warehouse className="h-5 w-5"/> Bodegas</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4"><Input value={newWarehouse} onChange={e=>setNewWarehouse(e.target.value)} placeholder="Nombre Bodega" className="bg-slate-950 border-slate-800"/><Button onClick={()=>{if(newWarehouse){addWarehouse(newWarehouse);setNewWarehouse("")}}} className="bg-amber-600 hover:bg-amber-500"><Plus className="h-4 w-4"/></Button></div>
                    <div className="grid gap-2">{warehouses.map(w=><div key={w} className="flex justify-between p-3 bg-slate-950 rounded border border-slate-800 text-slate-300"><span>{w}</span><Trash2 className="h-4 w-4 cursor-pointer hover:text-red-500" onClick={()=>removeWarehouse(w)}/></div>)}</div>
                </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="packaging">
             <Card className="bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-emerald-400 flex gap-2"><Database className="h-5 w-5"/> Envases</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4"><Input value={newPackaging} onChange={e=>setNewPackaging(e.target.value)} placeholder="Tipo Envase" className="bg-slate-950 border-slate-800"/><Button onClick={()=>{if(newPackaging){addPackagingType(newPackaging);setNewPackaging("")}}} className="bg-emerald-600 hover:bg-emerald-500"><Plus className="h-4 w-4"/></Button></div>
                    <div className="flex flex-wrap gap-2">{packagingTypes.map(p=><Badge key={p} variant="outline" className="text-emerald-400 border-emerald-900 py-1 px-3 text-sm flex gap-2">{p}<X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={()=>removePackagingType(p)}/></Badge>)}</div>
                </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="banking">
             <Card className="bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-purple-400 flex gap-2"><Banknote className="h-5 w-5"/> Bancos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Input value={newBankAlias} onChange={e=>setNewBankAlias(e.target.value)} placeholder="Alias (Ej: Cuenta Principal)" className="bg-slate-950 border-slate-800"/>
                        <Input value={newBankName} onChange={e=>setNewBankName(e.target.value)} placeholder="Banco" className="bg-slate-950 border-slate-800"/>
                        <Select onValueChange={(v:any)=>setNewBankType(v)}><SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Tipo"/></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-200"><SelectItem value="Corriente">Corriente</SelectItem><SelectItem value="Vista">Vista</SelectItem></SelectContent></Select>
                        <Input value={newBankAccountNumber} onChange={e=>setNewBankAccountNumber(e.target.value)} placeholder="N° Cuenta" className="bg-slate-950 border-slate-800"/>
                    </div>
                    {/* ✅ CORRECCIÓN: Eliminado el ID manual */}
                    <Button onClick={()=>{if(newBankAlias){addBankAccount({name:newBankAlias,bankName:newBankName,accountNumber:newBankAccountNumber,accountType:newBankType,initialBalance:0,status:'Activa'});setNewBankAlias("")}}} className="w-full bg-purple-600 hover:bg-purple-500 font-bold">Guardar Cuenta</Button>
                    <div className="space-y-2 mt-4">{bankAccounts.map(b=><div key={b.id} className="flex justify-between p-3 bg-slate-950 border border-slate-800 rounded text-slate-300"><div><div className="font-bold">{b.name}</div><div className="text-xs text-slate-500">{b.bankName || b.bank} - {b.accountType || b.type}</div></div><Trash2 className="h-4 w-4 cursor-pointer hover:text-red-500" onClick={()=>removeBankAccount(b.id)}/></div>)}</div>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}