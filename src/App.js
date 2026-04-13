import React, { useState } from "react";
import EODLogger from "./EODLogger";
import Reports from "./Reports";
import Attach from "./Attach";
import Charts from "./Charts";
import "./App.css"; // make sure your CSS file is imported

function App() {
  const [activeTab, setActiveTab] = useState("EOD");

  const tabs = [
    { key: "EOD", label: "EOD" },
    { key: "REPORTS", label: "Reports" },
    { key: "ATTACH", label: "Attach" },
    { key: "CHARTS", label: "Charts" }
  ];

  return (
    <div className="app">
      <div className="app-shell">
        {/* Top navigation */}
        <div className="top-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`top-tab ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === "EOD" && <EODLogger />}
          {activeTab === "REPORTS" && <Reports />}
          {activeTab === "ATTACH" && <Attach />}
          {activeTab === "CHARTS" && <Charts />}
        </div>
      </div>
    </div>
  );
}

export default App;