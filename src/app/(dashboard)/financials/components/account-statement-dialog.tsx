
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BankAccount, FinancialMovement } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Banknote, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { BankAccountStatementDocument } from '@/components/pdf/BankAccountStatementDocument';

interface AccountStatementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount;
  movements: FinancialMovement[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export function AccountStatementDialog({ isOpen, onOpenChange, account, movements }: AccountStatementDialogProps) {

  const statementLines = useMemo(() => {
    if (!account || !movements) return [];

    const relatedMovements = movements.filter(
      m => m.sourceAccountId === account.id || m.destinationAccountId === account.id
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = account.initialBalance || 0;

    return relatedMovements.map(mov => {
      let charge = 0;
      let credit = 0;

      if (mov.type === 'traspaso') {
        if (mov.sourceAccountId === account.id) {
          charge = mov.amount;
        } else {
          credit = mov.amount;
        }
      } else if (mov.type === 'expense') {
        charge = mov.amount;
      } else if (mov.type === 'income') {
        credit = mov.amount;
      }
      
      runningBalance += credit - charge;

      return {
        id: mov.id,
        date: mov.date,
        voucher: mov.voucherNumber || mov.id.slice(0, 6),
        concept: mov.description,
        charge,
        credit,
        balance: runningBalance,
      };
    });
  }, [account, movements]);

  const finalBalance = statementLines.length > 0 ? statementLines[statementLines.length - 1].balance : (account.initialBalance || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800 bg-slate-900 flex flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/20">
                <Banknote className="h-6 w-6 text-blue-400" />
            </div>
            <div>
                <DialogTitle className="text-xl text-white">Cartola Histórica de Movimientos</DialogTitle>
                <DialogDescription className="text-slate-400">
                    {account.name} - {account.bankName}
                </DialogDescription>
            </div>
          </div>
          <PDFDownloadLink
            document={<BankAccountStatementDocument account={account} movements={statementLines} />}
            fileName={`Cartola_${account.name.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Generando...' : 'Descargar PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6 py-4">
          <ScrollArea className="h-full">
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="w-[100px] text-slate-400">Fecha</TableHead>
                    <TableHead className="w-[100px] text-slate-400">Voucher</TableHead>
                    <TableHead className="text-slate-400">Concepto</TableHead>
                    <TableHead className="text-right text-rose-400">Cargos (-)</TableHead>
                    <TableHead className="text-right text-emerald-400">Abonos (+)</TableHead>
                    <TableHead className="text-right text-blue-400">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Saldo Inicial */}
                  <TableRow className="border-slate-800 bg-slate-900/30">
                    <TableCell colSpan={5} className="font-bold text-slate-400 text-xs uppercase">Saldo Inicial</TableCell>
                    <TableCell className="text-right font-bold font-mono text-slate-300">{formatCurrency(account.initialBalance || 0)}</TableCell>
                  </TableRow>

                  {statementLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-48 text-slate-500">
                        No hay movimientos registrados para esta cuenta.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statementLines.map(line => (
                      <TableRow key={line.id} className="border-slate-800/50 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs text-slate-300">{format(parseISO(line.date), 'dd-MM-yy')}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{line.voucher}</TableCell>
                        <TableCell className="text-sm text-slate-300">{line.concept}</TableCell>
                        <TableCell className="text-right font-mono text-rose-500">
                          {line.charge > 0 ? formatCurrency(line.charge) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-500">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-400 font-medium">{formatCurrency(line.balance)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                 <TableFooter>
                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-t-2 border-slate-700">
                        <TableCell colSpan={5} className="text-right font-bold text-lg text-white">Saldo Final</TableCell>
                        <TableCell className="text-right font-bold text-2xl font-mono text-blue-300">{formatCurrency(finalBalance)}</TableCell>
                    </TableRow>
                 </TableFooter>
              </Table>
            </div>
          </ScrollArea>
        </div>

      </DialogContent>
    </Dialog>
  );
}
