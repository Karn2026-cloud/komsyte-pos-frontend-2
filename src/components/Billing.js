import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../api';
import './Billing.css';

export default function Billing({ user }) {
  // ... (planFeatures and other state initializations are unchanged)
  const planFeatures = {
    free:   { downloadBill: false, manualAdd: false, whatsappShare: false },
    '299':  { downloadBill: true,  manualAdd: false, whatsappShare: false },
    '699':  { downloadBill: true,  manualAdd: true,  whatsappShare: true },
    '1499': { downloadBill: true,  manualAdd: true,  whatsappShare: true },
  };
  const features = planFeatures[user.subscription?.plan] || planFeatures.free;

  const [products, setProducts] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [unitInput, setUnitInput] = useState('qty');
  const [customerMobile, setCustomerMobile] = useState('');
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [isScanning, setIsScanning] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualProduct, setManualProduct] = useState({ name: '', price: '', quantity: 1, unit: 'qty' });

  const scannerRef = useRef(null);
  // ✅ 1. Create a ref for the quantity input field
  const quantityInputRef = useRef(null);
  const productMap = useMemo(() => new Map(products.map(p => [p.barcode, p])), [products]);

  const fetchStock = useCallback(async () => {
    try {
      const response = await API.get('/api/stock');
      setProducts(response.data || []);
    } catch (err) {
      console.error('Stock fetch error:', err);
      setMessage({ text: 'Error: Could not load product stock.', type: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchStock();
    return () => {
      if (scannerRef.current) scannerRef.current.clear().catch(console.error);
    };
  }, [fetchStock]);

  // ✅ 2. Update the onScanSuccess function
  const onScanSuccess = (decodedText) => {
    // This now ONLY populates the input field.
    setBarcodeInput(decodedText.trim());
    
    // Stop the scanner so the user isn't distracted.
    stopScanner(); 
    
    // Automatically focus the quantity input for a fast workflow.
    quantityInputRef.current?.focus();
  };

  const startScanner = () => {
    setIsScanning(true);
    const config = {
      fps: 20,
      qrbox: { width: 250, height: 100 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };
    const scanner = new Html5QrcodeScanner("reader", config, false);
    scanner.render(onScanSuccess, (error) => {});
    scannerRef.current = scanner;
  };

  const stopScanner = () => {
    if (scannerRef.current) scannerRef.current.clear().catch(console.error);
    setIsScanning(false);
  };

  // ... (The rest of your functions like addItemToBill, finalizeBill, etc., are unchanged)
  const calculateSubtotal = (item) => {
    return (item.price * item.quantity) - (item.discount || 0);
  };
  
  const addItemToBill = (barcode, quantity, unit) => {
    const product = productMap.get(barcode);

    if (!product) {
        return setMessage({ text: 'Product not found.', type: 'error' });
    }
    
    if (quantity <= 0) {
        return setMessage({ text: 'Quantity must be positive.', type: 'error' });
    }

    setBillItems(prevItems => {
        const existingItem = prevItems.find(item => item.barcode === barcode && item.unit === unit);

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;

            if (newQuantity > product.quantity) {
                setMessage({ text: `Insufficient stock for ${product.name}. Available: ${product.quantity}`, type: 'error' });
                return prevItems;
            }

            return prevItems.map(item =>
                item.barcode === barcode && item.unit === unit
                    ? { ...item, quantity: newQuantity, subtotal: calculateSubtotal({ ...item, quantity: newQuantity }) }
                    : item
            );
        } else {
            if (quantity > product.quantity) {
                 setMessage({ text: `Insufficient stock for ${product.name}. Available: ${product.quantity}`, type: 'error' });
                 return prevItems;
            }
            
            const newItem = {
                ...product,
                quantity,
                unit,
                discount: 0,
                subtotal: product.price * quantity,
            };
            return [...prevItems, newItem];
        }
    });

    setBarcodeInput('');
    setQuantityInput(1);
    setMessage({ text: `Added ${product.name}`, type: 'success' });
  };
  
  const addManualItemToBill = () => {
    if (!manualProduct.name || !manualProduct.price || !manualProduct.quantity) {
      return setMessage({ text: 'Please fill all fields for the manual product.', type: 'error' });
    }
    const newItem = {
      barcode: `manual-${Date.now()}`,
      name: manualProduct.name,
      price: Number(manualProduct.price),
      quantity: Number(manualProduct.quantity),
      unit: manualProduct.unit,
      discount: 0,
      subtotal: Number(manualProduct.price) * Number(manualProduct.quantity),
    };
    setBillItems(prev => [...prev, newItem]);
    setManualProduct({ name: '', price: '', quantity: 1, unit: 'qty' });
    setIsManualMode(false);
    setMessage({ text: `Added manual item: ${newItem.name}`, type: 'success' });
  };
  
  const handleDiscountChange = (index, discountValue) => {
    const discount = Number(discountValue) || 0;
    setBillItems(prevItems => {
        const updatedItems = [...prevItems];
        const item = updatedItems[index];
        if (discount < 0 || discount > (item.price * item.quantity)) {
          setMessage({ text: 'Discount cannot be negative or exceed subtotal.', type: 'error' });
          return prevItems;
        }
        item.discount = discount;
        item.subtotal = calculateSubtotal(item);
        return updatedItems;
    });
  };

  const removeItem = (index) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => billItems.reduce((sum, item) => sum + item.subtotal, 0), [billItems]);

  const generateAndDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(user.shopName || "Your Store", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString('en-IN')}`, 14, 30);
    doc.text(`Customer: ${customerMobile || 'N/A'}`, 14, 35);

    autoTable(doc, {
      startY: 40,
      head: [['Product', 'Price', 'Qty', 'Unit', 'Discount (₹)', 'Subtotal']],
      body: billItems.map(item => [
        item.name,
        `₹ ${item.price.toFixed(2)}`,
        item.quantity,
        item.unit,
        `₹ ${item.discount.toFixed(2)}`,
        `₹ ${item.subtotal.toFixed(2)}`
      ]),
      foot: [['Total', '', '', '', '', `₹ ${totalAmount.toFixed(2)}`]],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Receipt-${Date.now()}.pdf`);
  };

  const finalizeBill = async () => {
    if (billItems.length === 0) return setMessage({ text: 'Cannot finalize an empty bill.', type: 'error' });
    try {
      await API.post('/api/bills', { items: billItems, customerMobile, totalAmount });
      setMessage({ text: 'Bill finalized and saved successfully!', type: 'success' });
      if (features.downloadBill) generateAndDownloadPDF();
      setBillItems([]);
      setCustomerMobile('');
      stopScanner();
    } catch (err) {
      console.error('Finalize bill error:', err);
      setMessage({ text: `Error: ${err.response?.data?.error || 'Failed to finalize bill'}`, type: 'error' });
    }
  };

  return (
    <div className="billing-container">
      <div className="billing-main">
        <div className="input-section">
          <input className="barcode-input" placeholder="Enter or Scan Barcode" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItemToBill(barcodeInput, quantityInput, unitInput)} />
          {/* ✅ 3. Add the ref to the input element */}
          <input ref={quantityInputRef} className="quantity-input" type="number" value={quantityInput} onChange={e => setQuantityInput(Number(e.target.value))} min="0.01" step="0.01" />
          <select className="unit-selector" value={unitInput} onChange={e => setUnitInput(e.target.value)}>
            <option value="qty">qty</option>
            <option value="kg">kg</option>
            <option value="litre">litre</option>
          </select>
          <button className="add-item-btn" onClick={() => addItemToBill(barcodeInput, quantityInput, unitInput)}>Add Item</button>
        </div>
        
        <div className="tools-section">
          <button className={`tool-btn ${isScanning ? 'stop' : 'scan'}`} onClick={isScanning ? stopScanner : startScanner}>{isScanning ? '🛑 Stop' : '📷 Scan'}</button>
          {features.manualAdd && (
            <button className="tool-btn manual" onClick={() => setIsManualMode(!isManualMode)}>{isManualMode ? 'Cancel' : '✍️ Manual'}</button>
          )}
        </div>
        
        <div id="reader" style={{ display: isScanning ? 'block' : 'none' }}></div>
        
        {/* ... (rest of your JSX is unchanged) ... */}
        {isManualMode && (
          <div className="manual-add-section">
            <input placeholder="Product Name" value={manualProduct.name} onChange={e => setManualProduct({...manualProduct, name: e.target.value})} />
            <input placeholder="Price (₹)" type="number" value={manualProduct.price} onChange={e => setManualProduct({...manualProduct, price: e.target.value})} />
            <input placeholder="Quantity" type="number" min="1" value={manualProduct.quantity} onChange={e => setManualProduct({...manualProduct, quantity: e.target.value})} />
            <select value={manualProduct.unit} onChange={e => setManualProduct({...manualProduct, unit: e.target.value})}>
                <option value="qty">qty</option>
                <option value="kg">kg</option>
                <option value="litre">litre</option>
            </select>
            <button onClick={addManualItemToBill}>Add Manual Item</button>
          </div>
        )}
      </div>

      <div className="billing-sidebar">
        <h3>Current Bill</h3>
        <div className="bill-items-list">
          {billItems.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty/Unit</th>
                  <th>Discount (₹)</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, index) => (
                  <tr key={`${item.barcode}-${index}`}>
                    <td>{item.name}<br/><small>@ ₹ {item.price.toFixed(2)}</small></td>
                    <td>{item.quantity} <span className="unit-text">{item.unit}</span></td>
                    <td>
                      <input 
                        type="number" 
                        className="discount-input" 
                        placeholder="0.00"
                        value={item.discount || ''}
                        onChange={(e) => handleDiscountChange(index, e.target.value)}
                      />
                    </td>
                    <td>₹ {item.subtotal.toFixed(2)}</td>
                    <td><button className="remove-item-btn" onClick={() => removeItem(index)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="empty-bill-text">Scan or add items to begin</p>}
        </div>

        <div className="bill-summary">
          {features.whatsappShare && (
            <input className="customer-mobile-input" placeholder="Customer Mobile (for sharing)" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
          )}
          <div className="total-amount">Total: <span>₹ {totalAmount.toFixed(2)}</span></div>
          <button className="finalize-btn" onClick={finalizeBill} disabled={billItems.length === 0}>
            {features.downloadBill ? 'Finalize & Download' : 'Finalize Bill'}
          </button>
          {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
        </div>
      </div>
    </div>
  );
}