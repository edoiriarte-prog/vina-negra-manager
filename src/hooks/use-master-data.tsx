
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFirebase } from '@/firebase';
import { 
  doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// --- TIPOS ---
export type BankAccount = {
  id: string; name: string; bankName: string; accountNumber: string;
  accountType: string; initialBalance: number; status: 'Activa' | 'Inactiva';
  owner?: string; ownerRUT?: string; ownerEmail?: string;
  // Legacy
  bank?: string; type?: string; currency?: string;
};

export type Caliber = {
  name: string;
  code: string;
};

export type ProductCaliberAssociation = {
  id: string; // Corresponde al nombre/ID del producto
  calibers: string[]; // Array de NOMBRES de calibres
};

type MasterDataDoc = {
  products: string[]; 
  warehouses: string[];
  packagingTypes: string[];
  bankAccounts: BankAccount[];
  productCaliberAssociations: ProductCaliberAssociation[]; // Nuevo nombre consistente
  calibers: Caliber[];
};

export type MasterDataContextType = {
  products: string[];
  warehouses: string[];
  packagingTypes: string[];
  calibers: Caliber[];
  bankAccounts: BankAccount[];
  productCaliberAssociations: ProductCaliberAssociation[];
  isLoading: boolean;
  addProduct: (name: string) => void;
  removeProduct: (name: string) => void;
  addWarehouse: (name: string) => void;
  removeWarehouse: (name: string) => void;
  addPackagingType: (name: string) => void;
  removePackagingType: (name: string) => void;
  addCaliber: (caliber: Caliber) => void;
  removeCaliber: (name: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  
  const [products, setProducts] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<string[]>([]);
  const [calibers, setCalibers] = useState<Caliber[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [productCaliberAssociations, setProductCaliberAssociations] = useState<ProductCaliberAssociation[]>([]);

  const docRef = firestore ? doc(firestore, 'settings', 'master_data') : null;

  useEffect(() => {
    if (!docRef) {
      setIsLoading(false);
      return;
    }
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
        // Si el documento no existe, lo creamos vacío
        setDoc(docRef, { 
            products: [], warehouses: [], packagingTypes: [], calibers: [], 
            bankAccounts: [], productCaliberAssociations: [] 
        });
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error al cargar Master Data:", error);
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Error de Conexión', description: 'No se pudo cargar la configuración maestra.' });
    });
    return () => unsubscribe();
  }, [docRef, toast]);


  // --- ACCIONES CRUD ---

  const addToArray = (field: keyof MasterDataDoc, value: any) => {
    if (docRef) updateDoc(docRef, { [field]: arrayUnion(value) });
  };

  const removeFromArray = (field: keyof MasterDataDoc, value: any) => {
    if (docRef) updateDoc(docRef, { [field]: arrayRemove(value) });
  };
  
  const addProduct = (name: string) => {
    if(products.includes(name)) return;
    const upperName = name.toUpperCase();
    addToArray('products', upperName);
    // Al agregar un producto, creamos su asociación de calibres vacía
    const newAssoc = { id: upperName, calibers: [] };
    addToArray('productCaliberAssociations', newAssoc);
  };
  
  const removeProduct = async (name: string) => {
    if(!docRef) return;
    // También eliminamos su asociación
    const assocToRemove = productCaliberAssociations.find(a => a.id === name);
    await updateDoc(docRef, {
        products: arrayRemove(name),
        ...(assocToRemove && { productCaliberAssociations: arrayRemove(assocToRemove) })
    });
  };

  const updateProductCalibers = async (productId: string, newCaliberNames: string[]) => {
      if (!docRef) return;
      const allAssociations = [...productCaliberAssociations];
      const index = allAssociations.findIndex(a => a.id === productId);

      if (index > -1) {
          allAssociations[index].calibers = newCaliberNames;
      } else {
          allAssociations.push({ id: productId, calibers: newCaliberNames });
      }
      await updateDoc(docRef, { productCaliberAssociations: allAssociations });
  };

  const getCalibersForProduct = (productId: string) => {
      return productCaliberAssociations.find(a => a.id === productId)?.calibers || [];
  };

  const addCaliber = (caliber: Caliber) => {
    if(calibers.some(c => c.name === caliber.name || c.code === caliber.code)) return;
    addToArray('calibers', caliber);
  };

  const removeCaliber = async (name: string) => {
    const caliberToRemove = calibers.find(c => c.name === name);
    if (caliberToRemove) removeFromArray('calibers', caliberToRemove);
  };
  
  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
      const newAccount: BankAccount = { ...account, id: `BA-${Date.now()}` };
      addToArray('bankAccounts', newAccount);
  };
  
  const removeBankAccount = async (id: string) => {
      const accountToRemove = bankAccounts.find(a => a.id === id);
      if(accountToRemove) removeFromArray('bankAccounts', accountToRemove);
  };

  const value: MasterDataContextType = {
    products, addProduct, removeProduct,
    warehouses, addWarehouse: (w) => addToArray('warehouses', w), removeWarehouse: (w) => removeFromArray('warehouses', w),
    packagingTypes, addPackagingType: (p) => addToArray('packagingTypes', p), removePackagingType: (p) => removeFromArray('packagingTypes', p),
    calibers, addCaliber, removeCaliber,
    bankAccounts, addBankAccount, removeBankAccount,
    productCaliberAssociations, updateProductCalibers, getCalibersForProduct,
    isLoading
  };
  
  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

// --- HOOK ---
export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
