import React, { useState, ReactNode } from "react";

/**
 * WebsiteDetector Component
 *
 * What it does:
 * - Takes a user-input website URL and runs several detection checks.
 * - Displays a summary (legitimate vs suspicious) and a checklist of results.
 *
 * How it works:
 * 1. Parses the input string using the built-in URL API.
 * 2. Runs checks on the parsed URL:
 *    - Valid URL format (must parse without error).
 *    - Protocol check (only http or https allowed).
 *    - HTTPS security check (gives preference to secure https).
 *    - Character validation (ensures hostname has no invalid/suspicious symbols).
 *    - Domain length check (reasonable length between 1–253 chars).
 *    - IP address detection (flags raw IP-based URLs as potentially suspicious).
 * 3. Generates a checklist showing which checks passed and which failed.
 * 4. Displays a summary message at the top:
 *    - ✅ Legitimate if all checks pass.
 *    - ⚠️ Suspicious if one or more checks fail.
 *
 * Notes:
 * - This is a client-side implementation — it does not fetch data from the web.
 * - It complements URLDetector by focusing on whole website validation instead of just raw URL strings.
 * - Server-side extensions (SSL validation, DNS lookups, blacklist checks, etc.)
 *   could be added later by building an API backend.
 */


interface CheckResult {
  label: string;
  passed: boolean;
}

const WebsiteDetector: React.FC = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState("");

  const validateWebsite = (url: string) => {
    const checks: CheckResult[] = [];
    let summaryMessage = "";

    try {
      // Basic URL validation
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        setResults([
          { label: "Valid URL format", passed: false },
          { label: "Starts with http or https", passed: false },
        ]);
        setSummary("❌ Invalid URL format.");
        return;
      }

      const protocol = parsed.protocol.replace(":", "");
      const hostname = parsed.hostname;

      // Check 1: Valid format
      checks.push({ label: "Valid URL format", passed: true });

      // Check 2: Protocol
      checks.push({
        label: "Uses http or https protocol",
        passed: protocol === "http" || protocol === "https",
      });

      // Check 3: HTTPS
      checks.push({
        label: "Uses secure HTTPS",
        passed: protocol === "https",
      });

      // Check 4: No spaces or invalid characters
      const invalidChars = /[ !@#$%^&*(),;:'"?/\\|<>\[\]{}]/;
      checks.push({
        label: "No invalid characters in hostname",
        passed: !invalidChars.test(hostname),
      });

      // Check 5: Domain length reasonable
      checks.push({
        label: "Domain length is reasonable",
        passed: hostname.length > 1 && hostname.length <= 253,
      });

      // Check 6: Not an IP address (basic phishing check)
      const ipRegex =
        /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[A-F0-9]*:[A-F0-9:]+\]?$/i;
      checks.push({
        label: "Domain is not a raw IP address",
        passed: !ipRegex.test(hostname),
      });

      // Create summary
      const allPassed = checks.every((c) => c.passed);
      summaryMessage = allPassed
        ? `✅ This website looks legitimate: ${hostname}`
        : `⚠️ This website may be suspicious: ${hostname}`;

      setResults(checks);
      setSummary(summaryMessage);
    } catch {
      setResults([{ label: "Unexpected error occurred", passed: false }]);
      setSummary("❌ Error validating website.");
    }
  };

  const renderChecklist = (): ReactNode => {
    return (
      <ul className="mt-2 space-y-1">
        {results.map((check, index) => (
          <li
            key={index}
            className={`flex items-center space-x-2 ${
              check.passed ? "text-green-600" : "text-red-600"
            }`}
          >
            <span>{check.passed ? "✅" : "❌"}</span>
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-4 border rounded-xl shadow bg-white">
      <h2 className="text-xl font-bold mb-2">Website Detector</h2>
      <input
        className="border p-2 w-full rounded mb-2"
        type="text"
        placeholder="Enter website URL"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => validateWebsite(input)}
      >
        Check Website
      </button>

      {summary && <p className="mt-2 font-semibold">{summary}</p>}
      {renderChecklist()}
    </div>
  );
};

export default WebsiteDetector;
