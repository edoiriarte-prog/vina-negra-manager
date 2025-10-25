

import { BankAccount } from './types';

export const initialProducts = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS"];

// Updated to an array of objects to include code and name for proper sorting and display.
export const initialCalibers = [
    { code: "50", name: "EXTRA" },
    { code: "60", name: "PRIMERA" },
    { code: "70", name: "SEGUNDA" },
    { code: "84", name: "TERCERA" },
    { code: "96", name: "CUARTA" },
    { code: "111", name: "QUINTA" },
    { code: "ET", name: "ETIOLADAS" },
    { code: "DES", name: "DESCARTES" },
];

export const initialUnits = ["Kilos", "Cajas"];
export const initialPackagingTypes = ["CAJAS", "BINS", "PALLETS", "SACOS"];
export const initialWarehouses = ["Bodega Principal", "Cámara de Frío 1", "Campo A", "BODEGA CASA ACONCAGUA 80"];
export const initialBankAccounts: BankAccount[] = [
    {
        id: 'acc-1',
        name: 'Cuenta Corriente Banco Estado',
        accountType: 'Cuenta Corriente' as const,
        accountNumber: '123456789',
        bankName: 'Banco Estado',
        initialBalance: 15000000,
        status: 'Activa' as const,
        owner: 'Viña Negra SpA',
        ownerRUT: '78.261.683-8',
        ownerEmail: 'contacto@vinanegra.cl'
    },
    {
        id: 'acc-2',
        name: 'Caja Chica Oficina',
        accountType: 'Efectivo' as const,
        initialBalance: 500000,
        status: 'Activa' as const,
        owner: 'Viña Negra SpA',
        ownerRUT: '78.261.683-8',
        ownerEmail: 'contacto@vinanegra.cl'
    }
];


export type ProductMatrix = {
    [product: string]: string[];
}

// Defines which calibers are available for each product in the matrix entry.
// Note: This now uses just the name for matching. The full display name is constructed in components.
export const productCaliberMatrix: ProductMatrix = {
    "PALTAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "UVAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "DURAZNOS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "CLEMENTINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "MANDARINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
};







