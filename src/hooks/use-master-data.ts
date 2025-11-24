"use client";

import { 
    useCollection, 
    useDoc, 
    useFirebase, 
    useMemoFirebase, 
    updateDocumentNonBlocking, 
    setDocumentNonBlocking, 
    addDocumentNonBlocking, 
    deleteDocumentNonBlocking 
} from '@/firebase';
import { BankAccount, Contact, InventoryItem } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';

export type ProductCaliberAssociation = {
    id: string; 
    calibers: string[];
};

// Estructura del documento único de configuración
type MasterSettings = {
    products: string[];
    calibers: { name: string; code: string }[];
    warehouses: string[];
    units: string[];
    packagingTypes: string[];
    productCaliberAssociations: ProductCaliberAssociation[];
};

export function useMasterData() {
    // Obtenemos la instancia de Firestore desde el contexto del framework
    const { firestore } = useFirebase();

    // 1. DOCUMENTO DE CONFIGURACIÓN GENERAL (Listas simples)
    const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'general') : null, [firestore]);
    const { data: settingsData, isLoading: l1 } = useDoc<MasterSettings>(settingsDocRef);

    // 2. COLECCIÓN DE CUENTAS BANCARIAS
    const accountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
    const { data: bankAccountsData, isLoading: l2 } = useCollection<BankAccount>(accountsCollection);

    // 3. COLECCIÓN DE CONTACTOS (Proveedores/Clientes)
    const contactsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
    const { data: contactsData, isLoading: l3 } = useCollection<Contact>(contactsCollection);

    // 4. COLECCIÓN DE INVENTARIO
    const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
    const { data: inventoryData, isLoading: l4 } = useCollection<InventoryItem>(inventoryCollection);


    // --- VALORES POR DEFECTO ---
    const products = settingsData?.products || [];
    const calibers = settingsData?.calibers || [];
    const warehouses = settingsData?.warehouses || [];
    const units = settingsData?.units || ['Kilos', 'Cajas']; 
    const packagingTypes = settingsData?.packagingTypes || [];
    const productCaliberAssociations = settingsData?.productCaliberAssociations || [];
    
    // Data collections
    const bankAccounts = bankAccountsData || [];
    const contacts = contactsData || []; 
    const inventory = inventoryData || []; 
    
    // El estado de carga global se calcula si alguna colección está cargando
    const isLoading = l1 || l2 || l3 || l4;

    // --- FUNCIÓN GENÉRICA PARA ACTUALIZAR ARRAYS ---
    const updateSettingList = (field: keyof MasterSettings, newList: any[]) => {
        if (!firestore || !settingsDocRef) return;
        setDocumentNonBlocking(settingsDocRef, { [field]: newList }, { merge: true });
    };

    // --- PRODUCTOS ---
    const addProduct = (p: string) => {
        if (products.includes(p)) return;
        updateSettingList('products', [...products, p]);
    };
    const removeProduct = (p: string) => updateSettingList('products', products.filter(item => item !== p));

    // --- CALIBRES ---
    const addCaliber = (c: { name: string; code: string }) => {
        if (calibers.find(cal => cal.name === c.name)) return;
        updateSettingList('calibers', [...calibers, c]);
    };
    const removeCaliber = (name: string) => updateSettingList('calibers', calibers.filter(item => item.name !== name));

    // --- BODEGAS ---
    const addWarehouse = (w: string) => {
        if (warehouses.includes(w)) return;
        updateSettingList('warehouses', [...warehouses, w]);
    };
    const removeWarehouse = (w: string) => updateSettingList('warehouses', warehouses.filter(item => item !== w));

    // --- UNIDADES ---
    const addUnit = (u: string) => {
        if (units.includes(u)) return;
        updateSettingList('units', [...units, u]);
    };
    const removeUnit = (u: string) => updateSettingList('units', units.filter(item => item !== u));

    // --- ENVASES ---
    const addPackagingType = (p: string) => {
        if (packagingTypes.includes(p)) return;
        updateSettingList('packagingTypes', [...packagingTypes, p]);
    };
    const removePackagingType = (p: string) => updateSettingList('packagingTypes', packagingTypes.filter(item => item !== p));

    // --- ASOCIACIONES ---
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

    // --- CUENTAS BANCARIAS ---
    const addBankAccount = (account: BankAccount) => {
        if (!firestore) return;
        if (account.id) {
            setDocumentNonBlocking(doc(firestore, 'bankAccounts', account.id), account, { merge: true });
        } else {
            addDocumentNonBlocking(collection(firestore, 'bankAccounts'), account);
        }
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

    return {
        // Listas de Configuración
        products, addProduct, removeProduct,
        calibers, addCaliber, removeCaliber,
        warehouses, addWarehouse, removeWarehouse,
        units, addUnit, removeUnit,
        packagingTypes, addPackagingType, removePackagingType,
        productCaliberAssociations, updateProductCalibers,
        
        // Colecciones Principales
        inventory, 
        contacts, // <--- ESTO REEMPLAZA A useContacts
        bankAccounts, addBankAccount, updateBankAccount, removeBankAccount,
        
        // Estáticos
        internalConcepts, costCenters,
        
        // Carga
        isLoading,
    };
}