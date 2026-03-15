/**
 * Client-side PDF generation utility.
 *
 * Approach:
 *   1. Accept the already-mounted preview DOM element (from a React ref)
 *   2. Deep-clone it so the live component is not disturbed
 *   3. Wrap the clone in a professional letterhead (header + footer) using
 *      inline styles so no stylesheet is required in the off-screen container
 *   4. Append the wrapper to document.body with `position:absolute;top:-99999px`
 *      — this puts it off-screen but still lets the browser compute layout,
 *      which is required for html2canvas.  Using `position:fixed` with a large
 *      negative z-index (the previous approach) prevented html2canvas from
 *      painting the element.
 *   5. Capture with html2canvas-pro → convert to jsPDF A4 PDF → save
 *
 * html2canvas-pro is used instead of html2canvas because Tailwind v4 emits
 * computed CSS colors using modern CSS color functions (lab(), oklch(), oklab())
 * which the original html2canvas does not support, causing a console error and
 * blank/incorrect capture output.  html2canvas-pro adds full support for these
 * color spaces and is otherwise a drop-in replacement.
 *
 * Dynamic imports keep jsPDF / html2canvas-pro out of the SSR bundle entirely.
 */

export interface DietitianPDFData {
  name: string
  qualification: string
  licenseNumber: string
  clinicName: string
  address: string
  phone: string
}

export interface DownloadPDFInput {
  docTitle: string
  dietitian: DietitianPDFData
  /** The mounted preview container DOM element obtained from a React ref. */
  previewElement: HTMLElement
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

function buildHeaderHTML(d: DietitianPDFData): string {
  const rows: string[] = []
  if (d.name) {
    rows.push(
      `<div style="font-size:22px;font-weight:bold;color:#111111;margin-bottom:6px;">${escapeHtml(d.name)}</div>`
    )
  }
  if (d.qualification) {
    rows.push(
      `<div style="font-size:14px;color:#555555;margin-bottom:3px;">${escapeHtml(d.qualification)}</div>`
    )
  }
  if (d.licenseNumber) {
    rows.push(
      `<div style="font-size:14px;color:#555555;margin-bottom:3px;">License: ${escapeHtml(d.licenseNumber)}</div>`
    )
  }
  if (d.clinicName) {
    rows.push(
      `<div style="font-size:14px;color:#444444;">${escapeHtml(d.clinicName)}</div>`
    )
  }
  return `
    <div style="text-align:center;padding-bottom:18px;border-bottom:1.5px solid #e2e8f0;margin-bottom:24px;">
      ${rows.join('\n')}
    </div>`
}

function buildFooterHTML(d: DietitianPDFData, timestamp: string): string {
  const rows: string[] = []
  if (d.clinicName) {
    rows.push(
      `<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:5px;">${escapeHtml(d.clinicName)}</div>`
    )
  }
  if (d.address) {
    rows.push(
      `<div style="font-size:12px;color:#666666;margin-bottom:2px;">Clinic Address: ${escapeHtml(d.address)}</div>`
    )
  }
  if (d.phone) {
    rows.push(
      `<div style="font-size:12px;color:#666666;margin-bottom:8px;">Phone: ${escapeHtml(d.phone)}</div>`
    )
  }
  rows.push(
    `<div style="font-size:11px;color:#94a3b8;margin-top:6px;">Generated via Peepal | ${timestamp}</div>`
  )
  return `
    <div style="margin-top:40px;padding-top:16px;border-top:1.5px solid #e2e8f0;text-align:center;">
      ${rows.join('\n')}
    </div>`
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Clones the rendered preview element, wraps it in a clinical letterhead,
 * captures the result with html2canvas, and downloads it as an A4 PDF.
 *
 * Must be called from a browser environment (not SSR).
 */
export async function downloadDocumentAsPDF(input: DownloadPDFInput): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const { docTitle, dietitian, previewElement } = input
  const timestamp = formatTimestamp()

  // Dynamic import — deferred until first call, never included in the SSR bundle
  // html2canvas-pro handles modern CSS color functions (lab, oklch, oklab) that
  // Tailwind v4 emits in computed styles; plain html2canvas cannot parse them.
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  // ── Build off-screen wrapper ────────────────────────────────────────────
  // position:absolute + large negative top keeps the wrapper out of the
  // viewport while still allowing the browser to lay it out and paint it.
  // This is required for html2canvas — position:fixed with z-index:-100
  // (the previous approach) places the element behind the root stacking
  // context, which prevents html2canvas from capturing it.
  const wrapper = document.createElement('div')
  wrapper.style.cssText = [
    'position:absolute',
    'top:-99999px',
    'left:0',
    'width:816px',
    'background:#ffffff',
    'font-family:Arial,Helvetica,sans-serif',
    'padding:40px 48px',
    'box-sizing:border-box',
  ].join(';')

  // Header — letterhead (inline-styled, no Tailwind dependency)
  const headerEl = document.createElement('div')
  headerEl.innerHTML = buildHeaderHTML(dietitian)
  wrapper.appendChild(headerEl)

  // Document body — deep clone of the already-rendered preview.
  // Tailwind CSS is in the global <head> stylesheet, so all utility classes
  // on the cloned node still resolve correctly inside document.body.
  const clonedPreview = previewElement.cloneNode(true) as HTMLElement
  wrapper.appendChild(clonedPreview)

  // Footer — clinic info + timestamp (inline-styled)
  const footerEl = document.createElement('div')
  footerEl.innerHTML = buildFooterHTML(dietitian, timestamp)
  wrapper.appendChild(footerEl)

  document.body.appendChild(wrapper)

  try {
    // Allow the browser one event-loop tick to compute layout for the
    // freshly-appended node before html2canvas reads its bounding rects.
    await new Promise<void>((resolve) => setTimeout(resolve, 50))

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Fix Tailwind responsive breakpoints by anchoring to the wrapper width
      windowWidth: 816,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()   // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight() // 297 mm
    const imgHeightMM = (canvas.height * pageWidth) / canvas.width

    // Multi-page: stamp the full image, shift the vertical origin per page
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

    const filename =
      docTitle.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_') || 'document'
    pdf.save(`${filename}.pdf`)
  } finally {
    // Always remove the off-screen node whether generation succeeded or failed
    document.body.removeChild(wrapper)
  }
}
