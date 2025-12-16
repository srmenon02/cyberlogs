import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { AlertTriangle, Activity, Database, Server } from "lucide-react";

export default function CyberLogsDashboard() {
  const [logData, setLogData] = useState([]);
  const [summary, setSummary] = useState({ logsPerSec: 0, alerts: 0, topSource: "-", consumerLag: 0 });

  useEffect(() => {
    // placeholder simulated data fetching
    setSummary({ logsPerSec: 512, alerts: 7, topSource: "AppServer-03", consumerLag: 2 });
    setLogData([
      { time: "10:00", count: 420 },
      { time: "10:05", count: 480 },
      { time: "10:10", count: 512 },
      { time: "10:15", count: 490 },
      { time: "10:20", count: 505 }
    ]);
  }, []);

  const pieData = [
    { name: "INFO", value: 60 },
    { name: "WARNING", value: 25 },
    { name: "ERROR", value: 10 },
    { name: "CRITICAL", value: 5 }
  ];

  const COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#7e22ce"];

  return (
    <div className="p-6 grid gap-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Logs / sec</p>
              <p className="text-2xl font-bold">{summary.logsPerSec}</p>
            </div>
            <Activity className="text-blue-500" size={28} />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Alerts (last hr)</p>
              <p className="text-2xl font-bold">{summary.alerts}</p>
            </div>
            <AlertTriangle className="text-red-500" size={28} />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Top Source</p>
              <p className="text-2xl font-bold">{summary.topSource}</p>
            </div>
            <Server className="text-green-500" size={28} />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Consumer Lag</p>
              <p className="text-2xl font-bold">{summary.consumerLag}</p>
            </div>
            <Database className="text-purple-500" size={28} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Log Volume (Last Hour)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={logData}>
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Event Severity Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Logs Table Placeholder */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Live Log Feed</h2>
            <Button variant="outline" size="sm">Export CSV</Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
            <p>[Live logs will stream here... Example: 10:20:05 | INFO | AppServer-03 | Connection established]</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
