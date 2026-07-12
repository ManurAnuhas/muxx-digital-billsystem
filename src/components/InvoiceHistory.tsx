import React, { useState, useCallback } from 'react';
import { Download, Trash2, Calendar, FileText, DollarSign, Inbox } from 'lucide-react';

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

interface SavedInvoice {
  id: string;
  invoiceInfo: InvoiceInfo;
  client: ClientInfo;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  discount: number;
  total: number;
}

interface InvoiceHistoryProps {
  invoices: SavedInvoice[];
  onDelete: (id: string) => void;
}

export default function InvoiceHistory({ invoices, onDelete }: InvoiceHistoryProps) {
  const [activeDownloadInvoice, setActiveDownloadInvoice] = useState<SavedInvoice | null>(null);

  const handleDownloadPdf = useCallback(async (invoice: SavedInvoice) => {
    setActiveDownloadInvoice(invoice);
    
    // Allow React a tick to mount and render the hidden print block
    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-capture-${invoice.id}`);
      if (!element) {
        alert('Invoice render template not found.');
        setActiveDownloadInvoice(null);
        return;
      }

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
        pdf.save(`Muxx_Invoice_${invoice.invoiceInfo.number}.pdf`);
      } catch (error) {
        console.error('PDF Generation failed:', error);
        alert('Failed to generate PDF. Check browser console.');
      } finally {
        setActiveDownloadInvoice(null);
      }
    }, 100);
  }, []);

  if (invoices.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <Inbox size={48} className="empty-icon" />
          <h3>No Invoices Saved Yet</h3>
          <p>Go to the "Create Invoice" page to generate and save your first customer bill.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-grid">
      {invoices.map((invoice) => (
        <div key={invoice.id} className="card history-card">
          <div className="history-info">
            <h4 className="history-title">
              Invoice {invoice.invoiceInfo.number} — <span style={{ color: 'var(--clr-primary-hover)' }}>{invoice.client.name}</span>
            </h4>
            <div className="history-meta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={14} /> Issued: {invoice.invoiceInfo.date}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <FileText size={14} /> Items: {invoice.items.length}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--clr-success)', fontWeight: '600' }}>
                <DollarSign size={14} /> LKR {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="history-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleDownloadPdf(invoice)}
              title="Download PDF"
            >
              <Download size={16} /> PDF
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceInfo.number}?`)) {
                  onDelete(invoice.id);
                }
              }}
              title="Delete Invoice"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

          {/* Hidden PDF template for background capture */}
          {activeDownloadInvoice?.id === invoice.id && (
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <div id={`invoice-print-capture-${invoice.id}`} className="invoice-render-area" style={{ color: '#1e293b' }}>
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
                        <strong style={{ color: '#0f172a' }}>Invoice No:</strong> {invoice.invoiceInfo.number}<br />
                        <strong style={{ color: '#0f172a' }}>Date:</strong> {invoice.invoiceInfo.date}<br />
                        <strong style={{ color: '#0f172a' }}>Due Date:</strong> {invoice.invoiceInfo.dueDate}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="invoice-pdf-details">
                  <div className="pdf-address-col">
                    <h4>Billed To</h4>
                    <p>
                      <strong>{invoice.client.name}</strong><br />
                      {invoice.client.address && <>{invoice.client.address}<br /></>}
                      {invoice.client.email && <>{invoice.client.email}<br /></>}
                      {invoice.client.phone && <>{invoice.client.phone}</>}
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
                    {invoice.items.map((item, idx) => (
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
                      <span>LKR {invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="pdf-totals-row">
                        <span>Discount ({invoice.discount}%):</span>
                        <span>- LKR {((invoice.subtotal * invoice.discount) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {invoice.taxRate > 0 && (
                      <div className="pdf-totals-row">
                        <span>Tax ({invoice.taxRate}%):</span>
                        <span>
                          + LKR {(((invoice.subtotal - (invoice.subtotal * invoice.discount) / 100) * invoice.taxRate) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="pdf-totals-row grand-total">
                      <span>Total Due:</span>
                      <span>LKR {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="pdf-footer">
                  <span>Thank you for your business!</span>
                  <span>www.muxxdigital.com</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
