

export const initialProducts = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS"];
export const initialCalibers = ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADAS"];
export const initialUnits = ["Kilos", "Cajas"];
export const initialPackagingTypes = ["CAJAS", "BINS", "PALLETS", "SACOS"];

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
