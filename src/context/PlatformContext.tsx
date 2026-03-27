import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../hooks/useFirebase';
import type { User, Tenant, Environment } from '../types/platform';

interface PlatformContextType {
  user: User | null;
  tenant: Tenant | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isLoading: boolean;
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);


export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user: firebaseUser, loading: authLoading } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setUser(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    const fetchPlatformData = async () => {
      setIsLoading(true);
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          setUser({ ...userData, id: userSnap.id });
          
          if (userData.tenantId) {
            const tenantRef = doc(db, 'tenants', userData.tenantId);
            return onSnapshot(tenantRef, (doc) => {
              if (doc.exists()) {
                const tenantData = doc.data() as Tenant;
                setTenant({ ...tenantData, id: doc.id });
                setEnvironment(tenantData.currentEnvironment || 'DEV');
              }
              setIsLoading(false);
            });
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching platform data:", error);
        setIsLoading(false);
      }
    };

    let unsubscribe: any;
    fetchPlatformData().then(unsub => unsubscribe = unsub);
    return () => unsubscribe?.();
  }, [firebaseUser, authLoading]);

  return (
    <PlatformContext.Provider value={{ user, tenant, environment, setEnvironment, isLoading }}>
      {children}
    </PlatformContext.Provider>
  );
};
