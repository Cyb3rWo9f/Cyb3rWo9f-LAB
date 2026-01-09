// Real-time VM Telemetry Service using Appwrite Realtime
// This reads telemetry data pushed by your VM agent

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TELEMETRY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TELEMETRY_COLLECTION_ID || 'telemetry';

// Telemetry data structure (matches what VM agent sends)
export interface TelemetryData {
  cpu_percent: number;      // 0-100
  memory_percent: number;   // 0-100
  memory_used_gb: number;   // Current RAM usage in GB
  memory_total_gb: number;  // Total RAM in GB
  disk_percent: number;     // 0-100
  network_sent_mbps: number; // Network upload speed
  network_recv_mbps: number; // Network download speed
  uptime_hours: number;     // VM uptime in hours
  status: 'online' | 'idle' | 'busy' | 'offline';
  last_updated: string;     // ISO timestamp
  // Scan detection data
  scans_detected: number;   // Total scans detected
  recent_scans: number;     // Recent scans (rolling window)
  last_scan_time: string | null; // Last scan timestamp
  scan_type: string | null; // Type of last scan (PORT_SCAN, SYN_SCAN, SERVICE_SCAN)
  under_attack: boolean;    // Currently detecting scans
}

// Default fallback data when VM is offline
const FALLBACK_DATA: TelemetryData = {
  cpu_percent: 0,
  memory_percent: 0,
  memory_used_gb: 0,
  memory_total_gb: 8,
  disk_percent: 0,
  network_sent_mbps: 0,
  network_recv_mbps: 0,
  uptime_hours: 0,
  status: 'offline',
  last_updated: new Date().toISOString(),
  scans_detected: 0,
  recent_scans: 0,
  last_scan_time: null,
  scan_type: null,
  under_attack: false,
};

// Callback type for real-time updates
export type TelemetryCallback = (data: TelemetryData) => void;

// Store the WebSocket connection
let realtimeSocket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Subscribers for real-time updates
const subscribers: Set<TelemetryCallback> = new Set();

// Fetch latest telemetry from Appwrite (polling fallback)
export async function fetchTelemetry(): Promise<TelemetryData> {
  try {
    // Get the single telemetry document (document ID: "vm_stats")
    const url = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${TELEMETRY_COLLECTION_ID}/documents/vm_stats`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID
      }
    });

    if (!response.ok) {
      console.warn('Telemetry fetch failed, VM may be offline');
      return { ...FALLBACK_DATA, status: 'offline' };
    }

    const doc = await response.json();
    
    // Check if data is stale (no update in last 30 seconds)
    const lastUpdate = new Date(doc.last_updated || doc.$updatedAt);
    const now = new Date();
    const staleness = (now.getTime() - lastUpdate.getTime()) / 1000;
    
    if (staleness > 30) {
      return {
        ...mapDocumentToTelemetry(doc),
        status: 'offline'
      };
    }

    return mapDocumentToTelemetry(doc);
  } catch (error) {
    console.error('Failed to fetch telemetry:', error);
    return { ...FALLBACK_DATA, status: 'offline' };
  }
}

// Map Appwrite document to TelemetryData
function mapDocumentToTelemetry(doc: any): TelemetryData {
  return {
    cpu_percent: doc.cpu_percent ?? 0,
    memory_percent: doc.memory_percent ?? 0,
    memory_used_gb: doc.memory_used_gb ?? 0,
    memory_total_gb: doc.memory_total_gb ?? 8,
    disk_percent: doc.disk_percent ?? 0,
    network_sent_mbps: doc.network_sent_mbps ?? 0,
    network_recv_mbps: doc.network_recv_mbps ?? 0,
    uptime_hours: doc.uptime_hours ?? 0,
    status: doc.status ?? 'offline',
    last_updated: doc.last_updated ?? doc.$updatedAt ?? new Date().toISOString(),
    // Scan detection fields
    scans_detected: doc.scans_detected ?? 0,
    recent_scans: doc.recent_scans ?? 0,
    last_scan_time: doc.last_scan_time ?? null,
    scan_type: doc.scan_type ?? null,
    under_attack: doc.under_attack ?? false,
  };
}

// Subscribe to real-time telemetry updates
export function subscribeToTelemetry(callback: TelemetryCallback): () => void {
  subscribers.add(callback);
  
  // Start real-time connection if this is the first subscriber
  if (subscribers.size === 1) {
    connectRealtime();
  }
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
    
    // Close connection if no more subscribers
    if (subscribers.size === 0 && realtimeSocket) {
      realtimeSocket.close();
      realtimeSocket = null;
    }
  };
}

// Connect to Appwrite Realtime
function connectRealtime() {
  if (realtimeSocket?.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  try {
    // Appwrite Realtime WebSocket URL
    const wsEndpoint = APPWRITE_ENDPOINT.replace('https://', 'wss://').replace('/v1', '');
    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${TELEMETRY_COLLECTION_ID}.documents`;
    const wsUrl = `${wsEndpoint}/v1/realtime?project=${APPWRITE_PROJECT_ID}&channels[]=${encodeURIComponent(channel)}`;

    console.log('Connecting to Appwrite Realtime for telemetry...');
    realtimeSocket = new WebSocket(wsUrl);

    realtimeSocket.onopen = () => {
      console.log('✅ Telemetry realtime connected');
      reconnectAttempts = 0;
    };

    realtimeSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle realtime events
        if (message.type === 'event' && message.data?.payload) {
          const telemetry = mapDocumentToTelemetry(message.data.payload);
          
          // Notify all subscribers
          subscribers.forEach(callback => {
            try {
              callback(telemetry);
            } catch (err) {
              console.error('Telemetry callback error:', err);
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse realtime message:', err);
      }
    };

    realtimeSocket.onerror = (error) => {
      console.error('Telemetry realtime error:', error);
    };

    realtimeSocket.onclose = () => {
      console.log('Telemetry realtime disconnected');
      realtimeSocket = null;
      
      // Attempt reconnection if there are still subscribers
      if (subscribers.size > 0 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(connectRealtime, RECONNECT_DELAY);
      }
    };
  } catch (error) {
    console.error('Failed to connect to realtime:', error);
  }
}

// Calculate if VM is considered online (updated within last 30 seconds)
export function isVMOnline(telemetry: TelemetryData): boolean {
  if (telemetry.status === 'offline') return false;
  
  const lastUpdate = new Date(telemetry.last_updated);
  const now = new Date();
  const staleness = (now.getTime() - lastUpdate.getTime()) / 1000;
  
  return staleness < 30;
}

// Format uptime for display
export function formatUptime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  } else if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(0)}h`;
  }
}
