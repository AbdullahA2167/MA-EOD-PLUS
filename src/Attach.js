import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./Attach.css";

export default function Attach() {
  const [reports, setReports] = useState([]);

  const [filterType, setFilterType] = useState("QTD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "eodReports"));
      const data = snapshot.docs.map(doc => doc.data());
      setReports(data);
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

      // r.date is "YYYY-MM-DD"
      const [y, m, d] = r.date.split("-").map(Number);
      const reportDate = new Date(y, m - 1, d); // normalized at midnight

      if (filterType === "ALL") return true;

      // MTD: first day of current month → today
      if (filterType === "MTD") {
        const monthStart = new Date(
          todayMidnight.getFullYear(),
          todayMidnight.getMonth(),
          1
        );
        return reportDate >= monthStart && reportDate <= todayMidnight;
      }

      // YTD: Jan 1 of current year → today
      if (filterType === "YTD") {
        const yearStart = new Date(todayMidnight.getFullYear(), 0, 1);
        return reportDate >= yearStart && reportDate <= todayMidnight;
      }

      // QTD: first day of current quarter → today
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

      // Custom range (inclusive, using same normalization)
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

  const analytics = useMemo(() => {
    let dpSold = 0;
    let dpOpp = 0;

    let mcEligible = 0;
    let mcTotal = 0;
    let mcApproved = 0;

    let aalEligible = 0;
    let aalHits = 0;

    const excludedForMC = [
      "SMB",
      "DP",
      "ACC",
      "CHATR",
      "OUTRIGHT SALE",
      "COMWAVE"
    ];

    filteredReports.forEach(r => {
      r.customers?.forEach(c => {
        const products = c.products || [];

        const isSMB = products.some(p => p.name.includes("SMB"));

        const hasHUP = products.some(p => p.name.includes("HUP") && p.qty > 0);
        const hasTERM = products.some(p => p.name.includes("TERM") && p.qty > 0);
        const hasEXPU_H = products.some(p => p.name === "EXPU_H" && p.qty > 0);
        const hasEXPU_N = products.some(p => p.name === "EXPU_N" && p.qty > 0);

        const hasMCApproved = products.some(
          p => p.name === "MC APPROVED" && p.qty > 0
        );
        const hasMCAny = products.some(
          p =>
            (p.name === "MC APPROVED" || p.name === "MC UNDERREVIEW") &&
            p.qty > 0
        );

        // DP
        products.forEach(p => {
          const isDPRelevant =
            p.name.includes("HUP") ||
            p.name.includes("TERM") ||
            p.name === "EXPU_H" ||
            p.name === "EXPU_N";

          if (isDPRelevant && !isSMB) {
            const dpEntries = p.dp || [];

            // OLD FORMAT: boolean array
            if (dpEntries.length > 0 && typeof dpEntries[0] === "boolean") {
              dpOpp += p.qty;

              dpEntries.forEach(entry => {
                if (entry) dpSold++;
              });
            }

            // NEW FORMAT: dropdown object array
            else if (
              dpEntries.length > 0 &&
              typeof dpEntries[0] === "object"
            ) {
              dpEntries.forEach(entry => {
                if (!entry) return;

                if (entry.value === "HAS") return;

                dpOpp++;

                if (entry.value === "YES") dpSold++;
              });
            }

            // Fallback
            else {
              dpOpp += p.qty;
            }
          }
        });

        // MC
        const hasValidProduct = products.some(
          p =>
            !excludedForMC.some(ex => p.name.includes(ex)) &&
            p.name !== "MC APPROVED" &&
            p.name !== "MC UNDERREVIEW" &&
            p.qty > 0
        );

        const hasOnlyMC =
          hasMCAny &&
          !products.some(
            p =>
              p.name !== "MC APPROVED" &&
              p.name !== "MC UNDERREVIEW" &&
              p.qty > 0
          );

        if (!c.hadMCBefore) {
          if (hasValidProduct) {
            mcEligible++;

            if (hasMCAny) mcTotal++;
            if (hasMCApproved) mcApproved++;
          } else if (hasOnlyMC) {
            mcEligible++;
            mcTotal++;

            if (hasMCApproved) mcApproved++;
          }
        }

        // AAL
        if (!isSMB && (hasHUP || hasEXPU_H || hasEXPU_N)) {
          aalEligible++;
          if (c.hadAAL) aalHits++;
        }
      });
    });

    return {
      dpAttach: dpOpp ? ((dpSold / dpOpp) * 100).toFixed(1) : 0,
      mcTotalRate: mcEligible ? ((mcTotal / mcEligible) * 100).toFixed(1) : 0,
      mcApprovedRate: mcTotal ? ((mcApproved / mcTotal) * 100).toFixed(1) : 0,
      aalRate: aalEligible ? ((aalHits / aalEligible) * 100).toFixed(1) : 0,

      count: filteredReports.length,

      raw: {
        dpSold,
        dpOpp,
        mcEligible,
        mcTotal,
        mcApproved,
        aalEligible,
        aalHits
      }
    };
  }, [filteredReports]);

  return (
    <div className="attach-page">
      <div className="attach-shell">
        <h2 className="attach-title">Attach Performance</h2>

        <div className="attach-filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="attach-select"
          >
            <option value="ALL">All Time</option>
            <option value="MTD">Month To Date</option>
            <option value="QTD">Quarter To Date 🔥</option>
            <option value="YTD">Year To Date</option>
            <option value="RANGE">Custom Range</option>
          </select>

          {filterType === "RANGE" && (
            <div className="attach-range">
              <input
                type="date"
                className="attach-input"
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="attach-input"
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="attach-main-card">
          <div className="attach-metric-row">
            <span>DP Attach</span>
            <strong>{analytics.dpAttach}%</strong>
          </div>
          <div className="attach-metric-row">
            <span>MC Total Rate</span>
            <strong>{analytics.mcTotalRate}%</strong>
          </div>
          <div className="attach-metric-row">
            <span>MC Approved Rate</span>
            <strong>{analytics.mcApprovedRate}%</strong>
          </div>
          <div className="attach-metric-row">
            <span>AAL Rate</span>
            <strong>{analytics.aalRate}%</strong>
          </div>
        </div>

        <div className="attach-sub-info">
          Reports Loaded: {analytics.count}
        </div>

        <div className="attach-raw-card">
          <div>DP Sold: {analytics.raw.dpSold}</div>
          <div>DP Opp: {analytics.raw.dpOpp}</div>

          <div>MC Eligible: {analytics.raw.mcEligible}</div>
          <div>MC Total: {analytics.raw.mcTotal}</div>
          <div>MC Approved: {analytics.raw.mcApproved}</div>

          <div>AAL Eligible: {analytics.raw.aalEligible}</div>
          <div>AAL Hits: {analytics.raw.aalHits}</div>
        </div>
      </div>
    </div>
  );
}