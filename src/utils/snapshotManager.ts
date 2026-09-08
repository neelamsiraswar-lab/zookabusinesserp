import { 
  SystemSnapshotPayload, 
  SystemSnapshotMetadata, 
  SystemSnapshotTrigger, 
  AutoSnapshotConfig 
} from '../types';

const DB_NAME = 'zookabusiness_snapshot_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const CONFIG_KEY = 'zookabusiness_auto_snapshot_config';
const LEGACY_CONFIG_KEY = 'vyaparflow_auto_snapshot_config';
const LOCAL_STORAGE_FALLBACK_KEY = 'zookabusiness_snapshot_vault_fallback';
const LEGACY_LOCAL_STORAGE_FALLBACK_KEY = 'vyaparflow_snapshot_vault_fallback';

export const DEFAULT_AUTO_SNAPSHOT_CONFIG: AutoSnapshotConfig = {
  enabled: true,
  intervalHours: 24,
  autoDownloadJson: false,
  maxVaultSnapshots: 10,
  createSafetyPointOnRestore: true,
  lastSnapshotTimestamp: undefined,
  nextScheduledSnapshotTimestamp: undefined
};

// Open or initialize IndexedDB
const openSnapshotDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'metadata.id' });
        store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        store.createIndex('triggerType', 'metadata.triggerType', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Simple DJB2-based fast string checksum
export const generateDataChecksum = (content: string): string => {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return `ZB-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
};

// Format byte sizes into KB / MB
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Load Auto Snapshot Config
export const getStoredAutoSnapshotConfig = (): AutoSnapshotConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTO_SNAPSHOT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load auto snapshot config:', e);
  }
  return { ...DEFAULT_AUTO_SNAPSHOT_CONFIG };
};

// Save Auto Snapshot Config
export const saveStoredAutoSnapshotConfig = (config: AutoSnapshotConfig): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save auto snapshot config:', e);
  }
};

// Build standard snapshot metadata from raw parts
export const buildSnapshotMetadata = (
  payload: Omit<SystemSnapshotPayload, 'metadata'>,
  triggerType: SystemSnapshotTrigger,
  customLabel?: string
): SystemSnapshotMetadata => {
  const jsonStr = JSON.stringify(payload);
  const sizeBytes = new Blob([jsonStr]).size;
  const now = new Date().toISOString();
  const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let defaultLabel = 'Manual System Snapshot';
  if (triggerType === 'SCHEDULED_AUTO') {
    defaultLabel = 'Scheduled Auto Snapshot';
  } else if (triggerType === 'PRE_RESTORE_RECOVERY') {
    defaultLabel = 'Pre-Restore Recovery Point';
  } else if (triggerType === 'PRE_IMPORT') {
    defaultLabel = 'Pre-Import Recovery Snapshot';
  } else if (triggerType === 'PERIODIC_VAULT') {
    defaultLabel = 'Periodic Archive Snapshot';
  }

  return {
    id,
    timestamp: now,
    label: customLabel?.trim() || defaultLabel,
    triggerType,
    appName: payload.appName || 'Zooka Business',
    version: payload.version || '2.5.0',
    companiesCount: payload.companies?.length || 0,
    invoicesCount: payload.invoices?.length || 0,
    productsCount: payload.products?.length || 0,
    partiesCount: payload.parties?.length || 0,
    paymentsCount: payload.payments?.length || 0,
    expensesCount: payload.expenses?.length || 0,
    purchaseBillsCount: payload.purchaseBills?.length || 0,
    journalEntriesCount: payload.journalEntries?.length || 0,
    chequesCount: payload.cheques?.length || 0,
    usersCount: payload.users?.length || 0,
    sizeBytes,
    fileChecksum: generateDataChecksum(jsonStr)
  };
};

// Save Snapshot to Vault (IndexedDB with LocalStorage fallback)
export const saveSnapshotToVault = async (snapshot: SystemSnapshotPayload): Promise<void> => {
  try {
    const db = await openSnapshotDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Enforce retention limits
    const config = getStoredAutoSnapshotConfig();
    const all = await getAllSnapshotsFromVault();
    if (all.length > config.maxVaultSnapshots) {
      // Sort oldest first
      const sorted = [...all].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const toDelete = sorted.slice(0, all.length - config.maxVaultSnapshots);
      for (const item of toDelete) {
        // Do not auto-delete recovery points unless strictly necessary
        if (item.triggerType !== 'PRE_RESTORE_RECOVERY' || all.length > config.maxVaultSnapshots + 3) {
          await deleteSnapshotFromVault(item.id);
        }
      }
    }
  } catch (e) {
    console.warn('IndexedDB save failed, attempting LocalStorage fallback:', e);
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      let list: SystemSnapshotPayload[] = raw ? JSON.parse(raw) : [];
      list = list.filter(s => s.metadata.id !== snapshot.metadata.id);
      list.push(snapshot);
      if (list.length > 5) list = list.slice(list.length - 5);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(list));
    } catch (fallbackError) {
      console.error('Snapshot vault storage failed entirely:', fallbackError);
    }
  }
};

// Get all snapshot metadata summaries
export const getAllSnapshotsFromVault = async (): Promise<SystemSnapshotMetadata[]> => {
  try {
    const db = await openSnapshotDb();
    return await new Promise<SystemSnapshotMetadata[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const fullList: SystemSnapshotPayload[] = req.result || [];
        const metaList = fullList.map(item => item.metadata || buildSnapshotMetadata(item, 'MANUAL_EXPORT'));
        // Sort newest first
        metaList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(metaList);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB read failed, checking LocalStorage fallback:', e);
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || localStorage.getItem(LEGACY_LOCAL_STORAGE_FALLBACK_KEY);
      if (raw) {
        const list: SystemSnapshotPayload[] = JSON.parse(raw);
        return list.map(item => item.metadata).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (fallbackError) {
      console.error('LocalStorage fallback read failed:', fallbackError);
    }
    return [];
  }
};

// Retrieve a full snapshot payload by ID
export const getSnapshotPayloadById = async (id: string): Promise<SystemSnapshotPayload | null> => {
  try {
    const db = await openSnapshotDb();
    return await new Promise<SystemSnapshotPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      if (raw) {
        const list: SystemSnapshotPayload[] = JSON.parse(raw);
        const found = list.find(s => s.metadata.id === id);
        return found || null;
      }
    } catch (fallbackError) {
      console.error('Error fetching snapshot by ID:', fallbackError);
    }
    return null;
  }
};

// Delete snapshot from vault
export const deleteSnapshotFromVault = async (id: string): Promise<void> => {
  try {
    const db = await openSnapshotDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB delete failed, updating fallback:', e);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    if (raw) {
      let list: SystemSnapshotPayload[] = JSON.parse(raw);
      list = list.filter(s => s.metadata.id !== id);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Failed to delete from fallback:', err);
  }
};

// Clear entire vault
export const clearSnapshotVault = async (): Promise<void> => {
  try {
    const db = await openSnapshotDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed clearing IndexedDB store:', e);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
  } catch (err) {
    console.error('Failed clearing fallback:', err);
  }
};

// Export and download snapshot payload as a timestamped JSON file
export const downloadSnapshotAsJsonFile = (
  snapshot: SystemSnapshotPayload,
  customPrefix = 'ZookaBusiness_System_Snapshot'
): void => {
  try {
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const dateStr = new Date(snapshot.metadata?.timestamp || new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `${customPrefix}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to trigger snapshot download:', e);
  }
};

// Validate uploaded snapshot or imported JSON
export const validateSystemSnapshotFile = (
  parsed: any
): {
  isValid: boolean;
  error?: string;
  payload?: SystemSnapshotPayload;
  metadata?: SystemSnapshotMetadata;
} => {
  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, error: 'Invalid JSON file structure.' };
  }

  // Must have business profile or companies
  if (!parsed.business && !parsed.companies) {
    return { isValid: false, error: 'Missing core business or company profile records.' };
  }

  // Build or extract metadata
  const metadata: SystemSnapshotMetadata = parsed.metadata || {
    id: `import_${Date.now()}`,
    timestamp: parsed.exportedAt || new Date().toISOString(),
    label: parsed.label || 'Imported JSON Snapshot',
    triggerType: 'MANUAL_EXPORT',
    appName: parsed.appName || 'Zooka Business',
    version: parsed.version || '2.5.0',
    companiesCount: Array.isArray(parsed.companies) ? parsed.companies.length : (parsed.business ? 1 : 0),
    invoicesCount: Array.isArray(parsed.invoices) ? parsed.invoices.length : 0,
    productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
    partiesCount: Array.isArray(parsed.parties) ? parsed.parties.length : 0,
    paymentsCount: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
    expensesCount: Array.isArray(parsed.expenses) ? parsed.expenses.length : 0,
    purchaseBillsCount: Array.isArray(parsed.purchaseBills) ? parsed.purchaseBills.length : 0,
    journalEntriesCount: Array.isArray(parsed.journalEntries) ? parsed.journalEntries.length : 0,
    chequesCount: Array.isArray(parsed.cheques) ? parsed.cheques.length : 0,
    usersCount: Array.isArray(parsed.users) ? parsed.users.length : 0,
    sizeBytes: new Blob([JSON.stringify(parsed)]).size,
    fileChecksum: generateDataChecksum(JSON.stringify(parsed))
  };

  const payload: SystemSnapshotPayload = {
    metadata,
    companies: Array.isArray(parsed.companies) ? parsed.companies : [],
    business: parsed.business || {},
    invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    products: Array.isArray(parsed.products) ? parsed.products : [],
    parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    purchaseBills: Array.isArray(parsed.purchaseBills) ? parsed.purchaseBills : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    accountHeads: Array.isArray(parsed.accountHeads) ? parsed.accountHeads : [],
    journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
    cheques: Array.isArray(parsed.cheques) ? parsed.cheques : [],
    chequeBooks: Array.isArray(parsed.chequeBooks) ? parsed.chequeBooks : [],
    chequeTemplates: Array.isArray(parsed.chequeTemplates) ? parsed.chequeTemplates : [],
    customHsnCodes: Array.isArray(parsed.customHsnCodes) ? parsed.customHsnCodes : [],
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    appName: parsed.appName || 'Zooka Business',
    version: parsed.version || '2.5.0'
  };

  return {
    isValid: true,
    payload,
    metadata
  };
};
