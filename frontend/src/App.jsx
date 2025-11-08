import React, { useState } from "react";
import LogsDashboard from "./components/LogsDashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import "./App.css";

export default function App() {
  const [activeView, setActiveView] = useState("analytics");

  return (
    <div className="min-h-screen bg-charcoal-900 text-gray-200">
      {/* Top Navigation Banner */}
      <header className="px-8 py-4 flex justify-between items-center bg-charcoal-800 shadow-md fancy-font bg-transparent">
        <h1 className="text-2xl font-bold text-coral-500 tracking-wide fancy-header">
          CyberLogs
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView("logs")}
            className={`px-5 py-2 rounded-lg font-semibold transition ${
              activeView === "logs"
                ? "bg-coral-600 text-white"
                : "bg-charcoal-700 text-gray-300 hover:bg-charcoal-600"
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className={`px-5 py-2 rounded-lg font-semibold transition ${
              activeView === "analytics"
                ? "bg-coral-600 text-white"
                : "bg-charcoal-700 text-gray-300 hover:bg-charcoal-600"
            }`}
          >
            Analytics
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeView === "logs" ? <LogsDashboard /> : <AnalyticsDashboard />}
      </main>
    </div>
  );
}
