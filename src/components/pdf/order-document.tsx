
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, fontFamily: 'Helvetica', color: '#000' },
  
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
      borderBottom: '1px solid #000', 
      paddingBottom: 10,
      alignItems: 'center' 
  },
  
  companyWrapper: { flexDirection: 'row', alignItems: 'center' },
  companyInfo: { flexDirection: 'column' },
  companyName: { fontSize: 22, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' }, 
  companySub: { fontSize: 10, color: '#000', marginBottom: 1 }, 
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' }, 
  docNumberBox: { backgroundColor: '#f0f0f0', padding: '4 10', borderRadius: 4, marginBottom: 4, border: '1px solid #ccc' },
  docNumber: { fontSize: 14, fontFamily: 'Helvetica-Bold' }, 
  docDate: { fontSize: 11 },

  boxesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 5 },
  infoBox: { width: '32%', border: '1px solid #ddd', borderRadius: 2, backgroundColor: '#fdfdfd' },
  boxHeader: { borderBottom: '1px solid #ddd', padding: '4 6', marginBottom: 4, backgroundColor: '#f0f0f0' },
  boxTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#000' }, 
  boxContent: { padding: '2 6 6 6' },
  boxRow: { marginBottom: 3, flexDirection: 'row' },
  
  boxLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#000', width: 45 }, 
  boxValue: { fontSize: 9, color: '#000', flex: 1 }, 

  table: { width: '100%', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#eee', borderBottom: '1px solid #999', padding: '8 0' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #eee', padding: '10 0' },
  
  colCode: { width: '8%', paddingLeft: 4, fontSize: 9 },
  colDesc: { width: '27%', fontSize: 9 },
  colEnv: { width: '10%', textAlign: 'center', fontSize: 9 },
  colKg: { width: '10%', textAlign: 'center', fontSize: 9 },
  colNet: { width: '11%', textAlign: 'right', fontSize: 9 },
  colVat: { width: '11%', textAlign: 'right', fontSize: 9 },
  colSub: { width: '11%', textAlign: 'right', fontSize: 9 },
  colTotal: { width: '12%', textAlign: 'right', paddingRight: 4, fontSize: 9, fontFamily: 'Helvetica-Bold' },

  totalsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #ddd' },
  totalsLeft: { width: '50%', backgroundColor: '#f9fafb', padding: 8, borderRadius: 4 },
  totalsRight: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 10, color: '#000' }, 
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' }, 
  totalFinalBox: { backgroundColor: '#111', padding: 8, borderRadius: 2, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  
  obsContainer: { marginTop: 15 },
  obsBox: { border: '1px solid #ddd', padding: 8, borderRadius: 4, backgroundColor: '#fafafa', minHeight: 30 },
  
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 },
  signatureBox: { width: '30%', alignItems: 'center' },
  signatureLine: { width: '80%', borderTop: '1px solid #000', marginBottom: 6 },
  signatureText: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }, 
  signatureSub: { fontSize: 8, color: '#000', textTransform: 'uppercase', marginTop: 2 }, 
  
  disclaimer: { textAlign: 'center', fontSize: 8, color: '#000', marginTop: 40 },
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
                            <Text style={[styles.companySub, {fontFamily:'Helvetica-Bold'}]}>RUT: 78.261.683-8</Text>
                            <Text style={styles.companySub}>{type === 'VENTA' ? 'ventas@agrocomercialavn.com' : 'eduardoiriarte@agrocomercialavn.com'}</Text>
                        </View>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>ORDEN DE {type}</Text>
                        <View style={styles.docNumberBox}>
                            <Text style={styles.docNumber}>
                                {order.number || order.id?.substring(0,6)}
                            </Text>
                        </View>
                        <Text style={styles.docDate}>Fecha: {formatDate(order.date)}</Text>
                    </View>
                </View>

                {/* 2. INFO */}
                <View style={styles.boxesContainer}>
                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>{type === 'VENTA' ? 'CLIENTE' : 'PROVEEDOR'}</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}><Text style={[styles.boxValue, {fontSize: 10, fontFamily: 'Helvetica-Bold'}]}>{clientName}</Text></View>
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
                            <View style={styles.boxRow}><Text style={styles.boxLabel}>Venc:</Text><Text style={styles.boxValue}>{formatDate(order.balanceDueDate || order.paymentDueDate)}</Text></View>
                            
                            {bankAccount && (
                                <View style={{marginTop: 6, paddingTop: 6, borderTop: '1px solid #ddd'}}>
                                    <Text style={[styles.boxLabel, {marginBottom:3, width: '100%'}]}>DATOS TRANSFERENCIA:</Text>
                                        <Text style={{fontSize: 9}}>{bankAccount.bank || bankAccount.bankName}</Text>
                                        <Text style={{fontSize: 9, marginBottom: 4}}>{(bankAccount.type || bankAccount.accountType) || 'Cta'} N° {bankAccount.accountNumber}</Text>
                                        <Text style={{fontSize: 9, fontFamily: 'Helvetica-Bold'}}>Agrocomercial Viña Negra SpA</Text>
                                        <Text style={{fontSize: 9}}>RUT: 78.261.683-8</Text>
                                        <Text style={{fontSize: 9}}>eduardoiriarte@agrocomercialavn.com</Text>
                                </View>
                            )}
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
                                    <Text style={{fontSize: 9, fontFamily: 'Helvetica-Bold'}}>{item.product}</Text>
                                    <Text style={{fontSize: 8, color: '#000'}}>{item.caliber}</Text>
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
                            <Text style={{color:'#fff', fontSize:11, fontFamily:'Helvetica-Bold'}}>TOTAL A PAGAR:</Text>
                            <Text style={{color:'#fff', fontSize:12, fontFamily:'Helvetica-Bold'}}>{formatCurrency(totalBruto)}</Text>
                        </View>
                    </View>
                </View>

                {/* 5. OBSERVACIONES */}
                <View style={styles.obsContainer}>
                    <Text style={[styles.boxLabel, {marginBottom: 4, width: '100%'}]}>OBSERVACIONES</Text>
                    <View style={styles.obsBox}>
                        <Text style={{fontSize: 9, fontStyle: 'italic'}}>{order.notes || 'Sin observaciones.'}</Text>
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
                        <Text style={styles.signatureText}>{type === 'VENTA' ? 'CLIENTE' : 'PROVEEDOR'}</Text>
                        <Text style={styles.signatureSub}>{clientName ? clientName.toUpperCase() : 'RECEPCIÓN CONFORME'}</Text>
                    </View>
                </View>

                <Text style={styles.disclaimer}>Documento interno de control. No válido como factura tributaria.</Text>
            </Page>
        </Document>
    );
};
