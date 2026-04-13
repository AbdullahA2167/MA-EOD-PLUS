import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./Reports.css";

const reps = ['AA8', 'DN', 'YK', 'MR5'];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRep, setSelectedRep] = useState("ALL");

  useEffect(() => {
    const fetchReports = async () => {
      const snapshot = await getDocs(collection(db, "eodReports"));
      const data = snapshot.docs.map(doc => doc.data());
      setReports(data);
    };

    fetchReports();
  }, []);

  const groupedReports = useMemo(() => {
    const filtered = reports
      .filter(r => {
        const dateMatch = selectedDate ? r.date === selectedDate : true;
        const repMatch = selectedRep === "ALL" ? true : r.rep === selectedRep;
        return dateMatch && repMatch;
      })
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.date} ${a.time || "00:00"}`);
        const dateTimeB = new Date(`${b.date} ${b.time || "00:00"}`);
        return dateTimeB - dateTimeA;
      });

    const grouped = filtered.reduce((acc, report) => {
      const key = `${report.date}__${report.time || "00:00"}`;

      if (!acc[key]) {
        acc[key] = {
          date: report.date,
          time: report.time || "",
          reps: []
        };
      }

      acc[key].reps.push(report);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => {
      const dateTimeA = new Date(`${a.date} ${a.time || "00:00"}`);
      const dateTimeB = new Date(`${b.date} ${b.time || "00:00"}`);
      return dateTimeB - dateTimeA;
    });
  }, [reports, selectedDate, selectedRep]);

  return (
    <div className="reports-page">
      <div className="reports-shell">
        <h2 className="reports-title">Reports</h2>

        <div className="reports-filters">
          <input
            className="reports-input"
            type="date"
            onChange={e => setSelectedDate(e.target.value)}
          />

          <select
            className="reports-select"
            onChange={e => setSelectedRep(e.target.value)}
          >
            <option value="ALL">All Reps</option>
            {reps.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="reports-list">
          {groupedReports.length === 0 ? (
            <div className="reports-empty">No reports found.</div>
          ) : (
            groupedReports.map((group, i) => (
              <div key={i} className="report-card">
                <div className="report-header">
                  <strong className="report-rep">Report</strong>
                  <span className="report-meta">
                    {group.date} {group.time || ""}
                  </span>
                </div>

                <div className="report-customers">
                  {group.reps.map((repBlock, repIndex) => {
                    const customersWithItems = repBlock.customers?.filter(c =>
                      (c.products?.some(p => p.qty > 0))
                    ) || [];

                    if (customersWithItems.length === 0) return null;

                    return (
                      <div key={repIndex} className="rep-group-block">
                        <div className="rep-group-title">
                          {repBlock.rep}
                        </div>

                        {customersWithItems.map((cust, ci) => {
                          const items = cust.products?.filter(p => p.qty > 0) || [];

                          if (items.length === 0) return null;

                          return (
                            <div key={ci} className="customer-report-block">
                              <div className="customer-report-name">
                                {cust.name || `Customer ${ci + 1}`}
                              </div>

                              <div className="customer-items">
                                {items.map((p, idx) => (
                                  <div key={idx} className="customer-item-row">
                                    <span className="item-qty">{p.qty}</span>
                                    <span className="item-name">{p.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}