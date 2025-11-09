'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { BankAccount } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';


export type CaliberMaster = {
  id: string;
  code: string;
  name: string;
}

export function useMasterData() {
  const { firestore } = useFirebase();

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: productsData } = useCollection<{name: string}>(productsQuery);

  const calibersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'calibers') : null, [firestore]);
  const { data: calibersData } = useCollection<CaliberMaster>(calibersQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: unitsData } = useCollection<{name: string}>(unitsQuery);

  const packagingTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'packagingTypes') : null, [firestore]);
  const { data: packagingTypesData } = useCollection<{name: string}>(packagingTypesQuery);

  const warehousesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'warehouses') : null, [firestore]);
  const { data: warehousesData } = useCollection<{name: string}>(warehousesQuery);
  
  const bankAccountsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
  const { data: bankAccounts } = useCollection<BankAccount>(bankAccountsQuery);

  const products = useMemo(() => productsData?.map(p => p.name) || [], [productsData]);
  const calibers = useMemo(() => calibersData || [], [calibersData]);
  const units = useMemo(() => unitsData?.map(u => u.name) || [], [unitsData]);
  const packagingTypes = useMemo(() => packagingTypesData?.map(p => p.name) || [], [packagingTypesData]);
  const warehouses = useMemo(() => warehousesData?.map(w => w.name) || [], [warehousesData]);

  return {
    products,
    calibers,
    units,
    packagingTypes,
    warehouses,
    bankAccounts: bankAccounts || [], 
  };
}
