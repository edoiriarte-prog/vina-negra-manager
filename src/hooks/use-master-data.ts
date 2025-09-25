
"use client";

import { useLocalStorage } from './use-local-storage';
import { initialProducts, initialCalibers, initialUnits, initialPackagingTypes, initialWarehouses, initialBankAccounts } from '@/lib/master-data';
import { BankAccount } from '@/lib/types';

export function useMasterData() {
  const [products, setProducts] = useLocalStorage<string[]>('master-products', initialProducts);
  const [calibers, setCalibers] = useLocalStorage<string[]>('master-calibers', initialCalibers);
  const [units, setUnits] = useLocalStorage<string[]>('master-units', initialUnits);
  const [packagingTypes, setPackagingTypes] = useLocalStorage<string[]>('master-packaging-types', initialPackagingTypes);
  const [warehouses, setWarehouses] = useLocalStorage<string[]>('master-warehouses', initialWarehouses);
  const [bankAccounts, setBankAccounts] = useLocalStorage<BankAccount[]>('master-bank-accounts', initialBankAccounts);

  return {
    products,
    setProducts,
    calibers,
    setCalibers,
    units,
    setUnits,
    packagingTypes,
    setPackagingTypes,
    warehouses,
    setWarehouses,
    bankAccounts, 
    setBankAccounts,
  };
}
