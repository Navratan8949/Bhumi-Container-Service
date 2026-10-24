/**
 * Client-side PDF generation utility for Bhumi Container Service.
 * Safely loads html2pdf.js dynamically on the client side.
 */

export async function downloadElementAsPdf(element, filename = "document.pdf", options = {}) {
  if (typeof window === "undefined" || !element) {
    return false;
  }

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

    const opt = {
      margin: options.margin !== undefined ? options.margin : [6, 6, 6, 6],
      filename: cleanFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: options.backgroundColor || "#ffffff",
        ...(options.html2canvas || {}),
      },
      jsPDF: {
        unit: "mm",
        format: options.format || "a4",
        orientation: options.orientation || "portrait",
        ...(options.jsPDF || {}),
      },
    };

    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.error("PDF Generation error:", err);
    // Fallback: Use native browser print which supports "Save as PDF"
    window.print();
    return false;
  }
}
