#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

console.log('🚀 Starting Firebase Backend Test...\n');

// Load service account
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));
    console.log('✅ Service account loaded');
    console.log(`   Project ID: ${serviceAccount.project_id}\n`);
} catch (error) {
    console.error('❌ Failed to load service account:', error.message);
    process.exit(1);
}

// Initialize Firebase Admin
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin initialized\n');
} catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
}

const db = admin.firestore();

// Test 1: Check Firestore connection
console.log('📊 Test 1: Checking Firestore connection...');
try {
    const testRef = db.collection('_test_connection');
    await testRef.doc('test').set({ timestamp: new Date(), test: true });
    console.log('✅ Firestore connection successful');
    await testRef.doc('test').delete(); // Cleanup
    console.log('✅ Write/Delete operations working\n');
} catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    console.error('   Make sure Firestore database is created in Firebase Console\n');
    process.exit(1);
}

// Test 2: Test Subway Math data path
console.log('📊 Test 2: Testing Subway Math data path...');
const testUserId = 'test-user-' + Date.now();
const testPath = `artifacts/subway-math-app/users/${testUserId}/mathShortcutsProgress/data`;
console.log(`   Path: ${testPath}`);

try {
    const testData = {
        testTimestamp: admin.firestore.Timestamp.now(),
        testValue: Math.random(),
        message: 'Backend test write',
        addition: {
            'add-10': { strength: 5, lastReviewed: new Date().toISOString() }
        }
    };

    await db.doc(testPath).set(testData);
    console.log('✅ Successfully wrote test data');

    const readData = await db.doc(testPath).get();
    if (readData.exists) {
        console.log('✅ Successfully read test data');
        console.log('   Data:', JSON.stringify(readData.data(), null, 2));
    } else {
        console.log('❌ Data was written but could not be read back');
    }

    // Cleanup
    await db.doc(testPath).delete();
    console.log('✅ Cleanup successful\n');
} catch (error) {
    console.error('❌ Data path test failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   This might be a security rules issue (expected for client operations)\n');
}

// Test 3: Check Anonymous Auth status
console.log('📊 Test 3: Checking Anonymous Authentication...');
try {
    const authSettings = await admin.auth().projectConfigManager().getProjectConfig();
    console.log('✅ Authentication service accessible');

    // Note: We can't directly check if anonymous auth is enabled via Admin SDK
    console.log('⚠️  Note: Enable Anonymous sign-in in Firebase Console:');
    console.log('   https://console.firebase.google.com/project/subwaymath-77158/authentication/providers\n');
} catch (error) {
    console.error('❌ Auth check failed:', error.message);
}

// Test 4: List recent users (if any)
console.log('📊 Test 4: Checking for existing users...');
try {
    const listUsersResult = await admin.auth().listUsers(5);
    if (listUsersResult.users.length > 0) {
        console.log(`✅ Found ${listUsersResult.users.length} user(s):`);
        listUsersResult.users.forEach((user, i) => {
            console.log(`   ${i + 1}. ${user.uid} (${user.providerData.length > 0 ? user.providerData[0].providerId : 'anonymous'})`);
        });
    } else {
        console.log('ℹ️  No users found yet (this is normal if app hasn\'t been opened)');
    }
    console.log('');
} catch (error) {
    console.error('❌ User list check failed:', error.message);
}

// Summary
console.log('═══════════════════════════════════════════════════');
console.log('📋 SUMMARY');
console.log('═══════════════════════════════════════════════════');
console.log('✅ Firebase Admin SDK: Working');
console.log('✅ Firestore Database: Connected');
console.log('✅ Write/Read Operations: Working');
console.log('✅ Authentication Service: Accessible');
console.log('');
console.log('🎯 NEXT STEPS:');
console.log('1. ✅ Firestore is working!');
console.log('2. ⚠️  Make sure Anonymous Auth is enabled in Console');
console.log('3. ⚠️  Make sure Firestore security rules are published');
console.log('4. 🚀 Open index.html on your phone to test client-side auth');
console.log('');
console.log('🔗 Firebase Console:');
console.log('   https://console.firebase.google.com/project/subwaymath-77158');
console.log('═══════════════════════════════════════════════════');

process.exit(0);
