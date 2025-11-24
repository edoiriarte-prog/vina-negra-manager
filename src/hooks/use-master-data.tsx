
"use client";

import { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  useCollection,
  useDoc,
  useFirebase,
  useMemoFirebase
} from '@/firebase';
import { BankAccount, Contact, PurchaseOrder, SalesOrder, InventoryAdjustment, InventoryItem } from '@/lib/types';
import { doc, collection, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getInventory } from '@/lib/inventory';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// --- TYPES ---
export type ProductCaliberAssociation = {
  id: string; // Corresponds to product name for simplicity
  calibers: string[];
};

type MasterSettings = {
  products: { id: string, name: string }[];
  calibers: { id: string, name: string; code: string }[];
  warehouses: { id: string, name: string }[];
  units: { id: string, name: string }[];
  packagingTypes: { id: string, name: string }[];
  internalConcepts: { name: string }[];
  costCenters: { name: string }[];
  productCaliberAssociations: ProductCaliberAssociation[];
};

type MasterDataContextType = MasterSettings & {
  bankAccounts: BankAccount[];
  contacts: Contact[];
  inventory: InventoryItem[];
  isLoading: boolean;
  addProduct: (name: string) => void;
  removeProduct: (id: string) => void;
  addCaliber: (caliber: { name: string, code: string }) => void;
  removeCaliber: (id: string) => void;
  addWarehouse: (name: string) => void;
  removeWarehouse: (id: string) => void;
  addPackagingType: (name: string) => void;
  removePackagingType: (id: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  removeBankAccount: (id: string) => void;
  updateProductCalibers: (productId: string, caliberIds: string[]) => void;
};

// --- CONTEXT ---
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// --- PROVIDER ---
export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  // Settings Doc for master lists
  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'general') : null), [firestore]);
  const { data: settingsData, isLoading: l1 } = useDoc<MasterSettings>(settingsDocRef);
  
  // Collections for other master data
  const accountsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'bankAccounts') : null), [firestore]);
  const contactsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'contacts') : null), [firestore]);
  
  const { data: bankAccounts, isLoading: l2 } = useCollection<BankAccount>(accountsCollection);
  const { data: contacts, isLoading: l3 } = useCollection<Contact>(contactsCollection);

  // We need operational data here ONLY for inventory calculation
  const purchasesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'purchaseOrders') : null), [firestore]);
  const salesCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'salesOrders') : null), [firestore]);
  const adjustmentsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'inventoryAdjustments') : null), [firestore]);
  
  const { data: purchaseOrders, isLoading: l4 } = useCollection<PurchaseOrder>(purchasesCollection);
  const { data: salesOrders, isLoading: l5 } = useCollection<SalesOrder>(salesCollection);
  const { data: inventoryAdjustments, isLoading: l6 } = useCollection<InventoryAdjustment>(adjustmentsCollection);

  // Combine loading states
  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  // Defaults
  const products = settingsData?.products || [];
  const calibers = settingsData?.calibers || [];
  const warehouses = settingsData?.warehouses || [];
  const units = settingsData?.units || [];
  const packagingTypes = settingsData?.packagingTypes || [];
  const internalConcepts = settingsData?.internalConcepts || [];
  const costCenters = settingsData?.costCenters || [];
  const productCaliberAssociations = settingsData?.productCaliberAssociations || [];

  // Derived Data: Inventory
  const inventory = useMemo(() => {
    return getInventory(purchaseOrders || [], salesOrders || [], inventoryAdjustments || []);
  }, [purchaseOrders, salesOrders, inventoryAdjustments]);

  // CRUD Helpers for master lists
  const updateSettingList = (field: keyof MasterSettings, newList: any[]) => {
    if (!settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, { [field]: newList }, { merge: true });
  };
  
  const addItem = (list: {id:string, name: string}[], name: string, field: keyof MasterSettings) => {
      if(!list.find(i => i.name === name)) {
          const newItem = { id: `item-${Date.now()}`, name };
          updateSettingList(field, [...list, newItem]);
      }
  }

  const removeItem = (list: {id:string}[], id: string, field: keyof MasterSettings) => {
      updateSettingList(field, list.filter(item => item.id !== id));
  }
  
  const addProduct = (name: string) => addItem(products, name, 'products');
  const removeProduct = (id: string) => removeItem(products, id, 'products');
  
  const addCaliber = (caliber: {name: string, code: string}) => {
      if(!calibers.find(c => c.name === caliber.name)) {
          const newCaliber = { ...caliber, id: `cal-${Date.now()}`};
          updateSettingList('calibers', [...calibers, newCaliber]);
      }
  }
  const removeCaliber = (id: string) => removeItem(calibers, id, 'calibers');

  const addWarehouse = (name: string) => addItem(warehouses, name, 'warehouses');
  const removeWarehouse = (id: string) => removeItem(warehouses, id, 'warehouses');
  
  const addPackagingType = (name: string) => addItem(packagingTypes, name, 'packagingTypes');
  const removePackagingType = (id: string) => removeItem(packagingTypes, id, 'packagingTypes');
  
  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'bankAccounts'), account);
  };
  
  const removeBankAccount = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'bankAccounts', id));
  };
  
  const updateProductCalibers = (productId: string, caliberIds: string[]) => {
    if(!settingsDocRef) return;
    const newAssociations = [...productCaliberAssociations];
    const existingIndex = newAssociations.findIndex(a => a.id === productId);

    if (existingIndex > -1) {
      newAssociations[existingIndex].calibers = caliberIds;
    } else {
      newAssociations.push({ id: productId, calibers: caliberIds });
    }
    updateSettingList('productCaliberAssociations', newAssociations);
  };

  const value = {
    products, calibers, warehouses, units, packagingTypes, internalConcepts, costCenters, productCaliberAssociations,
    bankAccounts: bankAccounts || [],
    contacts: contacts || [],
    inventory: inventory || [],
    isLoading,
    addProduct, removeProduct,
    addCaliber, removeCaliber,
    addWarehouse, removeWarehouse,
    addPackagingType, removePackagingType,
    addBankAccount, removeBankAccount,
    updateProductCalibers,
  };

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

// --- HOOK ---
export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};
