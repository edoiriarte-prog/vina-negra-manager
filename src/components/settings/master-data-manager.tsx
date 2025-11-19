"use client";

import { useState } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Landmark, Warehouse } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankAccount } from '@/lib/types';

export function MasterDataManager() {
  const {
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    units, addUnit, removeUnit,
    packagingTypes, addPackagingType, removePackagingType,
    warehouses, addWarehouse, removeWarehouse,
    bankAccounts, addBankAccount, removeBankAccount
  } = useMasterData();

  // Estados para inputs simples
  const [newProduct, setNewProduct] = useState('');
  const [newCaliberName, setNewCaliberName] = useState('');
  const [newCaliberCode, setNewCaliberCode] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newPackaging, setNewPackaging] = useState('');
  const [newWarehouse, setNewWarehouse] = useState('');

  // Estado para formulario de Cuenta Bancaria
  const [newAccount, setNewAccount] = useState<Partial<BankAccount>>({
    name: '',
    bankName: '',
    accountType: 'Cuenta Corriente',
    accountNumber: '',
    initialBalance: 0,
    owner: '',
    ownerRUT: '',
    ownerEmail: '',
    status: 'Activa'
  });

  const handleAddAccount = () => {
    if (newAccount.name && newAccount.bankName) {
        const account: BankAccount = {
            id: `bank-${Date.now()}`,
            name: newAccount.name || '',
            bankName: newAccount.bankName || '',
            accountType: newAccount.accountType as any,
            accountNumber: newAccount.accountNumber || '',
            initialBalance: Number(newAccount.initialBalance) || 0,
            owner: newAccount.owner || '',
            ownerRUT: newAccount.ownerRUT || '',
            ownerEmail: newAccount.ownerEmail || '',
            status: 'Activa'
        };
        addBankAccount(account);
        setNewAccount({
            name: '', bankName: '', accountType: 'Cuenta Corriente', accountNumber: '', 
            initialBalance: 0, owner: '', ownerRUT: '', ownerEmail: '', status: 'Activa'
        });
    }
  };

  return (
    <div className="space-y-8">
        
      <div className="grid gap-6 md:grid-cols-2">
        {/* --- PRODUCTOS --- */}
        <Card>
            <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Gestiona los productos disponibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                placeholder="Nuevo Producto (ej: PALTAS)" 
                value={newProduct} 
                onChange={(e) => setNewProduct(e.target.value.toUpperCase())} 
                />
                <Button onClick={() => { if(newProduct) { addProduct(newProduct); setNewProduct(''); } }}>
                <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {products.map(p => (
                <div key={p} className="flex justify-between items-center p-2 border rounded bg-muted/20">
                    <span className="font-medium">{p}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeProduct(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>

        {/* --- CALIBRES --- */}
        <Card>
            <CardHeader>
            <CardTitle>Calibres</CardTitle>
            <CardDescription>Define nombres y códigos para los calibres.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                placeholder="Nombre (ej: PRIMERA)" 
                value={newCaliberName} 
                onChange={(e) => setNewCaliberName(e.target.value.toUpperCase())} 
                className="flex-1"
                />
                <Input 
                placeholder="Cód. (ej: 50)" 
                value={newCaliberCode} 
                onChange={(e) => setNewCaliberCode(e.target.value)} 
                className="w-24"
                />
                <Button onClick={() => { 
                if(newCaliberName && newCaliberCode) { 
                    addCaliber({name: newCaliberName, code: newCaliberCode}); 
                    setNewCaliberName(''); setNewCaliberCode(''); 
                } 
                }}>
                <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {calibers.map(c => (
                <div key={c.name} className="flex justify-between items-center p-2 border rounded bg-muted/20">
                    <span>{c.name} <span className="text-xs text-muted-foreground">({c.code})</span></span>
                    <Button variant="ghost" size="icon" onClick={() => removeCaliber(c.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>

        {/* --- UNIDADES --- */}
        <Card>
            <CardHeader>
            <CardTitle>Unidades</CardTitle>
            <CardDescription>Unidades de medida (Kilos, Cajas, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                placeholder="Nueva Unidad" 
                value={newUnit} 
                onChange={(e) => setNewUnit(e.target.value)} 
                />
                <Button onClick={() => { if(newUnit) { addUnit(newUnit); setNewUnit(''); } }}>
                <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {units.map(u => (
                <div key={u} className="flex justify-between items-center p-2 border rounded bg-muted/20">
                    <span>{u}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeUnit(u)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>

        {/* --- ENVASES --- */}
        <Card>
            <CardHeader>
            <CardTitle>Tipos de Envase</CardTitle>
            <CardDescription>Bins, Cajas plásticas, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                placeholder="Nuevo Envase" 
                value={newPackaging} 
                onChange={(e) => setNewPackaging(e.target.value.toUpperCase())} 
                />
                <Button onClick={() => { if(newPackaging) { addPackagingType(newPackaging); setNewPackaging(''); } }}>
                <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {packagingTypes.map(p => (
                <div key={p} className="flex justify-between items-center p-2 border rounded bg-muted/20">
                    <span className="text-sm">{p}</span>
                    <Button variant="ghost" size="icon" onClick={() => removePackagingType(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>
      </div>

      {/* --- SECCIÓN DE INFRAESTRUCTURA Y FINANZAS --- */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* --- BODEGAS --- */}
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" /> Bodegas</CardTitle>
                <CardDescription>Lugares de almacenamiento para control de inventario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Nombre Bodega (ej: Patio 1)" 
                        value={newWarehouse} 
                        onChange={(e) => setNewWarehouse(e.target.value)} 
                    />
                    <Button onClick={() => { if(newWarehouse) { addWarehouse(newWarehouse); setNewWarehouse(''); } }}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {warehouses.map(w => (
                    <div key={w} className="flex justify-between items-center p-2 border rounded bg-muted/20">
                        <span className="font-medium">{w}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeWarehouse(w)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* --- CUENTAS BANCARIAS --- */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Cuentas Bancarias</CardTitle>
                <CardDescription>Cuentas para registrar ingresos y egresos de tesorería.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Formulario */}
                    <div className="space-y-4 border p-4 rounded-md bg-muted/10">
                        <h4 className="font-semibold text-sm">Nueva Cuenta</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Alias / Nombre</Label>
                                <Input placeholder="Ej: Banco Estado Principal" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
                            </div>
                            <div>
                                <Label>Banco</Label>
                                <Input placeholder="Ej: Banco Estado" value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} />
                            </div>
                            <div>
                                <Label>Tipo Cuenta</Label>
                                <Select value={newAccount.accountType} onValueChange={(val: any) => setNewAccount({...newAccount, accountType: val})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                                        <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                                        <SelectItem value="Línea de Crédito">Línea de Crédito</SelectItem>
                                        <SelectItem value="Efectivo">Efectivo / Caja Chica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Número Cuenta</Label>
                                <Input placeholder="12345678" value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} />
                            </div>
                            <div>
                                <Label>Saldo Inicial ($)</Label>
                                <Input type="number" placeholder="0" value={newAccount.initialBalance} onChange={e => setNewAccount({...newAccount, initialBalance: Number(e.target.value)})} />
                            </div>
                            <div className="col-span-2">
                                <Label>Titular (Opcional)</Label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    <Input placeholder="Nombre Titular" value={newAccount.owner} onChange={e => setNewAccount({...newAccount, owner: e.target.value})} />
                                    <Input placeholder="RUT Titular" value={newAccount.ownerRUT} onChange={e => setNewAccount({...newAccount, ownerRUT: e.target.value})} />
                                    <Input placeholder="Email Notificaciones" value={newAccount.ownerEmail} onChange={e => setNewAccount({...newAccount, ownerEmail: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleAddAccount} disabled={!newAccount.name || !newAccount.bankName}>
                            <Plus className="mr-2 h-4 w-4" /> Agregar Cuenta
                        </Button>
                    </div>

                    {/* Lista */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <h4 className="font-semibold text-sm mb-2">Cuentas Registradas</h4>
                        {bankAccounts.length === 0 && <p className="text-sm text-muted-foreground">No hay cuentas registradas.</p>}
                        {bankAccounts.map(acc => (
                            <div key={acc.id} className="flex flex-col p-3 border rounded hover:bg-muted/30 transition-colors relative group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{acc.name}</p>
                                        <p className="text-sm text-muted-foreground">{acc.bankName} - {acc.accountType}</p>
                                        <p className="text-xs font-mono mt-1">{acc.accountNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-green-600">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.initialBalance)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">Saldo Inicial</p>
                                    </div>
                                </div>
                                {acc.owner && (
                                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                        Titular: {acc.owner} ({acc.ownerRUT})
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeBankAccount(acc.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}