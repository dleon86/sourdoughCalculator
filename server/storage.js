// Where photo files live. In the cloud: a private Vercel Blob store, so a
// photo is only reachable through our signed-in /api/photos route. Locally:
// the uploads/ folder.
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const UPLOAD_DIR = path.join(import.meta.dirname, '..', 'uploads');

const blob = useBlob ? await import('@vercel/blob') : null;

export async function saveFile(key, buffer, contentType) {
  if (blob) {
    await blob.put(key, buffer, { access: 'private', contentType, addRandomSuffix: false });
    return;
  }
  const file = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
}

// Returns a Node readable stream, or null when the file is gone.
export async function readFile(key) {
  if (blob) {
    const result = await blob.get(key, { access: 'private' });
    return result?.statusCode === 200 ? Readable.fromWeb(result.stream) : null;
  }
  try {
    const file = path.join(UPLOAD_DIR, key);
    await fs.access(file);
    return (await import('node:fs')).createReadStream(file);
  } catch {
    return null;
  }
}

export async function deleteFile(key) {
  if (blob) {
    await blob.del(key);
    return;
  }
  await fs.rm(path.join(UPLOAD_DIR, key), { force: true });
}
