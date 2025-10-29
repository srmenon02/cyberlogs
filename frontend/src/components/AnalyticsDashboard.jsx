import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]; // red, amber, blue, green

export default function AnalyticsDashboard() {
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        setChartData(data.chartData);
        setPieData(data.pieData);
      })
      .catch((err) => console.error("Failed to load analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-gray-400 p-10">Loading analytics...</div>;
  }

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-200">
      {/* Line chart */}
      <div className="bg-charcoal-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-coral-400">
          Requests & Alerts Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
            <XAxis dataKey="name" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f1f1f", border: "none" }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="bg-charcoal-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-coral-400">
          Alert Severity Distribution
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#1f1f1f", border: "none" }}
              labelStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
