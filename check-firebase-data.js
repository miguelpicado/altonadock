// Script to check Firebase Firestore data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAhGV-2qDfJ091o17aIrxxS6RD9T09KzmM",
    authDomain: "altonadock-77559.firebaseapp.com",
    projectId: "altonadock-77559",
    storageBucket: "altonadock-77559.firebasestorage.app",
    messagingSenderId: "1015374472267",
    appId: "1:1015374472267:web:3b71ce11078e1fa17459ce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirestoreData() {
    try {
        console.log('🔍 Checking Firebase Firestore for data...\n');

        // Check sales collection
        const salesRef = collection(db, 'sales');
        const q = query(salesRef, orderBy('fecha', 'desc'), limit(100));

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('❌ No data found in Firestore "sales" collection');
            console.log('   The database is empty.\n');
        } else {
            console.log(`✅ Found ${snapshot.size} records in Firestore!\n`);
            console.log('📊 Sample of most recent records:\n');

            snapshot.docs.slice(0, 10).forEach((doc, index) => {
                const data = doc.data();
                console.log(`${index + 1}. ID: ${doc.id}`);
                console.log(`   Type: ${data.tipo || 'N/A'}`);
                console.log(`   Employee: ${data.empleada || 'N/A'}`);
                console.log(`   Date: ${data.fecha ? new Date(data.fecha.seconds * 1000).toLocaleDateString() : 'N/A'}`);
                if (data.venta) console.log(`   Sale: €${data.venta}`);
                if (data.articulos) console.log(`   Items: ${data.articulos}`);
                console.log('');
            });

            // Summary by type
            const typeCount = {};
            snapshot.docs.forEach(doc => {
                const tipo = doc.data().tipo || 'unknown';
                typeCount[tipo] = (typeCount[tipo] || 0) + 1;
            });

            console.log('\n📈 Summary by record type:');
            Object.entries(typeCount).forEach(([tipo, count]) => {
                console.log(`   ${tipo}: ${count} records`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error accessing Firestore:', error.message);
        console.error('   Details:', error);
        process.exit(1);
    }
}

checkFirestoreData();
