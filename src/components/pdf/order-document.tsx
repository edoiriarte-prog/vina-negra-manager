import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Estilos idénticos a tu imagen de referencia
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#222' },
  
  // Cabecera Principal
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyInfo: { flexDirection: 'column' },
  companyName: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  companySub: { fontSize: 9, color: '#555', marginBottom: 2 },
  
  docInfo: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  docNumberBox: { border: '1px solid #000', padding: '2 8', borderRadius: 4, marginBottom: 4 },
  docNumber: { fontSize: 12, fontWeight: 'bold' },
  docDate: { fontSize: 9 },

  // Cajas de Información (Cliente / Despacho)
  boxesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
  infoBox: { width: '48%', border: '1px solid #888', borderRadius: 5, overflow: 'hidden' },
  boxHeader: { backgroundColor: '#f0f0f0', padding: '4 8', borderBottom: '1px solid #888' },
  boxTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  boxContent: { padding: '6 8' },
  boxRow: { flexDirection: 'row', marginBottom: 2 },
  boxLabel: { width: 60, fontWeight: 'bold', fontSize: 8 },
  boxValue: { flex: 1, fontSize: 8 },

  // Tabla
  table: { width: '100%', borderTop: '1px solid #000', borderBottom: '1px solid #000', marginBottom: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottom: '1px solid #000', padding: '4 0' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #ddd', padding: '6 0' },
  
  // Columnas Tabla (Anchos ajustados a la imagen)
  colCode: { width: '10%', paddingLeft: 4 },
  colDesc: { width: '25%' },
  colEnv: { width: '10%', textAlign: 'center' },
  colKg: { width: '10%', textAlign: 'right' },
  colNet: { width: '11%', textAlign: 'right' },
  colVat: { width: '11%', textAlign: 'right' },
  colSub: { width: '11%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right', paddingRight: 4 },
  
  // Sección de Totales (Barra Gris)
  totalsContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', border: '1px solid #ddd', padding: 8, marginTop: 0 },
  totalsLabelArea: { width: '55%', alignItems: 'flex-end', paddingRight: 10 },
  totalsValueArea: { width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalBigLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  totalBigValue: { fontSize: 14, fontWeight: 'bold' },

  // Condiciones y Observaciones
  sectionTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 15, marginBottom: 4, borderBottom: '1px solid #ccc' },
  textSmall: { fontSize: 8, marginBottom: 2 },

  // Firmas (Footer)
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50, paddingTop: 10 },
  signatureBox: { width: '30%', borderTop: '1px solid #000', alignItems: 'center', paddingTop: 5 },
  signatureText: { fontSize: 8, fontWeight: 'bold' },
  signatureSub: { fontSize: 7, color: '#666' },

  disclaimer: { textAlign: 'center', fontSize: 7, color: '#888', marginTop: 30 },
});

const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return '$0';
    return '$ ' + new Intl.NumberFormat('es-CL').format(Math.round(val));
};

const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-CL').format(val || 0);
}

export const OrderDocument = ({ order, clientName, clientRut, clientAddress, type }: any) => {
    // Datos derivados
    const isSale = type === 'VENTA';
    const totalNeto = order.includeVat ? Math.round(order.totalAmount / 1.19) : order.totalAmount;
    const totalIVA = order.includeVat ? order.totalAmount - totalNeto : Math.round(order.totalAmount * 0.19);
    const totalBruto = order.includeVat ? order.totalAmount : totalNeto + totalIVA;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
            
                {/* 1. CABECERA */}
                <View style={styles.headerContainer}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>Viña Negra SpA</Text>
                        <Text style={styles.companySub}>AGROCOMERCIAL</Text>
                        <Text style={styles.companySub}>RUT: 78.261.683-8</Text>
                        <Text style={styles.companySub}>L. Gallardo 1345, Ovalle</Text>
                        <Text style={styles.companySub}>eduardoiriarte@agrocomercialavn.com</Text>
                    </View>
                    <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>ORDEN DE {type}</Text>
                        <View style={styles.docNumberBox}>
                            <Text style={styles.docNumber}>{order.number || order.id?.substring(0,8).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.docDate}>Fecha Emisión:</Text>
                        <Text style={styles.docDate}>{order.date ? format(new Date(order.date), "dd 'de' MMMM, yyyy", { locale: es }) : '-'}</Text>
                    </View>
                </View>

                {/* 2. CAJAS DE INFO */}
                <View style={styles.boxesContainer}>
                    {/* CAJA CLIENTE / PROVEEDOR */}
                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>DATOS DEL {isSale ? 'CLIENTE' : 'PROVEEDOR'}</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Razón Social:</Text>
                                <Text style={styles.boxValue}>{clientName}</Text>
                            </View>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>RUT:</Text>
                                <Text style={styles.boxValue}>{clientRut || 'S/I'}</Text>
                            </View>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Dirección:</Text>
                                <Text style={styles.boxValue}>{clientAddress || 'Ovalle, Coquimbo'}</Text>
                            </View>
                             {/* Simulación de contacto si no existe en BD */}
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Contacto:</Text>
                                <Text style={styles.boxValue}>--</Text>
                            </View>
                        </View>
                    </View>

                    {/* CAJA DESPACHO */}
                    <View style={styles.infoBox}>
                        <View style={styles.boxHeader}><Text style={styles.boxTitle}>DATOS DE DESPACHO</Text></View>
                        <View style={styles.boxContent}>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Bodega:</Text>
                                <Text style={styles.boxValue}>{order.warehouse || 'Principal'}</Text>
                            </View>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Origen:</Text>
                                <Text style={styles.boxValue}>Viña Negra (Ovalle)</Text>
                            </View>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Transporte:</Text>
                                <Text style={styles.boxValue}>Por Definir</Text>
                            </View>
                            <View style={styles.boxRow}>
                                <Text style={styles.boxLabel}>Chofer:</Text>
                                <Text style={styles.boxValue}>--</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. TABLA DE PRODUCTOS */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.boxTitle, styles.colCode]}>CÓD.</Text>
                        <Text style={[styles.boxTitle, styles.colDesc]}>DESCRIPCIÓN</Text>
                        <Text style={[styles.boxTitle, styles.colEnv]}>ENV.</Text>
                        <Text style={[styles.boxTitle, styles.colKg]}>KGS</Text>
                        <Text style={[styles.boxTitle, styles.colNet]}>P. NETO</Text>
                        <Text style={[styles.boxTitle, styles.colVat]}>P. C/IVA</Text>
                        <Text style={[styles.boxTitle, styles.colSub]}>SUBT. NETO</Text>
                        <Text style={[styles.boxTitle, styles.colTotal]}>TOTAL C/IVA</Text>
                    </View>
                    
                    {order.items?.map((item: any, i: number) => {
                         const price = Number(item.price) || 0;
                         const qty = Number(item.quantity) || 0;
                         
                         // Cálculos de línea
                         const lineNetoUnit = order.includeVat ? Math.round(price / 1.19) : price;
                         const lineBrutoUnit = order.includeVat ? price : Math.round(price * 1.19);
                         
                         const lineSubtotalNeto = lineNetoUnit * qty;
                         const lineTotalBruto = lineBrutoUnit * qty;

                        return (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colCode}>{(i + 1) * 10}</Text>
                                <View style={styles.colDesc}>
                                    <Text style={{fontWeight: 'bold'}}>{item.product}</Text>
                                    <Text style={{fontSize: 7, color: '#555'}}>Calibre: {item.caliber}</Text>
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
                    <View style={[styles.totalsLabelArea, { flexDirection: 'row', justifyContent: 'space-between', width: '50%' }]}>
                         <Text style={styles.totalBigLabel}>TOTALES</Text>
                         {/* Suma de envases y kilos */}
                         <Text style={{fontSize: 10, fontWeight: 'bold'}}>
                            ENV: {formatNumber(order.items?.reduce((s:any, i:any)=> s + (Number(i.packagingQuantity)||0),0))}   
                            KGS: {formatNumber(order.items?.reduce((s:any, i:any)=> s + (Number(i.quantity)||0),0))}
                         </Text>
                    </View>
                    <View style={styles.totalsValueArea}>
                        <View style={styles.totalRow}>
                            <Text style={styles.boxLabel}>Neto:</Text>
                            <Text style={styles.boxValue}>{formatCurrency(totalNeto)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.boxLabel}>IVA (19%):</Text>
                            <Text style={styles.boxValue}>{formatCurrency(totalIVA)}</Text>
                        </View>
                        <View style={[styles.totalRow, { marginTop: 5 }]}>
                            <Text style={styles.totalBigLabel}>TOTAL:</Text>
                            <Text style={styles.totalBigValue}>{formatCurrency(totalBruto)}</Text>
                        </View>
                    </View>
                </View>

                {/* 5. CONDICIONES */}
                <Text style={styles.sectionTitle}>CONDICIONES COMERCIALES</Text>
                <Text style={styles.textSmall}>Tipo Venta: {order.saleType || 'Venta Firme'}</Text>
                <Text style={styles.textSmall}>Forma Pago: {order.paymentMethod || 'Contado'} {order.creditDays ? `(${order.creditDays} días)` : ''}</Text>

                {/* 6. OBSERVACIONES */}
                <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                <Text style={[styles.textSmall, {fontStyle: 'italic'}]}>
                    {order.notes || 'PENDIENTE DISTRIBUCION FACTURAS POR LOCAL'}
                </Text>

                {/* 7. FIRMAS */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>Despachado Por</Text>
                        <Text style={styles.signatureSub}>Bodega Viña Negra</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>Transportista</Text>
                        <Text style={styles.signatureSub}>Recibo Conforme Carga</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>Cliente</Text>
                        <Text style={styles.signatureSub}>Recepción Conforme</Text>
                    </View>
                </View>

                <Text style={styles.disclaimer}>
                    Documento no válido como factura electrónica. Uso interno de control.
                </Text>

            </Page>
        </Document>
    );
};