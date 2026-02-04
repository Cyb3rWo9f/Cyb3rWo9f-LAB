import { Writeup } from '../types';
import { getAuthHeaders } from './auth';

/**
 * Secure Writeup Loader v2
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DATABASE: writeups_meta collection (PUBLIC READ)              │
 * │  - Stores METADATA ONLY: title, excerpt, tags, locked status   │
 * │  - Contains fileId + bucketId references                       │
 * │  - NO ACTUAL CONTENT stored here                               │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *        ┌─────────────────────┴─────────────────────┐
 *        ▼                                           ▼
 * ┌──────────────────┐                    ┌──────────────────────┐
 * │  PUBLIC BUCKET   │                    │   PRIVATE BUCKET     │
 * │  (Anyone Read)   │                    │  (Auth+Approved Only)│
 * │                  │                    │                      │
 * │ Non-locked .md   │                    │   Locked .md files   │
 * │    files         │                    │                      │
 * └──────────────────┘                    └──────────────────────┘
 * 
 * SECURITY:
 * - Metadata is visible to all (titles, descriptions)
 * - Locked content is stored in PRIVATE bucket with Appwrite permissions
 * - Private bucket: Read permission = Users with 'approved' label
 * - Unauthorized users CANNOT fetch locked content at all (Appwrite blocks it)
 */

// Environment config
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const APPWRITE_WRITEUPS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_WRITEUPS_COLLECTION_ID || 'writeups_meta';
const APPWRITE_PUBLIC_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const APPWRITE_PRIVATE_BUCKET_ID = import.meta.env.VITE_APPWRITE_PRIVATE_BUCKET_ID;

// Placeholder content shown for locked writeups to unauthorized users
const LOCKED_CONTENT_PLACEHOLDER = `
> [!WARNING] Protected Content
> This writeup contains premium/exclusive content that requires approval.
> 
> **To access this content:**
> 1. Sign in with your Google account
> 2. Wait for admin approval
> 3. Once approved, full content will be available

---

*This content is protected. Sign in and get approved to view the full writeup.*
`;

/**
 * Auth context for loading writeups securely
 */
export interface WriteupAuthContext {
  isAuthenticated: boolean;
  isApproved: boolean;
}

/**
 * Writeup metadata from database
 */
interface WriteupMetadata {
  $id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string;  // JSON string
  platform: string;
  locked: boolean;
  hints: string; // JSON string
  readingTime: string;
  fileId: string;
  bucketId: string;
}

/**
 * Simple Frontmatter Parser
 */
function parseFrontmatter(content: string): { data: any, content: string } {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(fmRegex);
  
  if (!match) return { data: {}, content };

  const yamlBlock = match[1];
  const markdownBody = match[2];
  const data: any = {};

  yamlBlock.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        data[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        data[key.trim()] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  });

  return { data, content: markdownBody };
}

function calculateReadingTime(content: string): string {
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} MIN`;
}

/**
 * Fetch writeup metadata from database
 * This is PUBLIC - only contains titles, excerpts, etc. NO CONTENT
 */
async function fetchWriteupMetadata(): Promise<WriteupMetadata[]> {
  try {
    const queries = [
      JSON.stringify({ method: 'limit', values: [100] }),
      JSON.stringify({ method: 'orderDesc', values: ['date'] })
    ];
    const queryString = queries.map(q => `queries[]=${encodeURIComponent(q)}`).join('&');
    
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${APPWRITE_WRITEUPS_COLLECTION_ID}/documents?${queryString}`,
      {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      }
    );

    if (!response.ok) {
      console.warn('Writeups metadata collection not found, falling back to storage-only mode');
      return [];
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.warn('Failed to fetch writeup metadata:', error);
    return [];
  }
}

/**
 * List files in a storage bucket
 */
async function listFilesInBucket(bucketId: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files`,
      {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.files || [];
  } catch {
    return [];
  }
}

/**
 * Fetch file content from storage bucket
 * For private bucket, includes auth headers
 */
async function fetchFileContent(
  bucketId: string, 
  fileId: string, 
  requireAuth: boolean = false
): Promise<string | null> {
  try {
    const headers: HeadersInit = {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID
    };
    
    // Add auth headers for private bucket
    if (requireAuth) {
      const authHeaders = await getAuthHeaders();
      Object.assign(headers, authHeaders);
    }
    
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/download`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log(`🔒 Access denied to file ${fileId} - user not authorized`);
        return null;
      }
      console.error(`Failed to fetch file ${fileId}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching file content:', error);
    return null;
  }
}

/**
 * Load all writeups - SECURE VERSION
 * 
 * Priority order:
 * 1. Database mode (if writeups_meta collection exists) - MOST SECURE
 * 2. Legacy storage mode (fallback)
 */
export const loadAllWriteups = async (authContext?: WriteupAuthContext): Promise<Writeup[]> => {
  const canAccessLocked = authContext?.isAuthenticated && authContext?.isApproved;
  console.log(`🔐 Auth: authenticated=${authContext?.isAuthenticated}, approved=${authContext?.isApproved}`);

  // Try database mode first (new secure method)
  const metadata = await fetchWriteupMetadata();
  
  if (metadata.length > 0) {
    console.log(`📋 Database mode: Found ${metadata.length} writeups in metadata collection`);
    return loadFromDatabase(metadata, canAccessLocked || false);
  }
  
  // Fallback: Load from storage directly (legacy mode)
  console.log('📦 Legacy mode: Using storage-only (less secure)');
  return loadFromStorageLegacy(authContext);
};

/**
 * Load writeups from database metadata
 * Content is fetched separately based on lock status and bucket
 */
async function loadFromDatabase(
  metadata: WriteupMetadata[], 
  canAccessLocked: boolean
): Promise<Writeup[]> {
  const writeups: Writeup[] = [];

  for (const meta of metadata) {
    try {
      let content: string;
      let tags: string[] = [];
      let hints: string[] | undefined;
      
      // Parse JSON fields safely
      try { tags = JSON.parse(meta.tags || '[]'); } catch { tags = []; }
      try { 
        hints = JSON.parse(meta.hints || '[]'); 
        if (hints?.length === 0) hints = undefined;
      } catch { hints = undefined; }

      // Determine if this is in private bucket
      const isPrivateBucket = meta.bucketId === APPWRITE_PRIVATE_BUCKET_ID;

      if (meta.locked && !canAccessLocked) {
        // LOCKED & NOT AUTHORIZED: 
        // - Don't even TRY to fetch from private bucket (will fail anyway)
        // - Show placeholder content
        console.log(`🔒 BLOCKED: ${meta.title} (user not authorized, content not fetched)`);
        content = LOCKED_CONTENT_PLACEHOLDER;
      } else {
        // Either:
        // - NOT locked (fetch from public bucket)
        // - LOCKED but user IS authorized (fetch from private bucket with auth)
        const fileContent = await fetchFileContent(
          meta.bucketId, 
          meta.fileId, 
          isPrivateBucket // Use auth headers for private bucket
        );
        
        if (fileContent) {
          const parsed = parseFrontmatter(fileContent);
          content = parsed.content;
          console.log(`✅ Loaded: ${meta.title}${meta.locked ? ' [LOCKED-AUTHORIZED]' : ''}`);
        } else {
          // Could not fetch - might be permission denied for private bucket
          if (meta.locked) {
            console.log(`🔒 Access denied for: ${meta.title}`);
            content = LOCKED_CONTENT_PLACEHOLDER;
          } else {
            content = '*Failed to load content. Please try again later.*';
            console.warn(`⚠️ Failed to load: ${meta.title}`);
          }
        }
      }

      writeups.push({
        id: meta.$id,
        title: meta.title,
        excerpt: meta.excerpt || '',
        date: meta.date || '',
        readingTime: meta.locked && !canAccessLocked ? '? MIN' : (meta.readingTime || '5 MIN'),
        category: meta.category || 'Uncategorized',
        tags,
        content,
        platform: meta.platform || undefined,
        locked: meta.locked,
        hints
      });

    } catch (error) {
      console.error(`Failed to process writeup ${meta.$id}:`, error);
    }
  }

  const lockedCount = writeups.filter(w => w.locked).length;
  console.log(`📚 Loaded ${writeups.length} writeups (${lockedCount} locked)`);
  return writeups;
}

/**
 * Legacy: Load from storage bucket directly
 * Used when database collection doesn't exist
 * 
 * SECURITY NOTE: This mode is LESS SECURE because we must fetch files to check frontmatter
 * For secure operation, use the database mode with CLI tool
 */
async function loadFromStorageLegacy(authContext?: WriteupAuthContext): Promise<Writeup[]> {
  const writeups: Writeup[] = [];
  const canAccessLocked = authContext?.isAuthenticated && authContext?.isApproved;
  
  // List files in public bucket
  const files = await listFilesInBucket(APPWRITE_PUBLIC_BUCKET_ID);
  const mdFiles = files.filter((f: any) => f.name.endsWith('.md'));
  
  console.log(`📄 Found ${mdFiles.length} markdown files`);

  for (const file of mdFiles) {
    try {
      // Check if file is locked by naming convention
      const isLockedByName = file.name.startsWith('[LOCKED]-') || 
                             file.name.startsWith('_locked_') ||
                             file.name.toLowerCase().includes('.locked.');
      
      if (isLockedByName && !canAccessLocked) {
        // SKIP fetching locked files for unauthorized users
        console.log(`🔒 SKIPPED (by name): ${file.name}`);
        
        const cleanName = file.name
          .replace('[LOCKED]-', '')
          .replace('_locked_', '')
          .replace('.locked.', '.')
          .replace('.md', '');
        
        writeups.push({
          id: cleanName,
          title: cleanName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          excerpt: 'This content requires authentication and approval to view.',
          date: '',
          readingTime: '? MIN',
          category: 'Protected',
          tags: ['locked'],
          content: LOCKED_CONTENT_PLACEHOLDER,
          platform: undefined,
          locked: true,
          hints: undefined
        });
        continue;
      }
      
      // Fetch content
      const content = await fetchFileContent(APPWRITE_PUBLIC_BUCKET_ID, file.$id, false);
      
      if (!content) {
        console.warn(`Failed to download: ${file.name}`);
        continue;
      }

      const { data, content: markdown } = parseFrontmatter(content);
      const isLockedByFrontmatter = data.locked === 'true' || data.locked === true;
      const isLocked = isLockedByName || isLockedByFrontmatter;
      
      // SECURITY WARNING for files locked only by frontmatter
      if (isLockedByFrontmatter && !isLockedByName && !canAccessLocked) {
        console.warn(`⚠️ SECURITY: ${file.name} has locked:true but content was fetched!`);
        console.warn(`⚠️ Fix: Use CLI to push to private bucket, or rename to [LOCKED]-${file.name}`);
      }

      const writeupId = data.id || file.name.replace('.md', '').replace('[LOCKED]-', '');
      
      writeups.push({
        id: writeupId,
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        date: data.date || '',
        readingTime: isLocked && !canAccessLocked ? '? MIN' : calculateReadingTime(markdown),
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        content: isLocked && !canAccessLocked ? LOCKED_CONTENT_PLACEHOLDER : markdown,
        platform: data.platform || undefined,
        locked: isLocked,
        hints: Array.isArray(data.hints) ? data.hints : undefined
      });
      
      console.log(`✅ Loaded: ${file.name}${isLocked ? ' [LOCKED]' : ''}`);
      
    } catch (error) {
      console.error(`Failed to load ${file.name}:`, error);
    }
  }

  return writeups;
}

/**
 * Load full content for a specific locked writeup (on-demand)
 * Called when an authorized user wants to view locked content
 */
export const loadWriteupContent = async (
  writeupId: string,
  bucketId: string,
  fileId: string,
  isPrivate: boolean = false
): Promise<string | null> => {
  const content = await fetchFileContent(bucketId, fileId, isPrivate);
  if (!content) return null;
  const { content: markdown } = parseFrontmatter(content);
  return markdown;
};

/**
 * Check if content is the placeholder
 */
export const isContentStripped = (content: string): boolean => {
  return content.includes('This content is protected');
};
