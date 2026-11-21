/**
 * Professional Client-side PDF generation utility for Bhumi Container Service.
 * Uses html2canvas-pro to support modern CSS color spaces (oklch, lab, Tailwind v4)
 * and jsPDF to directly save high-quality downloadable PDFs.
 */

export async function downloadElementAsPdf(
  element,
  filename = "document.pdf",
  options = {}
) {
  if (typeof window === "undefined" || !element) {
    return false;
  }

  try {
    // 1. Dynamically import html2canvas-pro and jsPDF
    const html2canvasModule = await import("html2canvas-pro");
    const html2canvas = html2canvasModule.default || html2canvasModule;

    const { jsPDF } = await import("jspdf");

    const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

    // 2. Render element to high-res canvas (scale: 2 for print clarity)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: options.backgroundColor || "#ffffff",
      ...(options.html2canvas || {}),
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Failed to render canvas from element");
    }

    // 3. Setup PDF document parameters
    const orientation = options.orientation || "portrait";
    const format = options.format || "a4";

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format,
      ...(options.jsPDF || {}),
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Margins (default 6mm all sides)
    const margin = Array.isArray(options.margin)
      ? options.margin[0] ?? 6
      : typeof options.margin === "number"
      ? options.margin
      : 6;

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    // Calculate image height based on aspect ratio
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // 4. Render to PDF: Handle single-page or multi-page slicing cleanly
    if (imgHeight <= usableHeight) {
      // Single Page (Fits within 1 page)
      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        margin,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
    } else {
      // Multi-Page Slicing
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        position,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + margin;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          position,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
        heightLeft -= usableHeight;
      }
    }

    // 5. Trigger instant browser file download (exact same as Excel export)
    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error("PDF Generation error:", err);
    return false;
  }
}
