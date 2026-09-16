import crypto from 'crypto'
import request from 'supertest'
import express from 'express'
import webhooksRouter from '../routes/webhooks'

const app = express()
app.use('/api/webhooks', webhooksRouter)

describe('Stripe webhook handler', () => {
  const stripeSecret = 'whsec_test_secret'

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = stripeSecret
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it('returns 200 with { received: true } for valid payment_intent.succeeded', async () => {
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123', metadata: { invoiceId: 'inv-1', jobId: 'job-1', type: 'deposit' } } },
    })

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
  })

  it('returns 200 for payment_intent.payment_failed event', async () => {
    const payload = JSON.stringify({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_456', last_payment_error: { message: 'Insufficient funds' } } },
    })

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(payload)

    expect(res.status).toBe(200)
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send('not valid json')

    expect(res.status).toBe(400)
  })

  it('returns 500 when webhook secret is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(JSON.stringify({ type: 'payment_intent.succeeded', data: { object: {} } }))

    expect(res.status).toBe(500)
  })

  it('handles unrecognized event types gracefully', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = stripeSecret
    const payload = JSON.stringify({ type: 'customer.created', data: { object: {} } })
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(payload)
    expect(res.status).toBe(200)
  })
})

describe('DocuSeal webhook handler', () => {
  it('returns 200 with { received: true } for submission.completed', async () => {
    const payload = JSON.stringify({
      event_type: 'submission.completed',
      data: { id: 555, external_id: 'quote-001', submission: { id: 555, external_id: 'quote-001' } },
    })

    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
  })

  it('handles form.declined', async () => {
    const payload = JSON.stringify({ event_type: 'form.declined', data: { id: 1, decline_reason: 'changed mind' } })
    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .send(payload)
    expect(res.status).toBe(200)
  })

  it('handles form.viewed', async () => {
    const payload = JSON.stringify({ event_type: 'form.viewed', data: { id: 2 } })
    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .send(payload)
    expect(res.status).toBe(200)
  })

  it('rejects an invalid signature', async () => {
    process.env.DOCUSEAL_WEBHOOK_SECRET = 'whsec_test'
    const payload = JSON.stringify({ event_type: 'form.viewed', data: {} })
    const timestamp = Math.floor(Date.now() / 1000)

    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .set('x-docuseal-signature', `${timestamp}.wronghash`)
      .send(payload)

    expect(res.status).toBe(403)
    delete process.env.DOCUSEAL_WEBHOOK_SECRET
  })

  it('accepts a valid signature', async () => {
    const secret = 'whsec_test'
    process.env.DOCUSEAL_WEBHOOK_SECRET = secret
    const payload = JSON.stringify({ event_type: 'form.viewed', data: {} })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .set('x-docuseal-signature', `${timestamp}.${signature}`)
      .send(payload)

    expect(res.status).toBe(200)
    delete process.env.DOCUSEAL_WEBHOOK_SECRET
  })

  it('rejects a stale timestamp even with a correct signature', async () => {
    const secret = 'whsec_test'
    process.env.DOCUSEAL_WEBHOOK_SECRET = secret
    const payload = JSON.stringify({ event_type: 'form.viewed', data: {} })
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600
    const signature = crypto.createHmac('sha256', secret).update(`${staleTimestamp}.${payload}`).digest('hex')

    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .set('x-docuseal-signature', `${staleTimestamp}.${signature}`)
      .send(payload)

    expect(res.status).toBe(403)
    delete process.env.DOCUSEAL_WEBHOOK_SECRET
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/webhooks/docuseal')
      .set('Content-Type', 'application/json')
      .send('not json')
    expect(res.status).toBe(400)
  })
})
