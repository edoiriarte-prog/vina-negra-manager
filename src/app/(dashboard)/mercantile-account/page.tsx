"use client";

import React, { useState, useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement, OrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, Wallet, FileText, ChevronRight, User, ArrowUpRight, ArrowDownLeft,
  Truck, Briefcase, Download, Printer, Package, Scale
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- FORMATO MONEDA ---
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

// --- TIPOS DE DATO PARA LA VISTA ---
type ProductVolume = {
  name: string;
  totalKilos: number;
};

type AccountSummary = {
  contact: Contact;
  totalBilled: number; // Monto bruto (c/IVA)
  totalPaid: number;
  balance: number;
  productVolumes: ProductVolume[];
};

type DetailedMovement = {
    date: string;
    type: 'Cargo' | 'Abono';
    documentType: 'O/V' | 'O/C' | 'Pago';
    reference: string;
    details: string | OrderItem[]; // String para pagos, OrderItem[] para ventas
    charge: number;
    payment: number;
    balance: number;
};

export default function MercantileAccountPage() {
  const { contacts, isLoading: l1 }