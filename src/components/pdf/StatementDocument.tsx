
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos
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
  companyWrapper: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 60, height: 40, objectFit: 'contain', marginBottom: 5, marginRight: 10 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  companyDetails: { fontSize: 10, fontFamily: 'Helvetica', color: '#000' },
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 5, textTransform: 'uppercase' },
  docSubtitle: { fontSize: 11, fontFamily: 'Helvetica', color: '#000' },

  clientBox: { border: '1px solid #E5E7EB', borderRadius: 3, padding: 10, marginBottom: 20, backgroundColor: '#F9FAFB' },
  clientName: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  clientDetails: { fontSize: 10, fontFamily: 'Helvetica', color: '#000' },

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
  
  summaryBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    border: '1px solid #E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '3px 0',
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#000',
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  summaryTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #D1D5DB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  summaryTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
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
    borderTop: '1px solid #000',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  signatureSubtext: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#000',
    marginTop: 1,
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
    const logoUrl = '/logo.jpg'; 

    return (
        <Document>
            <Page size="A4" style={styles.page}>
            
                <View style={styles.headerContainer}>
                    <View style={styles.companyWrapper}>
                        <Image src={logoUrl} style={styles.logo} />
                        <View>
                            <Text style={styles.companyName}>Viña Negra SpA</Text>
                            <Text style={styles.companyDetails}>RUT: 78.261.683-8</Text>
                            <Text style={styles.companyDetails}>ventas@agrocomercialavn.com</Text>
                        </View>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>ESTADO DE CUENTA</Text>
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
                        const isDetailsArray = Array.isArray(mov.details);
                        
                        return (
                            <View key={i} style={[styles.tableRow, i % 2 !== 0 && styles.tableRowAlt]} wrap={false}>
                                <Text style={[styles.tableCell, styles.colDate]}>{formatDate(mov.date)}</Text>
                                <Text style={[styles.tableCell, styles.colRef, {fontFamily: 'Helvetica-Oblique'}]}>{mov.reference}</Text>
                                <View style={[styles.tableCell, styles.colConcept]}>
                                  {isDetailsArray ? (
                                      mov.details.map((item: any, idx: number) => (
                                          <Text key={idx} style={{fontSize: 8}}>
                                              • {item.product} ({item.caliber}): {item.quantity}kg a {formatCurrency(item.price)}
                                          </Text>
                                      ))
                                  ) : (
                                      <Text>{mov.details}</Text>
                                  )}
                                </View>
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
                        <Text style={styles.signatureSubtext}>JOSE ROJAS CARMONA</Text>
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
