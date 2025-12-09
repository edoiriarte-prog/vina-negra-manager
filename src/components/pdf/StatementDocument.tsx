
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#111827' },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  companyInfo: { flexDirection: 'column' },
  companyName: { fontSize: 16, fontWeight: 'bold' },
  companyDetails: { fontSize: 8, color: '#4B5563' },
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  docSubtitle: { fontSize: 9, color: '#4B5563' },

  clientBox: { border: '1px solid #E5E7EB', borderRadius: 3, padding: 10, marginBottom: 20, backgroundColor: '#F9FAFB' },
  clientName: { fontWeight: 'bold', fontSize: 10, marginBottom: 2 },
  clientDetails: { fontSize: 8, color: '#374151' },

  table: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 3, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottom: '1px solid #D1D5DB', padding: 6, alignItems: 'center' },
  tableHeaderCell: { fontSize: 7, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' },
  
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #F3F4F6', padding: '5px 6px', alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  tableCell: { fontSize: 8 },

  colDate: { width: '12%' },
  colRef: { width: '15%' },
  colConcept: { width: '28%' },
  colCharge: { width: '15%', textAlign: 'right', color: '#DC2626' },
  colPayment: { width: '15%', textAlign: 'right', color: '#059669' },
  colBalance: { width: '15%', textAlign: 'right', fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: 8 },
  footerText: { fontSize: 7, color: '#6B7280' },
  
  summaryBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    border: '1px solid #E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  summaryTotalRow: {
    marginTop: 5,
    paddingTop: 5,
    borderTop: '1px solid #D1D5DB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
   signatures: {
    position: 'absolute',
    bottom: 70,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 60
  },
  signatureBox: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '70%',
    borderTop: '1px solid #374151',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

// Helpers
const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('es-CL').format(Math.round(val || 0));
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), "dd-MM-yyyy", { locale: es }); } catch { return dateString; }
}

export const StatementDocument = ({ account, movements }: { account: any, movements: any[] }) => {
    
    const { contact } = account;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
            
                <View style={styles.headerContainer}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>Viña Negra SpA</Text>
                        <Text style={styles.companyDetails}>RUT: 78.261.683-8</Text>
                        <Text style={styles.companyDetails}>Tulahuén S/N, Monte Patria</Text>
                        <Text style={styles.companyDetails}>ventas@agrocomercialavn.com</Text>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>ESTADO DE CUENTA CORRIENTE</Text>
                        <Text style={styles.docSubtitle}>Al {format(new Date(), "dd 'de' MMMM, yyyy", {locale: es})}</Text>
                    </View>
                </View>

                <View style={styles.clientBox}>
                    <Text style={styles.clientName}>{contact.name || 'Cliente'}</Text>
                    <Text style={styles.clientDetails}>RUT: {contact.rut || 'S/I'}</Text>
                    <Text style={styles.clientDetails}>Dirección: {contact.address || 'No registrada'}</Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colDate]}>Fecha</Text>
                        <Text style={[styles.tableHeaderCell, styles.colRef]}>Referencia</Text>
                        <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto / Detalle</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCharge]}>Cargos (-)</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPayment]}>Abonos (+)</Text>
                        <Text style={[styles.tableHeaderCell, styles.colBalance]}>Saldo</Text>
                    </View>

                    {movements.map((mov, i) => {
                        const conceptText = typeof mov.details === 'string' 
                            ? mov.details
                            : mov.details.map((item: any) => `${item.quantity}kg ${item.product} ${item.caliber}`).join(', ');

                        return (
                            <View key={i} style={[styles.tableRow, i % 2 !== 0 && styles.tableRowAlt]}>
                                <Text style={[styles.tableCell, styles.colDate]}>{formatDate(mov.date)}</Text>
                                <Text style={[styles.tableCell, styles.colRef, {fontSize: 7, fontFamily: 'Helvetica-Oblique'}]}>{mov.reference}</Text>
                                <Text style={[styles.tableCell, styles.colConcept]}>{conceptText}</Text>
                                <Text style={[styles.tableCell, styles.colCharge]}>{mov.charge > 0 ? formatCurrency(mov.charge) : '-'}</Text>
                                <Text style={[styles.tableCell, styles.colPayment]}>{mov.payment > 0 ? formatCurrency(mov.payment) : '-'}</Text>
                                <Text style={[styles.tableCell, styles.colBalance]}>{formatCurrency(mov.balance)}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Facturado:</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(account.totalBilled)}</Text>
                    </View>
                     <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Pagado:</Text>
                        <Text style={[styles.summaryValue, { color: '#059669'}]}>{formatCurrency(account.totalPaid)}</Text>
                    </View>
                    <View style={styles.summaryTotalRow}>
                        <Text style={styles.summaryTotalLabel}>Saldo Pendiente:</Text>
                        <Text style={[styles.summaryTotalValue, { color: account.balance > 0 ? '#DC2626' : '#111827'}]}>{formatCurrency(account.balance)}</Text>
                    </View>
                </View>

                <View style={styles.signatures} fixed>
                     <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>Gerencia de Ventas</Text>
                    </View>
                     <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>Recepción Cliente</Text>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Viña Negra SpA - Documento informativo no válido como título ejecutivo.</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Página ${pageNumber} de ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
};
