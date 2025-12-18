
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- ESTILOS ---
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
  headerContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: 25,
      borderBottom: '2px solid #111827',
      paddingBottom: 10
  },
  companyWrapper: { flexDirection: 'column' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  companyDetails: { fontSize: 10, fontFamily: 'Helvetica', color: '#000' },
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 5, textTransform: 'uppercase' },
  docSubtitle: { fontSize: 11, fontFamily: 'Helvetica', color: '#000' },
  accountBox: { border: '1px solid #E5E7EB', borderRadius: 3, padding: 10, marginBottom: 20, backgroundColor: '#F9FAFB' },
  accountName: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  accountDetails: { fontSize: 10, fontFamily: 'Helvetica', color: '#000' },
  table: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 3, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottom: '1px solid #D1D5DB', padding: 8, alignItems: 'center' },
  tableHeaderCell: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#000', textTransform: 'uppercase' },
  
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #F3F4F6', padding: '6px 8px', alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  tableCell: { fontSize: 10, fontFamily: 'Helvetica' },

  colDate: { width: '12%' },
  colRef: { width: '15%' },
  colConcept: { width: '28%' },
  colCharge: { width: '15%', textAlign: 'right', color: '#DC2626', fontFamily: 'Helvetica' },
  colPayment: { width: '15%', textAlign: 'right', color: '#059669', fontFamily: 'Helvetica' },
  colBalance: { width: '15%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: 8 },
  footerText: { fontSize: 9, fontFamily: 'Helvetica', color: '#000' },
});

// --- HELPERS ---
const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('es-CL').format(Math.round(val || 0));
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), "dd-MM-yyyy", { locale: es }); } catch { return dateString; }
}

export const BankAccountStatementDocument = ({ account, movements }: { account: any, movements: any[] }) => {
    const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : (account.initialBalance || 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerContainer}>
                    <View style={styles.companyWrapper}>
                        <Text style={styles.companyName}>Viña Negra SpA</Text>
                        <Text style={styles.companyDetails}>RUT: 78.261.683-8</Text>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>CARTOLA BANCARIA</Text>
                        <Text style={styles.docSubtitle}>Al {format(new Date(), "dd 'de' MMMM, yyyy", {locale: es})}</Text>
                    </View>
                </View>

                <View style={styles.accountBox}>
                    <Text style={styles.accountName}>{account.name || 'Cuenta'}</Text>
                    <Text style={styles.accountDetails}>Banco: {account.bankName || 'N/A'}</Text>
                    <Text style={styles.accountDetails}>Número: {account.accountNumber || 'N/A'}</Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colDate]}>Fecha</Text>
                        <Text style={[styles.tableHeaderCell, styles.colRef]}>Voucher</Text>
                        <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCharge]}>Cargos (-)</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPayment]}>Abonos (+)</Text>
                        <Text style={[styles.tableHeaderCell, styles.colBalance]}>Saldo</Text>
                    </View>

                    {/* Saldo Inicial */}
                    <View style={[styles.tableRow, {backgroundColor: '#E5E7EB'}]}>
                        <Text style={[styles.tableCell, styles.colDate, {fontFamily: 'Helvetica-Bold'}]}></Text>
                        <Text style={[styles.tableCell, styles.colRef]}></Text>
                        <Text style={[styles.tableCell, styles.colConcept, {fontFamily: 'Helvetica-Bold'}]}>SALDO INICIAL</Text>
                        <Text style={[styles.tableCell, styles.colCharge]}></Text>
                        <Text style={[styles.tableCell, styles.colPayment]}></Text>
                        <Text style={[styles.tableCell, styles.colBalance]}>{formatCurrency(account.initialBalance || 0)}</Text>
                    </View>

                    {movements.map((mov, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 !== 0 && styles.tableRowAlt]}>
                            <Text style={[styles.tableCell, styles.colDate]}>{formatDate(mov.date)}</Text>
                            <Text style={[styles.tableCell, styles.colRef, {fontFamily: 'Helvetica-Oblique'}]}>{mov.voucher}</Text>
                            <Text style={[styles.tableCell, styles.colConcept]}>{mov.concept}</Text>
                            <Text style={[styles.tableCell, styles.colCharge]}>{mov.charge > 0 ? formatCurrency(mov.charge) : '-'}</Text>
                            <Text style={[styles.tableCell, styles.colPayment]}>{mov.credit > 0 ? formatCurrency(mov.credit) : '-'}</Text>
                            <Text style={[styles.tableCell, styles.colBalance]}>{formatCurrency(mov.balance)}</Text>
                        </View>
                    ))}
                    
                    {/* Saldo Final */}
                     <View style={[styles.tableRow, {backgroundColor: '#111827'}]}>
                        <Text style={[styles.tableCell, styles.colDate, {color: '#fff'}]}></Text>
                        <Text style={[styles.tableCell, styles.colRef, {color: '#fff'}]}></Text>
                        <Text style={[styles.tableCell, styles.colConcept, {fontFamily: 'Helvetica-Bold', color: '#fff'}]}>SALDO FINAL</Text>
                        <Text style={[styles.tableCell, styles.colCharge, {color: '#fff'}]}></Text>
                        <Text style={[styles.tableCell, styles.colPayment, {color: '#fff'}]}></Text>
                        <Text style={[styles.tableCell, styles.colBalance, {color: '#fff', fontSize: 12}]}>{formatCurrency(finalBalance)}</Text>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Documento generado por AVN Manager</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

