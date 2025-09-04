/**
 * PasswordSecurityAnalyzer.tsx
 *
 * Combines:
 *  - PasswordInput (entry + show/hide toggle)
 *  - PasswordStrength (strength meter with rules)
 *  - BruteForceEstimator (crack-time estimates)
 *
 * Usage: <PasswordSecurityAnalyzer />
 */

"use client";
import React, { useState } from "react";
import { getDomain } from "tldts";

// ---------------- Password Security Analyzer ----------------
export default function PasswordSecurityAnalyzer() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [showEncryption, setShowEncryption] = useState(false);
  const [expandedPCs, setExpandedPCs] = useState<Record<string, boolean>>({});

  // ---------------- Password Strength ----------------
  const rules = [
    { regex: /.{8,}/, label: "8+ characters" },
    { regex: /[A-Z]/, label: "Uppercase" },
    { regex: /[a-z]/, label: "Lowercase" },
    { regex: /[0-9]/, label: "Number" },
    { regex: /[^A-Za-z0-9]/, label: "Special character" },
  ];
  const passed = rules.filter((r) => r.regex.test(password)).length;
  const score = passed / rules.length;
  const getBarColor = () => {
    if (score <= 0.4) return "bg-red-500";
    if (score <= 0.8) return "bg-yellow-400";
    return "bg-green-500";
  };

  // ---------------- Brute Force Estimator ----------------
  type HashAlgoKey =
    | "md5"
    | "sha1"
    | "sha256"
    | "bcrypt10"
    | "bcrypt12"
    | "scrypt"
    | "argon2id";

  const HASH_RATES: Record<HashAlgoKey, number> = {
    md5: 1e11,
    sha1: 6e10,
    sha256: 8e9,
    bcrypt10: 1e5,
    bcrypt12: 2.5e4,
    scrypt: 8e4,
    argon2id: 5e4,
  };

  const PCS = [
    {
      name: "Typical PC",
      multiplier: 1,
      cpu: "Intel Core i5-10400",
      cores: 6,
      clock: "2.9 GHz",
      gpu: "Integrated",
    },
    {
      name: "Gaming Rig",
      multiplier: 8,
      cpu: "AMD Ryzen 9 5900X",
      cores: 12,
      clock: "3.7 GHz",
      gpu: "NVIDIA RTX 3080",
    },
    {
      name: "Cloud Cluster",
      multiplier: 1000,
      cpu: "Xeon Platinum 8260",
      cores: 48,
      clock: "2.4 GHz",
      gpu: "Tesla V100 x8",
    },
    {
      name: "Supercomputer",
      multiplier: 10000,
      cpu: "IBM POWER9",
      cores: 2048,
      clock: "3.1 GHz",
      gpu: "NVIDIA A100 x512",
    },
  ];

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "—";
    if (seconds < 1) return "Instant";
    const units = [
      { label: "years", value: 31557600 },
      { label: "days", value: 86400 },
      { label: "hours", value: 3600 },
      { label: "minutes", value: 60 },
      { label: "seconds", value: 1 },
    ];
    for (let unit of units) {
      if (seconds >= unit.value)
        return `${Math.floor(seconds / unit.value)} ${unit.label}`;
    }
    return "Instant";
  };

  const charsetSize =
    (/[a-z]/.test(password) ? 26 : 0) +
    (/[A-Z]/.test(password) ? 26 : 0) +
    (/[0-9]/.test(password) ? 10 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 32 : 0);

  const keyspace = Math.pow(charsetSize || 1, password.length);

  const togglePC = (name: string) => {
    setExpandedPCs((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // ---------------- Render ----------------
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Password Input */}
      <div className="relative">
        <label className="block mb-2 text-gray-700 font-semibold">Password</label>
        <input
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium hover:text-gray-700"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {/* Password Strength Meter */}
      {password && (
        <div className="w-full mt-4">
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className={`h-3 rounded-full ${getBarColor()} transition-all duration-300`}
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>Password Strength</span>
            <span>
              {score <= 0.4 ? "Weak" : score <= 0.8 ? "Medium" : "Strong"}
            </span>
          </div>
          <ul className="text-xs space-y-1">
            {rules.map((r, i) => (
              <li
                key={i}
                className={`flex items-center ${
                  r.regex.test(password) ? "text-green-600" : "text-red-600"
                }`}
              >
                {r.regex.test(password) ? "✅" : "❌"}{" "}
                <span className="ml-2">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Brute Force Estimator */}
      {password && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* LEFT: PC Crack Times */}
          <div className="flex-1 space-y-4">
            <h3 className="text-lg font-semibold">PC Crack Times</h3>
            {PCS.map((pc) => {
              const guessesPerSec = 1e7 * pc.multiplier;
              const avg = keyspace / 2 / guessesPerSec;
              const max = keyspace / guessesPerSec;
              const isExpanded = expandedPCs[pc.name] || false;

              return (
                <div
                  key={pc.name}
                  className="bg-gray-600 text-white rounded-lg p-3 cursor-pointer"
                  onClick={() => togglePC(pc.name)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{pc.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-green-200">
                        Avg: {formatTime(avg)} | Max: {formatTime(max)}
                      </span>
                      <span
                        className={`transform transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 bg-gray-700 p-3 rounded space-y-1 text-sm">
                      <p>
                        <span className="font-semibold">CPU:</span> {pc.cpu}
                      </p>
                      <p>
                        <span className="font-semibold">Cores:</span> {pc.cores}
                      </p>
                      <p>
                        <span className="font-semibold">Clock:</span> {pc.clock}
                      </p>
                      <p>
                        <span className="font-semibold">GPU:</span> {pc.gpu}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Hash Estimates */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Hash-Based Estimates</h3>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                onClick={() => setShowEncryption((s) => !s)}
              >
                {showEncryption ? "Hide" : "Show"}
              </button>
            </div>
            {showEncryption && (
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {(Object.keys(HASH_RATES) as HashAlgoKey[]).map((algo) => {
                  return (
                    <div
                      key={algo}
                      className="bg-gray-500 rounded p-3 flex justify-between items-center"
                    >
                      <span className="capitalize font-medium">{algo}</span>
                      <span className="font-mono text-green-200 text-xs">
                        {formatTime(keyspace / 2 / HASH_RATES[algo])} |{" "}
                        {formatTime(keyspace / HASH_RATES[algo])}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
