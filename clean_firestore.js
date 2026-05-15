/**
 * SCRIPT DE LIMPIEZA — Firestore
 * Viña Negra Agrocomercial ERP
 * 
 * LIMPIA: salesOrders, purchaseOrders, financialMovements,
 *         inventoryAdjustments, plannedOrders, serviceOrders
 * CONSERVA: contacts (clientes y proveedores)
 * 
 * INSTRUCCIONES:
 * 1. Copia este archivo a la raíz del proyecto (junto a package.json)
 * 2. Ejecuta desde la terminal de Cursor: node clean_firestore.js
 * 3. Confirma escribiendo "LIMPIAR" cuando te lo pida
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc
} = require('firebase/firestore');
const readline = require('readline');

require('dotenv').config();

const firebaseConfig = {
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

console.log('🔥 Conectando a Firebase:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Colecciones a limpiar ──────────────────────────────────────
const COLECCIONES_LIMPIAR = [
  'salesOrders',
  'purchaseOrders',
  'financialMovements',
  'inventoryAdjustments',
  'plannedOrders',
  'serviceOrders',
];

// ── CONSERVAR contacts ─────────────────────────────────────────
const COLECCIONES_CONSERVAR = ['contacts'];

// ── Helper: borrar colección en batches de 499 ─────────────────
async function deleteCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  
  if (snap.empty) {
    console.log(`   ⬜ ${collectionName}: vacía, nada que borrar`);
    return 0;
  }

  let batch  = writeBatch(db);
  let count  = 0;
  let total  = 0;

  for (const document of snap.docs) {
    batch.delete(doc(db, collectionName, document.id));
    count++;
    total++;

    if (count === 499) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) await batch.commit();

  console.log(`   🗑️  ${collectionName}: ${total} documentos eliminados`);
  return total;
}

// ── Confirmación por consola ───────────────────────────────────
function preguntar(pregunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(pregunta, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── MAIN ───────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   LIMPIEZA DE DATOS — VIÑA NEGRA ERP   ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📋 Se van a ELIMINAR estas colecciones:');
  COLECCIONES_LIMPIAR.forEach(c => console.log(`   ❌ ${c}`));
  
  console.log('\n✅ Se va a CONSERVAR:');
  COLECCIONES_CONSERVAR.forEach(c => console.log(`   ✅ ${c} (clientes y proveedores)`));

  console.log('\n⚠️  Esta acción es IRREVERSIBLE.');
  const respuesta = await preguntar('\n👉 Escribe LIMPIAR para confirmar: ');

  if (respuesta !== 'LIMPIAR') {
    console.log('\n❌ Cancelado. No se eliminó nada.');
    process.exit(0);
  }

  console.log('\n🚀 Iniciando limpieza...\n');

  let totalBorrados = 0;
  for (const col of COLECCIONES_LIMPIAR) {
    totalBorrados += await deleteCollection(col);
  }

  // Verificar que contacts sigue intacto
  const contactsSnap = await getDocs(collection(db, 'contacts'));
  console.log(`\n✅ contacts conservados: ${contactsSnap.size} registros intactos`);

  console.log('\n════════════════════════════════════════');
  console.log(`✅ LIMPIEZA COMPLETA — ${totalBorrados} documentos eliminados`);
  console.log('   El ERP está listo para datos reales.');
  console.log('════════════════════════════════════════\n');
  
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
