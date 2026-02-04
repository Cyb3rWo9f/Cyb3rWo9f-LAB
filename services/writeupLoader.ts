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

// Cache for writeup metadata (ID -> file info) to enable on-demand loading
const writeupFileCache = new Map<string, { fileId: string; fileName: string }>();

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
// SECURITY: Locked content is only included if user is authenticated AND approved
export const loadWriteupsFromStorage = async (authContext?: WriteupAuthContext): Promise<Writeup[]> => {
  const writeups: Writeup[] = [];
  
  // Check if user can access locked content
  const canAccessLocked = authContext?.isAuthenticated && authContext?.isApproved;

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
      // Fetch file content using the file ID
      const content = await getFileFromStorage(file.$id);
      
      if (!content) {
        console.warn(`Failed to download writeup: ${file.name} (ID: ${file.$id})`);
        continue;
      }

      const { data, content: markdown } = parseFrontmatter(content);
      
      // Determine if this writeup is locked
      const isLocked = data.locked === 'true' || data.locked === true;
      
      // Cache the file info for on-demand loading
      const writeupId = data.id || file.name.replace('.md', '');
      writeupFileCache.set(writeupId, { fileId: file.$id, fileName: file.name });
      
      // SECURITY: Strip content for locked writeups if user is not authorized
      // This prevents content from being exposed in network tab
      let finalContent = markdown;
      if (isLocked && !canAccessLocked) {
        console.log(`🔒 Stripping content for locked writeup: ${file.name} (user not authorized)`);
        finalContent = LOCKED_CONTENT_PLACEHOLDER;
      }

      writeups.push({
        id: writeupId,
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        date: data.date || '',
        readingTime: calculateReadingTime(markdown), // Use real content for reading time
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        content: finalContent,
        platform: data.platform || undefined,
        locked: isLocked,
        hints: Array.isArray(data.hints) ? data.hints : undefined
      });

      console.log(`Loaded writeup: ${file.name}${isLocked ? ' [LOCKED]' : ''}`);
    } catch (e) {
      console.error(`Failed to load writeup from storage: ${file.name}`, e);
    }
  }

  if (writeups.length === 0) {
    console.warn('No writeups found in Appwrite storage. Ensure files are uploaded and bucket is configured.');
  } else {
    console.log(`Successfully loaded ${writeups.length} writeups from Appwrite storage`);
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