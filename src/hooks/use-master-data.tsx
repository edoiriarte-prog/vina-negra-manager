"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase'; // Importar la función de escritura
import { 
  doc, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// --- DEFINICIÓN DE TIPOS LOCALES (Para evitar errores de importación) ---
export type BankAccount = {
  id: string; 
  name: string; 
  bankName: string; 
  accountNumber: string;
  accountType: string; 
  initialBalance: number; 
  status: 'Activa' | 'Inactiva';
  // Campos opcionales para compatibilidad
  bank?: string; 
  type?: string; 
  currency?: 'CLP' | 'USD';
};

export type Caliber = {
  name: string;
  code: string;
};

export type ProductCaliberAssociation = {
  id: string; 
  calibers: string[]; 
};

type MasterDataDoc = {
  products: string[]; 
  warehouses: string[];
  packagingTypes: string[];
  bankAccounts: BankAccount[];
  productCaliberAssociations: ProductCaliberAssociation[];
  calibers: Caliber[];
};

export type MasterDataContextType = {
  products: string[];
  warehouses: string[];
  packagingTypes: string[];
  calibers: Caliber[];
  bankAccounts: BankAccount[];
  productCaliberAssociations: ProductCaliberAssociation[];
  contacts: any[]; // Recuperado para ventas
  isLoading: boolean;
  
  addProduct: (name: string) => void;
  removeProduct: (name: string) => void;
  addWarehouse: (name: string) => void;
  removeWarehouse: (name: string) => void;
  addPackagingType: (name: string) => void;
  removePackagingType: (name: string) => void;
  addCaliber: (caliber: Caliber) => void;
  removeCaliber: (name: string) => void;
  addBankAccount: (account: BankAccount) => void; // Acepta el objeto completo con ID
  removeBankAccount: (id: string) => void;
  updateProductCalibers: (productId: string, calibers: string[]) => void;
  getCalibersForProduct: (productId: string) => string[];
};

// --- CONTEXTO ---
export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// --- PROVIDER ---
export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [loadingStates, setLoadingStates] = useState({
      master: true,
      contacts: true,
  });
  const isLoading = Object.values(loadingStates).some(s => s);
  
  const [products, setProducts] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<string[]>([]);
  const [calibers, setCalibers] = useState<Caliber[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [productCaliberAssociations, setProductCaliberAssociations] = useState<ProductCaliberAssociation[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const docRef = firestore ? doc(firestore, 'settings', 'master_data') : null;

  // 1. Cargar Configuración Maestra
  useEffect(() => {
    if (!docRef) { setLoadingStates(p => ({ ...p, master: false })); return; }
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MasterDataDoc;
        setProducts(data.products || []);
        setWarehouses(data.warehouses || []);
        setPackagingTypes(data.packagingTypes || []);
        setCalibers(data.calibers || []);
        setBankAccounts(data.bankAccounts || []);
        setProductCaliberAssociations(data.productCaliberAssociations || []);
      } else {
        // Si no existe, lo creamos con valores por defecto
        const initialData = { 
            products: [], warehouses: [], packagingTypes: [], calibers: [], 
            bankAccounts: [], productCaliberAssociations: [] 
        };
        setDocumentNonBlocking(docRef, initialData, { merge: false });
      }
      setLoadingStates(p => ({ ...p, master: false }));
    }, (err) => {
      console.error("Error al cargar master_data:", err);
      setLoadingStates(p => ({ ...p, master: false }));
    });
    return () => unsubscribe();
  }, [docRef]);

  // 2. Cargar Contactos
  useEffect(() => {
    if (!firestore) { setLoadingStates(p => ({ ...p, contacts: false })); return; }
    const contactsRef = collection(firestore, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setContacts(list);
        setLoadingStates(p => ({ ...p, contacts: false }));
    }, (err) => {
      console.error("Error al cargar contacts:", err);
      setLoadingStates(p => ({ ...p, contacts: false }));
    });
    return () => unsubscribe();
  }, [firestore]);

  // --- ACCIONES ---
  const updateField = (field: keyof MasterDataDoc, value: any) => {
    if (docRef) {
      updateDoc(docRef, { [field]: value }).catch(e => console.error(`Error updating ${field}`, e));
    }
  };

  const addToArray = (field: keyof MasterDataDoc, value: any) => {
    if (docRef) updateDoc(docRef, { [field]: arrayUnion(value) });
  };
  const removeFromArray = (field: keyof MasterDataDoc, value: any) => {
    if (docRef) updateDoc(docRef, { [field]: arrayRemove(value) });
  };
  
  const addProduct = (name: string) => {
    const upperName = name.trim().toUpperCase();
    if(products.includes(upperName)) return;
    addToArray('products', upperName);
    addToArray('productCaliberAssociations', { id: upperName, calibers: [] });
  };
  
  const removeProduct = (name: string) => {
    const newAssoc = productCaliberAssociations.filter(a => a.id !== name);
    updateField('products', arrayRemove(name));
    updateField('productCaliberAssociations', newAssoc);
  };

  const updateProductCalibers = (productId: string, newCaliberNames: string[]) => {
      if (!docRef) return;
      const allAssociations = [...productCaliberAssociations];
      const index = allAssociations.findIndex(a => a.id === productId);
      if (index > -1) {
          allAssociations[index].calibers = newCaliberNames;
      } else {
          allAssociations.push({ id: productId, calibers: newCaliberNames });
      }
      updateField('productCaliberAssociations', allAssociations);
  };

  const getCalibersForProduct = (productId: string) => {
      return productCaliberAssociations.find(a => a.id === productId)?.calibers || [];
  };

  const addCaliber = (caliber: Caliber) => {
    if(calibers.some(c => c.name.toUpperCase() === caliber.name.trim().toUpperCase())) return;
    addToArray('calibers', { ...caliber, name: caliber.name.trim().toUpperCase() });
  };
  
  const removeCaliber = (name: string) => {
    const caliberToRemove = calibers.find(c => c.name === name);
    if (caliberToRemove) removeFromArray('calibers', caliberToRemove);
  };
  
  const addBankAccount = (account: BankAccount) => {
      // Ahora acepta el objeto completo, incluido el ID predefinido
      if(bankAccounts.some(b => b.id === account.id)) return;
      addToArray('bankAccounts', account);
  };
  
  const removeBankAccount = (id: string) => {
      const acc = bankAccounts.find(a => a.id === id);
      if(acc) removeFromArray('bankAccounts', acc);
  };

  const value: MasterDataContextType = {
    products, addProduct, removeProduct,
    warehouses, addWarehouse: (w) => addToArray('warehouses', w), removeWarehouse: (w) => removeFromArray('warehouses', w),
    packagingTypes, addPackagingType: (p) => addToArray('packagingTypes', p), removePackagingType: (p) => removeFromArray('packagingTypes', p),
    calibers, addCaliber, removeCaliber,
    bankAccounts, addBankAccount, removeBankAccount,
    productCaliberAssociations, updateProductCalibers, getCalibersForProduct,
    contacts, 
    isLoading
  };
  
  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
