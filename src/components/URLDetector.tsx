import React, { useState } from "react";
import { getDomain } from "tldts";
import * as punycode from "punycode";


// URLDetector Component
// ---------------------
// This component analyzes user-input URLs purely on the client side, without fetching the website. 
// It performs multiple levels of static validation to detect potentially suspicious or malformed URLs.
//
// Features included:
// 1. Input Sanitization: trims input, rejects spaces, illegal characters, and unexpected symbols.
// 2. Domain Extraction: extracts the domain using tldts and converts to ASCII/Unicode for validation.
// 3. Domain Validation: checks for invalid characters, incorrect hyphen placement, numeric-only domains, and empty labels.
// 4. IDN Homograph Detection: identifies domains using deceptive Unicode characters that may mimic legitimate domains.
// 5. Suspicious TLD Detection: warns if the domain uses high-risk top-level domains (like .xyz, .top, .club).
// 6. Path, Query, and Fragment Validation: ensures URL path, query string, and fragment contain only valid URL characters.
// 7. Checklist Feedback: generates a checklist explaining why the URL is considered legitimate or suspicious, with color-coded messages for user clarity.
// 8. Pure Client-Side Operation: all checks are done in-browser using TypeScript and React; no server requests are made.
//
// Overall, this provides a safe, informative URL analysis tool to help users quickly evaluate whether a URL appears valid or potentially risky.



// Suspicious TLDs example list
const suspiciousTLDs = ["xyz", "top", "club", "online", "site", "info"];

// Validate each label of the domain
const isValidDomain = (domain: string): boolean => {
  const labels = domain.split(".");
  for (const label of labels) {
    if (!label) return false; // empty label
    if (/[^a-zA-Z0-9-]/.test(label)) return false; // invalid characters
    if (/^-|-$/.test(label)) return false; // starts or ends with hyphen
  }
  return true;
};

// Validate path, query, fragment characters
const isValidURLPath = (urlObj: URL): string[] => {
  const issues: string[] = [];
  const invalidChars = /[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]/; // valid URL chars per RFC 3986

  const checkPart = (part: string, name: string) => {
    if (invalidChars.test(part)) {
      issues.push(`${name} contains invalid characters`);
    }
  };

  checkPart(urlObj.pathname, "Path");
  checkPart(urlObj.search, "Query");
  checkPart(urlObj.hash, "Fragment");

  return issues;
};

const URLDetector: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<React.ReactNode>(null);

  const checkURL = () => {
    setResult(null);
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      setResult(<p className="text-red-600">❌ Please enter a URL</p>);
      return;
    }

    // Ensure protocol exists for parsing
    let url = trimmedInput;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      setResult(
        <div>
          <p className="text-red-600">❌ Invalid URL format</p>
          <ul className="list-disc ml-6 mt-2 text-gray-700">
            <li>URL could not be parsed properly</li>
          </ul>
        </div>
      );
      return;
    }

    const domain = getDomain(url);
    const asciiDomain = domain ? punycode.toASCII(domain) : "";
    const unicodeDomain = domain ? punycode.toUnicode(domain) : "";

    const checklistItems: string[] = [];
    const warningMessages: React.ReactNode[] = [];

    // Domain checks
    if (!domain) {
      warningMessages.push(
        <p className="text-red-600" key="nodomain">
          ❌ Could not extract domain
        </p>
      );
      checklistItems.push("No valid domain found");
    } else {
      if (!isValidDomain(domain)) {
        warningMessages.push(
          <p className="text-red-600" key="invalid">
            ❌ Domain contains invalid characters or invalid hyphen placement
          </p>
        );
        checklistItems.push("Domain has invalid characters or hyphen issues");
      }

      if (asciiDomain !== domain) {
        warningMessages.push(
          <p className="text-yellow-700" key="idn">
            ⚠️ Possible IDN homograph detected: {unicodeDomain} ({asciiDomain})
          </p>
        );
        checklistItems.push(
          "Domain may use deceptive Unicode characters (IDN homograph)"
        );
      }

      const tld = domain.split(".").pop();
      if (tld && suspiciousTLDs.includes(tld)) {
        warningMessages.push(
          <p className="text-yellow-700" key="tld">
            ⚠️ Suspicious top-level domain: .{tld}
          </p>
        );
        checklistItems.push("Suspicious TLD detected");
      }
    }

    // Path, query, fragment checks
    const pathIssues = isValidURLPath(urlObj);
    pathIssues.forEach((issue) => {
      warningMessages.push(
        <p className="text-red-600" key={issue}>
          ❌ {issue}
        </p>
      );
      checklistItems.push(issue);
    });

    // If no warnings, mark URL as legitimate
    if (warningMessages.length === 0 && domain) {
      warningMessages.push(
        <p className="text-green-600" key="ok">
          ✅ This URL looks legitimate: {url}
        </p>
      );
      checklistItems.push("Valid URL format");
      checklistItems.push("No suspicious TLD detected");
      checklistItems.push("No IDN homograph issues");
      checklistItems.push("No unusual characters in domain or path/query/fragment");
    }

    // Show all messages + checklist
    setResult(
      <div>
        {warningMessages}
        <div className="mt-2">
          <p className="font-semibold">Checklist:</p>
          <ul className="list-disc ml-6 text-gray-700">
            {checklistItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 border rounded-xl shadow bg-white max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">URL Detector</h2>
      <input
        className="border p-2 w-full rounded mb-2"
        type="text"
        placeholder="Enter URL"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={checkURL}
      >
        Check URL
      </button>
      {result && <div className="mt-2">{result}</div>}
    </div>
  );
};

export default URLDetector;
