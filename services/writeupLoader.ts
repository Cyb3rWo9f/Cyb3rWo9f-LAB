import { Writeup } from '../types';
import { getFileFromStorage, listFilesInStorage } from './appwrite';

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

*Content has been redacted for security. Please sign in and get approved to view the full writeup.*
`;

// Cache for writeup file info (ID -> file details) to enable on-demand loading
const writeupFileCache = new Map<string, { fileId: string; fileName: string; isLocked: boolean }>();

/**
 * Simple Frontmatter Parser
 * Parses the block between --- at the top of the file
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
      // Handle simple arrays like [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        data[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        // Strip surrounding quotes for simple string values
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
 * Auth context for loading writeups securely
 */
export interface WriteupAuthContext {
  isAuthenticated: boolean;
  isApproved: boolean;
}

// Load all writeups from Appwrite storage bucket
// Now requires auth context to properly secure locked content
export const loadAllWriteups = async (authContext?: WriteupAuthContext): Promise<Writeup[]> => {
  const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
  if (!bucketId) {
    console.error('VITE_APPWRITE_BUCKET_ID not configured in .env');
    return [];
  }
  
  return loadWriteupsFromStorage(authContext);
};

// Load writeups from Appwrite storage
// SECURITY: Locked writeup content is NEVER fetched for unauthorized users
// 
// IMPORTANT: For this to work securely, locked writeups MUST follow this naming convention:
// - Locked files: [LOCKED]-filename.md  (e.g., "[LOCKED]-web-pentesting-basics.md")
// - Public files: filename.md (no prefix)
// 
// This allows us to identify locked files WITHOUT fetching them, preventing content exposure
export const loadWriteupsFromStorage = async (authContext?: WriteupAuthContext): Promise<Writeup[]> => {
  const writeups: Writeup[] = [];
  
  // Check if user can access locked content
  const canAccessLocked = authContext?.isAuthenticated && authContext?.isApproved;
  console.log(`🔐 Auth context: authenticated=${authContext?.isAuthenticated}, approved=${authContext?.isApproved}, canAccessLocked=${canAccessLocked}`);

  // First, list all files in the storage bucket
  const files = await listFilesInStorage();
  
  if (files.length === 0) {
    console.warn('No files found in Appwrite storage bucket.');
    return writeups;
  }

  // Filter to only .md files
  const mdFiles = files.filter(file => file.name.endsWith('.md'));
  console.log(`📄 Found ${mdFiles.length} markdown files in storage`);

  for (const file of mdFiles) {
    try {
      // SECURITY CHECK: Determine if file is locked from filename
      // Locked files use naming convention: [LOCKED]-filename.md or _locked_filename.md
      const isLockedByName = file.name.startsWith('[LOCKED]-') || 
                             file.name.startsWith('_locked_') ||
                             file.name.toLowerCase().includes('.locked.');
      
      // If file appears locked by name and user is NOT authorized, skip fetching entirely
      if (isLockedByName && !canAccessLocked) {
        console.log(`🔒 SKIPPING fetch for locked file: ${file.name} (user not authorized)`);
        
        // Create a placeholder writeup entry without fetching content
        const cleanName = file.name
          .replace('[LOCKED]-', '')
          .replace('_locked_', '')
          .replace('.locked.', '.')
          .replace('.md', '');
        
        const writeupId = cleanName;
        
        // Cache file info for later (when user becomes authorized)
        writeupFileCache.set(writeupId, { 
          fileId: file.$id, 
          fileName: file.name,
          isLocked: true 
        });
        
        writeups.push({
          id: writeupId,
          title: cleanName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
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
        
        continue; // Skip fetching this file
      }
      
      // File is either not locked OR user is authorized - fetch the content
      const content = await getFileFromStorage(file.$id);
      
      if (!content) {
        console.warn(`Failed to download writeup: ${file.name} (ID: ${file.$id})`);
        continue;
      }

      const { data, content: markdown } = parseFrontmatter(content);
      
      // Check locked status from frontmatter (for files without naming convention)
      const isLockedByFrontmatter = data.locked === 'true' || data.locked === true;
      const isLocked = isLockedByName || isLockedByFrontmatter;
      
      const writeupId = data.id || file.name
        .replace('[LOCKED]-', '')
        .replace('_locked_', '')
        .replace('.md', '');
      
      // Cache file info
      writeupFileCache.set(writeupId, { 
        fileId: file.$id, 
        fileName: file.name,
        isLocked 
      });
      
      // Determine final content
      let finalContent: string;
      let readingTime: string;
      
      // SECURITY: If locked by frontmatter (but not by name), we already fetched it
      // For truly secure implementation, ALL locked files should use naming convention
      if (isLockedByFrontmatter && !isLockedByName && !canAccessLocked) {
        console.warn(`⚠️ File ${file.name} is locked by frontmatter but NOT by naming convention!`);
        console.warn(`⚠️ Content was exposed in network. Rename to: [LOCKED]-${file.name}`);
        finalContent = LOCKED_CONTENT_PLACEHOLDER;
        readingTime = '? MIN';
      } else {
        finalContent = markdown;
        readingTime = calculateReadingTime(markdown);
      }
      
      console.log(`✅ Loaded: ${file.name}${isLocked ? ' [LOCKED]' : ''}`);

      writeups.push({
        id: writeupId,
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        date: data.date || '',
        readingTime,
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        content: finalContent,
        platform: data.platform || undefined,
        locked: isLocked,
        hints: Array.isArray(data.hints) ? data.hints : undefined
      });

    } catch (e) {
      console.error(`Failed to load writeup from storage: ${file.name}`, e);
    }
  }

  if (writeups.length === 0) {
    console.warn('No writeups found in Appwrite storage. Ensure files are uploaded and bucket is configured.');
  } else {
    const lockedCount = writeups.filter(w => w.locked).length;
    console.log(`Successfully loaded ${writeups.length} writeups (${lockedCount} locked)`);
  }

  return writeups;
};

/**
 * Load full content of a specific locked writeup
 * SECURITY: This should only be called when user is authenticated AND approved
 * The auth check should be performed BEFORE calling this function
 * 
 * @param writeupId - The ID of the writeup to load
 * @returns The full markdown content or null if not found
 */
export const loadLockedWriteupContent = async (writeupId: string): Promise<string | null> => {
  const fileInfo = writeupFileCache.get(writeupId);
  
  if (!fileInfo) {
    console.warn(`No cached file info for writeup: ${writeupId}`);
    return null;
  }
  
  try {
    const content = await getFileFromStorage(fileInfo.fileId);
    
    if (!content) {
      console.error(`Failed to fetch locked writeup content: ${writeupId}`);
      return null;
    }
    
    const { content: markdown } = parseFrontmatter(content);
    console.log(`✅ Loaded full content for authorized user: ${fileInfo.fileName}`);
    return markdown;
  } catch (error) {
    console.error(`Error loading locked writeup content: ${writeupId}`, error);
    return null;
  }
};

/**
 * Check if a writeup's content is the placeholder (stripped)
 */
export const isContentStripped = (content: string): boolean => {
  return content.includes('Content has been redacted for security');
};