// DocuSeal API client — creates signature requests ("submissions") from a template.
// Docs: https://www.docuseal.com/docs/api
// Self-hosted by default (DOCUSEAL_API_URL), or point at https://api.docuseal.com
// if you switch to DocuSeal's hosted plan instead.

interface CreateSignatureRequestParams {
  templateId: string
  submitterEmail: string
  submitterName: string
  /** Round-tripped back on the webhook payload (`data.external_id`) so we can match it to a quote. */
  externalId: string
}

interface DocuSealSubmitter {
  id: number
  email: string
  embed_src?: string
}

interface DocuSealSubmission {
  id: number
  submitters: DocuSealSubmitter[]
}

export async function createSignatureRequest(params: CreateSignatureRequestParams): Promise<DocuSealSubmission> {
  const apiUrl = process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.com'
  const apiKey = process.env.DOCUSEAL_API_KEY
  if (!apiKey) throw new Error('DOCUSEAL_API_KEY not configured')

  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/submissions`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: params.templateId,
      external_id: params.externalId,
      send_email: true,
      submitters: [{ email: params.submitterEmail, name: params.submitterName, role: 'Signer1' }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DocuSeal API error (${res.status}): ${text}`)
  }

  return (await res.json()) as DocuSealSubmission
}
