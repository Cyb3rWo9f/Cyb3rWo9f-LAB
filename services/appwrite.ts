// Appwrite Configuration from environment variables
// NOTE: Only endpoint, project ID, database ID, collection ID, and bucket ID are needed
// API keys should NEVER be exposed in frontend code
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const APPWRITE_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

// Validate Appwrite configuration (API key no longer required for public reads)
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_ID || !APPWRITE_COLLECTION_ID) {
  console.warn('Appwrite is not fully configured. Please set all environment variables in .env file.');
}

if (!APPWRITE_BUCKET_ID) {
  console.warn('APPWRITE_BUCKET_ID is not configured. Storage operations will fail.');
}

// Appwrite REST API functions
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: any;
}

// ========================================
// WRITE OPERATIONS - DISABLED FOR SECURITY
// These should only be done via Appwrite Console or a secure backend
// ========================================

// Create document - DISABLED (use Appwrite Console)
export async function setDocument(_data: any): Promise<AppwriteDocument | null> {
  console.error('setDocument is disabled for security. Use Appwrite Console for write operations.');
  return null;
}

// Update document - DISABLED (use Appwrite Console)
export async function updateDocument(_documentId: string, _data: Record<string, any>): Promise<AppwriteDocument | null> {
  console.error('updateDocument is disabled for security. Use Appwrite Console for write operations.');
  return null;
}

// ========================================
// ========================================
// READ OPERATIONS - Public access (no API key needed)
// Requires Appwrite permissions: Any -> Read
// ========================================

// Get all documents from collection using cursor-based pagination (stable ordering)
export async function getDocuments(): Promise<AppwriteDocument[]> {
  try {
    const limit = 100; // maximum page size supported
    const allDocs: AppwriteDocument[] = [];
    let page = 0;
    let offset = 0;

    while (true) {
      // Use JSON-encoded queries for Appwrite 1.x REST API
      const queries = [
        JSON.stringify({ method: 'limit', values: [limit] }),
        JSON.stringify({ method: 'offset', values: [offset] }),
        JSON.stringify({ method: 'orderDesc', values: ['publishedAt'] })
      ];
      const queryString = queries.map(q => `queries[]=${encodeURIComponent(q)}`).join('&');
      const url = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${APPWRITE_COLLECTION_ID}/documents?${queryString}`;
      console.log(`Fetching documents page ${page + 1} (limit=${limit}, offset=${offset})`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch documents:', response.status, errorText);
        break;
      }

      const data = await response.json();
      const docs: AppwriteDocument[] = data.documents || [];
      const total = data.total || 0;

      console.log(`Page ${page + 1}: ${docs.length} docs (reported total: ${total})`);

      allDocs.push(...docs);

      // Stop if no docs returned
      if (docs.length === 0) break;

      // Stop if we've reached or exceeded the reported total
      if (total > 0 && allDocs.length >= total) break;

      // Advance offset by actual docs received (Appwrite may cap below our limit)
      page += 1;
      offset += docs.length;
      if (page > 50) {
        console.warn('Stopping pagination after 50 pages to avoid infinite loop');
        break;
      }
    }

    // Deduplicate by document id (defensive)
    const seenIds = new Set<string>();
    const uniqueDocs = allDocs.filter((doc: any) => {
      const docId = doc.$id || doc.id;
      if (seenIds.has(docId)) return false;
      seenIds.add(docId);
      return true;
    });

    if (uniqueDocs.length < allDocs.length) {
      console.log(`Deduplicated: ${allDocs.length} -> ${uniqueDocs.length} documents`);
    }

    console.log(`Fetched ${uniqueDocs.length} unique documents total`);
    return uniqueDocs;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

// Get a specific document
export async function getDocument(documentId: string): Promise<AppwriteDocument | null> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${APPWRITE_COLLECTION_ID}/documents/${documentId}`,
      {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }

    const doc = await response.json();
    
    // Parse JSON strings back to objects
    const parsed = { ...doc } as AppwriteDocument;
    for (const key in parsed) {
      if (typeof parsed[key] === 'string' && key !== '$id' && key !== '$createdAt' && key !== '$updatedAt') {
        try {
          parsed[key] = JSON.parse(parsed[key]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

// Delete document - DISABLED (use Appwrite Console)
export async function deleteDocument(_documentId: string): Promise<boolean> {
  console.error('deleteDocument is disabled for security. Use Appwrite Console for delete operations.');
  return false;
}

// ========================================
// STORAGE FUNCTIONS
// ========================================

// Upload file - DISABLED (use Appwrite Console)
export async function uploadFileToStorage(_fileName: string, _fileContent: string): Promise<any | null> {
  console.error('uploadFileToStorage is disabled for security. Use Appwrite Console for uploads.');
  return null;
}

// Update file - DISABLED (use Appwrite Console)
export async function updateFileInStorage(_fileName: string, _fileContent: string): Promise<any | null> {
  console.error('updateFileInStorage is disabled for security. Use Appwrite Console for updates.');
  return null;
}

// List all files in the storage bucket (PUBLIC READ)
export async function listFilesInStorage(): Promise<{ $id: string; name: string; mimeType: string; sizeOriginal: number }[]> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to list files in storage:', response.status);
      return [];
    }

    const result = await response.json();
    console.log(`Found ${result.files?.length || 0} files in storage bucket`);
    return result.files || [];
  } catch (error) {
    console.error('Error listing files in storage:', error);
    return [];
  }
}

// Get a file from storage by file ID
export async function getFileFromStorage(fileId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download`,
      {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch file ${fileId}:`, response.status);
      return null;
    }

    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error fetching file from storage:', error);
    return null;
  }
}

// Delete file - DISABLED (use Appwrite Console)
export async function deleteFileFromStorage(_fileName: string): Promise<boolean> {
  console.error('deleteFileFromStorage is disabled for security. Use Appwrite Console for deletes.');
  return false;
}