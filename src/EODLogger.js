import React, { useState } from 'react';
import './App.css';

const reps = ['AA8', 'DN', 'YK', 'HK4', 'MR5', 'Other'];

const productsByType = {
  CBU: ['CBU VOICE', 'CBU TERM', 'CBU HUP', 'CBU TVM HUP', 'CBU HUP RD', 'CBU TVM HUP RD', 'CBU 5GHI', 'CBU MBB'],
  RPP: ['RPP VOICE', 'RPP TERM', 'RPP HUP', 'RPP TVM HUP', 'RPP HUP RD', 'RPP TVM HUP RD', 'RPP 5GHI', 'RPP MBB'],
  SMB: ['SMB VOICE', 'SMB TERM', 'SMB HUP', 'SMB TVM HUP', 'SMB HUP RD', 'SMB TVM HUP RD', 'SMB 5GHI', 'SMB MBB', 'SMB CABLE'],
  FIDO: ['FIDO VOICE', 'FIDO TERM', 'FIDO HUP', 'FIDO TVM HUP', 'FIDO HUP RD', 'FIDO TVM HUP RD', 'FIDO MBB', 'FIDO EXPU_N', 'FIDO EXPU_H', 'FIDO EXPU_V'],
  Other: [
    'DP', 'ACC', 'EXPU_N', 'EXPU_H', 'EXPU_V', 'MC APPROVED',
    'MC UNDERREVIEW', 'CABLE', 'CHATR', 'OUTRIGHT SALE', 'COMWAVE'
  ]
};

function App() {
  const [repData, setRepData] = useState([{ rep: '', products: [], selectedTypes: [], customProducts: [], accProfit: '' }]);
  const [showDisplay, setShowDisplay] = useState(false);
  const [displayText, setDisplayText] = useState('');

  const handleRepChange = (index, value) => {
    const newData = [...repData];
    newData[index] = { rep: value === 'Other' ? '' : value, products: [], selectedTypes: [], customProducts: [], accProfit: '' };
    setRepData(newData);
  };

  const handleOtherRepChange = (index, value) => {
    const newData = [...repData];
    newData[index].rep = value.toUpperCase();
    setRepData(newData);
  };

  const handleProductQtyChange = (repIndex, product, qty) => {
    const newData = [...repData];
    const rep = newData[repIndex];
    const existing = rep.products.find(p => p.name === product);
    if (existing) {
      existing.qty = qty;
    } else {
      rep.products.push({ name: product, qty });
    }
    setRepData(newData);
  };

  const getProductsForRep = (repIndex, type) => {
    const rep = repData[repIndex];
    return rep.products.filter(p => productsByType[type]?.includes(p.name));
  };

  const handleCustomerTypeClick = (repIndex, type) => {
    const newData = [...repData];
    const rep = newData[repIndex];
    if (rep.selectedTypes.includes(type)) return;
    rep.selectedTypes.push(type);
    const selectedProducts = productsByType[type];
    selectedProducts.forEach(product => {
      if (!rep.products.find(p => p.name === product)) {
        rep.products.push({ name: product, qty: 0 });
      }
    });
    setRepData(newData);
  };

  const addRep = () => {
    setRepData([...repData, { rep: '', products: [], selectedTypes: [], customProducts: [], accProfit: '' }]);
  };

  const clearAll = () => {
    setRepData([{ rep: '', products: [], selectedTypes: [], customProducts: [], accProfit: '' }]);
    setShowDisplay(false);
    setDisplayText('');
  };

  const displaySummary = () => {
    const today = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
    let summary = `${today}\n\n`;
    repData.forEach(rep => {
      const filtered = rep.products.filter(p => p.qty > 0);
      const customs = rep.customProducts.filter(p => p.qty > 0);
      const all = [...filtered, ...customs];
      if (rep.rep && all.length > 0) {
        summary += `${rep.rep.toUpperCase()}: ` + all.map(p => {
          if (p.name === 'ACC' && rep.accProfit) {
            return `${p.qty} ${p.name} $${rep.accProfit}`;
          }
          return `${p.qty} ${p.name}`;
        }).join(', ') + `\n\n`;
      }
    });
    setDisplayText(summary.trim());
    setShowDisplay(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = displayText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCustomProductChange = (index, name, qty) => {
    const newData = [...repData];
    const rep = newData[index];
    const existing = rep.customProducts.find(p => p.name === name);
    if (existing) {
      existing.qty = qty;
    } else {
      rep.customProducts.push({ name, qty });
    }
    setRepData(newData);
  };

  const handleAccProfitChange = (index, value) => {
    const newData = [...repData];
    newData[index].accProfit = value;
    setRepData(newData);
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'Arial' }}>
      {!showDisplay && repData.map((rep, index) => (
        <div key={index} style={{ marginBottom: '3rem', border: '1px solid #ccc', padding: '1.5rem', borderRadius: '10px', display: 'inline-block', minWidth: '300px' }}>
          
          {/* Rep Selector */}
          <div style={{ marginBottom: '1rem' }}>
            <select value={rep.rep || 'Select Rep'} onChange={e => handleRepChange(index, e.target.value)} style={{ fontSize: '1rem', padding: '0.5rem', marginBottom: '1rem' }}>
              <option disabled>Select Rep</option>
              {reps.map(r => <option key={r}>{r}</option>)}
            </select>
            {rep.rep === '' && (
              <input type="text" placeholder="Enter Rep Code" value={rep.rep} onChange={e => handleOtherRepChange(index, e.target.value)} style={{ textTransform: 'uppercase', fontSize: '1rem', padding: '0.5rem' }} />
            )}
          </div>

          {/* Product Sections */}
          {rep.selectedTypes.map(type => (
            <div key={type}>
              <h4>{type} Products</h4>

              {/* ✅ ACC Profit only when ACC qty > 0 */}
              {type === 'Other' && rep.products.find(p => p.name === 'ACC' && p.qty > 0) && (
                <div style={{ marginBottom: '1rem' }}>
                  <label>ACC Profit: $</label>
                  <input type="number" value={rep.accProfit} onChange={(e) => handleAccProfitChange(index, e.target.value)} style={{ fontSize: '1rem', padding: '0.3rem', width: '100px', marginLeft: '0.5rem' }} />
                </div>
              )}

              {getProductsForRep(index, type).map(product => (
                <div key={product.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ marginRight: '1rem', minWidth: '120px', textAlign: 'right' }}>{product.name}</span>
                  <button onClick={() => handleProductQtyChange(index, product.name, Math.max(0, product.qty - 1))} style={{ margin: '0 0.5rem', fontSize: '1.2rem' }}>-</button>
                  <span>{product.qty}</span>
                  <button onClick={() => handleProductQtyChange(index, product.name, product.qty + 1)} style={{ margin: '0 0.5rem', fontSize: '1.2rem' }}>+</button>
                </div>
              ))}
            </div>
          ))}

          {/* Custom Products */}
          {rep.customProducts.length > 0 && (
            <div>
              <h4>Custom Products</h4>
              {rep.customProducts.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ marginRight: '1rem', minWidth: '120px', textAlign: 'right' }}>{p.name}</span>
                  <button onClick={() => handleCustomProductChange(index, p.name, Math.max(0, p.qty - 1))} style={{ margin: '0 0.5rem', fontSize: '1.2rem' }}>-</button>
                  <span>{p.qty}</span>
                  <button onClick={() => handleCustomProductChange(index, p.name, p.qty + 1)} style={{ margin: '0 0.5rem', fontSize: '1.2rem' }}>+</button>
                </div>
              ))}
            </div>
          )}

          {/* 🔻 Buttons at Bottom 🔻 */}
          <div style={{ marginTop: '1.5rem' }}>
            {['CBU', 'RPP', 'SMB', 'FIDO', 'Other'].map(type => (
              <button
                key={type}
                onClick={() => handleCustomerTypeClick(index, type)}
                disabled={!rep.rep || rep.selectedTypes.includes(type)}
                style={{ margin: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>
                {type}
              </button>
            ))}
            <button onClick={() => handleCustomProductChange(index, prompt('Enter Custom Product Name') || '', 1)} style={{ margin: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>None</button>
          </div>
        </div>
      ))}

      {!showDisplay && (
        <div style={{ marginTop: '2rem' }}>
          <button onClick={addRep} style={{ margin: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>Add Rep</button>
          <button onClick={displaySummary} style={{ margin: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>Display</button>
          <button onClick={clearAll} style={{ margin: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>Clear All</button>
        </div>
      )}

      {showDisplay && (
        <div style={{ padding: '2rem' }}>
          <textarea value={displayText} readOnly style={{ width: '90vw', height: '80vh', fontSize: '1.2rem', padding: '1rem' }} />
          <div style={{ marginTop: '1rem' }}>
            <button onClick={copyToClipboard} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>Copy</button>
            <button onClick={() => setShowDisplay(false)} style={{ padding: '0.5rem 1rem', marginLeft: '1rem', fontSize: '1rem' }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
