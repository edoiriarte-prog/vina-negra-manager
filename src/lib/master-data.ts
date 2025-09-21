

export const initialProducts = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS", "Cereza"];
export const initialCalibers = ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES", "Large", "Jumbo", "XJ", "G"];
export const initialUnits = ["Kilos", "Cajas"];
export const initialPackagingTypes = ["CAJAS", "BINS", "PALLETS", "SACOS"];

export type ProductMatrix = {
    [product: string]: string[];
}

// Defines which calibers are available for each product in the matrix entry.
export const productCaliberMatrix: ProductMatrix = {
    "PALTAS": ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA"],
    "UVAS": ["PRIMERA", "SEGUNDA", "DESCARTES"],
    "DURAZNOS": ["EXTRA", "PRIMERA", "SEGUNDA"],
    "CLEMENTINAS": ["PRIMERA", "SEGUNDA"],
    "MANDARINAS": ["PRIMERA", "SEGUNDA"],
    "Cereza": ["Large", "Jumbo", "XJ", "G"]
};
