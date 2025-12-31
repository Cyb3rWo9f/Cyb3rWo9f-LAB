import { Writeup } from '../types';
import { getFileFromStorage, listFilesInStorage } from './appwrite';

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

// Load all writeups from Appwrite storage bucket
export const loadAllWriteups = async (): Promise<Writeup[]> => {
  const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
  if (!bucketId) {
    console.error('VITE_APPWRITE_BUCKET_ID not configured in .env');
    return [];
  }
  
  return loadWriteupsFromStorage();
};

// Load writeups from Appwrite storage
export const loadWriteupsFromStorage = async (): Promise<Writeup[]> => {
  const writeups: Writeup[] = [];

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

      writeups.push({
        id: data.id || file.name.replace('.md', ''),
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        date: data.date || '',
        readingTime: calculateReadingTime(markdown),
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        content: markdown,
        platform: data.platform || undefined,
        locked: data.locked === 'true' || data.locked === true,
        hints: Array.isArray(data.hints) ? data.hints : undefined
      });

      console.log(`Loaded writeup: ${file.name}`);
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