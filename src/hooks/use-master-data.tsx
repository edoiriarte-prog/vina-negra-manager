

"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from './use-local-storage';
import { BankAccount, Contact, InventoryItem, PurchaseOrder, SalesOrder, InventoryAdjustment } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { getInventory } from '@/lib/inventory'; // Make sure to have this helper

// --- TYPES ---
export type ProductCaliberAssociation = {
    id: string; 
    calibers: string[];
};

type MasterDataContextType = {
    products: { id: string; name: string }[];
    addProduct: (p: string) => void;
    removeProduct: (id: string) => void;
    calibers: { id: string; name: string; code: string }[];
    addCaliber: (c: { name: string; code: string }) => void;
    removeCaliber: (id: string) => void;
    warehouses: { id: string; name: string }[];
    addWarehouse: (w: string) => void;
    removeWarehouse: (id: string) => void;
    units: { id: string; name: string }[];
    addUnit: (u: string) => void;
    removeUnit: (id: string) => void;
    packagingTypes: { id: string; name: string }[];
    addPackagingType: (p: string) => void;
    removePackagingType: (id: string) => void;
    productCaliberAssociations: ProductCaliberAssociation[];
    updateProductCalibers: (productName: string, caliberNames: string[]) => void;
    bankAccounts: BankAccount[];
    addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
    updateBankAccount: (account: BankAccount) => void;
    removeBankAccount: (id: string) => void;
    contacts: Contact[];
    inventory: InventoryItem[];
    purchaseOrders: PurchaseOrder[];
    salesOrders: SalesOrder[];
    inventoryAdjustments: InventoryAdjustment[];
    internalConcepts: { name: string }[];
    costCenters: { name: string }[];
    isLoading: boolean;
};

// --- CONTEXT ---
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export function MasterDataProvider({ children }: { children: ReactNode }) {
    const { firestore } = useFirebase();

    // --- DATA FETCHING ---
    const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
    const { data: productsData, isLoading: l1 } = useCollection<{name: string}>(productsCollection);
    const products = productsData || [];
    
    const calibersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'calibers') : null, [firestore]);
    const { data: calibersData, isLoading: l2 } = useCollection<{name: string, code: string}>(calibersCollection);
    const calibers = calibersData || [];
    
    const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: unitsData, isLoading: l3 } = useCollection<{name: string}>(unitsCollection);
    const units = unitsData || [];

    const assocCollection = useMemoFirebase(() => firestore ? collection(firestore, 'productCaliberAssociations') : null, [firestore]);
    const { data: assocData, isLoading: l4 } = useCollection<ProductCaliberAssociation>(assocCollection);
    const productCaliberAssociations = assocData || [];
    
    const warehousesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'warehouses') : null, [firestore]);
    const { data: warehousesData, isLoading: l5 } = useCollection<{name: string}>(warehousesCollection);
    const warehouses = warehousesData || [];

    const packagingTypesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'packagingTypes') : null, [firestore]);
    const { data: packagingTypesData, isLoading: l6 } = useCollection<{name: string}>(packagingTypesCollection);
    const packagingTypes = packagingTypesData || [];

    const accountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
    const { data: bankAccountsData, isLoading: l7 } = useCollection<BankAccount>(accountsCollection);
    const bankAccounts = bankAccountsData || [];

    const contactsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
    const { data: contactsData, isLoading: l8 } = useCollection<Contact>(contactsCollection);
    const contacts = contactsData || [];
    
    const purchaseOrdersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
    const { data: purchaseOrdersData, isLoading: l10 } = useCollection<PurchaseOrder>(purchaseOrdersCollection);
    const purchaseOrders = purchaseOrdersData || [];
    
    const salesOrdersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
    const { data: salesOrdersData, isLoading: l11 } = useCollection<SalesOrder>(salesOrdersCollection);
    const salesOrders = salesOrdersData || [];

    const inventoryAdjustmentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventoryAdjustments') : null, [firestore]);
    const { data: inventoryAdjustmentsData, isLoading: l12 } = useCollection<InventoryAdjustment>(inventoryAdjustmentsCollection);
    const inventoryAdjustments = inventoryAdjustmentsData || [];


    const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l10 || l11 || l12;
    
    const inventory = useMemo(() => {
        return getInventory(purchaseOrders, salesOrders, inventoryAdjustments);
    }, [purchaseOrders, salesOrders, inventoryAdjustments]);

    // --- CRUD FUNCTIONS ---
    const addProduct = (name: string) => { if (firestore && name) addDocumentNonBlocking(collection(firestore, 'products'), { name }); };
    const removeProduct = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'products', id)); };

    const addCaliber = (caliber: { name: string; code: string }) => { if (firestore && caliber.name) addDocumentNonBlocking(collection(firestore, 'calibers'), caliber); };
    const removeCaliber = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'calibers', id)); };
    
    const addUnit = (name: string) => { if (firestore && name) addDocumentNonBlocking(collection(firestore, 'units'), { name }); };
    const removeUnit = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'units', id)); };

    const addWarehouse = (name: string) => { if (firestore && name) addDocumentNonBlocking(collection(firestore, 'warehouses'), { name }); };
    const removeWarehouse = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'warehouses', id)); };

    const addPackagingType = (name: string) => { if (firestore && name) addDocumentNonBlocking(collection(firestore, 'packagingTypes'), { name }); };
    const removePackagingType = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'packagingTypes', id)); };

    const updateProductCalibers = (productName: string, caliberNames: string[]) => {
        if (!firestore) return;
        const assocRef = doc(firestore, 'productCaliberAssociations', productName);
        setDocumentNonBlocking(assocRef, { id: productName, calibers: caliberNames }, { merge: true });
    };

    const addBankAccount = (account: Omit<BankAccount, 'id'>) => { if (firestore) addDocumentNonBlocking(collection(firestore, 'bankAccounts'), account); };
    const updateBankAccount = (account: BankAccount) => { if (firestore) setDocumentNonBlocking(doc(firestore, 'bankAccounts', account.id), account, { merge: true }); };
    const removeBankAccount = (id: string) => { if (firestore) deleteDocumentNonBlocking(doc(firestore, 'bankAccounts', id)); };

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
        productCaliberAssociations, updateProductCalibers,
        inventory, contacts, bankAccounts, addBankAccount, updateBankAccount, removeBankAccount,
        purchaseOrders, salesOrders, inventoryAdjustments,
        internalConcepts, costCenters,
        isLoading
    };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
}

// --- CUSTOM HOOK ---
export function useMasterData() {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
}
