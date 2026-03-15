/**
 * Client-side PDF generation utility.
 * Uses html2canvas + jsPDF to convert an off-screen DOM node to a PDF download.
 * Imported only from client components — never executed server-side.
 */

export interface DietitianPDFData {
  name: string
  qualification: string
  licenseNumber: string
  clinicName: string
  address: string
  phone: string
}

export interface PDFSectionData {
  label: string
  content: string
}

export interface PDFSnapshotData {
  name: string
  age: string
  gender: string
  height: string
  weight: string
  bmi: string
  ibw: string
  weightDiff: string
  previousWeight: string
  weightChange: string
  primaryGoal: string
  activityLevel: string
  medicalConditions: string
  foodAllergies: string
}

export interface DownloadPDFInput {
  docTitle: string
  dietitian: DietitianPDFData
  snapshot: PDFSnapshotData | null
  sections: PDFSectionData[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTimestamp(): string {
  const d = new Date()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const h24 = d.getHours()
  const h12 = h24 % 12 || 12
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${day} ${month} ${year} | ${h12}:${min} ${ampm}`
}

function buildSnapshotTableHTML(snap: PDFSnapshotData): string {
  const fields: [string, string][] = [
    ['Name', snap.name],
    ['Age', snap.age],
    ['Gender', snap.gender],
    ['Height', snap.height],
    ['Current Weight', snap.weight],
    ['BMI', snap.bmi],
    ['Ideal Body Weight', snap.ibw],
    ['Weight Difference', snap.weightDiff],
    ['Prev. Visit Weight', snap.previousWeight],
    ['Weight Change', snap.weightChange],
    ['Primary Goal', snap.primaryGoal],
    ['Activity Level', snap.activityLevel],
    ['Medical Conditions', snap.medicalConditions],
    ['Food Allergies', snap.foodAllergies],
  ]

  let rows = ''
  for (let i = 0; i < fields.length; i += 3) {
    const cells = fields.slice(i, i + 3)
    // Pad to 3 columns
    while (cells.length < 3) cells.push(['', ''])
    rows += `<tr>${cells
      .map(
        ([label, value]) => `
      <td style="width:33%;padding:4px 8px;vertical-align:top;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:1px;">${escapeHtml(label)}</div>
        <div style="font-size:12px;font-weight:500;color:#1e293b;text-transform:capitalize;">${escapeHtml(value)}</div>
      </td>`
      )
      .join('')}</tr>`
  }
  return `<table style="width:100%;border-collapse:collapse;">${rows}</table>`
}

function buildPDFHTML(input: DownloadPDFInput, timestamp: string): string {
  const { docTitle, dietitian, snapshot, sections } = input

  // ── Header ───────────────────────────────────────────────────────────
  const qualLine = dietitian.qualification
    ? `<div style="font-size:14px;color:#555;margin-bottom:3px;">${escapeHtml(dietitian.qualification)}</div>`
    : ''
  const licenseLine = dietitian.licenseNumber
    ? `<div style="font-size:14px;color:#555;margin-bottom:3px;">License: ${escapeHtml(dietitian.licenseNumber)}</div>`
    : ''
  const clinicHeaderLine = dietitian.clinicName
    ? `<div style="font-size:14px;color:#444;margin-bottom:0;">${escapeHtml(dietitian.clinicName)}</div>`
    : ''

  // ── Patient snapshot ─────────────────────────────────────────────────
  const snapshotHTML = snapshot
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-bottom:20px;">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:10px;">Patient Information</div>
        ${buildSnapshotTableHTML(snapshot)}
      </div>`
    : ''

  // ── Document sections ────────────────────────────────────────────────
  const sectionsHTML = sections
    .map(
      (s) => `
    <div style="margin-bottom:18px;">
      <div style="font-size:13px;font-weight:600;color:#1e293b;padding-bottom:5px;border-bottom:1px solid #f1f5f9;margin-bottom:8px;">${escapeHtml(s.label)}</div>
      <div style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.65;">${escapeHtml(s.content || 'Empty')}</div>
    </div>`
    )
    .join('')

  // ── Footer ───────────────────────────────────────────────────────────
  const clinicFooterLine = dietitian.clinicName
    ? `<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:5px;">${escapeHtml(dietitian.clinicName)}</div>`
    : ''
  const addressLine = dietitian.address
    ? `<div style="font-size:12px;color:#666;margin-bottom:2px;">Clinic Address: ${escapeHtml(dietitian.address)}</div>`
    : ''
  const phoneLine = dietitian.phone
    ? `<div style="font-size:12px;color:#666;margin-bottom:8px;">Phone: ${escapeHtml(dietitian.phone)}</div>`
    : ''

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:40px 48px;width:714px;color:#111111;">

      <!-- HEADER (center-aligned) -->
      <div style="text-align:center;padding-bottom:18px;border-bottom:1.5px solid #e2e8f0;margin-bottom:24px;">
        <div style="font-size:22px;font-weight:bold;color:#111111;margin-bottom:6px;">${escapeHtml(dietitian.name || 'Dietitian')}</div>
        ${qualLine}
        ${licenseLine}
        ${clinicHeaderLine}
      </div>

      <!-- DOCUMENT TITLE -->
      <h1 style="font-size:18px;font-weight:bold;color:#111111;margin:0 0 16px 0;">${escapeHtml(docTitle)}</h1>

      <!-- PATIENT INFORMATION -->
      ${snapshotHTML}

      <!-- DOCUMENT SECTIONS -->
      ${sectionsHTML}

      <!-- FOOTER (center-aligned) -->
      <div style="margin-top:40px;padding-top:16px;border-top:1.5px solid #e2e8f0;text-align:center;">
        ${clinicFooterLine}
        ${addressLine}
        ${phoneLine}
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Generated via Peepal | ${timestamp}</div>
      </div>

    </div>`
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Generates and downloads a professionally-formatted PDF from the current
 * document state. Dynamic imports ensure jsPDF / html2canvas are only
 * bundled and loaded on the client when this function is actually called.
 */
export async function downloadDocumentAsPDF(input: DownloadPDFInput): Promise<void> {
  // Dynamic import — client-only, deferred until needed
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const timestamp = formatTimestamp()

  // Build off-screen container
  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;z-index:-100;'
  container.innerHTML = buildPDFHTML(input, timestamp)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()   // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight() // 297 mm
    const imgHeightMM = (canvas.height * pageWidth) / canvas.width

    // Multi-page: shift image vertically on each subsequent page
    let position = 0
    let heightLeft = imgHeightMM

    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeightMM)
    heightLeft -= pageHeight
    position -= pageHeight

    while (heightLeft > 0) {
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeightMM)
      heightLeft -= pageHeight
      position -= pageHeight
    }

    // Sanitise filename — strip characters that are invalid in filenames
    const filename =
      input.docTitle.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_') ||
      'document'
    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
