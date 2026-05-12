/**
 * Vercel Serverless — contact Nexia via Resend (SDK officiel).
 * Définir RESEND_API_KEY dans les variables d’environnement (Vercel ou .env en local avec `vercel dev`).
 *
 * Base équivalente : import { Resend } from "resend"; const resend = new Resend(process.env.RESEND_API_KEY);
 */

import { Resend } from "resend";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBody(req) {
  const b = req.body;
  if (b == null || b === "") return {};
  if (typeof b === "object") return b;
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY manquant côté serveur" });
  }

  const resend = new Resend(apiKey);
  const data = parseBody(req);

  const name = (data.name || "").toString().trim();
  const email = (data.email || "").toString().trim();
  const phone = (data.phone || "").toString().trim();
  const sector = (data.sector || "").toString().trim();
  const message = (data.message || "").toString().trim();

  if (!name || !email || !sector || !message) {
    return res.status(400).json({ error: "Nom, e-mail, secteur et message sont requis." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Adresse e-mail invalide." });
  }

  const subjectName = name.slice(0, 120) || "Sans nom";
  const subject = `Nouveau contact Nexia — ${subjectName}`;

  const html = `
    <h2 style="font-family:system-ui,sans-serif;">Nouveau contact Nexia</h2>
    <table style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;">
      <tr><td style="padding:4px 12px 4px 0;"><strong>Nom</strong></td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;"><strong>E-mail</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;"><strong>Téléphone</strong></td><td>${escapeHtml(phone || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;"><strong>Secteur</strong></td><td>${escapeHtml(sector)}</td></tr>
    </table>
    <p style="font-family:system-ui,sans-serif;margin-top:16px;"><strong>Message</strong></p>
    <pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;background:#f4f4f5;padding:14px;border-radius:8px;margin:0;">${escapeHtml(message)}</pre>
  `;

  const { data: sent, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "haris.gana@gmail.com",
    replyTo: email,
    subject,
    html,
  });

  if (error) {
    return res.status(502).json({
      error: "Resend n’a pas pu envoyer l’e-mail.",
      detail: error,
    });
  }

  return res.status(200).json({ ok: true, id: sent?.id || null });
}
