"use client";
import { useState } from "react";
import DetectionQuizzes from "./components/DetectionQuizzes";
import { WebsiteDetector, EmailDetector, URLDetector } from "./components";
import PasswordSecurityAnalyzer from "./components/PasswordSecurityAnalyzer";

function App() {
  const [activeTab, setActiveTab] = useState<
    "website" | "email" | "url" | "password" | "quiz"
  >("website");

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔐 Cybersecurity Toolkit</h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        <button
          onClick={() => setActiveTab("website")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "website"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Website Detector
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "email"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Email Detector
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "url"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          URL Detector
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "password"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Password Security
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "quiz"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Quizzes
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "website" && <WebsiteDetector />}
        {activeTab === "email" && <EmailDetector />}
        {activeTab === "url" && <URLDetector />}
        {activeTab === "password" && <PasswordSecurityAnalyzer />}
        {activeTab === "quiz" && <DetectionQuizzes />}
      </div>
    </div>
  );
}

export default App;
