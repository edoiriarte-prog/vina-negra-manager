

export const initialProducts = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS"];
export const initialCalibers = ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"];
export const initialUnits = ["Kilos", "Cajas"];
export const initialPackagingTypes = ["CAJAS", "BINS", "PALLETS", "SACOS"];
export const initialWarehouses = ["Bodega Principal", "Cámara de Frío 1", "Campo A"];
export const initialBankAccounts = [
    {
        id: 'acc-1',
        name: 'Cuenta Corriente Banco Estado',
        accountType: 'Cuenta Corriente' as const,
        accountNumber: '123456789',
        bankName: 'Banco Estado',
        initialBalance: 15000000,
        status: 'Activa' as const,
        owner: 'Viña Negra SpA',
    },
    {
        id: 'acc-2',
        name: 'Caja Chica Oficina',
        accountType: 'Efectivo' as const,
        initialBalance: 500000,
        status: 'Activa' as const,
        owner: 'Viña Negra SpA',
    }
];


export type ProductMatrix = {
    [product: string]: string[];
}

// Defines which calibers are available for each product in the matrix entry.
export const productCaliberMatrix: ProductMatrix = {
    "PALTAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "UVAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "DURAZNOS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "CLEMENTINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"],
    "MANDARINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLadas"],
};

