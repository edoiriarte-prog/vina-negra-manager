"use client";

import { useLocalStorage } from './use-local-storage';
import { initialProducts, initialCalibers, initialUnits, initialPackagingTypes } from '@/lib/master-data';

export function useMasterData() {
  const [products, setProducts] = useLocalStorage<string[]>('master-products', initialProducts);
  const [calibers, setCalibers] = useLocalStorage<string[]>('master-calibers', initialCalibers);
  const [units, setUnits] = useLocalStorage<string[]>('master-units', initialUnits);
  const [packagingTypes, setPackagingTypes] = useLocalStorage<string[]>('master-packaging-types', initialPackagingTypes);

  return {
    products,
    setProducts,
    calibers,
    setCalibers,
    units,
    setUnits,
    packagingTypes,
    setPackagingTypes,
  };
}
