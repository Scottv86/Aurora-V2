import { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  FirebaseUser, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { MODULES } from '../constants/modules';

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

export const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);


export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (e) {
            console.error("Failed to fetch user doc:", e);
            setUser(firebaseUser);
            setLoading(false);
            return;
          }
          
          if (!userSnap.exists()) {
            const tenantId = 'default-tenant';
            try {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || null,
                role: 'admin',
                tenantId: tenantId,
                lastActive: serverTimestamp()
              });
            } catch (e) {
              console.error("Failed to create user doc:", e);
            }

            const tenantRef = doc(db, 'tenants', tenantId);
            try {
              const tenantSnap = await getDoc(tenantRef);
              if (!tenantSnap.exists()) {
                await setDoc(tenantRef, {
                  id: tenantId,
                  name: 'Default Organization',
                  slug: 'default',
                  plan: 'ENTERPRISE',
                  status: 'ACTIVE',
                  ownerId: firebaseUser.uid,
                  createdAt: serverTimestamp(),
                  environments: ['DEV', 'PROD'],
                  currentEnvironment: 'DEV'
                });

                const contactsModule = MODULES.find(m => m.id === 'contacts');
                if (contactsModule) {
                  await setDoc(doc(db, 'tenants', tenantId, 'modules', 'contacts'), {
                    name: contactsModule.name,
                    category: contactsModule.category,
                    iconName: 'Users',
                    description: contactsModule.description,
                    enabled: true,
                    enabledAt: serverTimestamp()
                  });
                }
              }
            } catch (e) {
              console.error("Failed to setup default tenant:", e);
            }
          } else {
            const userData = userSnap.data();
            let tenantId = userData?.tenantId;
            let role = userData?.role;
            
            const updates: any = { lastActive: serverTimestamp() };
            
            if (!tenantId) {
              tenantId = 'default-tenant';
              updates.tenantId = tenantId;
            }
            
            if (!['admin', 'editor', 'viewer'].includes(role)) {
              updates.role = 'admin';
            }

            try {
              await setDoc(userRef, updates, { merge: true });
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }

            if (tenantId) {
              const tenantRef = doc(db, 'tenants', tenantId);
              try {
                const tenantSnap = await getDoc(tenantRef);
                if (!tenantSnap.exists()) {
                  await setDoc(tenantRef, {
                    id: tenantId,
                    name: 'Default Organization',
                    slug: 'default',
                    plan: 'ENTERPRISE',
                    status: 'ACTIVE',
                    ownerId: firebaseUser.uid,
                    createdAt: serverTimestamp(),
                    environments: ['DEV', 'PROD'],
                    currentEnvironment: 'DEV'
                  });
                }
              } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `tenants/${tenantId}`);
              }

              try {
                const modulesRef = collection(db, 'tenants', tenantId, 'modules');
                const modulesSnap = await getDocs(modulesRef);
                if (modulesSnap.empty) {
                  const contactsModule = MODULES.find(m => m.id === 'contacts');
                  if (contactsModule) {
                    await setDoc(doc(db, 'tenants', tenantId, 'modules', 'contacts'), {
                      name: contactsModule.name,
                      category: contactsModule.category,
                      iconName: 'Users',
                      description: contactsModule.description,
                      enabled: true,
                      enabledAt: serverTimestamp()
                    });
                  }
                }
              } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `tenants/${tenantId}/modules`);
              }
            }
          }
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        if (firebaseUser) setUser(firebaseUser);
        else setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // Silently handle cancelled sign-in
      } else {
        console.error("Sign in error:", error);
        toast.error("Failed to sign in. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
