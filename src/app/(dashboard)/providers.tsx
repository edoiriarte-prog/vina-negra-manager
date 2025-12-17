"use client";

import { ReactNode } from "react";
import { OperationsProvider } from "@/hooks/use-operations";
import { MasterDataProvider } from "@/hooks/use-master-data";

export function DataProviders({ children }: { children: ReactNode }) {
  return (
    <MasterDataProvider>
      <OperationsProvider>
        {children}
      </OperationsProvider>
    </MasterDataProvider>
  );
}
