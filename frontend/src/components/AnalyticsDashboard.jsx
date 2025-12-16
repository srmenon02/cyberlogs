import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]; // red, amber, blue, green
const INTERVALS = [
  { value: "15min", label: "15 minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" }
];

// Frontend cache for analytics (TTL: 60 seconds)
const analyticsCache = new Map();
const FRONTEND_CACHE_TTL = 60000; // 60 seconds in milliseconds

export default function AnalyticsDashboard() {
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState("15min"); // default interval
  const debounceTimer = useRef(null);
  const [cacheStatus, setCacheStatus] = useState(""); // For debugging

  // Fetch with frontend caching and debouncing
  const fetchAnalyticsWithCache = async (selectedInterval) => {
    const cacheKey = `analytics_${selectedInterval}`;
    
    // Check frontend cache first
    if (analyticsCache.has(cacheKey)) {
      const cached = analyticsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < FRONTEND_CACHE_TTL) {
        console.log(`✅ Cache HIT for ${selectedInterval}`);
        setCacheStatus(`Loaded from cache (${selectedInterval})`);
        setChartData(cached.data.chartData);
        setPieData(cached.data.pieData);
        setLoading(false);
        return;
      }
    }

    // Cache miss - fetch from API
    console.log(`⏭️ Cache MISS for ${selectedInterval}, fetching from API...`);
    setCacheStatus(`Fetching from server (${selectedInterval})...`);
    setLoading(true);
    
    try {
      // Determine API endpoint based on environment
      const apiUrl = process.env.REACT_APP_API_URL || 
                     (typeof window !== 'undefined' && window.location.origin.includes('localhost') 
                       ? 'http://localhost:8000' 
                       : window.location.origin);
      
      const response = await fetch(
        `${apiUrl}/api/analytics?interval=${selectedInterval}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Store in frontend cache
      analyticsCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      setChartData(data.chartData);
      setPieData(data.pieData);
      setCacheStatus(`Loaded from server (${selectedInterval})`);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setCacheStatus(`Error loading ${selectedInterval}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Debounced interval change handler
  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);
    
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new debounce timer - wait 300ms before fetching
    debounceTimer.current = setTimeout(() => {
      fetchAnalyticsWithCache(newInterval);
    }, 300);
  };

  useEffect(() => {
    fetchAnalyticsWithCache(interval);
    
    // Cleanup timer on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [interval]);

  if (loading && chartData.length === 0) {
    return <div className="text-center text-gray-400 p-10">Loading analytics...</div>;
  }

  return (
    <div className="p-6 grid grid-cols-1 gap-6 text-gray-200">
      {/* Interval selector */}
      <div className="mb-4 flex gap-2 items-center">
        <span className="text-gray-400 font-semibold">Show Logs over the last:</span>
        <select
          value={interval}
          onChange={(e) => handleIntervalChange(e.target.value)}
          className="bg-charcoal-700 text-gray-200 px-3 py-1 rounded-lg"
        >
          {INTERVALS.map((intv) => (
            <option key={intv.value} value={intv.value}>
              {intv.label}
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-gray-500 ml-2">Loading...</span>}
        <span className="text-xs text-gray-600 ml-4">{cacheStatus}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-charcoal-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-coral-400">
            Request Severity Distribution
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
                contentStyle={{ backgroundColor: "#ccc0c0ff", border: "none" }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
