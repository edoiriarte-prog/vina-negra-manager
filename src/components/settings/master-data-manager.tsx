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

  const cardClass = "bg-slate-900 border-slate-800";
  const inputClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-600";

  return (
    <Card className={cardClass}>
        <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200"><Landmark className="h-5 w-5 text-slate-500" /> Cuentas Bancarias</CardTitle>
        <CardDescription className="text-slate-400">Cuentas para registrar ingresos y egresos de tesorería.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-4 border-r border-slate-800 pr-6">
            <h4 className="font-medium text-white mb-2">Nueva Cuenta</h4>
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Alias / Nombre</Label>
                    <Input placeholder="Ej: Banco Estado Principal" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Banco</Label>
                    <Input placeholder="Ej: Banco Estado" value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Tipo Cuenta</Label>
                        <Select value={newAccount.accountType} onValueChange={(val: any) => setNewAccount({...newAccount, accountType: val})}>
                            <SelectTrigger className={inputClass}><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <SelectItem value="Cuenta Corriente">Cta. Corriente</SelectItem>
                                <SelectItem value="Cuenta Vista">Cta. Vista</SelectItem>
                                <SelectItem value="Línea de Crédito">Línea de Crédito</SelectItem>
                                <SelectItem value="Efectivo">Efectivo / Caja Chica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">N° Cuenta</Label>
                        <Input placeholder="12345678" value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} className={inputClass} />
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Saldo Inicial ($)</Label>
                    <Input type="number" placeholder="0" value={newAccount.initialBalance || ''} onChange={e => setNewAccount({...newAccount, initialBalance: Number(e.target.value)})} className={inputClass} />
                </div>
                <Button 
                    onClick={handleAddAccount} 
                    disabled={!newAccount.name || !newAccount.bankName}
                    className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold mt-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Guardar Cuenta
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
                        <div className="text-xs text-slate-500 uppercase tracking-wide">{acc.bankName} - {acc.accountType}</div>
                        <div className="text-xs text-slate-600 font-mono mt-1">{acc.accountNumber}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-emerald-500 font-bold text-lg">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.initialBalance)}</div>
                        <div className="text-[10px] text-slate-600">Saldo Inicial</div>
                        <button onClick={() => removeBankAccount(acc.id)} className="text-red-500 text-xs hover:underline mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                    </div>
                </div>
            ))}
        </div>
        </CardContent>
    </Card>
  );
}
