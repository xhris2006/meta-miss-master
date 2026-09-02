/* ════════════════════════════════════════════════════════════════
   PDF helpers (admin) — generated client-side with jsPDF.
   • downloadCandidatePdf  → one candidate, full info + photo
   • downloadTransactionsPdf → all transactions, status + payer number
   jsPDF is loaded dynamically so it never runs during SSR.
═══════════════════════════════════════════════════════════════ */

const BRAND = { r: 37, g: 99, b: 235 }; // #2563EB

interface LoadedImage {
  dataUrl: string;
  w: number;
  h: number;
  format: string;
}

/** Fetch an image and return a base64 data URL + natural size (or null on failure). */
async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 3, h: img.naturalHeight || 4 });
      img.onerror = () => resolve({ w: 3, h: 4 });
      img.src = dataUrl;
    });
    const mime = dataUrl.substring(5, dataUrl.indexOf(";")); // e.g. image/jpeg
    const format = mime.includes("png") ? "PNG" : mime.includes("webp") ? "WEBP" : "JPEG";
    return { dataUrl, w: dims.w, h: dims.h, format };
  } catch {
    return null;
  }
}

const fmtDate = (d?: string | Date) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(d);
  }
};
const fmtMoney = (n?: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;
const val = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

export interface PdfCandidate {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  age?: number;
  city?: string;
  phone?: string;
  email?: string;
  bio?: string;
  totalVotes?: number;
  totalLikes?: number;
  instagram?: string;
  tiktok?: string;
  snap?: string;
  whatsappFan?: string;
  photoUrl?: string;
  createdAt?: string;
}

/** Generate and download a full info sheet (with photo) for a single candidate. */
export async function downloadCandidatePdf(candidate: PdfCandidate, apiBase: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("REINES DU META", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Fiche candidat", 14, 21);

  // Photo
  const photoUrl = candidate.photoUrl
    ? candidate.photoUrl.startsWith("http")
      ? candidate.photoUrl
      : `${apiBase}${candidate.photoUrl}`
    : "";
  let infoTop = 40;
  if (photoUrl) {
    const img = await loadImage(photoUrl);
    if (img) {
      const boxW = 45;
      const boxH = Math.min(60, (boxW * img.h) / img.w);
      try {
        doc.addImage(img.dataUrl, img.format, 14, 36, boxW, boxH);
        infoTop = Math.max(infoTop, 36 + boxH + 6);
      } catch {
        /* unsupported image → skip */
      }
      // Name + badges next to the photo
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(val(candidate.name), 66, 46);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`${val(candidate.type)}  ·  ${val(candidate.status)}`, 66, 54);
      doc.text(`${val(candidate.city)}${candidate.age ? `  ·  ${candidate.age} ans` : ""}`, 66, 61);
    }
  }
  if (!photoUrl) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(val(candidate.name), 14, 40);
    infoTop = 48;
  }

  const rows: [string, string][] = [
    ["Nom complet", val(candidate.name)],
    ["Type", val(candidate.type)],
    ["Statut", val(candidate.status)],
    ["Âge", candidate.age ? `${candidate.age} ans` : "—"],
    ["Ville", val(candidate.city)],
    ["Téléphone", val(candidate.phone)],
    ["Email", val(candidate.email)],
    ["Votes totaux", String(candidate.totalVotes ?? 0)],
    ["Likes", String(candidate.totalLikes ?? 0)],
    ["Instagram", val(candidate.instagram)],
    ["TikTok", val(candidate.tiktok)],
    ["Snapchat", val(candidate.snap)],
    ["WhatsApp", val(candidate.whatsappFan)],
    ["Inscrit le", fmtDate(candidate.createdAt)],
    ["Identifiant", val(candidate.id)],
    ["Bio", val(candidate.bio)],
  ];

  autoTable(doc, {
    startY: infoTop,
    head: [["Information", "Valeur"]],
    body: rows,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", textColor: [71, 85, 105] }, 1: { cellWidth: pageW - 45 - 28 } },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || infoTop;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document généré le ${fmtDate(new Date())}`, 14, Math.min(finalY + 10, doc.internal.pageSize.getHeight() - 10));

  const safeName = (candidate.name || "candidat").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`fiche_${safeName}.pdf`);
}

export interface PdfPayment {
  id?: string;
  amount?: number;
  votesCount?: number;
  status?: string;
  createdAt?: string;
  flutterwaveTxRef?: string;
  candidateId?: string;
  candidateName?: string | null;
  metadata?: any;
  user?: { name?: string; email?: string; phone?: string };
}

/** Resolve the payer phone number from the user record or the payment metadata. */
function payerPhone(p: PdfPayment): string {
  if (p.user?.phone) return p.user.phone;
  const m = p.metadata || {};
  return m.phone || m.phone_number || m.msisdn || m.customerPhone || "—";
}

/** Generate and download a report of all transactions (status + payer number). */
export async function downloadTransactionsPdf(
  payments: PdfPayment[],
  candidateNameById: Record<string, string> = {},
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("REINES DU META", 14, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Rapport des transactions", 14, 18);

  // Summary
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const revenue = completed.reduce((s, p) => s + (p.amount || 0), 0);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  const summary = `Total : ${payments.length} transaction(s)  ·  Complétées : ${completed.length}  ·  Revenus : ${fmtMoney(revenue)}  ·  Généré le ${fmtDate(new Date())}`;
  doc.text(summary, 14, 32);

  const body = payments.map((p, i) => [
    String(i + 1),
    fmtDate(p.createdAt),
    val(p.user?.name),
    payerPhone(p),
    p.candidateName || candidateNameById[p.candidateId || ""] || "—",
    String(p.votesCount ?? "—"),
    fmtMoney(p.amount),
    val(p.status),
    val(p.flutterwaveTxRef),
  ]);

  autoTable(doc, {
    startY: 37,
    head: [["#", "Date", "Payeur", "N° payeur", "Candidat", "Votes", "Montant", "Statut", "Référence"]],
    body,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [243, 246, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
    // Colour the status cell
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 7) {
        const s = String(data.cell.raw);
        if (s === "COMPLETED") data.cell.styles.textColor = [16, 185, 129];
        else if (s === "PENDING") data.cell.styles.textColor = [245, 158, 11];
        else if (s === "FAILED" || s === "REFUNDED") data.cell.styles.textColor = [239, 68, 68];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
}
