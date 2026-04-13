import * as admin from 'firebase-admin';

// This is a stub for the firebaseAdmin module to support legacy migration scripts.
// In Aurora V2, we are moving towards Supabase/Prisma, but some migrations still
// need to read from the original Firestore source.

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
  });
}

export const firebaseAdmin = admin;
