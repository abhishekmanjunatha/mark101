/**
 * Client-side PDF generation utility.
 *
 * Strategy — per-page DOM capture:
 *   • Each PDF page is built as a separate fixed-size (A4) off-screen div.
 *   • Header appears ONLY on page 1 (letterhead).
 *   • Footer appears on EVERY page (fixed to the bottom of each page div).
 *   • Content is cloned for each page and translated upward by a computed
 *     offset so that overflow:hidden on the clip container shows only the
 *     slice belonging to that page.
 *   • html2canvas-pro captures each page div — it handles Tailwind v4's
 *     modern CSS color functions (lab, oklch, oklab) that plain html2canvas
 *     cannot parse.
 *   • jsPDF assembles the per-page JPEG images into an A4 PDF.
 *
 * Dynamic imports keep jsPDF / html2canvas-pro out of the SSR bundle.
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

// ── A4 page geometry (pixels at 96 dpi) ───────────────────────────────────
const PAGE_W = 794   // 210 mm at 96 dpi
const PAGE_H = 1123  // 297 mm at 96 dpi
const MARGIN_X = 48  // left / right padding (px)
const MARGIN_Y = 36  // top / bottom padding (px)
const CONTENT_W = PAGE_W - MARGIN_X * 2   // 698 px

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
  const h24 = d.getHours()
  const h12 = h24 % 12 || 12
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} | ${h12}:${min} ${ampm}`
}

/**
 * Renders an HTML string inside a hidden div of the given width and returns
 * its scrollHeight so we can calculate per-page content slice sizes.
 */
async function measureHtml(html: string, width: number): Promise<number> {
  const div = document.createElement('div')
  div.style.cssText = `position:absolute;top:-99999px;left:0;width:${width}px;font-family:Inter,Helvetica,Arial,sans-serif;`
  div.innerHTML = html
  document.body.appendChild(div)
  await new Promise<void>((r) => setTimeout(r, 30))
  const h = div.scrollHeight
  document.body.removeChild(div)
  return h
}

/**
 * Deep-clones el, renders it in a hidden container of the given width, and
 * returns its scrollHeight.
 */
async function measureElement(el: HTMLElement, width: number): Promise<number> {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `position:absolute;top:-99999px;left:0;width:${width}px;`
  wrapper.appendChild(el.cloneNode(true))
  document.body.appendChild(wrapper)
  await new Promise<void>((r) => setTimeout(r, 30))
  const h = wrapper.scrollHeight
  document.body.removeChild(wrapper)
  return h
}

// ── Header / Footer HTML builders ─────────────────────────────────────────

/** Center-aligned clinical letterhead (page 1 only). */
function buildHeaderHTML(d: DietitianPDFData): string {
  const rows: string[] = []
  if (d.name) {
    rows.push(`<div style="font-size:22px;font-weight:bold;color:#111111;margin-bottom:5px;">${escapeHtml(d.name)}</div>`)
  }
  if (d.qualification) {
    rows.push(`<div style="font-size:13px;color:#444444;margin-bottom:3px;">${escapeHtml(d.qualification)}</div>`)
  }
  if (d.licenseNumber) {
    rows.push(`<div style="font-size:13px;color:#555555;margin-bottom:3px;">License: ${escapeHtml(d.licenseNumber)}</div>`)
  }
  if (d.clinicName) {
    rows.push(`<div style="font-size:13px;color:#444444;">${escapeHtml(d.clinicName)}</div>`)
  }
  return `<div style="text-align:center;padding-bottom:14px;border-bottom:1.5px solid #555555;">${rows.join('')}</div>`
}

/** Center-aligned footer repeated on every page. */
function buildFooterHTML(d: DietitianPDFData, timestamp: string): string {
  const rows: string[] = []
  if (d.clinicName) {
    rows.push(`<div style="font-size:13px;font-weight:600;color:#222222;margin-bottom:4px;">${escapeHtml(d.clinicName)}</div>`)
  }
  if (d.address) {
    rows.push(`<div style="font-size:12px;color:#555555;margin-bottom:2px;word-wrap:break-word;overflow-wrap:break-word;">Clinic Address: ${escapeHtml(d.address)}</div>`)
  }
  if (d.phone) {
    rows.push(`<div style="font-size:12px;color:#555555;margin-bottom:6px;">Phone: ${escapeHtml(d.phone)}</div>`)
  }
  rows.push(`<div style="font-size:11px;color:#888888;margin-top:4px;">Generated via Peepal | ${timestamp}</div>`)
  return `<div style="border-top:1.5px solid #555555;padding-top:10px;text-align:center;">${rows.join('')}</div>`
}

// ── Preview content enhancements ──────────────────────────────────────────

/**
 * Applies inline style overrides directly to the cloned preview DOM node.
 * The original preview element in the composer is never modified.
 *
 * Changes applied:
 *   - Document title (h2): centered, bold, uppercase, prominent size
 *   - Section headings (h3): bold, uppercase, dark color
 *   - Root font-family: Inter
 */
function enhancePreviewClone(el: HTMLElement): void {
  el.style.fontFamily = 'Inter,Helvetica,Arial,sans-serif'

  const h2 = el.querySelector('h2') as HTMLElement | null
  if (h2) {
    h2.style.textAlign = 'center'
    h2.style.fontWeight = 'bold'
    h2.style.textTransform = 'uppercase'
    h2.style.fontSize = '20px'
    h2.style.color = '#111111'
    h2.style.letterSpacing = '0.04em'
    h2.style.marginTop = '8px'
    h2.style.marginBottom = '20px'
  }

  el.querySelectorAll('h3').forEach((node) => {
    const h = node as HTMLElement
    h.style.fontWeight = 'bold'
    h.style.textTransform = 'uppercase'
    h.style.fontSize = '13px'
    h.style.color = '#111111'
    h.style.letterSpacing = '0.03em'
    h.style.marginTop = '14px'
    h.style.marginBottom = '4px'
  })
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Builds one PDF page at a time as a fixed A4-sized off-screen DOM node,
 * captures it with html2canvas-pro, then assembles into a jsPDF document.
 *
 * Must be called from a browser environment (not during SSR).
 */
export async function downloadDocumentAsPDF(input: DownloadPDFInput): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const { docTitle, dietitian, previewElement } = input
  const timestamp = formatTimestamp()

  // Dynamic import — deferred until first call, not in SSR bundle
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  const headerHTML = buildHeaderHTML(dietitian)
  const footerHTML = buildFooterHTML(dietitian, timestamp)

  // Measure component heights so we can calculate content slice sizes
  const [headerH, footerH, contentH] = await Promise.all([
    measureHtml(headerHTML, CONTENT_W),
    measureHtml(footerHTML, CONTENT_W),
    measureElement(previewElement, CONTENT_W),
  ])

  // Pixel positions (from page top) for content area boundaries
  const HEADER_GAP = 14   // vertical gap between header divider and first content line
  const FOOTER_GAP = 8    // vertical gap between last content line and footer divider

  const contentTopP1   = MARGIN_Y + headerH + HEADER_GAP  // page 1 (below header)
  const contentTopRest = MARGIN_Y                           // pages 2+ (below top margin)
  const footerTopPx    = PAGE_H - MARGIN_Y - footerH        // where footer div starts

  const sliceHP1   = Math.max(footerTopPx - FOOTER_GAP - contentTopP1, 80)
  const sliceHRest = Math.max(footerTopPx - FOOTER_GAP - contentTopRest, 80)

  const totalPages =
    contentH <= sliceHP1
      ? 1
      : 1 + Math.ceil((contentH - sliceHP1) / sliceHRest)

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight()  // 297 mm

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    // How many pixels of content have already been shown on previous pages
    const sliceOffset = pageIdx === 0 ? 0 : sliceHP1 + (pageIdx - 1) * sliceHRest
    const contentTop  = pageIdx === 0 ? contentTopP1 : contentTopRest
    const clipH       = Math.max(footerTopPx - FOOTER_GAP - contentTop, 50)

    // ── Off-screen A4 page container ─────────────────────────────────
    const pageDiv = document.createElement('div')
    pageDiv.style.cssText = [
      'position:absolute',
      'top:-99999px',
      'left:0',
      `width:${PAGE_W}px`,
      `height:${PAGE_H}px`,
      'overflow:hidden',
      'background:#ffffff',
      'font-family:Inter,Helvetica,Arial,sans-serif',
      'box-sizing:border-box',
    ].join(';')

    // Header — letterhead, FIRST PAGE ONLY
    if (pageIdx === 0) {
      const hDiv = document.createElement('div')
      hDiv.style.cssText = `position:absolute;top:${MARGIN_Y}px;left:${MARGIN_X}px;right:${MARGIN_X}px;`
      hDiv.innerHTML = headerHTML
      pageDiv.appendChild(hDiv)
    }

    // Content clip — overflow:hidden hides the out-of-slice portions
    const clipDiv = document.createElement('div')
    clipDiv.style.cssText = [
      'position:absolute',
      `top:${contentTop}px`,
      `left:${MARGIN_X}px`,
      `right:${MARGIN_X}px`,
      `height:${clipH}px`,
      'overflow:hidden',
    ].join(';')

    // Inner wrapper: translated up by sliceOffset to expose the correct slice
    const innerDiv = document.createElement('div')
    innerDiv.style.cssText = `position:relative;top:${-sliceOffset}px;width:100%;`
    const cloned = previewElement.cloneNode(true) as HTMLElement
    enhancePreviewClone(cloned)
    innerDiv.appendChild(cloned)
    clipDiv.appendChild(innerDiv)
    pageDiv.appendChild(clipDiv)

    // Footer — EVERY PAGE, absolutely positioned at the bottom
    const fDiv = document.createElement('div')
    fDiv.style.cssText = `position:absolute;bottom:${MARGIN_Y}px;left:${MARGIN_X}px;right:${MARGIN_X}px;`
    fDiv.innerHTML = footerHTML
    pageDiv.appendChild(fDiv)

    document.body.appendChild(pageDiv)

    try {
      // Let the browser compute layout before html2canvas reads bounding rects
      await new Promise<void>((r) => setTimeout(r, 50))

      const canvas = await html2canvas(pageDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: PAGE_W,
        width: PAGE_W,
        height: PAGE_H,
      })

      if (pageIdx > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH)
    } finally {
      document.body.removeChild(pageDiv)
    }
  }

  const filename =
    docTitle.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_') || 'document'
  pdf.save(`${filename}.pdf`)
}


