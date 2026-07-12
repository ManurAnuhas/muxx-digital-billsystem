import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Download, Save, CreditCard, User, Calendar, FileText } from 'lucide-react';

interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface InvoiceInfo {
  number: string;
  date: string;
  dueDate: string;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

interface InvoiceGeneratorProps {
  services: ServiceOption[];
  onSave: (invoice: {
    id: string;
    invoiceInfo: InvoiceInfo;
    client: ClientInfo;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    discount: number;
    total: number;
  }) => void;
}

export default function InvoiceGenerator({ services, onSave }: InvoiceGeneratorProps) {
  const [client, setClient] = useState<ClientInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    number: `MD-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', qty: 1, price: 0 }
  ]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // Math Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    return (subtotal * discount) / 100;
  }, [subtotal, discount]);

  const taxAmount = useMemo(() => {
    return ((subtotal - discountAmount) * taxRate) / 100;
  }, [subtotal, discountAmount, taxRate]);

  const total = useMemo(() => {
    return subtotal - discountAmount + taxAmount;
  }, [subtotal, discountAmount, taxAmount]);

  // Handlers
  const handleItemChange = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === 'description') {
        copy[index][field] = value as string;
      } else {
        copy[index][field] = Number(value) || 0;
      }
      return copy;
    });
  }, []);

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, { description: '', qty: 1, price: 0 }]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddPredefinedService = useCallback(() => {
    if (!selectedServiceId) return;
    const service = services.find((s) => s.id === selectedServiceId);
    if (service) {
      setItems((prev) => {
        // If the first item is empty, overwrite it
        if (prev.length === 1 && prev[0].description === '' && prev[0].price === 0) {
          return [{ description: service.name, qty: 1, price: service.price }];
        }
        return [...prev, { description: service.name, qty: 1, price: service.price }];
      });
    }
    setSelectedServiceId('');
  }, [selectedServiceId, services]);

  const handleDownloadPdf = useCallback(async () => {
    const element = document.getElementById('invoice-capture-area');
    if (!element) return;
    
    // Dynamically import libraries to keep initial bundle light
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Muxx_Invoice_${invoiceInfo.number}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Failed to generate PDF. Check browser console.');
    }
  }, [invoiceInfo]);

  const handleSaveInvoice = useCallback(() => {
    if (!client.name) {
      alert('Please enter a Client Name before saving.');
      return;
    }
    onSave({
      id: Date.now().toString(),
      invoiceInfo,
      client,
      items,
      subtotal,
      taxRate,
      discount,
      total
    });
    alert('Invoice saved successfully to history!');
  }, [client, invoiceInfo, items, subtotal, taxRate, discount, total, onSave]);

  return (
    <div className="creator-layout">
      {/* Form Settings */}
      <div className="card">
        <div className="form-section">
          {/* Client Details */}
          <div>
            <h3 className="section-subtitle"><User size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Client Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Client Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. client@example.com"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Client Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +94 77 123 4567"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Client Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Colombo, Sri Lanka"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div>
            <h3 className="section-subtitle"><FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Invoice Metadata</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Invoice Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={invoiceInfo.number}
                  onChange={(e) => setInvoiceInfo({ ...invoiceInfo, number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date of Issue</label>
                <input
                  type="date"
                  className="form-control"
                  value={invoiceInfo.date}
                  onChange={(e) => setInvoiceInfo({ ...invoiceInfo, date: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label>Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={invoiceInfo.dueDate}
                  onChange={(e) => setInvoiceInfo({ ...invoiceInfo, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Predefined Services Selector */}
          <div>
            <h3 className="section-subtitle"><CreditCard size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Add Predefined Service / Design</h3>
            <div className="predefined-service-box">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Select Service</label>
                <select
                  className="form-control"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  <option value="">-- Choose a Preset Service --</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name} (LKR {svc.price.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddPredefinedService}
                disabled={!selectedServiceId}
              >
                <Plus size={16} /> Add Preset
              </button>
            </div>
          </div>

          {/* Line Items Manager */}
          <div className="items-manager">
            <h3 className="section-subtitle"><FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Line Items</h3>
            <div className="items-list">
              {items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <div className="form-group">
                    <label style={{ display: idx === 0 ? 'block' : 'none' }}>Description</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Service / Design description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: idx === 0 ? 'block' : 'none' }}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: idx === 0 ? 'block' : 'none' }}>Price (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: idx === 0 ? 'block' : 'none', textAlign: 'right' }}>Amount</label>
                    <div className="item-amount-display">
                      {(item.qty * item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="form-group" style={{ justifyContent: 'center' }}>
                    <label style={{ display: idx === 0 ? 'block' : 'none', visibility: 'hidden' }}>Action</label>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
              <Plus size={16} /> Add Custom Line Item
            </button>
          </div>

          {/* Discount & Tax Rate */}
          <div className="form-grid">
            <div className="form-group">
              <label>Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={discount || ''}
                placeholder="0"
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="form-group">
              <label>Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={taxRate || ''}
                placeholder="0"
                onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveInvoice}>
              <Save size={18} /> Save Invoice
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownloadPdf}>
              <Download size={18} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice A4 Visual Preview */}
      <div className="preview-container">
        <h3 className="section-subtitle"><FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Invoice Preview (A4 Letterhead)</h3>
        
        <div id="invoice-capture-area" className="invoice-render-area">
          <div className="invoice-pdf-header">
            <div className="invoice-pdf-brand">
              <span className="invoice-pdf-logo-text">MUXX</span>
              <span className="invoice-pdf-logo-sub">Digital Agency</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                Panadura, Sri Lanka<br />
                Phone: +94 70 185 4881<br />
                Email: hello@muxxdigital.com
              </p>
            </div>
            <div className="invoice-pdf-meta">
              <h2 className="invoice-pdf-title">Invoice</h2>
              <div className="invoice-pdf-info-row">
                <div>
                  <strong style={{ color: '#0f172a' }}>Invoice No:</strong> {invoiceInfo.number}<br />
                  <strong style={{ color: '#0f172a' }}>Date:</strong> {invoiceInfo.date}<br />
                  <strong style={{ color: '#0f172a' }}>Due Date:</strong> {invoiceInfo.dueDate}
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-pdf-details">
            <div className="pdf-address-col">
              <h4>Billed To</h4>
              <p>
                <strong>{client.name || 'Client Name'}</strong><br />
                {client.address && <>{client.address}<br /></>}
                {client.email && <>{client.email}<br /></>}
                {client.phone && <>{client.phone}</>}
              </p>
            </div>
            <div className="pdf-address-col">
              <h4>Payment Info</h4>
              <p>
                Bank: Commercial Bank PLC<br />
                Acc Name: MUXX Digital<br />
                Acc No: 123-456-7890<br />
                Branch: Panadura
              </p>
            </div>
          </div>

          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '55%' }}>Description</th>
                <th style={{ width: '10%' }} className="num-col">Qty</th>
                <th style={{ width: '15%' }} className="num-col">Unit Price</th>
                <th style={{ width: '20%' }} className="num-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.description || 'Service Details'}</td>
                  <td className="num-col">{item.qty}</td>
                  <td className="num-col">LKR {item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="num-col">LKR {(item.qty * item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pdf-summary-block">
            <div className="pdf-notes">
              <h5>Terms & Conditions</h5>
              <p>Please send payments within the due date. Contact us for any invoice-related queries.</p>
            </div>
            <div className="pdf-totals-table">
              <div className="pdf-totals-row">
                <span>Subtotal:</span>
                <span>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div className="pdf-totals-row">
                  <span>Discount ({discount}%):</span>
                  <span>- LKR {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="pdf-totals-row">
                  <span>Tax ({taxRate}%):</span>
                  <span>+ LKR {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="pdf-totals-row grand-total">
                <span>Total Due:</span>
                <span>LKR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="pdf-footer">
            <span>Thank you for your business!</span>
            <span>www.muxxdigital.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
