/**
 * Google Cloud Storage service: uploads job photos / generated PDFs and hands
 * back short-lived signed URLs for reading them. Objects are private —
 * nothing in the bucket needs a public ACL.
 */
import { Storage } from '@google-cloud/storage'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME
const SIGNED_URL_EXPIRY_MINUTES = Number(process.env.GCS_SIGNED_URL_EXPIRY_MINUTES ?? 15)

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  // GOOGLE_APPLICATION_CREDENTIALS env var is picked up automatically by the
  // client library; falls back to Application Default Credentials on GCP.
})

function getBucket() {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')
  return storage.bucket(BUCKET_NAME)
}

export interface UploadResult {
  storagePath: string
  signedUrl: string
}

/**
 * Uploads a buffer (e.g. a multer file) to `path/within/bucket` and returns
 * a signed read URL valid for GCS_SIGNED_URL_EXPIRY_MINUTES.
 */
export async function uploadObject(
  objectPath: string,
  data: Buffer,
  contentType: string
): Promise<UploadResult> {
  const file = getBucket().file(objectPath)
  await file.save(data, { contentType, resumable: false })
  const signedUrl = await getSignedUrl(objectPath)
  return { storagePath: objectPath, signedUrl }
}

/** Generates a fresh signed read URL for an already-uploaded object. */
export async function getSignedUrl(objectPath: string): Promise<string> {
  const [url] = await getBucket().file(objectPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_EXPIRY_MINUTES * 60 * 1000,
  })
  return url
}

export async function deleteObject(objectPath: string): Promise<void> {
  await getBucket().file(objectPath).delete({ ignoreNotFound: true })
}
