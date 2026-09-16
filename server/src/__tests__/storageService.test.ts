const mockFileObj = {
  save: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockResolvedValue(['https://signed.example/object']),
  delete: jest.fn().mockResolvedValue(undefined),
}
const mockBucketObj = {
  file: jest.fn(() => mockFileObj),
}
const mockStorageInstance = {
  bucket: jest.fn(() => mockBucketObj),
}

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => mockStorageInstance),
}))

const OLD_ENV = process.env

describe('storageService', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV, GCS_BUCKET_NAME: 'sbg-photos' }
    mockFileObj.save.mockClear()
    mockFileObj.getSignedUrl.mockClear().mockResolvedValue(['https://signed.example/object'])
    mockFileObj.delete.mockClear()
    mockBucketObj.file.mockClear()
    mockStorageInstance.bucket.mockClear()
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('uploads a buffer and returns the storage path and signed URL', async () => {
    const { uploadObject } = require('../services/storageService')

    const result = await uploadObject('jobs/1/photo.jpg', Buffer.from('data'), 'image/jpeg')

    expect(mockStorageInstance.bucket).toHaveBeenCalledWith('sbg-photos')
    expect(mockBucketObj.file).toHaveBeenCalledWith('jobs/1/photo.jpg')
    expect(mockFileObj.save).toHaveBeenCalledWith(Buffer.from('data'), { contentType: 'image/jpeg', resumable: false })
    expect(mockFileObj.getSignedUrl).toHaveBeenCalled()
    expect(result).toEqual({ storagePath: 'jobs/1/photo.jpg', signedUrl: 'https://signed.example/object' })
  })

  it('throws when GCS_BUCKET_NAME is not configured', async () => {
    delete process.env.GCS_BUCKET_NAME
    const { uploadObject } = require('../services/storageService')

    await expect(uploadObject('x', Buffer.from(''), 'text/plain')).rejects.toThrow('GCS_BUCKET_NAME is not configured')
  })

  it('generates a signed read URL with an expiry in the future', async () => {
    const { getSignedUrl } = require('../services/storageService')
    const before = Date.now()

    const url = await getSignedUrl('jobs/1/doc.pdf')

    expect(url).toBe('https://signed.example/object')
    const opts = mockFileObj.getSignedUrl.mock.calls[0][0]
    expect(opts.action).toBe('read')
    expect(opts.expires).toBeGreaterThan(before)
  })

  it('honours a custom GCS_SIGNED_URL_EXPIRY_MINUTES', async () => {
    process.env.GCS_SIGNED_URL_EXPIRY_MINUTES = '60'
    const { getSignedUrl } = require('../services/storageService')
    const before = Date.now()

    await getSignedUrl('jobs/1/doc.pdf')

    const opts = mockFileObj.getSignedUrl.mock.calls[0][0]
    expect(opts.expires).toBeGreaterThanOrEqual(before + 59 * 60 * 1000)
  })

  it('deletes an object, ignoring not-found errors', async () => {
    const { deleteObject } = require('../services/storageService')

    await deleteObject('jobs/1/photo.jpg')

    expect(mockBucketObj.file).toHaveBeenCalledWith('jobs/1/photo.jpg')
    expect(mockFileObj.delete).toHaveBeenCalledWith({ ignoreNotFound: true })
  })
})
