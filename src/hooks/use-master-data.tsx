
"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, writeBatch, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { Contact, BankAccount, ProductCaliberAssociation, Caliber } from '@/lib/types';
import { useToast } from './use-toast';

export type MasterDataContextType = {
  products: string[];
  calibers: Caliber[];
  warehouses: string[];
  packagingTypes: string[];
  costCenters: { name: string }[];
  contacts: Contact[];
  bankAccounts: BankAccount[];
  productCaliberAssociations: ProductCaliberAssociation[];
  inventory: any[]; // Consider creating a specific type for inventory items
  isLoading: boolean;
  addProduct: (productName: string) => void;
  removeProduct: (productName: string) => void;
  addCaliber: (caliber: Omit<Caliber, 'id'>) => void;
  removeCaliber: (caliberName: string) => void;
  addWarehouse: (warehouseName: string) => void;
  removeWarehouse: (warehouseName: string) => void;
  addPackagingType: (typeName: string) => void;
  removePackagingType: (typeName: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  removeBankAccount: (accountId: string) => void;
  updateProductCalibers: (productId: string, calibers: string[]) => void;
  getCalibersForProduct: (productId: string) => Caliber[];
};

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const [products, setProducts] = useState<string[]>([]);
  const [calibers, setCalibers] = useState<Caliber[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<string[]>([]);
  const [costCenters, setCostCenters] = useState<{ name: string }[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [productCaliberAssociations, setProductCaliberAssociations] = useState<ProductCaliberAssociation[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  const [loadingStates, setLoadingStates] = useState({
    general: true,
    contacts: true,
    bankAccounts: true,
    associations: true,
    inventory: true,
  });

  const isLoading = Object.values(loadingStates).some(state => state);

  // Listener para datos maestros generales
  useEffect(() => {
    if (!db) {
      setLoadingStates(prev => ({ ...prev, general: false }));
      return;
    }
    const unsub = onSnapshot(doc(db, 'settings', 'master_data'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProducts(data.products || []);
        setCalibers(data.calibers || []);
        setWarehouses(data.warehouses || []);
        setPackagingTypes(data.packagingTypes || []);
        setCostCenters(data.costCenters || []);
      }
      setLoadingStates(prev => ({ ...prev, general: false }));
    }, (error) => {
      console.error("Error fetching general master data:", error);
      setLoadingStates(prev => ({ ...prev, general: false }));
    });
    return () => unsub();
  }, []);
  
  // Listener para contactos
  useEffect(() => {
    if (!db) {
      setLoadingStates(prev => ({ ...prev, contacts: false }));
      return;
    }
    const unsub = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setContacts(contactsData);
      setLoadingStates(prev => ({ ...prev, contacts: false }));
    }, (error) => {
      console.error("Error fetching contacts:", error);
      setLoadingStates(prev => ({ ...prev, contacts: false }));
    });
    return () => unsub();
  }, []);

  // Listener para cuentas bancarias
  useEffect(() => {
    if (!db) {
      setLoadingStates(prev => ({ ...prev, bankAccounts: false }));
      return;
    }
    const unsub = onSnapshot(collection(db, 'bankAccounts'), (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount));
      setBankAccounts(accountsData);
      setLoadingStates(prev => ({ ...prev, bankAccounts: false }));
    }, (error) => {
      console.error("Error fetching bank accounts:", error);
      setLoadingStates(prev => ({ ...prev, bankAccounts: false }));
    });
    return () => unsub();
  }, []);

  // Listener para asociaciones
  useEffect(() => {
    if (!db) {
      setLoadingStates(prev => ({ ...prev, associations: false }));
      return;
    }
    const unsub = onSnapshot(collection(db, 'productCaliberAssociations'), (snapshot) => {
        const associationsData = snapshot.docs.map(doc => ({ id: doc.id, calibers: doc.data().calibers || [] }));
        setProductCaliberAssociations(associationsData);
        setLoadingStates(prev => ({ ...prev, associations: false }));
    }, (error) => {
        console.error("Error fetching product-caliber associations:", error);
        setLoadingStates(prev => ({ ...prev, associations: false }));
    });
    return () => unsub();
  }, []);
  
  // Listener para inventario
  useEffect(() => {
    if (!db) {
        setLoadingStates(prev => ({...prev, inventory: false}));
        return;
    }
    const unsub = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(inventoryData);
      setLoadingStates(prev => ({...prev, inventory: false}));
    }, (error) => {
      console.error("Error fetching inventory:", error);
      setLoadingStates(prev => ({...prev, inventory: false}));
    });
    return () => unsub();
  }, []);

  // --- Funciones CRUD ---
  const masterDocRef = db ? doc(db, 'settings', 'master_data') : null;

  const updateMasterArray = async (field: string, value: any, action: 'add' | 'remove') => {
    if (!masterDocRef) return;
    try {
      await updateDoc(masterDocRef, {
        [field]: action === 'add' ? arrayUnion(value) : arrayRemove(value)
      });
      toast({ title: "Actualización Exitosa", description: `Se ha ${action === 'add' ? 'agregado' : 'eliminado'} el ítem.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la lista maestra." });
    }
  };

  const addProduct = (productName: string) => updateMasterArray('products', productName, 'add');
  const removeProduct = (productName: string) => updateMasterArray('products', productName, 'remove');
  
  const addCaliber = async (caliber: Omit<Caliber, 'id'>) => {
      // Since calibers are now complex objects, we handle them carefully.
      // We read the existing array, add the new one, and write back.
      if (!masterDocRef) return;
      const currentCalibers = calibers || [];
      const newCalibers = [...currentCalibers, caliber];
      try {
        await updateDoc(masterDocRef, { calibers: newCalibers });
        toast({ title: "Calibre Agregado" });
      } catch(e) { console.error(e); }
  };
  
  const removeCaliber = async (caliberName: string) => {
       if (!masterDocRef) return;
       const newCalibers = (calibers || []).filter(c => c.name !== caliberName);
       try {
        await updateDoc(masterDocRef, { calibers: newCalibers });
        toast({ variant: 'destructive', title: "Calibre Eliminado" });
      } catch(e) { console.error(e); }
  };

  const addWarehouse = (warehouseName: string) => updateMasterArray('warehouses', warehouseName, 'add');
  const removeWarehouse = (warehouseName: string) => updateMasterArray('warehouses', warehouseName, 'remove');
  
  const addPackagingType = (typeName: string) => updateMasterArray('packagingTypes', typeName, 'add');
  const removePackagingType = (typeName: string) => updateMasterArray('packagingTypes', typeName, 'remove');
  
  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
      if (!db) return;
      await addDoc(collection(db, 'bankAccounts'), account);
  };

  const removeBankAccount = async (accountId: string) => {
      if (!db) return;
      await deleteDoc(doc(db, 'bankAccounts', accountId));
  };
  
  const updateProductCalibers = async (productId: string, newCalibers: string[]) => {
      if(!db) return;
      const docRef = doc(db, "productCaliberAssociations", productId);
      try {
        // Usamos setDoc con merge:true. Crea el doc si no existe, o lo actualiza si existe.
        await updateDoc(docRef, { calibers: newCalibers });
      } catch (e) {
          // Si updateDoc falla porque el doc no existe, lo creamos con setDoc.
          if ((e as any).code === 'not-found') {
              await setDoc(docRef, { calibers: newCalibers });
          } else {
              console.error("Error al asociar calibres:", e);
              toast({ variant: 'destructive', title: "Error de Asociación", description: "No se pudieron guardar los cambios."});
          }
      }
  };

  const getCalibersForProduct = (productId: string): Caliber[] => {
      const association = productCaliberAssociations.find(a => a.id === productId);
      if (!association) return [];
      return calibers.filter(c => association.calibers.includes(c.name));
  };

  const value = {
    products, calibers, warehouses, packagingTypes, costCenters, contacts, bankAccounts, productCaliberAssociations, inventory,
    isLoading,
    addProduct, removeProduct, addCaliber, removeCaliber, addWarehouse, removeWarehouse,
    addPackagingType, removePackagingType, addBankAccount, removeBankAccount,
    updateProductCalibers, getCalibersForProduct
  };

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
