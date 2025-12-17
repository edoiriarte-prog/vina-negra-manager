
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  
  logo: {
      width: 80,
      height: 50,
      objectFit: 'contain',
      marginRight: 10
  },

  headerContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 20, 
      borderBottom: '1px solid #111', 
      paddingBottom: 10,
      alignItems: 'center' 
  },
  
  companyWrapper: { flexDirection: 'row', alignItems: 'center' },
  companyInfo: { flexDirection: 'column' },
  companyName: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  companySub: { fontSize: 8, color: '#444', marginBottom: 1 },
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  docNumberBox: { backgroundColor: '#f3f4f6', padding: '4 10', borderRadius: 4, marginBottom: 4, border: '1px solid #ccc' },
  docNumber: { fontSize: 12, fontWeight: 'bold' },
  docDate: { fontSize: 9 },

  boxesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 5 },
  infoBox: { width: '32%', border: '1px solid #ddd', borderRadius: 2, backgroundColor: '#fcfcfc' },
  boxHeader: { borderBottom: '1px solid #ddd', padding: '4 6', marginBottom: 4, backgroundColor: '#f3f4f6' },
  boxTitle: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', color: '#333' },
  boxContent: { padding: '2 6 6 6' },
  boxRow: { marginBottom: 3, flexDirection: 'row' },
  
  // OJO: width 45 es para etiquetas cortas. Para títulos largos usamos override.
  boxLabel: { fontWeight: 'bold', fontSize: 7, color: '#444', width: 45 },
  boxValue: { fontSize: 7, color: '#000', flex: 1 },

  table: { width: '100%', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#eee', borderBottom: '1px solid #999', padding: '8 0' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #eee', padding: '10 0' },
  
  colCode: { width: '8%', paddingLeft: 4, fontSize: 7 },
  colDesc: { width: '27%', fontSize: 7 },
  colEnv: { width: '10%', textAlign: 'center', fontSize: 7 },
  colKg: { width: '10%', textAlign: 'center', fontSize: 7 },
  colNet: { width: '11%', textAlign: 'right', fontSize: 7 },
  colVat: { width: '11%', textAlign: 'right', fontSize: 7 },
  colSub: { width: '11%', textAlign: 'right', fontSize: 7 },
  colTotal: { width: '12%', textAlign: 'right', paddingRight: 4, fontSize: 7, fontWeight: 'bold' },

  totalsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #ddd' },
  totalsLeft: { width: '50%', backgroundColor: '#f9fafb', padding: 8, borderRadius: 4 },
  totalsRight: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 8, color: '#444' },
  totalValue: { fontSize: 8, fontWeight: 'bold' },
  totalFinalBox: { backgroundColor: '#111', padding: 8, borderRadius: 2, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  
  obsContainer: { marginTop: 15 },
  obsBox: { border: '1px solid #ddd', padding: 8, borderRadius: 4, backgroundColor: '#fafafa', minHeight: 30 },
  
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 },
  signatureBox: { width: '30%', alignItems: 'center' },
  signatureLine: { width: '80%', borderTop: '1px solid #000', marginBottom: 6 },
  signatureText: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase' },
  signatureSub: { fontSize: 6, color: '#666', textTransform: 'uppercase', marginTop: 2 },
  
  disclaimer: { textAlign: 'center', fontSize: 6, color: '#999', marginTop: 40 },
});

// Helpers
const formatCurrency = (val: number) => '$ ' + new Intl.NumberFormat('es-CL').format(Math.round(val || 0));
const formatNumber = (val: number) => new Intl.NumberFormat('es-CL').format(val || 0);
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try { return format(parseISO(dateString), "dd 'de' MMMM, yyyy", { locale: es }); } catch { return dateString; }
}

export const OrderDocument = ({ order, clientName, clientRut, clientAddress, clientContact, bankAccount, type }: any) => {
    
    const totalNeto = order.totalAmount || 0;
    const totalIVA = order.includeVat !== false ? Math.round(totalNeto * 0.19) : 0;
    const totalBruto = totalNeto + totalIVA;
    const totalPackages = order.items?.reduce((s:any, i:any)=> s + (Number(i.packagingQuantity)||0),0) || 0;
    const totalKilos = order.items?.reduce((s:any, i:any)=> s + (Number(i.quantity)||0),0) || 0;

    const logoUrl = '/logo.jpg'; 

    return (
        <Document>
            <Page size="A4" style={styles.page}>
            
                {/* 1. HEADER */}
                <View style={styles.headerContainer}>
                    <View style={styles.companyWrapper}>
                        <Image src={logoUrl} style={styles.logo} />
                        <View style={styles.companyInfo}>
                            <Text style={styles.companyName}>VIÑA NEGRA SPA</Text>
                            <Text style={[styles.companySub, {fontWeight:'bold'}]}>RUT: 78.261.683-8</Text>
                            <Text style={styles.companySub}>ventas@agrocomercialavn.com</Text>
                        </View>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>ORDEN DE {type}</Text>
                        <View style={styles.docNumberBox}>
                            <Text style={styles.docNumber}>
                                {order.number?.startsWith('OV-') ? order.number : `OV-${order.number || order.id?.substring(0,6)}`}
                            </Text>
                        </View>
                        <Text style={styles.docDate}>Fecha: {formatDate(order.date)}</Text>
                    </View>
                </View>

                {/* 2. INFO */}
                <View style={styles.boxesContainer}>
                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>CLIENTE</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}><Text style={styles.boxValue}>{clientName}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>RUT:</Text><Text style={styles.boxValue}>{clientRut || 'S/I'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Dir:</Text><Text style={styles.boxValue}>{clientAddress || 'S/I'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Att:</Text><Text style={styles.boxValue}>{clientContact || '-'}</Text></View>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>DESPACHO</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Bodega:</Text><Text style={styles.boxValue}>{order.warehouse || 'Central'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Transp:</Text><Text style={styles.boxValue}>{order.transport || 'Por Definir'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Chofer:</Text><Text style={styles.boxValue}>{order.driver || order.driverName || '-'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Patente:</Text><Text style={styles.boxValue}>{order.plate || order.licensePlate || '-'}</Text></View>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>COMERCIAL</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Op:</Text><Text style={styles.boxValue}>{order.saleType || 'Venta Firme'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Pago:</Text><Text style={styles.boxValue}>{order.paymentMethod || 'Contado'}</Text></View>
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Venc:</Text><Text style={styles.boxValue}>{formatDate(order.paymentDueDate)}</Text></View>
                            
                            {/* SECCION DATOS BANCARIOS (CORREGIDA) */}
                            <View style={{marginTop: 6, paddingTop: 6, borderTop: '1px solid #ddd'}}>
                                {/* width: '100%' para evitar que se corte el texto */}
                                <Text style={[styles.boxLabel, {marginBottom:3, width: '100%'}]}>DATOS TRANSFERENCIA:</Text>
                                
                                {bankAccount ? (
                                    <>
                                        <Text style={{fontSize: 7}}>{bankAccount.bank || bankAccount.bankName}</Text>
                                        <Text style={{fontSize: 7, marginBottom: 4}}>{(bankAccount.type || bankAccount.accountType) || 'Cta'} N° {bankAccount.accountNumber}</Text>
                                        
                                        {/* NUEVOS DATOS AGREGADOS */}
                                        <Text style={{fontSize: 7, fontWeight: 'bold'}}>Agrocomercial Viña Negra SpA</Text>
                                        <Text style={{fontSize: 7}}>RUT: 78.261.683-8</Text>
                                        <Text style={{fontSize: 7}}>ventas@agrocomercialavn.com</Text>
                                    </>
                                ) : (
                                    <Text style={{fontSize: 6, fontStyle: 'italic', color:'#666'}}>No asignados</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. TABLA */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colCode}>CÓD</Text>
                        <Text style={styles.colDesc}>DESCRIPCIÓN</Text>
                        <Text style={styles.colEnv}>ENV</Text>
                        <Text style={styles.colKg}>KGS</Text>
                        <Text style={styles.colNet}>P.NETO</Text>
                        <Text style={styles.colVat}>P.C/IVA</Text>
                        <Text style={styles.colSub}>SUBT.</Text>
                        <Text style={styles.colTotal}>TOTAL</Text>
                    </View>
                    {order.items?.map((item: any, i: number) => {
                         const price = Number(item.price) || 0;
                         const qty = Number(item.quantity) || 0;
                         const lineNetoUnit = price;
                         const lineBrutoUnit = price * 1.19;
                         const lineSubtotalNeto = lineNetoUnit * qty;
                         const lineTotalBruto = lineSubtotalNeto * 1.19;
                        return (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colCode}>{item.code || (i + 1) * 10}</Text>
                                <View style={styles.colDesc}>
                                    <Text style={{fontSize: 7, fontWeight: 'bold'}}>{item.product}</Text>
                                    <Text style={{fontSize: 6, color: '#666'}}>{item.caliber}</Text>
                                </View>
                                <Text style={styles.colEnv}>{item.packagingQuantity || '-'}</Text>
                                <Text style={styles.colKg}>{formatNumber(qty)}</Text>
                                <Text style={styles.colNet}>{formatCurrency(lineNetoUnit)}</Text>
                                <Text style={styles.colVat}>{formatCurrency(lineBrutoUnit)}</Text>
                                <Text style={styles.colSub}>{formatCurrency(lineSubtotalNeto)}</Text>
                                <Text style={styles.colTotal}>{formatCurrency(lineTotalBruto)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* 4. TOTALES */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsLeft}>
                        <Text style={[styles.boxLabel, {marginBottom:4}]}>RESUMEN CARGA</Text>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2}}>
                             <Text style={styles.totalLabel}>Total Envases:</Text>
                             <Text style={styles.totalValue}>{formatNumber(totalPackages)}</Text>
                        </View>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                             <Text style={styles.totalLabel}>Total Kilos:</Text>
                             <Text style={styles.totalValue}>{formatNumber(totalKilos)}</Text>
                        </View>
                    </View>
                    <View style={styles.totalsRight}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal Neto:</Text>
                            <Text style={styles.totalValue}>{formatCurrency(totalNeto)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>IVA (19%):</Text>
                            <Text style={styles.totalValue}>{formatCurrency(totalIVA)}</Text>
                        </View>
                        <View style={styles.totalFinalBox}>
                            <Text style={{color:'#fff', fontSize:9, fontWeight:'bold'}}>TOTAL A PAGAR:</Text>
                            <Text style={{color:'#fff', fontSize:10, fontWeight:'bold'}}>{formatCurrency(totalBruto)}</Text>
                        </View>
                    </View>
                </View>

                {/* 5. OBSERVACIONES (CORREGIDA) */}
                <View style={styles.obsContainer}>
                    {/* width: '100%' para evitar que se corte el título */}
                    <Text style={[styles.boxLabel, {marginBottom: 4, width: '100%'}]}>OBSERVACIONES</Text>
                    <View style={styles.obsBox}>
                        <Text style={{fontSize: 7, fontStyle: 'italic'}}>{order.notes || 'Sin observaciones.'}</Text>
                    </View>
                </View>

                {/* 6. FIRMAS */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>GERENCIA VENTAS</Text>
                        <Text style={styles.signatureSub}>JOSE ROJAS CARMONA</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>OPERACIONES</Text>
                        <Text style={styles.signatureSub}>JOAQUIN BOU CORTES</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>CLIENTE</Text>
                        <Text style={styles.signatureSub}>{clientName ? clientName.toUpperCase() : 'RECEPCIÓN CONFORME'}</Text>
                    </View>
                </View>

                <Text style={styles.disclaimer}>Documento interno de control. No válido como factura tributaria.</Text>
            </Page>
        </Document>
    );
};
