"use client";

import { useState, useEffect } from 'react';
import { BankAccount } from '@/lib/types';

export type ProductCaliberAssociation = {
  id: string; 
  calibers: string[];
};

export function useMasterData() {
  // --- 1. PRODUCTOS ---
  const [products, setProducts] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('products');
        return saved ? JSON.parse(saved) : []; 
    }
    return [];
  });

  // --- 2. CALIBRES ---
  const [calibers, setCalibers] = useState<{ name: string; code: string }[]>(() => {
     if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('calibers');
        return saved ? JSON.parse(saved) : []; 
    }
    return [];
  });

  // --- 3. BODEGAS ---
  const [warehouses, setWarehouses] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('warehouses');
       return saved ? JSON.parse(saved) : ['Bodega Central', 'Patio 1']; 
   }
   return ['Bodega Central']; 
 });

  // --- 4. UNIDADES (Ahora editable) ---
  const [units, setUnits] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('units');
       return saved ? JSON.parse(saved) : ['Kilos', 'Cajas']; 
   }
   return ['Kilos', 'Cajas']; 
 });

  // --- 5. ENVASES (Ahora editable) ---
  const [packagingTypes, setPackagingTypes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('packagingTypes');
       return saved ? JSON.parse(saved) : ['TORITO PLASTICO 15K', 'CAJA PLASTICA 10K', 'BIN']; 
   }
   return ['TORITO PLASTICO 15K', 'CAJA PLASTICA 10K', 'BIN']; 
 });

  // --- 6. ASOCIACIONES ---
  const [productCaliberAssociations, setProductCaliberAssociations] = useState<ProductCaliberAssociation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productCaliberAssociations');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // --- 7. CUENTAS BANCARIAS ---
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bankAccounts');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // --- DATOS ESTÁTICOS DE REFERENCIA ---
  const internalConcepts = [
    { name: 'Retiro de Socios' }, { name: 'Pago de Impuestos' }, { name: 'Comisión Bancaria' },
    { name: 'Préstamo Interno' }, { name: 'Gastos Generales' }, { name: 'Mantención' }, 
    { name: 'Combustible' }, { name: 'Remuneraciones' }, { name: 'Leyes Sociales' }
  ];
  
  const costCenters = [
      { name: 'Administración' }, { name: 'Campo' }, { name: 'Packing' }, { name: 'Comercial' }, { name: 'Logística' }
  ];

  // --- PERSISTENCIA ---
  useEffect(() => { localStorage.setItem('products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('calibers', JSON.stringify(calibers)); }, [calibers]);
  useEffect(() => { localStorage.setItem('warehouses', JSON.stringify(warehouses)); }, [warehouses]);
  useEffect(() => { localStorage.setItem('units', JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem('packagingTypes', JSON.stringify(packagingTypes)); }, [packagingTypes]);
  useEffect(() => { localStorage.setItem('productCaliberAssociations', JSON.stringify(productCaliberAssociations)); }, [productCaliberAssociations]);
  useEffect(() => { localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts)); }, [bankAccounts]);

  // --- FUNCIONES ---
  const addProduct = (p: string) => setProducts([...products, p]);
  const removeProduct = (p: string) => setProducts(products.filter(item => item !== p));
  
  const addCaliber = (c: {name: string, code: string}) => setCalibers([...calibers, c]);
  const removeCaliber = (n: string) => setCalibers(calibers.filter(item => item.name !== n));

  const addWarehouse = (w: string) => setWarehouses([...warehouses, w]);
  const removeWarehouse = (w: string) => setWarehouses(warehouses.filter(item => item !== w));

  const addUnit = (u: string) => setUnits([...units, u]);
  const removeUnit = (u: string) => setUnits(units.filter(item => item !== u));

  const addPackagingType = (p: string) => setPackagingTypes([...packagingTypes, p]);
  const removePackagingType = (p: string) => setPackagingTypes(packagingTypes.filter(item => item !== p));

  const addBankAccount = (account: BankAccount) => setBankAccounts([...bankAccounts, account]);
  const updateBankAccount = (account: BankAccount) => setBankAccounts(bankAccounts.map(a => a.id === account.id ? account : a));
  const removeBankAccount = (id: string) => setBankAccounts(bankAccounts.filter(a => a.id !== id));

  const updateProductCalibers = (productName: string, caliberNames: string[]) => {
    setProductCaliberAssociations(prev => {
      const index = prev.findIndex(a => a.id === productName);
      let newAssociations = [...prev];
      if (index >= 0) {
        newAssociations[index] = { ...newAssociations[index], calibers: caliberNames };
      } else {
        newAssociations.push({ id: productName, calibers: caliberNames });
      }
      return newAssociations;
    });
  };

  return {
    products, addProduct, removeProduct,
    calibers, addCaliber, removeCaliber,
    warehouses, addWarehouse, removeWarehouse,
    units, addUnit, removeUnit,
    packagingTypes, addPackagingType, removePackagingType,
    bankAccounts, addBankAccount, updateBankAccount, removeBankAccount,
    productCaliberAssociations, updateProductCalibers,
    internalConcepts, costCenters
  };
}