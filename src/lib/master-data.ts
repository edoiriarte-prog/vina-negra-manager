


export const initialProducts = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS", "Cereza"];
export const initialCalibers = ["CUARTA", "QUINTA", "DESCARTES", "ETIOLADA", "EXTRA", "G", "Jumbo", "Large", "PRIMERA", "SEGUNDA", "TERCERA", "XJ"];
export const initialUnits = ["Kilos", "Cajas"];
export const initialPackagingTypes = ["CAJAS", "BINS", "PALLETS", "SACOS"];

export type ProductMatrix = {
    [product: string]: string[];
}

// Defines which calibers are available for each product in the matrix entry.
export const productCaliberMatrix: ProductMatrix = {
    "PALTAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADA"],
    "UVAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADA"],
    "DURAZNOS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADA"],
    "CLEMENTINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADA"],
    "MANDARINAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "ETIOLADA"],
    "Cereza": ["Large", "Jumbo", "XJ", "G"]
};

