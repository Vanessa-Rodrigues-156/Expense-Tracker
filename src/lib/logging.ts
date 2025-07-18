import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export interface ActivityLog {
  id: string;
  userId: string;
  category: 'auth' | 'transaction' | 'profile' | 'navigation' | 'system' | 'settings';
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

// Set to false to temporarily disable all logging
const LOGGING_ENABLED = true;

export const logUserAction = async (
  userId: string,
  category: ActivityLog['category'],
  action: string,
  details: Record<string, any> = {}
): Promise<void> => {
  // Skip logging if disabled, no userId provided, or Firebase not configured
  if (!LOGGING_ENABLED || !userId || !isFirebaseConfigured || !db) {
    return;
  }

  try {
    const logData = {
      userId,
      category,
      action,
      details,
      timestamp: Timestamp.now(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      ipAddress: 'unknown' // In a real app, you'd get this from the server
    };

    await addDoc(collection(db, 'activity_logs'), logData);
  } catch (error) {
    // Silently fail for logging errors - don't spam console in production
    if (process.env.NODE_ENV === 'development') {
      console.warn('Activity logging failed:', error);
    }
    // Don't throw error as logging shouldn't break the app
  }
};

export const getUserActivityLogs = async (
  userId: string,
  limitCount: number = 50
): Promise<ActivityLog[]> => {
  try {
    if (!isFirebaseConfigured || !db) {
      return [];
    }
    const q = query(
      collection(db, 'activity_logs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as ActivityLog[];
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return [];
  }
};

export const getSystemActivityLogs = async (
  limitCount: number = 100
): Promise<ActivityLog[]> => {
  try {
    if (!isFirebaseConfigured || !db) {
      return [];
    }
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as ActivityLog[];
  } catch (error) {
    console.error('Error getting system activity logs:', error);
    return [];
  }
};

// Predefined action types for consistency
export const LOG_ACTIONS = {
  AUTH: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    SESSION_RESTORED: 'session_restored'
  },
  TRANSACTION: {
    CREATE: 'create_transaction',
    UPDATE: 'update_transaction',
    DELETE: 'delete_transaction',
    VIEW: 'view_transactions',
    EXPORT: 'export_transactions'
  },
  PROFILE: {
    VIEW: 'view_profile',
    UPDATE: 'update_profile',
    CHANGE_THEME: 'change_theme'
  },
  NAVIGATION: {
    PAGE_VIEW: 'page_view',
    MODAL_OPEN: 'modal_open',
    MODAL_CLOSE: 'modal_close'
  },
  SYSTEM: {
    ERROR: 'error',
    PERFORMANCE: 'performance_metric'
  },
  SETTINGS: {
    DATA_EXPORT: 'data_export',
    DATA_IMPORT: 'data_import',
    DATA_DELETE: 'data_delete'
  }
} as const;