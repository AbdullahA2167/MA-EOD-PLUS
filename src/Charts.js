import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./Charts.css";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ResponsiveContainer
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="chart-tooltip-row" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Charts() {
  const [reports, setReports] = useState([]);

  const [tab, setTab] = useState("ATTACH");
  const [chartType, setChartType] = useState("LINE");
  const [attachType, setAttachType] = useState("ALL");
  const [repFilter, setRepFilter] = useState("ALL");

  const [filterType, setFilterType] = useState("QTD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "eodReports"));
      setReports(snapshot.docs.map(doc => doc.data()));
    };
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return reports.filter(r => {
      if (!r.date) return false;

      const [y, m, d] = r.date.split("-").map(Number);
      const reportDate = new Date(y, m - 1, d); // normalized at midnight

      if (filterType === "ALL") return true;

      if (filterType === "MTD") {
        const monthStart = new Date(
          todayMidnight.getFullYear(),
          todayMidnight.getMonth(),
          1
        );
        return reportDate >= monthStart && reportDate <= todayMidnight;
      }

      if (filterType === "YTD") {
        const yearStart = new Date(todayMidnight.getFullYear(), 0, 1);
        return reportDate >= yearStart && reportDate <= todayMidnight;
      }

      if (filterType === "QTD") {
        const month = todayMidnight.getMonth(); // 0–11
        const quarterStartMonth = Math.floor(month / 3) * 3; // 0,3,6,9
        const quarterStart = new Date(
          todayMidnight.getFullYear(),
          quarterStartMonth,
          1
        );
        return reportDate >= quarterStart && reportDate <= todayMidnight;
      }

      if (filterType === "RANGE") {
        if (!startDate || !endDate) return false;

        const [sy, sm, sd] = startDate.split("-").map(Number);
        const [ey, em, ed] = endDate.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        return reportDate >= start && reportDate <= end;
      }

      return true;
    });
  }, [reports, filterType, startDate, endDate]);

  const groupedData = useMemo(() => {
    const map = {};

    filteredReports.forEach(r => {
      if (repFilter !== "ALL" && r.rep !== repFilter) return;

      const date = r.date;

      if (!map[date]) {
        map[date] = {
          date,
          dpSold: 0,
          dpOpp: 0,
          mcEligible: 0,
          mcTotal: 0,
          mcApproved: 0,
          aalEligible: 0,
          aalHits: 0,
          sales: 0
        };
      }

      r.customers?.forEach(c => {
        const products = c.products || [];

        const isSMB = products.some(p => p.name.includes("SMB"));

        const hasHUP = products.some(p => p.name.includes("HUP") && p.qty > 0);
        const hasEXPU = products.some(p => p.name.includes("EXPU") && p.qty > 0);

        const hasMCAny = products.some(
          p => p.name === "MC APPROVED" || p.name === "MC UNDERREVIEW"
        );

        const hasMCApproved = products.some(p => p.name === "MC APPROVED");

        products.forEach(p => {
          if (
            (p.name.includes("HUP") ||
              p.name.includes("TERM") ||
              p.name.includes("EXPU")) &&
            !isSMB
          ) {
            map[date].dpOpp += p.qty;
            p.dp?.forEach(v => v && map[date].dpSold++);
          }

          if (!["DP", "ACC", "MC"].some(x => p.name.includes(x))) {
            map[date].sales += p.qty;
          }
        });

        if (!isSMB) {
          map[date].mcEligible++;
          if (hasMCAny) map[date].mcTotal++;
          if (hasMCApproved) map[date].mcApproved++;
        }

        if (!isSMB && (hasHUP || hasEXPU)) {
          map[date].aalEligible++;
          if (c.hadAAL) map[date].aalHits++;
        }
      });
    });

    return Object.values(map).map(d => {
      const dp = d.dpOpp ? (d.dpSold / d.dpOpp) * 100 : 0;
      const mc = d.mcEligible ? (d.mcTotal / d.mcEligible) * 100 : 0;
      const aal = d.aalEligible ? (d.aalHits / d.aalEligible) * 100 : 0;

      const totalOpp = d.dpOpp + d.mcEligible + d.aalEligible;
      const totalSuccess = d.dpSold + d.mcTotal + d.aalHits;

      const ALL = totalOpp ? (totalSuccess / totalOpp) * 100 : 0;

      return {
        date: d.date,
        DP: Number(dp.toFixed(1)),
        MC: Number(mc.toFixed(1)),
        AAL: Number(aal.toFixed(1)),
        ALL: Number(ALL.toFixed(1)),
        Sales: d.sales
      };
    });
  }, [filteredReports, repFilter]);

  const dataKey =
    tab === "ATTACH"
      ? attachType === "ALL"
        ? "ALL"
        : attachType
      : "Sales";

  return (
    <div className="charts-page">
      <div className="charts-shell">
        <h2 className="charts-title">Charts</h2>

        <div className="charts-subtabs">
          <button
            className={`charts-tab-btn ${tab === "ATTACH" ? "active" : ""}`}
            onClick={() => setTab("ATTACH")}
          >
            Attach
          </button>

          <button
            className={`charts-tab-btn ${tab === "SALES" ? "active" : ""}`}
            onClick={() => setTab("SALES")}
          >
            Sales
          </button>
        </div>

        <div className="charts-controls">
          <select
            className="charts-select"
            value={chartType}
            onChange={e => setChartType(e.target.value)}
          >
            <option value="LINE">Line</option>
            <option value="BAR">Bar</option>
          </select>

          <select
            className="charts-select"
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
          >
            <option value="ALL">All Reps</option>
            <option value="AA8">AA8</option>
            <option value="DN">DN</option>
            <option value="YK">YK</option>
            <option value="MR5">MR5</option>
          </select>

          <select
            className="charts-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="QTD">Quarter To Date</option>
            <option value="MTD">Month To Date</option>
            <option value="YTD">Year To Date</option>
            <option value="RANGE">Custom Range</option>
            <option value="ALL">All Time</option>
          </select>

          {tab === "ATTACH" && (
            <select
              className="charts-select"
              value={attachType}
              onChange={e => setAttachType(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="DP">DP</option>
              <option value="MC">MC</option>
              <option value="AAL">AAL</option>
            </select>
          )}

          {filterType === "RANGE" && (
            <div className="charts-range">
              <input
                className="charts-input"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <input
                className="charts-input"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="charts-card">
          <div className="charts-card-header">
            <span className="charts-card-label">
              {tab === "ATTACH" ? `${attachType} Trend` : "Sales Trend"}
            </span>
            <span className="charts-card-meta">
              {chartType} Chart
            </span>
          </div>

          <div className="charts-area">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "LINE" ? (
                <LineChart
                  data={groupedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#b1b1b1", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#b1b1b1", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#ff3131"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#ff3131", strokeWidth: 0 }}
                    activeDot={{
                      r: 6,
                      fill: "#ffffff",
                      stroke: "#ff3131",
                      strokeWidth: 3
                    }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={groupedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#b1b1b1", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#b1b1b1", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={dataKey}
                    fill="#ff3131"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}