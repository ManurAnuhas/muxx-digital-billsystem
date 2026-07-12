import { useState, useMemo, useCallback } from 'react';
import muxxLogo from '../assets/logo.png';
import {
  Plus, Trash2, Download, Save, User,
  FileText, Mail, Sparkles, Receipt
} from 'lucide-react';

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

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  attachPdf?: boolean;
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
    status: 'pending' | 'paid';
  }) => void;
  emailConfig: EmailConfig;
}

export default function InvoiceGenerator({ services, onSave, emailConfig }: InvoiceGeneratorProps) {
  const [client, setClient] = useState<ClientInfo>({ name: '', email: '', phone: '', address: '' });

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    number: `MD-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', qty: 1, price: 0 }]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
  const taxAmount = useMemo(() => ((subtotal - discountAmount) * taxRate) / 100, [subtotal, discountAmount, taxRate]);
  const total = useMemo(() => subtotal - discountAmount + taxAmount, [subtotal, discountAmount, taxAmount]);

  const handleItemChange = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => {
      const copy = [...prev];
      if (field === 'description') copy[index][field] = value as string;
      else copy[index][field] = Number(value) || 0;
      return copy;
    });
  }, []);

  const handleAddItem = useCallback(() => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]), []);

  const handleRemoveItem = useCallback((index: number) =>
    setItems(prev => prev.filter((_, i) => i !== index)), []);

  const handleAddPredefinedService = useCallback(() => {
    if (!selectedServiceId) return;
    const service = services.find(s => s.id === selectedServiceId);
    if (service) {
      setItems(prev => {
        if (prev.length === 1 && prev[0].description === '' && prev[0].price === 0)
          return [{ description: service.name, qty: 1, price: service.price }];
        return [...prev, { description: service.name, qty: 1, price: service.price }];
      });
    }
    setSelectedServiceId('');
  }, [selectedServiceId, services]);

  const handleDownloadPdf = useCallback(async () => {
    const element = document.getElementById('invoice-capture-area');
    if (!element) return;

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'), import('jspdf')
    ]);

    const originalZoom = (element as HTMLElement).style.zoom;
    (element as HTMLElement).style.zoom = '1';

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      (element as HTMLElement).style.zoom = originalZoom;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Muxx_Invoice_${invoiceInfo.number}.pdf`);
    } catch (err) {
      (element as HTMLElement).style.zoom = originalZoom;
      console.error('PDF error:', err);
      alert('Failed to generate PDF. See console for details.');
    }
  }, [invoiceInfo]);

  const handleSendEmail = useCallback(async () => {
    if (!client.email) { alert('Please enter a Client Email before sending.'); return; }
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      alert('Email configuration is incomplete. Configure EmailJS keys in the Settings tab first.');
      return;
    }
    setSendingEmail(true);
    const element = document.getElementById('invoice-capture-area');
    if (!element) { alert('Invoice element not found.'); setSendingEmail(false); return; }

    const originalZoom = (element as HTMLElement).style.zoom;
    (element as HTMLElement).style.zoom = '1';

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf')
      ]);
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      (element as HTMLElement).style.zoom = originalZoom;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      const formData = new FormData();
      formData.append('service_id', emailConfig.serviceId);
      formData.append('template_id', emailConfig.templateId);
      formData.append('user_id', emailConfig.publicKey);
      formData.append('to_email', client.email);
      formData.append('email', client.email);
      formData.append('to_name', client.name);
      formData.append('invoice_num', invoiceInfo.number);
      formData.append('total_amount', `LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      formData.append('items_summary', items.map(item => `${item.description} (x${item.qty})`).join(', '));
      if (emailConfig.attachPdf) {
        formData.append('invoice_pdf', pdfBlob, `Muxx_Invoice_${invoiceInfo.number}.pdf`);
      }

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', { method: 'POST', body: formData });
      if (response.ok) alert(`Invoice sent to ${client.name} (${client.email})!`);
      else { const t = await response.text(); throw new Error(t || 'EmailJS failed.'); }
    } catch (err: any) {
      if (element) (element as HTMLElement).style.zoom = originalZoom;
      console.error('Email error:', err);
      alert(`Failed to send email: ${err.message || err}`);
    } finally { setSendingEmail(false); }
  }, [client, invoiceInfo, total, items, emailConfig]);

  const handleSaveInvoice = useCallback(() => {
    if (!client.name) { alert('Please enter a Client Name before saving.'); return; }
    onSave({ id: Date.now().toString(), invoiceInfo, client, items, subtotal, taxRate, discount, total, status });
    alert('Invoice saved to history!');
  }, [client, invoiceInfo, items, subtotal, taxRate, discount, total, status, onSave]);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="creator-layout">
      {/* ─── LEFT: Form ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Client Details */}
        <div className="card">
          <h3 className="section-subtitle">
            <User size={15} /> Client Details
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" className="form-control" placeholder="e.g. John Doe"
                value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Client Email</label>
              <input type="email" className="form-control" placeholder="e.g. client@example.com"
                value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Client Phone</label>
              <input type="text" className="form-control" placeholder="e.g. +94 77 123 4567"
                value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Client Address</label>
              <input type="text" className="form-control" placeholder="e.g. Colombo, Sri Lanka"
                value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="card">
          <h3 className="section-subtitle">
            <Receipt size={15} /> Invoice Details
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Number</label>
              <input type="text" className="form-control"
                value={invoiceInfo.number}
                onChange={e => setInvoiceInfo({ ...invoiceInfo, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Date of Issue</label>
              <input type="date" className="form-control"
                value={invoiceInfo.date}
                onChange={e => setInvoiceInfo({ ...invoiceInfo, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" className="form-control"
                value={invoiceInfo.dueDate}
                onChange={e => setInvoiceInfo({ ...invoiceInfo, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Payment Status</label>
              <div className="status-toggle-group">
                <button
                  type="button"
                  className={`status-toggle-btn pending ${status === 'pending' ? 'active' : ''}`}
                  onClick={() => setStatus('pending')}
                >
                  <span className="status-dot-pulse pending" />
                  <span>Pending</span>
                </button>
                <button
                  type="button"
                  className={`status-toggle-btn paid ${status === 'paid' ? 'active' : ''}`}
                  onClick={() => setStatus('paid')}
                >
                  <span className="status-dot-pulse paid" />
                  <span>Paid</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Service */}
        <div className="card">
          <h3 className="section-subtitle">
            <Sparkles size={15} /> Quick Add Preset Service
          </h3>
          <div className="predefined-service-box">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Select Preset</label>
              <select className="form-control" value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}>
                <option value="">— Choose a preset service —</option>
                {services.map(svc => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} · LKR {fmt(svc.price)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-secondary"
              onClick={handleAddPredefinedService} disabled={!selectedServiceId}>
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        {/* Line Items */}
        <div className="card">
          <div className="items-manager">
            <div className="items-header">
              <h3 className="section-subtitle" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                <FileText size={15} /> Line Items
              </h3>
              <button type="button" className="btn btn-ghost" onClick={handleAddItem}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                <Plus size={14} /> Add Row
              </button>
            </div>
            <div style={{ borderBottom: '1px solid var(--bd-soft)', margin: '0.75rem 0' }} />

            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '3fr 0.7fr 1.2fr 1fr auto',
              gap: '0.6rem',
              padding: '0 0.75rem',
              marginBottom: '0.25rem',
            }}>
              {['Description', 'Qty', 'Price (LKR)', 'Amount', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--txt-lo)', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            <div className="items-list">
              {items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <input type="text" className="form-control" placeholder="Service / Design description"
                    value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                  <input type="number" min="1" className="form-control" style={{ textAlign: 'right' }}
                    value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                  <input type="number" min="0" step="0.01" className="form-control" style={{ textAlign: 'right' }}
                    value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                  <div className="item-amount-display">{fmt(item.qty * item.price)}</div>
                  <button type="button" className="remove-btn" onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1} title="Remove row">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Discount & Tax */}
            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Discount (%)</label>
                <input type="number" min="0" max="100" className="form-control" placeholder="0"
                  value={discount || ''} onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
              </div>
              <div className="form-group">
                <label>Tax Rate (%)</label>
                <input type="number" min="0" className="form-control" placeholder="0"
                  value={taxRate || ''} onChange={e => setTaxRate(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>

            {/* Totals */}
            <div className="totals-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>LKR {fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row">
                  <span>Discount ({discount}%)</span>
                  <span style={{ color: 'var(--emerald)' }}>− LKR {fmt(discountAmount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="summary-row">
                  <span>Tax ({taxRate}%)</span>
                  <span>+ LKR {fmt(taxAmount)}</span>
                </div>
              )}
              <div className="summary-row grand-total">
                <span>Total Due</span>
                <span>LKR {fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-group">
          <button type="button" className="btn btn-primary" onClick={handleSaveInvoice}>
            <Save size={16} /> Save Invoice
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDownloadPdf}>
            <Download size={16} /> Download PDF
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleSendEmail} disabled={sendingEmail}>
            <Mail size={16} /> {sendingEmail ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Preview ─── */}
      <div className="preview-container">
        <div className="preview-toolbar">
          <h3>
            <FileText size={14} /> Live Preview
          </h3>
          <span className="preview-badge">A4 Letterhead</span>
        </div>

        <div className="preview-frame">
          <div id="invoice-capture-area" className="invoice-render-area">
            {/* Header */}
            <div className="invoice-pdf-header">
              <div className="invoice-pdf-brand">
                <img src={muxxLogo} alt="Muxx Digital" />
                <div className="invoice-pdf-brand-details">
                  Panadura, Sri Lanka<br />
                  Phone: +94779474855<br />
                  Email: info.muxxdigital@gmail.com
                </div>
              </div>
              <div className="invoice-pdf-meta">
                <div className="invoice-pdf-title">INVOICE</div>
                <div className="invoice-pdf-meta-rows">
                  <strong>Invoice No:</strong> {invoiceInfo.number}<br />
                  <strong>Date:</strong> {invoiceInfo.date}<br />
                  <strong>Due Date:</strong> {invoiceInfo.dueDate}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="invoice-pdf-body">
              {/* Billed To / Payment Info */}
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
                    Bank: Sampath Bank<br />
                    Acc Name: A.M.Anuhas<br />
                    Acc No: 104752497687<br />
                    Branch: Panadura
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th style={{ width: '55%' }}>Description</th>
                    <th className="num-col" style={{ width: '10%' }}>Qty</th>
                    <th className="num-col" style={{ width: '15%' }}>Unit Price</th>
                    <th className="num-col" style={{ width: '20%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description || 'Service Details'}</td>
                      <td className="num-col">{item.qty}</td>
                      <td className="num-col">LKR {fmt(item.price)}</td>
                      <td className="num-col">LKR {fmt(item.qty * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="pdf-summary-block">
                <div className="pdf-notes">
                  <h5>Terms & Conditions</h5>
                  <p>Please send payments within the due date. Contact us for any invoice-related queries.</p>
                </div>
                <div className="pdf-totals-table">
                  <div className="pdf-totals-row">
                    <span>Subtotal:</span>
                    <span>LKR {fmt(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="pdf-totals-row">
                      <span>Discount ({discount}%):</span>
                      <span>− LKR {fmt(discountAmount)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="pdf-totals-row">
                      <span>Tax ({taxRate}%):</span>
                      <span>+ LKR {fmt(taxAmount)}</span>
                    </div>
                  )}
                  <div className="pdf-totals-row grand-total" style={{ position: 'relative' }}>
                    <span>Total Due:</span>
                    <span>LKR {fmt(total)}</span>
                    {status === 'paid' && (
                      <div className="pdf-paid-stamp-overlay">
                        <span className="stamp-sub">MUXX DIGITAL</span>
                        <span className="stamp-main">PAID</span>
                        <span className="stamp-foot">RECEIVED</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pdf-footer">
              <span>Looking forward to working with you again!</span>
              <span>www.muxx.digital</span>
            </div>

            {/* SVG Grunge Filter for realistic stamp effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="grunge-filter">
                  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
