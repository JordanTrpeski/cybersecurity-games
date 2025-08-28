import React, { useState } from "react";

// Reusable DetectionQuizzes component file for the cybersecurity-games project.
// Exported components:
// - default export: DetectionQuizzes (a single component that renders the full tabbed quiz UI)
// - named exports: QuizShell, PhishingQuiz, WebsiteQuiz, EmailQuiz, URLQuiz
// Save this as src/components/DetectionQuizzes.tsx and import where needed.

export type Question = {
  id: number;
  prompt: string;
  choices: string[];
  answer: number; // index of correct choice
  explanation: string;
};

export function QuizShell({
  title,
  questions,
}: {
  title: string;
  questions: Question[];
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);

  const q = questions[index];

  function submit() {
    if (selected === null) return;
    const correct = selected === q.answer;
    if (correct) setScore((s) => s + 1);
    setShowExplanation(true);
  }

  function next() {
    setShowExplanation(false);
    setSelected(null);
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setShowExplanation(false);
    setFinished(false);
  }

  return (
    <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>

      {!finished ? (
        <div>
          <div className="mb-4">
            <div className="text-sm text-gray-500">Question {index + 1} of {questions.length}</div>
            <div className="mt-2 text-lg font-medium">{q.prompt}</div>
          </div>

          <div className="grid gap-3">
            {q.choices.map((c, i) => {
              const isSelected = selected === i;
              const isCorrect = showExplanation && i === q.answer;
              const isWrongAndSelected = showExplanation && isSelected && i !== q.answer;
              return (
                <button
                  key={i}
                  onClick={() => !showExplanation && setSelected(i)}
                  className={`text-left p-3 rounded-lg border w-full transition focus:outline-none
                    ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white"}
                    ${isCorrect ? "border-green-500 bg-green-50" : ""}
                    ${isWrongAndSelected ? "border-red-400 bg-red-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1">{c}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={submit}
              disabled={selected === null || showExplanation}
              className="px-4 py-2 bg-indigo-600 disabled:bg-indigo-200 text-white rounded-lg"
            >
              Submit
            </button>

            <button
              onClick={next}
              disabled={!showExplanation}
              className="px-4 py-2 bg-gray-100 disabled:bg-gray-50 rounded-lg"
            >
              Next
            </button>

            <div className="ml-auto text-sm text-gray-600">Score: {score}</div>
          </div>

          {showExplanation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="font-medium">Explanation</div>
              <div className="mt-2 text-sm text-gray-700">{q.explanation}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="text-3xl font-bold">Finished</div>
          <div className="mt-2 text-xl">Your score: {score} / {questions.length}</div>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={restart} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Restart</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Question banks for each topic ----
const phishingQuestions: Question[] = [
  {
    id: 1,
    prompt: "You receive an email from your bank asking you to click a link to verify your account. The email contains urgent language and a link that points to a slightly different domain. What are the most suspicious signs?",
    choices: [
      "The urgent language and unfamiliar link — possible phishing",
      "Banks always email for verification, so it's safe",
      "The email is legitimate because it uses your name",
      "Ignore — it's harmless promotional content"
    ],
    answer: 0,
    explanation: "Phishing emails often use urgent language to prompt immediate action and links that mimic real domains (typosquatting). Banks rarely ask for verification via email with direct links. Check sender address and hover the link to inspect the true URL."
  },
  {
    id: 2,
    prompt: "An email contains an attachment named 'invoice.zip' from an unknown sender. What should you do?",
    choices: [
      "Open it to see the invoice",
      "Scan the file and verify sender before opening",
      "Reply asking to resend because it might be important",
      "Forward to colleagues immediately"
    ],
    answer: 1,
    explanation: "Attachments (especially .zip, .exe, documents with macros) from unknown senders are high-risk. Scan with antivirus and verify the sender separately (call them) before opening."
  },
  {
    id: 3,
    prompt: "An email address looks like support@amaz0n.com (zero instead of o). The email content looks like a purchase receipt you don't recognize. This suggests:",
    choices: [
      "A legitimate receipt from Amazon",
      "A phishing attempt using a lookalike domain",
      "An internal system notification",
      "A harmless newsletter"
    ],
    answer: 1,
    explanation: "Attackers use visually similar characters to impersonate brands (e.g., 'amaz0n' instead of 'amazon'). Check the exact sender domain and don't click links; open your account directly through the official site if concerned."
  }
];

const websiteQuestions: Question[] = [
  {
    id: 1,
    prompt: "You visit a site that has a padlock icon but the URL is 'httpS://secure-login.example.verify-now.com'. Is this definitely the real site?",
    choices: [
      "Yes — padlock means it's secure and real",
      "No — padlock only means the connection is encrypted; domain matters",
      "Yes — any site with https is safe",
      "No — it's definitely a virus"
    ],
    answer: 1,
    explanation: "HTTPS (padlock) means the connection is encrypted, not that the site is trustworthy. Attackers can host phishing pages on HTTPS. Carefully check the domain (example.verify-now.com) — the real site would likely be example.com or login.example.com."
  },
  {
    id: 2,
    prompt: "Which of these is the best way to verify a website's authenticity before entering credentials?",
    choices: [
      "Trust the look of the page and logo",
      "Check the exact domain name and use bookmarks or type the known URL",
      "Click the first linked result in search engines",
      "Use the browser's autofill without checking"
    ],
    answer: 1,
    explanation: "Always verify the exact domain name. Use bookmarks or type the URL you know, or search for the official site through trusted sources. Avoid entering credentials on pages reached through unsolicited links."
  }
];

const emailQuestions: Question[] = [
  {
    id: 1,
    prompt: "An email from a colleague asks for a confidential file but contains unusual grammar and a slightly off sender address. What should you do?",
    choices: [
      "Send the file immediately — they asked",
      "Verify via a different channel (call or chat) before sending",
      "Ignore the message",
      "Reply with your confidential file to prove identity"
    ],
    answer: 1,
    explanation: "Business Email Compromise (BEC) often spoofs internal addresses or uses lookalikes and tries to rush requests. Verify via another channel before sharing sensitive data."
  },
  {
    id: 2,
    prompt: "An email claims your mailbox is full and asks you to click a link to upgrade storage. The link points to a short URL (bit.ly/xyz). Best response:",
    choices: [
      "Click the link and upgrade — it resolves the issue",
      "Don't click — check storage settings directly from your email provider",
      "Forward to IT without checking",
      "Reply to the email asking for more info"
    ],
    answer: 1,
    explanation: "Shortened URLs hide destination domains. Check your account directly via the official provider website or contact IT. Avoid clicking links that claim account problems."
  }
];

const urlQuestions: Question[] = [
  {
    id: 1,
    prompt: "Which URL is most likely malicious or a typosquat?",
    choices: [
      "https://accounts.google.com",
      "https://goog1e.com",
      "https://google.com/login",
      "https://mail.google.com"
    ],
    answer: 1,
    explanation: "'goog1e.com' replaces 'l' with '1' and is a typical typosquatting domain. Always inspect the domain name carefully (the right-most registered domain is important)."
  },
  {
    id: 2,
    prompt: "You see a long URL with many subdomains: 'https://secure.paypal.accounts.verify.example.com'. What is the effective registered domain?",
    choices: [
      "secure.paypal.accounts.verify.example.com",
      "paypal.accounts.verify.example.com",
      "example.com",
      "verify.example.com"
    ],
    answer: 2,
    explanation: "The effective registered domain (the root) is 'example.com'. Subdomains can be arbitrarily named to impersonate services. Always pay attention to the registered domain (the last two labels typically)."
  }
];

// ---- Individual wrapper components that mount QuizShell with appropriate bank ----
export function PhishingQuiz() {
  return <QuizShell title="Detect Phishing Emails" questions={phishingQuestions} />;
}
export function WebsiteQuiz() {
  return <QuizShell title="Identify Fake vs Real Websites" questions={websiteQuestions} />;
}
export function EmailQuiz() {
  return <QuizShell title="Spot Fake or Compromised Emails" questions={emailQuestions} />;
}
export function URLQuiz() {
  return <QuizShell title="Detect Malicious or Typosquatted URLs" questions={urlQuestions} />;
}

// ---- Main component: tabbed container (default export) ----
export default function DetectionQuizzes({ initialTab }: { initialTab?: "phish" | "website" | "email" | "url" }) {
  const tabs = [
    { id: "phish", label: "Phishing", comp: <PhishingQuiz /> },
    { id: "website", label: "Websites", comp: <WebsiteQuiz /> },
    { id: "email", label: "Emails", comp: <EmailQuiz /> },
    { id: "url", label: "URLs", comp: <URLQuiz /> },
  ];

  const [active, setActive] = useState<string>(initialTab ?? tabs[0].id);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cybersecurity Games — Detection Quiz</h1>
            <p className="text-sm text-gray-600 mt-1">Practice spotting phishing, fake websites, suspicious emails, and malicious URLs.</p>
          </div>
          <div className="text-sm text-gray-500">Tip: don't rely on the padlock alone. Check domains & sender addresses.</div>
        </header>

        <div className="flex gap-6">
          <nav className="w-56 hidden md:block">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <ul className="space-y-2">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setActive(t.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${active === t.id ? "bg-indigo-50 border-l-4 border-indigo-500" : "hover:bg-gray-50"}`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <main className="flex-1">
            {tabs.map((t) => (
              <div key={t.id} style={{ display: active === t.id ? "block" : "none" }}>
                {t.comp}
              </div>
            ))}
          </main>
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Built for practice — use this to train pattern recognition. For real incidents, follow your org's incident response policies.
        </footer>
      </div>
    </div>
  );
}
