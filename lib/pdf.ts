// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const React: any;

export async function exportReportToPdf(
  containerRef: { current: HTMLDivElement | null },
  _title: string
): Promise<void> {
  const container = containerRef.current;
  if (!container) return;

  // Dynamic imports to avoid SSR issues
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
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let remainingHeight = imgHeight;
  let sourceY = 0;
  let isFirstPage = true;

  while (remainingHeight > 0) {
    const pageContentHeight = pageHeight - margin * 2;
    const sliceHeight = Math.min(remainingHeight, pageContentHeight);
    const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(sourceSliceHeight);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, -sourceY);

    if (!isFirstPage) pdf.addPage();

    pdf.addImage(
      sliceCanvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      margin,
      margin,
      contentWidth,
      sliceHeight
    );

    remainingHeight -= pageContentHeight;
    sourceY += sourceSliceHeight;
    isFirstPage = false;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`informe-sac-${dateStr}.pdf`);
}
