
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from './use-local-storage';
import { BankAccount, Contact, InventoryItem, PurchaseOrder, SalesOrder, InventoryAdjustment } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

// --- TYPES ---
export type ProductCaliberAssociation = {
    id: string; 
    calibers: string[];
};

type MasterDataContextType = {
    products: string[];
    addProduct: (p: string) => void;
    removeProduct: (p: string) => void;
    calibers: { name: string; code: string }[];
    addCaliber: (c: { name: string; code: string }) => void;
    removeCaliber: (name: string) => void;
    warehouses: { id: string; name: string }[];
    addWarehouse: (w: string) => void;
    removeWarehouse: (id: string) => void;
    units: string[];
    addUnit: (u: string) => void;
    removeUnit: (u: string) => void;
    packagingTypes: { id: string; name: string }[];
    addPackagingType: (p: string) => void;
    removePackagingType: (id: string) => void;
    productCaliberAssociations: ProductCaliberAssociation[];
    updateProductCalibers: (productName: string, caliberNames: string[]) => void;
    bankAccounts: BankAccount[];
    addBankAccount: (account: BankAccount) => void;
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

    // --- DATA FETCHING (Sin cambios aquí) ---
    const [products, setProducts] = useLocalStorage<string[]>('products', ['PALTA HASS', 'LIMÓN', 'NUEZ']);
    const [calibers, setCalibers] = useLocalStorage<{ name: string; code: string }[]>('calibers', [
        { name: 'PAL_EXTRA', code: '50' }, { name: 'PAL_PRIMERA', code: '60' },
    ]);
    const [units, setUnits] = useLocalStorage<string[]>('units', ['Kilos', 'Cajas']);
    const [productCaliberAssociations, setProductCaliberAssociations] = useLocalStorage<ProductCaliberAssociation[]>('productCaliberAssociations', []);

    // Warehouses from Firestore
    const warehousesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'warehouses') : null, [firestore]);
    const { data: warehousesData, isLoading: l1 } = useCollection<{name: string}>(warehousesCollection);
    const warehouses = warehousesData || [];

    // Packaging Types from Firestore
    const packagingTypesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'packagingTypes') : null, [firestore]);
    const { data: packagingTypesData, isLoading: l8 } = useCollection<{name: string}>(packagingTypesCollection);
    const packagingTypes = packagingTypesData || [];

    // Bank Accounts from Firestore
    const accountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
    const { data: bankAccountsData, isLoading: l2 } = useCollection<BankAccount>(accountsCollection);
    const bankAccounts = bankAccountsData || [];

    // Contacts from Firestore
    const contactsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
    const { data: contactsData, isLoading: l3 } = useCollection<Contact>(contactsCollection);
    const contacts = contactsData || [];

    // Inventory Items from Firestore
    const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
    const { data: inventoryData, isLoading: l4 } = useCollection<InventoryItem>(inventoryCollection);
    const inventory = inventoryData || [];
    
    // Orders
    const purchaseOrdersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
    const { data: purchaseOrdersData, isLoading: l5 } = useCollection<PurchaseOrder>(purchaseOrdersCollection);
    const purchaseOrders = purchaseOrdersData || [];
    
    const salesOrdersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
    const { data: salesOrdersData, isLoading: l6 } = useCollection<SalesOrder>(salesOrdersCollection);
    const salesOrders = salesOrdersData || [];

    const inventoryAdjustmentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventoryAdjustments') : null, [firestore]);
    const { data: inventoryAdjustmentsData, isLoading: l7 } = useCollection<InventoryAdjustment>(inventoryAdjustmentsCollection);
    const inventoryAdjustments = inventoryAdjustmentsData || [];


    const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

    // --- CRUD FUNCTIONS (Sin cambios aquí) ---
    const addProduct = (p: string) => !products.includes(p) && setProducts([...products, p]);
    const removeProduct = (p: string) => setProducts(products.filter(item => item !== p));

    const addCaliber = (c: { name: string; code: string }) => !calibers.some(cal => cal.name === c.name) && setCalibers([...calibers, c]);
    const removeCaliber = (name: string) => setCalibers(calibers.filter(item => item.name !== name));
    
    const addWarehouse = (name: string) => {
        if (firestore && name && !warehouses.some(w => w.name === name)) {
            addDocumentNonBlocking(collection(firestore, 'warehouses'), { name });
        }
    };
    const removeWarehouse = (id: string) => {
        if (firestore) {
            deleteDocumentNonBlocking(doc(firestore, 'warehouses', id));
        }
    };

    const addPackagingType = (name: string) => {
        if (firestore && name && !packagingTypes.some(p => p.name === name)) {
            addDocumentNonBlocking(collection(firestore, 'packagingTypes'), { name });
        }
    };
    const removePackagingType = (id: string) => {
        if (firestore) {
            deleteDocumentNonBlocking(doc(firestore, 'packagingTypes', id));
        }
    };

    const addUnit = (u: string) => !units.includes(u) && setUnits([...units, u]);
    const removeUnit = (u: string) => setUnits(units.filter(item => item !== u));

    const updateProductCalibers = (productName: string, caliberNames: string[]) => {
        const index = productCaliberAssociations.findIndex(a => a.id === productName);
        let newAssociations = [...productCaliberAssociations];
        if (index >= 0) newAssociations[index] = { id: productName, calibers: caliberNames };
        else newAssociations.push({ id: productName, calibers: caliberNames });
        setProductCaliberAssociations(newAssociations);
    };

    const addBankAccount = (account: BankAccount) => { /* Firestore logic needed */ };
    const updateBankAccount = (account: BankAccount) => { /* Firestore logic needed */ };
    const removeBankAccount = (id: string) => { /* Firestore logic needed */ };

    const internalConcepts = [
        { name: 'Retiro de Socios' }, { name: 'Pago de Impuestos' }, { name: 'Comisión Bancaria' },
        { name: 'Préstamo Interno' }, { name: 'Gastos Generales' }, { name: 'Mantención' }, 
        { name: 'Combustible' }, { name: 'Remuneraciones' }, { name: 'Leyes Sociales' }
    ];
    
    const costCenters = [
        { name: 'Administración' }, { name: 'Campo' }, { name: 'Packing' }, { name: 'Comercial' }, { name: 'Logística' }
    ];
    
    // --- VALUE PARA EL PROVIDER ---
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

    
    