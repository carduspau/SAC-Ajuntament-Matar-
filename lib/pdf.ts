// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const React: any;

/**
 * Scans upward from `idealSourceRow` (in full-canvas pixel rows) to find a
 * mostly-white row suitable as a page-break point.
 * Returns the safe row index, or `idealSourceRow` if none found.
 */
function findSafeBreakRow(
  canvas: HTMLCanvasElement,
  idealSourceRow: number,
  scanPx: number
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return idealSourceRow;

  const startRow = Math.max(0, idealSourceRow - scanPx);
  const rowsToScan = Math.min(idealSourceRow - startRow + 1, canvas.height - startRow);
  if (rowsToScan <= 0) return idealSourceRow;

  const imageData = ctx.getImageData(0, startRow, canvas.width, rowsToScan);
  const { data, width } = imageData;

  // Scan from idealSourceRow upward looking for a nearly-white row
  for (let dy = 0; dy <= idealSourceRow - startRow; dy++) {
    const rowIdx = (idealSourceRow - startRow) - dy; // relative row in imageData
    let isWhiteRow = true;
    // Sample every 4th pixel for speed
    for (let x = 0; x < width; x += 4) {
      const i = (rowIdx * width + x) * 4;
      if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
        isWhiteRow = false;
        break;
      }
    }
    if (isWhiteRow) {
      return startRow + rowIdx; // absolute row in canvas
    }
  }

  return idealSourceRow; // fallback
}

export async function exportReportToPdf(
  containerRef: { current: HTMLDivElement | null },
  _title: string
): Promise<void> {
  const container = containerRef.current;
  if (!container) return;

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
    allowTaint: true,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  // Available page height in mm
  const pageContentHeightMm = pageHeight - margin * 2;
  // How many canvas pixels correspond to one full page of content
  const canvasPixelsPerPage = (pageContentHeightMm / (pageWidth - margin * 2)) * (canvas.width / contentWidth) * pageContentHeightMm;
  // Simpler: pixels per mm in the scaled canvas
  const pxPerMm = canvas.width / contentWidth;
  const pageContentHeightPx = pageContentHeightMm * pxPerMm;

  // Scan range: try up to 60px above ideal break to find whitespace
  const SCAN_PX = 60;

  let sourceY = 0; // current Y position in canvas pixels
  let isFirstPage = true;

  while (sourceY < canvas.height) {
    const remainingPx = canvas.height - sourceY;
    const idealSlicePx = Math.min(remainingPx, pageContentHeightPx);

    // Find a safe break point (avoid cutting mid-element)
    const safeBreakPx = remainingPx <= pageContentHeightPx
      ? idealSlicePx  // last page — no need to search
      : findSafeBreakRow(canvas, Math.floor(sourceY + idealSlicePx), SCAN_PX) - sourceY;

    const actualSlicePx = Math.max(safeBreakPx, 1);
    // Convert back to mm for PDF
    const sliceHeightMm = actualSlicePx / pxPerMm;

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(actualSlicePx);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, -sourceY);

    if (!isFirstPage) pdf.addPage();

    pdf.addImage(
      sliceCanvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      margin,
      margin,
      contentWidth,
      sliceHeightMm
    );

    sourceY += actualSlicePx;
    isFirstPage = false;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`informe-sac-${dateStr}.pdf`);
}
