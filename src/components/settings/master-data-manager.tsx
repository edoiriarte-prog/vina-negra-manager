
"use client";

import { useState } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Landmark } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankAccount } from '@/lib/types';

export function MasterDataManager() {
  const {
    bankAccounts, addBankAccount, removeBankAccount
  } = useMasterData();

  // Estado para formulario de Cuenta Bancaria
  const [newAccount, setNewAccount] = useState<Omit<BankAccount, 'id'>>({
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
        addBankAccount(newAccount);
        setNewAccount({
            name: '', bankName: '', accountType: 'Cuenta Corriente', accountNumber: '', 
            initialBalance: 0, owner: '', ownerRUT: '', ownerEmail: '', status: 'Activa'
        });
    }
  };

  return (
    <div className="space-y-8">
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
                                <Input type="number" placeholder="0" value={newAccount.initialBalance || ''} onChange={e => setNewAccount({...newAccount, initialBalance: Number(e.target.value)})} />
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
  );
}
