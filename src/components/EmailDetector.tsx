/**
 * Advanced Email Authenticity Checker — Single React Component (No APIs)
 *
 * WHAT IT IMPLEMENTS
 * - Simple scoring system with detailed reasons (transparent rule-by-rule)
 * - Attachment checks (dangerous, macro-enabled, double extensions)
 * - Link vs. display mismatch for Markdown and HTML anchors
 * - Stronger sender-domain heuristics (lookalikes, free providers, long domains, punycode)
 * - Basic header analysis (From vs Reply-To mismatch, SPF in Authentication-Results)
 * - Clean UI to paste email subject/body and optionally enter headers & attachments
 *
 * HOW IT WORKS
 * 1) You enter Subject, From, Reply-To, Authentication-Results, Attachments, and Body.
 * 2) On "Analyze", we extract URLs, parse domains, and run heuristic rules.
 * 3) Each triggered rule contributes weighted points to a total Risk Score.
 * 4) We show: total score, risk category, and the exact reasons that fired.
 *
 * NOTES
 * - 100% offline. No external APIs.
 * - Sensible defaults: nothing is hardcoded to be suspicious. If you paste a normal email,
 *   score should be low. Turn on/off stricter checks with the provided toggles.
 */

"use client";
import { useMemo, useState } from "react";
import { getDomain, parse as parseTld } from "tldts";

// ------------------------- Types -------------------------
interface DetectionInput {
  subject: string;
  body: string;
  fromEmail: string;
  replyToEmail: string;
  authResults: string; // raw Authentication-Results header line(s)
  attachments: string[]; // file names
  options: {
    treatFreeProvidersAsSuspicious: boolean;
    strictBrandLookalikes: boolean;
    threshold: number; // score threshold for Suspicious
  };
}

interface DetectionResult {
  score: number;
  reasons: string[];
  category: "Likely Safe" | "Needs Review" | "Suspicious";
}

// ------------------------- Config & Helpers -------------------------
const WEIGHTS = {
  keyword: 2,
  suspiciousUrl: 3,
  longDomain: 2,
  punycode: 3,
  brandLookalike: 4,
  freeProviderAsCorp: 2,
  linkMismatch: 3,
  dangerousAttachment: 5,
  macroAttachment: 4,
  doubleExtension: 5,
  replyToMismatch: 4,
  spfFailOrMissing: 3,
};

const PHISHING_KEYWORDS = [
  "urgent",
  "verify",
  "account locked",
  "password reset",
  "click here",
  "last warning",
  "act now",
  // Business-y but often abused (kept low weight overall)
  "invoice attached",
  "bank transfer",
  "payment declined",
  "confirm your account",
];

const DANGEROUS_EXTS = [".exe", ".scr", ".bat", ".vbs", ".js", ".cmd", ".pif", ".jar"];
const RISKY_OFFICE_EXTS = [".docm", ".xlsm", ".pptm"];
const FREE_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
];

// A small set of high-target brands to check lookalikes for. Extend as needed.
const HIGH_VALUE_BRANDS = [
  "paypal.com",
  "microsoft.com",
  "apple.com",
  "amazon.com",
  "google.com",
  "netflix.com",
  "bankofamerica.com",
  "chase.com",
];

function normalizeStr(s: string) {
  return s.toLowerCase().trim();
}

function emailToDomain(email: string): string | null {
  const m = email.toLowerCase().match(/@([^>\s]+)>?$|@([^\s]+)/);
  const host = m ? (m[1] || m[2]) : null;
  if (!host) return null;
  return getDomain(host) || host;
}

function safeGetDomainFromUrl(raw: string): string | null {
  try {
    const hasScheme = /^https?:\/\//i.test(raw);
    const url = new URL(hasScheme ? raw : `http://${raw}`);
    // getDomain returns eTLD+1; fallback to hostname
    return getDomain(url.hostname) || url.hostname;
  } catch {
    // Try last-resort parse via tldts.parse
    const info = parseTld(raw);
    if (info && info.domain) return info.domain;
    return null;
  }
}

// primitive homoglyph normalization for common swaps
function deobfuscateHomoglyphs(s: string) {
  return s
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a");
}

function looksLikeBrand(domain: string, brandDomain: string) {
  const d = deobfuscateHomoglyphs(domain.toLowerCase());
  const b = brandDomain.toLowerCase();
  if (d === b) return false; // exact match is not a lookalike
  // Flag when eTLD+1 equals brand with extra label (e.g., paypal.com.security-login.cn)
  if (d.includes(b) && !d.endsWith(b)) return true;
  // Flag near-equality after homoglyphs (e.g., paypa1.com)
  const stripped = d.replace(/[^a-z]/g, "");
  const strippedB = b.replace(/[^a-z]/g, "");
  return stripped === strippedB; // very strict equality after deobfuscation
}

function extractAllUrls(text: string): string[] {
  const urls = new Set<string>();
  // Plain URLs
  const plain = text.match(/https?:\/\/[^\s)]+/gi) || [];
  plain.forEach((u) => urls.add(u));
  // Markdown [text](url)
  const mdReg = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = mdReg.exec(text)) !== null) urls.add(m[1]);
  // HTML <a href="url">
  const htmlReg = /<a [^>]*href=\"([^\"]+)\"[^>]*>/gi;
  while ((m = htmlReg.exec(text)) !== null) urls.add(m[1]);
  return Array.from(urls);
}

function extractLinkTextPairs(text: string): Array<{ display: string; href: string }>{
  const pairs: Array<{ display: string; href: string }> = [];
  // Markdown [display](href)
  const md = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = md.exec(text)) !== null) {
    pairs.push({ display: m[1], href: m[2] });
  }
  // HTML <a href="...">display</a>
  const html = /<a [^>]*href=\"([^\"]+)\"[^>]*>(.*?)<\/a>/gi;
  while ((m = html.exec(text)) !== null) {
    pairs.push({ display: m[2], href: m[1] });
  }
  return pairs;
}

// ------------------------- Core Detection -------------------------
function detect(input: DetectionInput): DetectionResult {
  const reasons: string[] = [];
  let score = 0;

  const text = normalizeStr(`${input.subject} ${input.body}`);
  const fromDomain = emailToDomain(input.fromEmail) || "";
  const replyToDomain = emailToDomain(input.replyToEmail) || "";

  // 1) Keywords (mild weight)
  for (const kw of PHISHING_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Contains suspicious phrase: "${kw}"`);
      score += WEIGHTS.keyword;
    }
  }

  // 2) URLs & domains
  const urls = extractAllUrls(input.body);
  for (const url of urls) {
    const domain = safeGetDomainFromUrl(url);
    if (!domain) continue;

    if (domain.length > 40) {
      reasons.push(`Very long domain: ${domain}`);
      score += WEIGHTS.longDomain;
    }

    if (/^xn--/.test(domain)) {
      reasons.push(`Punycode domain detected: ${domain}`);
      score += WEIGHTS.punycode;
    }

    // Generic suspicious cues
    if (/(secure|login|update|verify)/i.test(domain)) {
      reasons.push(`Suspicious keyword in domain: ${domain}`);
      score += WEIGHTS.suspiciousUrl;
    }

    // Brand lookalikes
    if (input.options.strictBrandLookalikes) {
      for (const brand of HIGH_VALUE_BRANDS) {
        if (looksLikeBrand(domain, brand)) {
          reasons.push(`Brand lookalike detected: ${domain} ~ ${brand}`);
          score += WEIGHTS.brandLookalike;
          break;
        }
      }
    }
  }

  // 3) Link text vs destination mismatch
  const pairs = extractLinkTextPairs(input.body);
  for (const { display, href } of pairs) {
    const d = safeGetDomainFromUrl(href) || "";
    const disp = normalizeStr(display);
    if (d && disp && !disp.includes(d)) {
      reasons.push(`Link text ("${display}") does not match destination (${href})`);
      score += WEIGHTS.linkMismatch;
    }
  }

  // 4) Attachments
  for (const file of input.attachments) {
    const lower = file.toLowerCase().trim();
    if (!lower) continue;

    if (DANGEROUS_EXTS.some((ext) => lower.endsWith(ext))) {
      reasons.push(`Dangerous attachment: ${file}`);
      score += WEIGHTS.dangerousAttachment;
    }

    if (RISKY_OFFICE_EXTS.some((ext) => lower.endsWith(ext))) {
      reasons.push(`Macro-enabled Office attachment: ${file}`);
      score += WEIGHTS.macroAttachment;
    }

    if (/\.(\w+)\.(exe|bat|scr|cmd|js)$/i.test(lower)) {
      reasons.push(`Double-extension trick: ${file}`);
      score += WEIGHTS.doubleExtension;
    }
  }

  // 5) Headers (From/Reply-To, SPF)
  if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
    reasons.push(`From (${fromDomain}) ≠ Reply-To (${replyToDomain})`);
    score += WEIGHTS.replyToMismatch;
  }

  if (input.authResults) {
    const ar = input.authResults.toLowerCase();
    if (!/spf=pass/.test(ar)) {
      reasons.push(`SPF not pass in Authentication-Results`);
      score += WEIGHTS.spfFailOrMissing;
    }
  }

  // 6) Treat free providers as suspicious *only* if pretending to be corporate
  if (input.options.treatFreeProvidersAsSuspicious && fromDomain) {
    const isFree = FREE_PROVIDERS.includes(fromDomain);
    // If email claims a brand in subject/body but sent from free provider
    if (isFree && HIGH_VALUE_BRANDS.some((b) => text.includes(b.split(".")[0]))) {
      reasons.push(`Corporate-sounding email sent from free provider (${fromDomain})`);
      score += WEIGHTS.freeProviderAsCorp;
    }
  }

  // Final category
  let category: DetectionResult["category"] = "Likely Safe";
  if (score >= input.options.threshold * 2) category = "Suspicious";
  else if (score >= input.options.threshold) category = "Needs Review";

  return { score, reasons, category };
}

// ------------------------- UI Component -------------------------
export default function AdvancedEmailDetector() {
  const [subject, setSubject] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [authResults, setAuthResults] = useState("");
  const [attachmentsRaw, setAttachmentsRaw] = useState("");
  const [body, setBody] = useState("");

  const [treatFree, setTreatFree] = useState(true);
  const [strictBrands, setStrictBrands] = useState(true);
  const [threshold, setThreshold] = useState(7);

  const attachments = useMemo(
    () => attachmentsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    [attachmentsRaw]
  );

  const [result, setResult] = useState<DetectionResult | null>(null);

  function analyze() {
    const res = detect({
      subject,
      body,
      fromEmail,
      replyToEmail: replyTo,
      authResults,
      attachments,
      options: {
        treatFreeProvidersAsSuspicious: treatFree,
        strictBrandLookalikes: strictBrands,
        threshold,
      },
    });
    setResult(res);
  }

  function fillSafeExample() {
    setSubject("Your July invoice is ready");
    setFromEmail("billing@legitvendor.com");
    setReplyTo("billing@legitvendor.com");
    setAuthResults("spf=pass dkim=pass dmarc=pass");
    setAttachmentsRaw("invoice.pdf");
    setBody(
      "Hi team, your July invoice is attached as a PDF. You can also view it in your account portal at https://portal.legitvendor.com.\n\nIf you have questions, reply to this email."
    );
  }

  function fillSuspiciousExample() {
    setSubject("URGENT: Verify your PayPal account now");
    setFromEmail("support@paypa1.com");
    setReplyTo("helpcenter@gmail.com");
    setAuthResults("spf=fail dkim=none");
    setAttachmentsRaw("invoice.docm, setup.exe");
    setBody(
      "Dear user, your account is locked. Click here immediately to verify: [PayPal Secure](http://secure-paypal.com-login.cn)."
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">Advanced Email Authenticity Checker</h1>
      <p className="text-sm text-gray-600">
        Paste a real email or load an example, then click <span className="font-semibold">Analyze</span>.
        Adjust options if needed. Higher score = higher risk.
      </p>

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Subject</label>
          <input
            className="w-full border rounded-xl p-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
          />

          <label className="block text-sm font-medium">From</label>
          <input
            className="w-full border rounded-xl p-2"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="e.g., notifications@company.com"
          />

          <label className="block text-sm font-medium">Reply-To</label>
          <input
            className="w-full border rounded-xl p-2"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="optional"
          />

          <label className="block text-sm font-medium">Authentication-Results</label>
          <input
            className="w-full border rounded-xl p-2"
            value={authResults}
            onChange={(e) => setAuthResults(e.target.value)}
            placeholder="e.g., spf=pass dkim=pass dmarc=pass"
          />

          <label className="block text-sm font-medium">Attachments (comma-separated)</label>
          <input
            className="w-full border rounded-xl p-2"
            value={attachmentsRaw}
            onChange={(e) => setAttachmentsRaw(e.target.value)}
            placeholder="invoice.pdf, info.docm"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Body</label>
          <textarea
            className="w-full border rounded-xl p-2 h-56"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the email body (plain, Markdown, or HTML)"
          />

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={fillSafeExample}
              className="border rounded-xl p-2 hover:bg-gray-50"
              type="button"
            >
              Load Safe Example
            </button>
            <button
              onClick={fillSuspiciousExample}
              className="border rounded-xl p-2 hover:bg-gray-50"
              type="button"
            >
              Load Suspicious Example
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="opt-free"
                type="checkbox"
                checked={treatFree}
                onChange={(e) => setTreatFree(e.target.checked)}
              />
              <label htmlFor="opt-free" className="text-sm">Treat brand-like emails from free providers as suspicious</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="opt-brands"
                type="checkbox"
                checked={strictBrands}
                onChange={(e) => setStrictBrands(e.target.checked)}
              />
              <label htmlFor="opt-brands" className="text-sm">Strict brand lookalike checks</label>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm">Threshold</label>
              <input
                type="number"
                className="w-24 border rounded-xl p-1"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value || "7", 10))}
                min={3}
                max={20}
              />
              <span className="text-xs text-gray-500">Suspicious ≥ 2× threshold • Needs Review ≥ threshold</span>
            </div>
          </div>

          <button
            onClick={analyze}
            className="mt-3 bg-blue-600 text-white rounded-xl p-2 shadow hover:bg-blue-700"
            type="button"
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Risk Score: {result.score}</div>
              <div className={
                result.category === "Suspicious"
                  ? "text-red-700 font-semibold"
                  : result.category === "Needs Review"
                  ? "text-yellow-700 font-semibold"
                  : "text-green-700 font-semibold"
              }>
                {result.category}
              </div>
            </div>
          </div>

          {result.reasons.length > 0 ? (
            <ul className="list-disc ml-6 mt-3 space-y-1 text-sm">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 mt-3">No red flags detected by the current rules.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500">
        Tip: If you see false positives, lower strictness (disable brand lookalikes),
        increase threshold, or remove business-y keywords like "invoice attached".
      </div>
    </div>
  );
}
