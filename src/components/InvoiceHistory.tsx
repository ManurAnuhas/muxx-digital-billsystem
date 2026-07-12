import { useState, useCallback } from 'react';
import {
  Download, Trash2, Calendar, FileText, DollarSign,
  Inbox, Clock, CheckCircle, Mail
} from 'lucide-react';

// Public URL — works in emails and PDFs (local imports don't work in email clients)
const LOGO_URL = 'https://raw.githubusercontent.com/ManurAnuhas/muxx-digital-billsystem/main/public/logo.png';

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
  status?: 'pending' | 'paid';
}

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  attachPdf?: boolean;
}

interface InvoiceHistoryProps {
  invoices: SavedInvoice[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'pending' | 'paid') => void;
  emailConfig: EmailConfig;
}

export default function InvoiceHistory({
  invoices,
  onDelete,
  onUpdateStatus,
  emailConfig
}: InvoiceHistoryProps) {
  // Capture invoice state: tracks which invoice is currently being rendered/captured, and the action ('download' or 'email')
  const [activeCapture, setActiveCapture] = useState<{ id: string; action: 'download' | 'email' } | null>(null);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  // Core capture and execution handler
  const handleTriggerAction = useCallback((invoice: SavedInvoice, action: 'download' | 'email') => {
    setActiveCapture({ id: invoice.id, action });

    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-capture-${invoice.id}`);
      if (!element) {
        alert('Invoice render template not found.');
        setActiveCapture(null);
        return;
      }

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf')
      ]);

      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        if (action === 'download') {
          pdf.save(`Muxx_Invoice_${invoice.invoiceInfo.number}.pdf`);
        } else {
          // Send Email process
          if (!invoice.client.email) {
            alert('Client does not have an email address specified.');
            setActiveCapture(null);
            return;
          }
          if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
            alert('Email settings are not configured. Go to Service Catalog and set your EmailJS credentials first.');
            setActiveCapture(null);
            return;
          }

          const pdfBlob = pdf.output('blob');
          const formData = new FormData();
          formData.append('service_id', emailConfig.serviceId);
          formData.append('template_id', emailConfig.templateId);
          formData.append('user_id', emailConfig.publicKey);
          formData.append('to_email', invoice.client.email);
          formData.append('email', invoice.client.email);
          formData.append('to_name', invoice.client.name);
          formData.append('invoice_num', invoice.invoiceInfo.number);

          // Customize subject lines based on status
          const statusText = (invoice.status || 'pending') === 'paid' ? 'PAID RECEIPT' : 'INVOICE DUE';
          formData.append('subject', `${statusText} - Invoice ${invoice.invoiceInfo.number}`);
          formData.append('total_amount', `LKR ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          formData.append('items_summary', invoice.items.map(item => `${item.description} (x${item.qty})`).join(', '));
          if (emailConfig.attachPdf) {
            formData.append('invoice_pdf', pdfBlob, `Muxx_Invoice_${invoice.invoiceInfo.number}.pdf`);
          }

          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            alert(`Email sent successfully to ${invoice.client.name} (${invoice.client.email})!`);
          } else {
            const errorMsg = await response.text();
            throw new Error(errorMsg || 'Failed sending email.');
          }
        }
      } catch (err: any) {
        console.error('PDF/Email Error:', err);
        alert(`Failed to complete action: ${err.message || err}`);
      } finally {
        setActiveCapture(null);
      }
    }, 150);
  }, [emailConfig]);

  // Mark invoice as Paid handler
  const handleMarkAsPaid = useCallback((invoice: SavedInvoice) => {
    onUpdateStatus(invoice.id, 'paid');
    
    // Auto-prompt to send the receipt
    const confirmEmail = window.confirm(
      `Invoice #${invoice.invoiceInfo.number} has been marked as PAID!\n\nDo you want to email the updated Payment Receipt (PDF) to the client (${invoice.client.email}) now?`
    );

    if (confirmEmail) {
      // Trigger email send process for the updated paid invoice
      handleTriggerAction({ ...invoice, status: 'paid' }, 'email');
    }
  }, [onUpdateStatus, handleTriggerAction]);

  if (invoices.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><Inbox size={28} /></div>
          <h3>No Invoices Saved Yet</h3>
          <p>Go to "Create Invoice" to generate and save your first client bill.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-grid">
      {invoices.map((invoice) => {
        const discAmt = (invoice.subtotal * invoice.discount) / 100;
        const taxAmt = ((invoice.subtotal - discAmt) * invoice.taxRate) / 100;
        const status = invoice.status || 'pending';

        return (
          <div key={invoice.id} className="card history-card">
            {/* Left Info block */}
            <div className="history-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="history-number">#{invoice.invoiceInfo.number}</span>
                {status === 'paid' ? (
                  <span className="badge badge-green">Paid</span>
                ) : (
                  <span className="badge badge-amber">Pending Payment</span>
                )}
              </div>
              <h4 className="history-title">
                {invoice.client.name}
              </h4>
              <div className="history-meta">
                <span><Calendar size={13} /> {invoice.invoiceInfo.date}</span>
                <span><Clock size={13} /> Due: {invoice.invoiceInfo.dueDate}</span>
                <span><FileText size={13} /> {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}</span>
                <span className="history-amount">
                  <DollarSign size={13} /> LKR {fmt(invoice.total)}
                </span>
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="history-actions">
              {status === 'pending' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                  onClick={() => handleMarkAsPaid(invoice)}
                  title="Mark as Paid"
                >
                  <CheckCircle size={15} />
                  <span>Mark Paid</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTriggerAction(invoice, 'email')}
                disabled={activeCapture?.id === invoice.id}
                title="Email PDF to Client"
              >
                <Mail size={15} />
                <span>{activeCapture?.id === invoice.id && activeCapture.action === 'email' ? 'Sending…' : 'Email'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTriggerAction(invoice, 'download')}
                disabled={activeCapture?.id === invoice.id}
                title="Download PDF"
              >
                <Download size={15} />
                <span>{activeCapture?.id === invoice.id && activeCapture.action === 'download' ? 'Building…' : 'PDF'}</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete invoice ${invoice.invoiceInfo.number}?`)) onDelete(invoice.id);
                }}
                title="Delete Invoice"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Hidden PDF Capture template */}
            {activeCapture?.id === invoice.id && (
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
                <div
                  id={`invoice-print-capture-${invoice.id}`}
                  className="invoice-render-area pdf-capture"
                >
                  <div className="invoice-pdf-header">
                    <div className="invoice-pdf-brand">
                      <img src={LOGO_URL} alt="Muxx Digital" crossOrigin="anonymous" />
                      <div className="invoice-pdf-brand-details">
                        Panadura, Sri Lanka<br />
                        Phone: +94779474855<br />
                        Email: info.muxxdigital@gmail.com
                      </div>
                    </div>
                    <div className="invoice-pdf-meta">
                       <div className="invoice-pdf-title">INVOICE</div>
                       <div className="invoice-pdf-meta-rows">
                         <strong>Invoice No:</strong> {invoice.invoiceInfo.number}<br />
                         <strong>Date:</strong> {invoice.invoiceInfo.date}<br />
                         <strong>Due Date:</strong> {invoice.invoiceInfo.dueDate}
                       </div>
                     </div>
                  </div>

                  <div className="invoice-pdf-body">
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
                          Bank: Sampath Bank<br />
                          Acc Name: A.M.Anuhas<br />
                          Acc No: 104752497687<br />
                          Branch: Panadura
                        </p>
                      </div>
                    </div>

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
                        {invoice.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.description || 'Service Details'}</td>
                            <td className="num-col">{item.qty}</td>
                            <td className="num-col">LKR {fmt(item.price)}</td>
                            <td className="num-col">LKR {fmt(item.qty * item.price)}</td>
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
                          <span>LKR {fmt(invoice.subtotal)}</span>
                        </div>
                        {invoice.discount > 0 && (
                          <div className="pdf-totals-row">
                            <span>Discount ({invoice.discount}%):</span>
                            <span>− LKR {fmt(discAmt)}</span>
                          </div>
                        )}
                        {invoice.taxRate > 0 && (
                          <div className="pdf-totals-row">
                            <span>Tax ({invoice.taxRate}%):</span>
                            <span>+ LKR {fmt(taxAmt)}</span>
                          </div>
                        )}
                        <div className="pdf-totals-row grand-total" style={{ position: 'relative' }}>
                          <span>Total Due:</span>
                          <span>LKR {fmt(invoice.total)}</span>
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
            )}
          </div>
        );
      })}
    </div>
  );
}
