import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import enquiriesRouter from './routes/enquiries'
import quotesRouter from './routes/quotes'
import jobsRouter from './routes/jobs'
import installersRouter from './routes/installers'
import customersRouter from './routes/customers'
import invoicesRouter from './routes/invoices'
import certificatesRouter from './routes/certificates'
import webhooksRouter from './routes/webhooks'
import weatherRouter from './routes/weather'
import stcRouter from './routes/stc'
import { checkJwt, authEnabled } from './middleware/auth'

const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(morgan('dev'))

// Raw body for Stripe/DocuSeal webhooks BEFORE json middleware.
// Not gated by AUTH_ENABLED: these are verified by their own provider signatures
// (Stripe/DocuSeal), not by end-user Auth0 tokens.
app.use('/api/webhooks', webhooksRouter)

app.use(express.json({ limit: '5mb' }))

// ─── Routes ───────────────────────────────────────────────────────────────────
// Data routes require a valid Auth0 access token once AUTH_ENABLED=true (see
// middleware/auth.ts). Left off by default so this keeps working unauthenticated
// until the Auth0 tenant/roles are confirmed ready to enforce.
const authGate = authEnabled ? [checkJwt] : []

app.use('/api/enquiries', ...authGate, enquiriesRouter)
app.use('/api/quotes', ...authGate, quotesRouter)
app.use('/api/jobs', ...authGate, jobsRouter)
app.use('/api/jobs/:jobId/certificates', ...authGate, certificatesRouter)
app.use('/api/installers', ...authGate, installersRouter)
app.use('/api/customers', ...authGate, customersRouter)
app.use('/api/invoices', ...authGate, invoicesRouter)
app.use('/api/weather', weatherRouter)
app.use('/api/stc', stcRouter)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }))

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const status = (err as any).statusCode ?? 500
  res.status(status).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`🔆 SBG Scheduler API running on http://localhost:${PORT}`)
})

export default app
