
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useCollection,
  useDoc,
  useFirebase,
  useMemoFirebase,
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase';
import { BankAccount, Contact, InventoryItem } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';

// --- TIPOS ---
export type ProductCaliberAssociation = {
  id: string; // ID del producto (nombre)
  calibers: string[]; // IDs de calibres (nombres)
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
  
  // Funciones CRUD
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
  
  // --- ESTA LÍNEA FALTABA EN TU CÓDIGO ---
  updateProductCalibers: (productId: string, caliberIds: string[]) => void;
  
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (account: BankAccount) => void;
  removeBankAccount: (id: string) => void;
  
  // Estáticos
  internalConcepts: { name: string }[];
  costCenters: { name: string }[];
};

// --- CONTEXTO ---
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// --- PROVIDER ---
export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  // 1. Configuración General (Listas)
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'general') : null, [firestore]);
  const { data: settingsData, isLoading: l1 } = useDoc<MasterSettings>(settingsDocRef);

  // 2. Colecciones Maestras
  const accountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
  const { data: bankAccountsData, isLoading: l2 } = useCollection<BankAccount>(accountsCollection);

  const contactsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contactsData, isLoading: l3 } = useCollection<Contact>(contactsCollection);

  const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
  const { data: inventoryData, isLoading: l4 } = useCollection<InventoryItem>(inventoryCollection);

  // Valores por defecto seguros
  const products = settingsData?.products || [];
  const calibers = settingsData?.calibers || [];
  const warehouses = settingsData?.warehouses || [];
  const units = settingsData?.units || ['Kilos', 'Cajas'];
  const packagingTypes = settingsData?.packagingTypes || [];
  const productCaliberAssociations = settingsData?.productCaliberAssociations || [];
  
  const bankAccounts = bankAccountsData || [];
  const contacts = contactsData || [];
  const inventory = inventoryData || [];

  const isLoading = l1 || l2 || l3 || l4;

  // --- FUNCIONES DE ESCRITURA (FIREBASE) ---
  const updateSettingList = (field: keyof MasterSettings, newList: any[]) => {
    if (!firestore || !settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, { [field]: newList }, { merge: true });
  };

  const addProduct = (p: string) => { if (!products.includes(p)) updateSettingList('products', [...products, p]); };
  const removeProduct = (p: string) => updateSettingList('products', products.filter(item => item !== p));

  const addCaliber = (c: { name: string; code: string }) => { 
      if (!calibers.find(cal => cal.name === c.name)) updateSettingList('calibers', [...calibers, c]); 
  };
  const removeCaliber = (name: string) => updateSettingList('calibers', calibers.filter(item => item.name !== name));

  const addWarehouse = (w: string) => { if (!warehouses.includes(w)) updateSettingList('warehouses', [...warehouses, w]); };
  const removeWarehouse = (w: string) => updateSettingList('warehouses', warehouses.filter(item => item !== w));

  const addUnit = (u: string) => { if (!units.includes(u)) updateSettingList('units', [...units, u]); };
  const removeUnit = (u: string) => updateSettingList('units', units.filter(item => item !== u));

  const addPackagingType = (p: string) => { if (!packagingTypes.includes(p)) updateSettingList('packagingTypes', [...packagingTypes, p]); };
  const removePackagingType = (p: string) => updateSettingList('packagingTypes', packagingTypes.filter(item => item !== p));

  // ASOCIACIONES
  const updateProductCalibers = (productName: string, caliberNames: string[]) => {
    const index = productCaliberAssociations.findIndex(a => a.id === productName);
    let newAssociations = [...productCaliberAssociations];
    
    if (index >= 0) {
      newAssociations[index] = { id: productName, calibers: caliberNames };
    } else {
      newAssociations.push({ id: productName, calibers: caliberNames });
    }
    updateSettingList('productCaliberAssociations', newAssociations);
  };

  // Gestión de Cuentas Bancarias
  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'bankAccounts'), account);
  };
  
  const updateBankAccount = (account: BankAccount) => {
     if (!firestore) return;
     updateDocumentNonBlocking(doc(firestore, 'bankAccounts', account.id), account);
  };

  const removeBankAccount = (id: string) => {
     if (!firestore) return;
     deleteDocumentNonBlocking(doc(firestore, 'bankAccounts', id));
  };

  // Datos estáticos
  const internalConcepts = [
    { name: 'Retiro de Socios' }, { name: 'Pago de Impuestos' }, { name: 'Comisión Bancaria' },
    { name: 'Préstamo Interno' }, { name: 'Gastos Generales' }, { name: 'Mantención' },
    { name: 'Combustible' }, { name: 'Remuneraciones' }, { name: 'Leyes Sociales' }
  ];
  
  const costCenters = [
      { name: 'Administración' }, { name: 'Campo' }, { name: 'Packing' }, { name: 'Comercial' }, { name: 'Logística' }
  ];

  const value: MasterDataContextType = {
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    warehouses, addWarehouse, removeWarehouse,
    units, addUnit, removeUnit,
    packagingTypes, addPackagingType, removePackagingType,
    productCaliberAssociations,
    updateProductCalibers, // <--- FUNCIÓN AGREGADA
    inventory,
    contacts,
    bankAccounts, addBankAccount, updateBankAccount, removeBankAccount,
    internalConcepts, costCenters,
    isLoading
  };

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

// --- HOOK ---
export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
