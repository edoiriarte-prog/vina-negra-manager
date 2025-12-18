"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/firebase/init'; // Usamos la conexión limpia directa
import { BankAccount, Contact, InventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// --- TIPOS ---
export type ProductCaliberAssociation = {
  id: string; // Nombre del producto
  calibers: string[]; // Nombres de calibres
};

type MasterSettings = {
  products: string[]; 
  calibers: { name: string; code: string }[];
  warehouses: string[];
  units: string[];
  packagingTypes: string[];
  productCaliberAssociations: ProductCaliberAssociation[];
};

type MasterDataContextType = {
  // Datos
  products: string[];
  calibers: { name: string; code: string }[];
  warehouses: string[];
  units: string[];
  packagingTypes: string[];
  productCaliberAssociations: ProductCaliberAssociation[];
  inventory: InventoryItem[];
  contacts: Contact[];
  bankAccounts: BankAccount[];
  
  isLoading: boolean;
  
  // Funciones CRUD Configuración
  addProduct: (p: string) => void;
  removeProduct: (p: string) => void;
  addCaliber: (c: { name: string; code: string }) => void;
  removeCaliber: (name: string) => void;
  addWarehouse: (w: string) => void;
  removeWarehouse: (w: string) => void;
  addUnit: (u: string) => void;
  removeUnit: (u: string) => void;
  addPackagingType: (p: string) => void;
  removePackagingType: (p: string) => void;
  updateProductCalibers: (productId: string, caliberIds: string[]) => void;
  
  // Funciones CRUD Cuentas
  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<void>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  removeBankAccount: (id: string) => Promise<void>;
  
  // Estáticos
  internalConcepts: { name: string }[];
  costCenters: { name: string }[];
};

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const [settings, setSettings] = useState<MasterSettings>({
    products: [],
    calibers: [],
    warehouses: [],
    units: ['Kilos', 'Cajas'],
    packagingTypes: [],
    productCaliberAssociations: []
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const [loadingStates, setLoadingStates] = useState({
    settings: true,
    banks: true,
    contacts: true,
    inventory: true,
  });

  const isLoading = Object.values(loadingStates).some(state => state);

  useEffect(() => {
    if (!db) {
      Object.keys(loadingStates).forEach(key => setLoadingStates(prev => ({...prev, [key]: false})));
      return;
    };

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) setSettings(prev => ({ ...prev, ...(docSnap.data() as Partial<MasterSettings>) }));
      setLoadingStates(prev => ({...prev, settings: false}));
    }, () => setLoadingStates(prev => ({...prev, settings: false})));

    const unsubBanks = onSnapshot(collection(db, 'bankAccounts'), (snapshot) => {
      setBankAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)));
      setLoadingStates(prev => ({...prev, banks: false}));
    }, () => setLoadingStates(prev => ({...prev, banks: false})));

    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
      setLoadingStates(prev => ({...prev, contacts: false}));
    }, () => setLoadingStates(prev => ({...prev, contacts: false})));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
       setLoadingStates(prev => ({...prev, inventory: false}));
    }, () => setLoadingStates(prev => ({...prev, inventory: false})));

    return () => {
      unsubSettings();
      unsubBanks();
      unsubContacts();
      unsubInventory();
    };
  }, []);

  const updateSettingList = async (field: keyof MasterSettings, newList: any[]) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'general'), { [field]: newList }, { merge: true });
    } catch (e) {
        console.error("Error updating settings:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la configuración." });
    }
  };

  const addProduct = (p: string) => { if (!settings.products.includes(p)) updateSettingList('products', [...settings.products, p]); };
  const removeProduct = (p: string) => updateSettingList('products', settings.products.filter(item => item !== p));
  const addCaliber = (c: { name: string; code: string }) => { if (!settings.calibers.find(cal => cal.name === c.name)) updateSettingList('calibers', [...settings.calibers, c]); };
  const removeCaliber = (name: string) => updateSettingList('calibers', settings.calibers.filter(item => item.name !== name));
  const addWarehouse = (w: string) => { if (!settings.warehouses.includes(w)) updateSettingList('warehouses', [...settings.warehouses, w]); };
  const removeWarehouse = (w: string) => updateSettingList('warehouses', settings.warehouses.filter(item => item !== w));
  const addUnit = (u: string) => { if (!settings.units.includes(u)) updateSettingList('units', [...settings.units, u]); };
  const removeUnit = (u: string) => updateSettingList('units', settings.units.filter(item => item !== u));
  const addPackagingType = (p: string) => { if (!settings.packagingTypes.includes(p)) updateSettingList('packagingTypes', [...settings.packagingTypes, p]); };
  const removePackagingType = (p: string) => updateSettingList('packagingTypes', settings.packagingTypes.filter(item => item !== p));

  const updateProductCalibers = (productName: string, caliberNames: string[]) => {
    const index = settings.productCaliberAssociations.findIndex(a => a.id === productName);
    let newAssociations = [...settings.productCaliberAssociations];
    if (index >= 0) newAssociations[index] = { id: productName, calibers: caliberNames };
    else newAssociations.push({ id: productName, calibers: caliberNames });
    updateSettingList('productCaliberAssociations', newAssociations);
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
    await addDoc(collection(db, 'bankAccounts'), account);
    toast({ title: "Cuenta Agregada" });
  };
  
  const updateBankAccount = async (account: BankAccount) => {
     const { id, ...data } = account;
     await updateDoc(doc(db, 'bankAccounts', id), data);
     toast({ title: "Cuenta Actualizada" });
  };

  const removeBankAccount = async (id: string) => {
     await deleteDoc(doc(db, 'bankAccounts', id));
     toast({ title: "Cuenta Eliminada" });
  };

  const internalConcepts = [{ name: 'Retiro de Socios' }, { name: 'Pago de Impuestos' }, { name: 'Comisión Bancaria' }, { name: 'Préstamo Interno' }, { name: 'Gastos Generales' }, { name: 'Mantención' }, { name: 'Combustible' }, { name: 'Remuneraciones' }, { name: 'Leyes Sociales' }];
  const costCenters = [{ name: 'Administración' }, { name: 'Campo' }, { name: 'Packing' }, { name: 'Comercial' }, { name: 'Logística' }, { name: 'Gestión Empresarial' }, { name: 'Gestión Comercial' }];

  const value: MasterDataContextType = {
    ...settings, inventory, contacts, bankAccounts, addProduct, removeProduct,
    addCaliber, removeCaliber, addWarehouse, removeWarehouse, addUnit, removeUnit,
    addPackagingType, removePackagingType, updateProductCalibers, addBankAccount,
    updateBankAccount, removeBankAccount, internalConcepts, costCenters, isLoading
  };

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) throw new Error('useMasterData must be used within a MasterDataProvider');
  return context;
}
