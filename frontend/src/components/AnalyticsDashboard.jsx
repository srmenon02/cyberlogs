import React, { useState } from "react";

export default function App() {
  const [activeView, setActiveView] = useState("logs");

  return (
    <div className="min-h-screen bg-charcoal-900">
      {/* Top Navigation Banner */}
      <div className="bg-charcoal-800 border-b border-charcoal-700 px-8 py-4">
        <div className="flex justify-end gap-3">
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
      </div>

      {/* Content */}
      {activeView === "logs" ? <LogsDashboard /> : <AnalyticsDashboard />}
    </div>
  );
}