import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import express from 'express'

const router = Router()

// ─── Stripe webhook ───────────────────────────────────────────────────────────
// Must receive raw body for signature verification
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET

    if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' })

    // In production: const event = stripe.webhooks.constructEvent(req.body, sig, secret)
    let body: any
    try {
      body = JSON.parse(req.body.toString())
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const { type, data } = body

    switch (type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = data.object
        const invoiceId = paymentIntent.metadata?.invoiceId
        const jobId = paymentIntent.metadata?.jobId
        const invoiceType = paymentIntent.metadata?.type  // 'deposit' | 'balance'
        console.log(`💳 Payment succeeded: invoice=${invoiceId} job=${jobId} type=${invoiceType}`)
        // In production:
        // - Update invoice status to 'paid'
        // - If deposit: update job status to 'deposit_paid' → allow scheduling
        // - If balance: update job status to 'paid' → trigger certificate generation
        // - Send receipt email to customer
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = data.object
        console.log(`❌ Payment failed: ${paymentIntent.id}`, paymentIntent.last_payment_error?.message)
        // In production: send failure notification email
        break
      }
      case 'payment_link.completed': {
        console.log('🔗 Payment link completed')
        break
      }
      default:
        console.log(`Unhandled Stripe event type: ${type}`)
    }

    res.json({ received: true })
  }
)

// ─── DocuSeal webhook ─────────────────────────────────────────────────────────
router.post(
  '/docuseal',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const payload = req.body.toString()
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET

    if (secret) {
      const header = req.headers['x-docuseal-signature'] as string | undefined
      if (!header || !verifyDocusealSignature(header, payload, secret)) {
        return res.status(403).json({ error: 'Invalid signature' })
      }
    }

    let body: any
    try {
      body = JSON.parse(payload)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const eventType = body?.event_type
    const data = body?.data
    // We pass the quote id as `external_id` when creating the submission
    // (see docusealService.createSignatureRequest) so it round-trips back here.
    const quoteId = data?.external_id ?? data?.submission?.external_id
    const submissionId = data?.submission?.id ?? data?.id

    switch (eventType) {
      case 'submission.completed': {
        console.log(`✅ Quote signed: submissionId=${submissionId} quoteId=${quoteId}`)
        // In production:
        // 1. Update quote.docSignStatus = 'signed'
        // 2. Create Job record from quote data
        // 3. Generate deposit Stripe Payment Link
        // 4. Send deposit payment request to customer
        break
      }
      case 'form.declined': {
        console.log(`❌ Quote declined: submissionId=${submissionId} reason=${data?.decline_reason}`)
        // In production: update quote.docSignStatus = 'declined', notify sales team
        break
      }
      case 'form.viewed': {
        console.log(`👁 Quote viewed: submissionId=${submissionId}`)
        // In production: update quote.docSignStatus = 'viewed'
        break
      }
      default:
        console.log(`Unhandled DocuSeal event: ${eventType}`)
    }

    res.status(200).json({ received: true })
  }
)

/**
 * DocuSeal signs webhooks as `X-Docuseal-Signature: <timestamp>.<hmac>`, where the
 * HMAC-SHA256 (hex) is computed over `${timestamp}.${rawBody}`.
 * https://www.docuseal.com/resources/use-webhooks
 */
function verifyDocusealSignature(header: string, rawBody: string, secret: string): boolean {
  const [timestamp, signature] = header.split('.', 2)
  if (!timestamp || !signature) return false

  // Reject stale requests to blunt replay attacks (5 minute tolerance)
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

export default router
