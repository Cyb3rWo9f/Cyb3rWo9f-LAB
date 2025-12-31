#!/usr/bin/env node
import dotenv from 'dotenv';
import {
  Client,
  Databases,
  Permission,
  Role,
  Query
} from 'node-appwrite';

// Load environment variables
dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const APPWRITE_ENDPOINT = requireEnv('VITE_APPWRITE_ENDPOINT');
const APPWRITE_PROJECT_ID = requireEnv('VITE_APPWRITE_PROJECT_ID');
const APPWRITE_API_KEY = requireEnv('VITE_APPWRITE_API_KEY');
const APPWRITE_DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'news-db';
const APPWRITE_COLLECTION_ID = process.env.VITE_APPWRITE_COLLECTION_ID || 'articles';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function ensureDatabase(dbId) {
  try {
    await databases.get(dbId);
    console.log(`✓ Database exists: ${dbId}`);
  } catch (err) {
    console.log(`Creating database: ${dbId}`);
    await databases.create(dbId, 'News Database');
    console.log('✓ Database created');
  }
}

async function ensureCollection(dbId, collectionId) {
  try {
    await databases.getCollection(dbId, collectionId);
    console.log(`✓ Collection exists: ${collectionId}`);
    return;
  } catch (err) {
    console.log(`Creating collection: ${collectionId}`);
    await databases.createCollection(dbId, collectionId, collectionId, [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]);
    console.log('✓ Collection created');
  }
}

async function ensureAttribute(createFn, label) {
  try {
    await createFn();
    console.log(`✓ Attribute ensured: ${label}`);
  } catch (err) {
    // Ignore "attribute already exists"
    if (err?.response?.code === 409) {
      console.log(`↺ Attribute already exists: ${label}`);
    } else {
      console.warn(`⚠️ Attribute issue (${label}):`, err.message || err);
    }
  }
}

async function ensureIndex(createFn, label) {
  try {
    await createFn();
    console.log(`✓ Index ensured: ${label}`);
  } catch (err) {
    if (err?.response?.code === 409) {
      console.log(`↺ Index already exists: ${label}`);
    } else {
      console.warn(`⚠️ Index issue (${label}):`, err.message || err);
    }
  }
}

async function ensureSchema(dbId, collectionId) {
  await ensureAttribute(
    () => databases.createStringAttribute(dbId, collectionId, 'title', 255, true),
    'title'
  );
  await ensureAttribute(
    () => databases.createStringAttribute(dbId, collectionId, 'description', 500, true),
    'description'
  );
  await ensureAttribute(
    () => databases.createStringAttribute(dbId, collectionId, 'url', 255, true),
    'url'
  );
  await ensureAttribute(
    () => databases.createStringAttribute(dbId, collectionId, 'source', 100, true),
    'source'
  );
  await ensureAttribute(
    () => databases.createDatetimeAttribute(dbId, collectionId, 'publishedAt', true),
    'publishedAt'
  );
  await ensureAttribute(
    () => databases.createEnumAttribute(dbId, collectionId, 'category', ['exploit', 'cve', 'breach', 'general'], true),
    'category'
  );
  await ensureAttribute(
    () => databases.createEnumAttribute(dbId, collectionId, 'severity', ['critical', 'high', 'medium', 'low'], false, 'low'),
    'severity'
  );
  await ensureAttribute(
    () => databases.createEnumAttribute(dbId, collectionId, 'type', ['article', 'metadata'], true, 'article'),
    'type'
  );

  // Indexes for performance and uniqueness
  await ensureIndex(
    () => databases.createIndex(dbId, collectionId, 'idx_publishedAt_desc', 'key', ['publishedAt'], ['DESC']),
    'idx_publishedAt_desc'
  );
  await ensureIndex(
    () => databases.createIndex(dbId, collectionId, 'idx_category', 'key', ['category'], ['ASC']),
    'idx_category'
  );
  await ensureIndex(
    () => databases.createIndex(dbId, collectionId, 'idx_type', 'key', ['type'], ['ASC']),
    'idx_type'
  );
  await ensureIndex(
    () => databases.createIndex(dbId, collectionId, 'uniq_url', 'unique', ['url']),
    'uniq_url'
  );
}

async function clearDocuments(dbId, collectionId) {
  let totalDeleted = 0;

  while (true) {
    // Grab a snapshot of up to 100 ids; delete them; repeat until empty
    const res = await databases.listDocuments(dbId, collectionId, [Query.limit(100)]);
    if (!res.documents.length) break;

    const ids = res.documents.map((d) => d.$id);
    for (const id of ids) {
      await databases.deleteDocument(dbId, collectionId, id);
      totalDeleted += 1;
      if (totalDeleted % 25 === 0) {
        console.log(`Deleted ${totalDeleted} documents...`);
      }
    }
  }
  console.log(`✓ Cleared documents: ${totalDeleted}`);
}

async function main() {
  console.log('🚨 Resetting Appwrite database + collection...');
  await ensureDatabase(APPWRITE_DATABASE_ID);
  await ensureCollection(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
  await ensureSchema(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
  await clearDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
  console.log('✅ Reset complete. Collection is empty and schema verified.');
  console.log('You can now run your app to repopulate from the RSS background sync.');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
