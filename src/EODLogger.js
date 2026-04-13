import React, { useState } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, addDoc } from "firebase/firestore";

const reps = ['AA8', 'DN', 'YK', 'MR5'];

const productsByType = {
  CBU: ['CBU VOICE', 'CBU TERM', 'CBU HUP', 'CBU TVM HUP', 'CBU HUP RD', 'CBU TVM HUP RD', 'CBU 5GHI', 'CBU MBB'],
  RPP: ['RPP VOICE', 'RPP TERM', 'RPP HUP', 'RPP TVM HUP', 'RPP HUP RD', 'RPP TVM HUP RD', 'RPP 5GHI', 'RPP MBB'],
  SMB: ['SMB VOICE', 'SMB TERM', 'SMB HUP', 'SMB TVM HUP', 'SMB HUP RD', 'SMB TVM HUP RD', 'SMB 5GHI', 'SMB MBB', 'SMB CABLE'],
  FIDO: ['FIDO VOICE', 'FIDO TERM', 'FIDO HUP', 'FIDO TVM HUP', 'FIDO HUP RD', 'FIDO TVM HUP RD', 'FIDO MBB', 'FIDO EXPU_N', 'FIDO EXPU_H', 'FIDO EXPU_V'],
  Other: ['ACC', 'EXPU_N', 'EXPU_H', 'EXPU_V', 'MC APPROVED', 'MC UNDERREVIEW', 'CABLE', 'CHATR', 'OUTRIGHT SALE', 'COMWAVE']
};

function App() {
  const [repData, setRepData] = useState([{ rep: '', customers: [] }]);
  const [showDisplay, setShowDisplay] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

  const isDPEligible = (name) =>
    name.includes("HUP") || name.includes("TERM") || name === "EXPU_H" || name === "EXPU_N";

  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: 'success' });
    }, 2200);
  };

  const addRep = () => {
    setRepData([...repData, { rep: '', customers: [] }]);
  };

  const addCustomer = (repIndex) => {
    const newData = [...repData];
    newData[repIndex].customers.push({
      name: '',
      selectedTypes: [],
      products: [],
      hadMCBefore: false,
      hadAAL: false
    });
    setRepData(newData);
  };

  const handleRepChange = (index, value) => {
    const newData = [...repData];
    newData[index] = { rep: value, customers: [] };
    setRepData(newData);
  };

  const handleCustomerName = (repIndex, custIndex, value) => {
    const newData = [...repData];
    newData[repIndex].customers[custIndex].name = value;
    setRepData(newData);
  };

  const toggleFlag = (repIndex, custIndex, field) => {
    const newData = [...repData];
    newData[repIndex].customers[custIndex][field] =
      !newData[repIndex].customers[custIndex][field];
    setRepData(newData);
  };

  const handleTypeClick = (repIndex, custIndex, type) => {
    const newData = [...repData];
    const cust = newData[repIndex].customers[custIndex];

    if (cust.selectedTypes.includes(type)) {
      cust.selectedTypes = cust.selectedTypes.filter(t => t !== type);
      setRepData(newData);
      return;
    }

    cust.selectedTypes.push(type);

    productsByType[type].forEach(product => {
      if (!cust.products.find(p => p.name === product)) {
        cust.products.push({ name: product, qty: 0, dp: [] });
      }
    });

    setRepData(newData);
  };

  const changeQty = (repIndex, custIndex, product, change) => {
    const newData = [...repData];
    const customer = newData[repIndex].customers[custIndex];

    customer.products = customer.products.map(p => {
      if (p.name !== product) return p;

      let newQty = Math.max(0, p.qty + change);
      let dpArray = p.dp || [];

      if (isDPEligible(p.name)) {
        if (change > 0) {
          dpArray = [...dpArray, { value: 'NONE' }];
        }
        if (change < 0) {
          dpArray = dpArray.slice(0, -1);
        }
      }

      return { ...p, qty: newQty, dp: dpArray };
    });

    setRepData(newData);
  };

  const setDPValue = (repIndex, custIndex, productName, index, value) => {
    const newData = [...repData];

    const product = newData[repIndex]
      .customers[custIndex]
      .products.find(p => p.name === productName);

    if (!product.dp || !product.dp[index]) return;

    product.dp[index] = { value };
    setRepData(newData);
  };

  const buildSummary = () => {
    let summary = "";

    repData.forEach(rep => {
      if (!rep.rep) return;

      const totals = {};
      let dpCount = 0;

      rep.customers.forEach(cust => {
        cust.products.forEach(p => {
          if (p.qty > 0) {
            totals[p.name] = (totals[p.name] || 0) + p.qty;
          }

          p.dp?.forEach(entry => {
            if (entry && entry.value === 'YES') dpCount++;
          });
        });
      });

      const entries = Object.entries(totals);

      if (entries.length || dpCount) {
        summary += `${rep.rep}: `;
        const text = entries.map(([n, q]) => `${q} ${n}`);
        if (dpCount) text.push(`${dpCount} DP`);
        summary += text.join(', ') + "\n\n";
      }
    });

    return summary.trim();
  };

  const displaySummary = () => {
    const summary = buildSummary();
    const today = new Date().toLocaleDateString('en-CA');
    const finalText = summary ? `Date: ${today}\n\n${summary}` : `Date: ${today}`;
    setDisplayText(finalText);
    setShowDisplay(true);
  };

  const saveData = async () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    for (let rep of repData) {
      await addDoc(collection(db, "eodReports"), {
        date,
        time,
        rep: rep.rep,
        customers: rep.customers
      });
    }
  };

  const handleSave = async () => {
    try {
      await saveData();
      showPopup("Report saved successfully ✅", "success");
    } catch (error) {
      console.error(error);
      showPopup("Failed to save report ❌", "error");
    }
  };

  const sendWhatsApp = async () => {
    const summary = buildSummary();

    if (!summary) {
      showPopup("Nothing to send 😭", "error");
      return;
    }

    try {
      await saveData();
      const encoded = encodeURIComponent(summary);
      window.location.href = `https://api.whatsapp.com/send?text=${encoded}`;
    } catch (error) {
      console.error(error);
      showPopup("Failed to save before WhatsApp ❌", "error");
    }
  };

  return (
    <div className="app">
      {popup.show && (
        <div className={`save-popup ${popup.type}`}>
          {popup.message}
        </div>
      )}

      <div className="app-shell">
        {!showDisplay && repData.map((rep, repIndex) => (
          <div key={repIndex} className="rep-card">
            <select
              className="rep-select"
              onChange={e => handleRepChange(repIndex, e.target.value)}
            >
              <option>Select Rep</option>
              {reps.map(r => <option key={r}>{r}</option>)}
            </select>

            <button
              className="add-customer-btn"
              onClick={() => addCustomer(repIndex)}
            >
              + Add Customer
            </button>

            {rep.customers.map((cust, custIndex) => (
              <div key={custIndex} className="customer-card">
                <input
                  placeholder="Customer Name (optional)"
                  className="customer-input"
                  onChange={e => handleCustomerName(repIndex, custIndex, e.target.value)}
                />

                <div className="customer-options">
                  <div className="flags-row">
                    <label className="check-label">
                      <input
                        type="checkbox"
                        onChange={() => toggleFlag(repIndex, custIndex, 'hadMCBefore')}
                      />
                      Had MC Before
                    </label>

                    <label className="check-label">
                      <input
                        type="checkbox"
                        onChange={() => toggleFlag(repIndex, custIndex, 'hadAAL')}
                      />
                      AAL Done
                    </label>
                  </div>

                  <div className="type-buttons">
                    {Object.keys(productsByType).map(type => (
                      <button
                        key={type}
                        className={`type-btn ${cust.selectedTypes.includes(type) ? 'active' : ''}`}
                        onClick={() => handleTypeClick(repIndex, custIndex, type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {cust.selectedTypes.map(type => (
                  <div key={type} className="type-section">
                    <h4 className="type-title">{type}</h4>

                    {cust.products
                      .filter(p => productsByType[type].includes(p.name))
                      .map(p => (
                        <div key={p.name} className="product-row-card">
                          <div className="product-name">{p.name}</div>

                          <div className="qty-controls">
                            <button
                              className="qty-btn qty-btn-outline"
                              onClick={() => changeQty(repIndex, custIndex, p.name, -1)}
                            >
                              -
                            </button>

                            <span className="qty-value">{p.qty}</span>

                            <button
                              className="qty-btn qty-btn-filled"
                              onClick={() => changeQty(repIndex, custIndex, p.name, 1)}
                            >
                              +
                            </button>
                          </div>

                          {isDPEligible(p.name) && p.dp.length > 0 && (
                            <div className="dp-row">
                              {p.dp.map((entry, i) => (
                                <div key={i} className="dp-select-wrap">
                                  <span className="dp-label-text">DP {i + 1}</span>
                                  <select
                                    className="dp-select"
                                    value={entry?.value || 'NONE'}
                                    onChange={e =>
                                      setDPValue(
                                        repIndex,
                                        custIndex,
                                        p.name,
                                        i,
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="NONE">No</option>
                                    <option value="YES">Yes</option>
                                    <option value="HAS">Existing</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {!showDisplay && (
          <>
            <button className="secondary-btn add-rep-btn" onClick={addRep}>
              + Add Rep
            </button>

            <button className="display-btn" onClick={displaySummary}>
              Display
            </button>
          </>
        )}

        {showDisplay && (
          <div className="summary-card">
            <textarea
              value={displayText}
              readOnly
              className="summary-textarea"
            />

            <div className="summary-actions">
              <button className="secondary-btn" onClick={() => setShowDisplay(false)}>
                Back
              </button>

              <button className="secondary-btn" onClick={handleSave}>
                Save
              </button>

              <button className="whatsapp-btn" onClick={sendWhatsApp}>
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;