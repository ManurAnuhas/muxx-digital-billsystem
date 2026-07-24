import { useState, useMemo, useCallback, useEffect } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
import {
  Plus, Trash2, Download, Save, User,
  FileText, Mail, Sparkles, Receipt, Link
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

interface SavedInvoice {
  id: string;
  invoiceInfo: InvoiceInfo;
  client: ClientInfo;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  discount: number;
  total: number;
  status?: 'pending' | 'paid';
}

interface InvoiceGeneratorProps {
  type?: 'invoice' | 'quotation';
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
    status: any;
    driveLink?: string;
  }) => void;
  emailConfig: EmailConfig;
  invoices?: SavedInvoice[];
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const getNextInvoiceNumber = (invoices: SavedInvoice[], type: 'invoice' | 'quotation' = 'invoice') => {
  const defaultPrefix = type === 'quotation' ? 'MD-Q-' : 'MD-';
  const startNum = 12; // Start from 12 so next is 13
  
  if (!invoices || invoices.length === 0) {
    return `${defaultPrefix}0013`;
  }
  
  let highestNum = startNum;
  let bestPrefix = defaultPrefix;
  let bestPadding = 4;

  invoices.forEach(inv => {
    const numStr = inv.invoiceInfo?.number || '';
    const match = numStr.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      const val = parseInt(digits, 10);
      if (!isNaN(val) && val > highestNum) {
        highestNum = val;
        bestPrefix = prefix;
        bestPadding = digits.length;
      }
    } else {
      const digitMatch = numStr.match(/\d+/);
      if (digitMatch) {
        const val = parseInt(digitMatch[0], 10);
        if (!isNaN(val) && val > highestNum) {
          highestNum = val;
          bestPadding = digitMatch[0].length;
        }
      }
    }
  });

  const nextVal = highestNum + 1;
  const paddedVal = String(nextVal).padStart(bestPadding, '0');
  return `${bestPrefix}${paddedVal}`;
};

export default function InvoiceGenerator({ type = 'invoice', services, onSave, emailConfig, invoices = [], showToast }: InvoiceGeneratorProps) {
  const notify = useCallback((msg: string, t: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, t);
    else console.log(`[${t.toUpperCase()}] ${msg}`);
  }, [showToast]);
  const [client, setClient] = useState<ClientInfo>({ name: '', email: '', phone: '', address: '' });

  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    number: type === 'quotation' ? `MD-Q-${Date.now().toString().slice(-6)}` : `MD-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [driveLink, setDriveLink] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', qty: 1, price: 0 }]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [status, setStatus] = useState<string>(type === 'quotation' ? 'proposed' : 'pending');

  // Autocomplete Suggestions logic
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<ClientInfo[]>([]);

  const allClients = useMemo(() => {
    const list: ClientInfo[] = [];
    try {
      const invs = JSON.parse(localStorage.getItem('muxx_invoices') || '[]');
      const quots = JSON.parse(localStorage.getItem('muxx_quotations') || '[]');
      const clientsMap = new Map<string, ClientInfo>();
      
      [...invs, ...quots].forEach((item: any) => {
        if (item && item.client && item.client.name) {
          const key = item.client.name.toLowerCase().trim();
          clientsMap.set(key, item.client);
        }
      });
      return Array.from(clientsMap.values());
    } catch (e) {
      console.error('Failed to parse storage for autocomplete clients:', e);
    }
    return list;
  }, [invoices]);

  const handleClientNameChange = (val: string) => {
    setClient(prev => ({ ...prev, name: val }));
    if (!val.trim()) {
      setSuggestions(allClients);
      setShowSuggestions(allClients.length > 0);
      return;
    }
    const filtered = allClients.filter(c => 
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleClientNameFocus = () => {
    if (client.name.trim()) {
      const filtered = allClients.filter(c => 
        c.name.toLowerCase().includes(client.name.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions(allClients);
      setShowSuggestions(allClients.length > 0);
    }
  };

  const handleSelectSuggestion = (c: ClientInfo) => {
    setClient(c);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSuggestions) {
        const container = document.getElementById('client-name-autocomplete-container');
        if (container && !container.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      }
    };
    document.onmousedown = handleClickOutside;
    return () => {
      document.onmousedown = null;
    };
  }, [showSuggestions]);

  useEffect(() => {
    setStatus(type === 'quotation' ? 'proposed' : 'pending');
  }, [type]);

  useEffect(() => {
    if (invoices && invoices.length > 0) {
      setInvoiceInfo(prev => {
        const defaultPrefix = type === 'quotation' ? 'MD-Q-' : 'MD-';
        const isDefaultTimestamp = prev.number.startsWith(defaultPrefix) && prev.number.length >= (defaultPrefix.length + 5) && !isNaN(Number(prev.number.slice(defaultPrefix.length)));
        const defaultStartingNumber = type === 'quotation' ? 'MD-Q-0013' : 'MD-0013';
        if (isDefaultTimestamp || prev.number === defaultStartingNumber) {
          return {
            ...prev,
            number: getNextInvoiceNumber(invoices, type)
          };
        }
        return prev;
      });
    } else {
      setInvoiceInfo(prev => {
        const defaultPrefix = type === 'quotation' ? 'MD-Q-' : 'MD-';
        const isDefaultTimestamp = prev.number.startsWith(defaultPrefix) && prev.number.length >= (defaultPrefix.length + 5) && !isNaN(Number(prev.number.slice(defaultPrefix.length)));
        if (isDefaultTimestamp) {
          return {
            ...prev,
            number: type === 'quotation' ? 'MD-Q-0013' : 'MD-0013'
          };
        }
        return prev;
      });
    }
  }, [invoices, type]);


  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
  const taxAmount = useMemo(() => ((subtotal - discountAmount) * taxRate) / 100, [subtotal, discountAmount, taxRate]);
  const total = useMemo(() => subtotal - discountAmount + taxAmount, [subtotal, discountAmount, taxRate]);

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
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Muxx_${type === 'quotation' ? 'Quotation' : 'Invoice'}_${invoiceInfo.number}.pdf`);
      notify(`${type === 'quotation' ? 'Quotation' : 'Invoice'} PDF downloaded!`, 'success');
    } catch (err) {
      (element as HTMLElement).style.zoom = originalZoom;
      console.error('PDF error:', err);
      notify('Failed to generate PDF. See console for details.', 'error');
    }
  }, [invoiceInfo, type, notify]);

  const handleSendEmail = useCallback(async () => {
    if (!client.email) { notify('Please enter a Client Email before sending.', 'error'); return; }
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      notify('Email configuration is incomplete. Configure EmailJS keys in the Settings tab first.', 'error');
      return;
    }
    setSendingEmail(true);
    const element = document.getElementById('invoice-capture-area');
    if (!element) { notify('Capture element not found.', 'error'); setSendingEmail(false); return; }

    const originalZoom = (element as HTMLElement).style.zoom;
    (element as HTMLElement).style.zoom = '1';

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf')
      ]);
      // Generate ultra-compressed PDF for email attachment (~12-15KB total file size)
      const emailCanvas = await html2canvas(element, { scale: 0.5, useCORS: true, backgroundColor: '#ffffff' });
      (element as HTMLElement).style.zoom = originalZoom;
      const emailImgData = emailCanvas.toDataURL('image/jpeg', 0.15);
      const emailPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = emailPdf.internal.pageSize.getWidth();
      const pdfHeight = (emailCanvas.height * pdfWidth) / emailCanvas.width;
      emailPdf.addImage(emailImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const pdfBlob = emailPdf.output('blob');

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
      formData.append('drive_link', driveLink || '');
      formData.append('subject', type === 'quotation' ? `Quotation ${invoiceInfo.number} from Muxx Digital` : `Invoice ${invoiceInfo.number} from Muxx Digital`);
      formData.append('document_type', type === 'quotation' ? 'Quotation' : 'Invoice');
      formData.append('invoice_pdf', pdfBlob, `Muxx_${type === 'quotation' ? 'Quotation' : 'Invoice'}_${invoiceInfo.number}.pdf`);

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', { method: 'POST', body: formData });
      if (response.ok) notify(`${type === 'quotation' ? 'Quotation' : 'Invoice'} sent to ${client.name} (${client.email})!`, 'success');
      else { const t = await response.text(); throw new Error(t || 'EmailJS failed.'); }
    } catch (err: any) {
      if (element) (element as HTMLElement).style.zoom = originalZoom;
      console.error('Email error:', err);
      notify(`Failed to send email: ${err.message || err}`, 'error');
    } finally { setSendingEmail(false); }
  }, [client, invoiceInfo, total, items, emailConfig, driveLink, type, notify]);

  const handleSaveInvoice = useCallback(() => {
    if (!client.name) { notify('Please enter a Client Name before saving.', 'error'); return; }
    onSave({ id: Date.now().toString(), invoiceInfo, client, items, subtotal, taxRate, discount, total, status, driveLink });
    notify(`${type === 'quotation' ? 'Quotation' : 'Invoice'} saved to history!`, 'success');
  }, [client, invoiceInfo, items, subtotal, taxRate, discount, total, status, driveLink, onSave, type, notify]);

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
            <div className="form-group" id="client-name-autocomplete-container" style={{ position: 'relative' }}>
              <label>Client Name</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={client.name}
                  onChange={e => handleClientNameChange(e.target.value)}
                  onFocus={handleClientNameFocus}
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="autocomplete-suggestions">
                    {suggestions.map((c, i) => (
                      <div
                        key={i}
                        className="autocomplete-suggestion-item"
                        onClick={() => handleSelectSuggestion(c)}
                      >
                        <span className="autocomplete-suggestion-name">{c.name}</span>
                        {(c.email || c.phone) && (
                          <span className="autocomplete-suggestion-meta">
                            {c.email} {c.phone ? `· ${c.phone}` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
            <Receipt size={15} /> {type === 'quotation' ? 'Quotation Details' : 'Invoice Details'}
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>{type === 'quotation' ? 'Quotation Number' : 'Invoice Number'}</label>
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
              <label>{type === 'quotation' ? 'Valid Until' : 'Due Date'}</label>
              <input type="date" className="form-control"
                value={invoiceInfo.dueDate}
                onChange={e => setInvoiceInfo({ ...invoiceInfo, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{type === 'quotation' ? 'Quotation Status' : 'Payment Status'}</label>
              <div className="status-toggle-group">
                {type === 'quotation' ? (
                  <>
                    <button
                      type="button"
                      className={`status-toggle-btn pending ${status === 'proposed' ? 'active' : ''}`}
                      onClick={() => setStatus('proposed')}
                    >
                      <span className="status-dot-pulse pending" />
                      <span>Proposed</span>
                    </button>
                    <button
                      type="button"
                      className={`status-toggle-btn paid ${status === 'accepted' ? 'active accepted' : ''}`}
                      onClick={() => setStatus('accepted')}
                    >
                      <span className="status-dot-pulse paid" />
                      <span>Accepted</span>
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
            {type === 'invoice' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Google Drive / Deliverable Link (Optional)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--txt-lo)' }}><Link size={14} /></span>
                  <input type="url" className="form-control" style={{ paddingLeft: '2.25rem' }} placeholder="e.g. https://drive.google.com/drive/folders/..."
                    value={driveLink} onChange={e => setDriveLink(e.target.value)} />
                </div>
              </div>
            )}
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
            <Save size={16} /> Save {type === 'quotation' ? 'Quotation' : 'Invoice'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDownloadPdf}>
            <Download size={16} /> Download PDF
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleSendEmail} disabled={sendingEmail}>
            <Mail size={16} /> {sendingEmail ? 'Sending…' : `Send ${type === 'quotation' ? 'Quotation' : 'Email'}`}
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
            <div className="invoice-pdf-header" style={{
              background: type === 'quotation' 
                ? 'linear-gradient(130deg, #0f172a 0%, #1e293b 55%, #334155 100%)' 
                : 'linear-gradient(130deg, #12003a 0%, #3a0090 55%, #7300d0 100%)'
            }}>
              <div className="invoice-pdf-brand">
                <img src={LOGO_BASE64} alt="Muxx Digital" />
                <div className="invoice-pdf-brand-details">
                  Panadura, Sri Lanka<br />
                  Phone: +94779474855<br />
                  Email: info.muxxdigital@gmail.com
                </div>
              </div>
              <div className="invoice-pdf-meta">
                <div className="invoice-pdf-title">{type === 'quotation' ? 'QUOTATION' : 'INVOICE'}</div>
                <div className="invoice-pdf-meta-rows">
                  <strong>{type === 'quotation' ? 'Quotation No:' : 'Invoice No:'}</strong> {invoiceInfo.number}<br />
                  <strong>Date:</strong> {invoiceInfo.date}<br />
                  <strong>{type === 'quotation' ? 'Valid Until:' : 'Due Date:'}</strong> {invoiceInfo.dueDate}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="invoice-pdf-body">
              {/* Billed To / Payment Info */}
              <div className="invoice-pdf-details">
                <div className="pdf-address-col">
                  <h4>{type === 'quotation' ? 'Quotation For' : 'Billed To'}</h4>
                  <p>
                    <strong>{client.name || 'Client Name'}</strong><br />
                    {client.address && <>{client.address}<br /></>}
                    {client.email && <>{client.email}<br /></>}
                    {client.phone && <>{client.phone}</>}
                  </p>
                </div>
                <div className="pdf-address-col">
                  {type === 'quotation' ? (
                    <>
                      <h4>Proposal Terms</h4>
                      <p>
                        <strong>Validity:</strong> 14 Days<br />
                        <strong>Payment Schedule:</strong><br />
                        50% Advance & 50% Upon Completion
                      </p>
                    </>
                  ) : (
                    <>
                      <h4>Payment Info</h4>
                      {status === 'paid' ? (
                        <p style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>
                          Payment Status: PAID<br />
                          Method: Bank Transfer / Online<br />
                          Thank you for your payment!
                        </p>
                      ) : (
                        <p>
                          Bank: Sampath Bank<br />
                          Acc Name: A.M.Anuhas<br />
                          Acc No: 104752497687<br />
                          Branch: Panadura
                        </p>
                      )}
                    </>
                  )}
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
                  <h5>{type === 'quotation' ? 'Estimate Notes' : 'Terms & Conditions'}</h5>
                  <p>
                    {type === 'quotation' 
                      ? 'This is an estimate only. Actual costs may vary depending on design modifications or scope changes.'
                      : 'Please send payments within the due date. Contact us for any invoice-related queries.'}
                  </p>
                  {type === 'invoice' && status === 'paid' && driveLink && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16,185,129,0.08)', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <h5 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--emerald)' }}>Project / Deliverables Link</h5>
                      <a href={driveLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--emerald)', wordBreak: 'break-all', textDecoration: 'underline' }}>
                        {driveLink}
                      </a>
                    </div>
                  )}
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
                    <span>{type === 'quotation' ? 'Estimated Total:' : 'Total Due:'}</span>
                    <span>LKR {fmt(total)}</span>
                    {type === 'invoice' && status === 'paid' && (
                      <div className="pdf-paid-stamp-overlay">
                        <span className="stamp-sub">MUXX DIGITAL</span>
                        <span className="stamp-main">PAID</span>
                        <span className="stamp-foot">RECEIVED</span>
                      </div>
                    )}
                    {type === 'quotation' && status === 'accepted' && (
                      <div className="pdf-paid-stamp-overlay" style={{ border: '3px double #10b981', color: '#10b981', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.18)' }}>
                        <span className="stamp-sub">MUXX DIGITAL</span>
                        <span className="stamp-main">APPROVED</span>
                        <span className="stamp-foot">ACCEPTED</span>
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

