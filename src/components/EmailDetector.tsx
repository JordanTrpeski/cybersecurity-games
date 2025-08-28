import React, { useState } from "react";

const suspiciousKeywords = ["urgent", "click here", "reset password", "verify"];

const EmailDetector: React.FC = () => {
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState("");

  const checkEmail = () => {
    const text = emailText.toLowerCase();
    let score = 0;

    suspiciousKeywords.forEach((kw) => {
      if (text.includes(kw)) score++;
    });

    if (score >= 2) {
      setResult("⚠️ Suspicious email detected");
    } else {
      setResult("✅ Email looks okay");
    }
  };

  return (
    <div className="p-4 border rounded-xl shadow bg-white">
      <h2 className="text-xl font-bold mb-2">Email Detector</h2>
      <textarea
        className="border p-2 w-full rounded mb-2"
        rows={4}
        placeholder="Paste email content here"
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
      />
      <button
        className="bg-green-600 text-white px-4 py-2 rounded"
        onClick={checkEmail}
      >
        Check Email
      </button>
      {result && <p className="mt-2">{result}</p>}
    </div>
  );
};

export default EmailDetector;
