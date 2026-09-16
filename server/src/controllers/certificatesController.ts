import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { generateCesPdf, generateStcAssignmentPdf } from '../services/pdfService'
import { mapCertificate } from '../utils/mappers'

const CertificateSchema = z.object({
  type: z.enum(['CES', 'STC_assignment', 'service_report']),
  cesWorkDescription: z.string().optional(),
  cesLicenceNumber: z.string().optional(),
  cesRecRegistration: z.string().optional(),
  cesCompletionDate: z.string().optional(),
  cesCertificationDate: z.string().optional(),
  stcPanelSerials: z.array(z.string()).optional(),
  stcSystemOwnerName: z.string().optional(),
  stcInstallationDate: z.string().optional(),
  stcSystemSizeKw: z.number().positive().optional(),
  stcCertificateQuantity: z.number().int().positive().optional(),
})

/** GET /api/jobs/:jobId/certificates */
export async function list(req: Request, res: Response) {
  const { rows } = await query(
    `SELECT * FROM certificates WHERE job_id = $1 ORDER BY created_at DESC`,
    [req.params.jobId]
  )
  res.json(rows.map(mapCertificate))
}

/** POST /api/jobs/:jobId/certificates */
export async function create(req: Request, res: Response) {
  try {
    const body = CertificateSchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO certificates (
         job_id, type, ces_work_description, ces_licence_number, ces_rec_registration,
         ces_completion_date, ces_certification_date, stc_panel_serials, stc_system_owner,
         stc_install_date, stc_system_size_kw, stc_certificate_qty
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.params.jobId, body.type, body.cesWorkDescription ?? null, body.cesLicenceNumber ?? null,
        body.cesRecRegistration ?? null, body.cesCompletionDate ?? null, body.cesCertificationDate ?? null,
        body.stcPanelSerials ?? null, body.stcSystemOwnerName ?? null, body.stcInstallationDate ?? null,
        body.stcSystemSizeKw ?? null, body.stcCertificateQuantity ?? null,
      ]
    )
    res.status(201).json(mapCertificate(rows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to create certificate' })
  }
}

/** GET /api/jobs/:jobId/certificates/:certId/pdf */
export async function getPdf(req: Request, res: Response) {
  const { jobId } = req.params
  const type = (req.query.type as string) ?? 'CES'

  if (type === 'STC_assignment') {
    const pdf = await generateStcAssignmentPdf({
      systemOwnerName: 'James Nguyen',
      systemOwnerAddress: '14 Kookaburra Cres, Doncaster VIC 3108',
      nmi: '6102345678',
      installDate: new Date().toLocaleDateString('en-AU'),
      systemSizeKw: 6.6, panelCount: 16,
      panelModel: 'REC Alpha 415W',
      panelSerials: ['REC001','REC002','REC003','REC004'],
      inverterModel: 'Fronius Primo 6.0', inverterSerial: 'FRO98765',
      installerName: 'Liam O\'Brien', installerLicence: 'REC7845',
      recRegistration: 'A5023451', stcCount: 36,
      retailerName: 'Solar Battery Group Pty Ltd',
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename=stc-${jobId}.pdf`)
    return res.send(Buffer.from(pdf))
  }

  const pdf = await generateCesPdf({
    jobId, customerName: 'James Nguyen',
    address: '14 Kookaburra Cres, Doncaster VIC 3108',
    nmi: '6102345678', licenceNumber: 'REC7845',
    recRegistration: 'A5023451',
    workDescription: 'Installation of 6.6kW solar PV system — 16 × REC Alpha 415W + Fronius Primo 6.0',
    systemSizeKw: 6.6, panelCount: 16, inverterModel: 'Fronius Primo 6.0',
    completionDate: new Date().toLocaleDateString('en-AU'),
    certificationDate: new Date().toLocaleDateString('en-AU'),
  })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename=ces-${jobId}.pdf`)
  res.send(Buffer.from(pdf))
}
