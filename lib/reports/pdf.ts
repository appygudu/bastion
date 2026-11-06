import PDFDocument from "pdfkit";
import type { ReportModel } from "./model";

export function renderReportPdf(model: ReportModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Times-Bold").fontSize(11).fillColor("#6e6456").text("BASTION  ·  EXECUTIVE POSTURE BRIEF");
    doc.moveDown(0.4);
    doc.font("Times-Bold").fontSize(24).fillColor("#1c1915").text(model.title);
    doc.font("Times-Roman").fontSize(11).fillColor("#1c1915").text(model.generatedAt);
    if (model.demo) {
      doc.moveDown(0.4);
      doc.font("Times-Italic").text("Demo fixture. Northwind Labs rows were seeded and were not collected from a live customer.");
    }
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(42).text(String(model.score));
    doc.font("Times-Roman").fontSize(12).text(`${model.band}. This index is a heuristic, not a certification.`);
    doc.moveDown(0.4);
    doc.fontSize(11).text(model.narrative);
    doc.moveDown(0.8);
    doc.font("Times-Bold").fontSize(13).text("Remediation roadmap");
    for (const phase of model.roadmap) {
      doc.moveDown(0.3);
      doc.font("Times-Bold").fontSize(11).text(phase.horizon);
      doc.font("Times-Roman").fontSize(11).list(phase.items);
    }
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(13).text("Highest-priority findings");
    const top = model.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").slice(0, 8);
    if (!top.length) doc.font("Times-Roman").fontSize(11).text("No critical or high findings in this brief.");
    for (const finding of top) {
      doc.moveDown(0.35);
      doc.font("Times-Bold").fontSize(11).text(`${finding.severity.toUpperCase()}  ${finding.title}`);
      doc.font("Times-Roman").fontSize(10).text(finding.evidence);
    }
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(13).text("Ledger");
    doc.font("Times-Roman").fontSize(11).text(
      `${model.ledger.events} events. Chain ${model.ledger.chainValid ? "verified" : "FAILED"}. ${model.ledger.anomalies} anomalies. ${model.agents.events} agent events, ${model.agents.findings} guardrail findings.`,
    );
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(13).text("Framework mapping");
    for (const item of model.frameworks) {
      doc.moveDown(0.25);
      doc.font("Times-Bold").fontSize(11).text(item.name);
      doc.font("Times-Roman").fontSize(10).text(item.how);
    }
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(13).text("Limitations");
    doc.font("Times-Roman").fontSize(10).list(model.limitations);
    doc.moveDown(1);
    doc.fontSize(9).fillColor("#6e6456").text("© 2026 Flyhigh. All rights reserved. Defensive use on assets you own or are authorized to assess.");
    doc.end();
  });
}
