const OLD_ENV = process.env

describe('docusealService — createSignatureRequest', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('throws without calling the API when DOCUSEAL_API_KEY is not configured', async () => {
    delete process.env.DOCUSEAL_API_KEY
    const { createSignatureRequest } = require('../services/docusealService')

    await expect(
      createSignatureRequest({ templateId: 't', submitterEmail: 'a@b.com', submitterName: 'A', externalId: 'x' })
    ).rejects.toThrow('DOCUSEAL_API_KEY not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts a submission request and returns the parsed submission', async () => {
    process.env.DOCUSEAL_API_KEY = 'key-123'
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example.com/'
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, submitters: [{ id: 1, email: 'james@example.com' }] }),
    })
    const { createSignatureRequest } = require('../services/docusealService')

    const result = await createSignatureRequest({
      templateId: 'tmpl-1', submitterEmail: 'james@example.com', submitterName: 'James Nguyen', externalId: 'quote-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docuseal.example.com/submissions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Auth-Token': 'key-123', 'Content-Type': 'application/json' },
      })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({
      template_id: 'tmpl-1',
      external_id: 'quote-1',
      send_email: true,
      submitters: [{ email: 'james@example.com', name: 'James Nguyen', role: 'Signer1' }],
    })
    expect(result).toEqual({ id: 42, submitters: [{ id: 1, email: 'james@example.com' }] })
  })

  it('defaults to the hosted DocuSeal API URL when DOCUSEAL_API_URL is unset', async () => {
    process.env.DOCUSEAL_API_KEY = 'key-123'
    delete process.env.DOCUSEAL_API_URL
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, submitters: [] }) })
    const { createSignatureRequest } = require('../services/docusealService')

    await createSignatureRequest({ templateId: 't', submitterEmail: 'a@b.com', submitterName: 'A', externalId: 'x' })

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.docuseal.com/submissions')
  })

  it('throws with the status and response body when the API responds with an error', async () => {
    process.env.DOCUSEAL_API_KEY = 'key-123'
    fetchMock.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'Invalid template' })
    const { createSignatureRequest } = require('../services/docusealService')

    await expect(
      createSignatureRequest({ templateId: 't', submitterEmail: 'a@b.com', submitterName: 'A', externalId: 'x' })
    ).rejects.toThrow('DocuSeal API error (422): Invalid template')
  })

  it('falls back to an empty error body when reading the response text fails', async () => {
    process.env.DOCUSEAL_API_KEY = 'key-123'
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => { throw new Error('stream closed') },
    })
    const { createSignatureRequest } = require('../services/docusealService')

    await expect(
      createSignatureRequest({ templateId: 't', submitterEmail: 'a@b.com', submitterName: 'A', externalId: 'x' })
    ).rejects.toThrow('DocuSeal API error (500): ')
  })
})
