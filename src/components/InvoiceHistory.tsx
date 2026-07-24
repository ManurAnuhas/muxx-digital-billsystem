import { useState, useCallback } from 'react';
import {
  Download, Trash2, Calendar, FileText, DollarSign,
  Inbox, Clock, CheckCircle, Mail, Link
} from 'lucide-react';
import { LOGO_BASE64 } from '../assets/logoBase64';

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
  status?: any;
  driveLink?: string;
}

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  attachPdf?: boolean;
}

interface InvoiceHistoryProps {
  type?: 'invoice' | 'quotation';
  invoices: SavedInvoice[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: any, driveLink?: string) => void;
  emailConfig: EmailConfig;
}

export default function InvoiceHistory({
  type = 'invoice',
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
    let finalInvoice = { ...invoice };
    if (action === 'email' && type === 'invoice' && invoice.status === 'paid') {
      const userLink = window.prompt(
        `Sending Payment Receipt for Invoice #${invoice.invoiceInfo.number}.\n\nVerify or update the Google Drive / Deliverables Link (Optional):`,
        invoice.driveLink || ''
      );
      if (userLink === null) {
        return; // cancelled
      }
      finalInvoice.driveLink = userLink;
      if (userLink !== invoice.driveLink) {
        onUpdateStatus(invoice.id, 'paid', userLink);
      }
    }

    setActiveCapture({ id: finalInvoice.id, action });

    setTimeout(async () => {
      const element = document.getElementById(`invoice-print-capture-${finalInvoice.id}`);
      if (!element) {
        alert('Render template not found.');
        setActiveCapture(null);
        return;
      }

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf')
      ]);

      try {
        if (action === 'download') {
          // Full quality PDF for download
          const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          pdf.save(`Muxx_${type === 'quotation' ? 'Quotation' : 'Invoice'}_${invoice.invoiceInfo.number}.pdf`);
        } else {
          // Send Email process
          if (!invoice.client.email) {
            alert('Client does not have an email address specified.');
            setActiveCapture(null);
            return;
          }
          if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
            alert('Email settings are not configured. Go to Settings and set credentials first.');
            setActiveCapture(null);
            return;
          }

          // Ultra-compressed PDF for email attachment (~12-15KB file size)
          const emailCanvas = await html2canvas(element, { scale: 0.5, useCORS: true, backgroundColor: '#ffffff' });
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
          formData.append('to_email', invoice.client.email);
          formData.append('email', invoice.client.email);
          formData.append('to_name', invoice.client.name);
          formData.append('invoice_num', invoice.invoiceInfo.number);

          // Customize subject lines based on status
          const statusText = type === 'quotation' 
            ? 'QUOTATION' 
            : (invoice.status === 'paid' ? 'PAID RECEIPT' : 'INVOICE DUE');
          formData.append('subject', `${statusText} - ${type === 'quotation' ? 'Quotation' : 'Invoice'} ${invoice.invoiceInfo.number}`);
          formData.append('document_type', type === 'quotation' ? 'Quotation' : 'Invoice');
          formData.append('total_amount', `LKR ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          formData.append('items_summary', invoice.items.map(item => `${item.description} (x${item.qty})`).join(', '));
          formData.append('drive_link', finalInvoice.driveLink || '');
          if (emailConfig.attachPdf !== false) {
            formData.append('invoice_pdf', pdfBlob, `Muxx_${type === 'quotation' ? 'Quotation' : 'Invoice'}_${finalInvoice.invoiceInfo.number}.pdf`);
          }

          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send-form', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            alert(`Email sent successfully to ${finalInvoice.client.name} (${finalInvoice.client.email})!`);
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
  }, [emailConfig, onUpdateStatus, type]);

  // Mark invoice as Paid handler
  const handleMarkAsPaid = useCallback((invoice: SavedInvoice) => {
    const defaultLink = invoice.driveLink || '';
    const userLink = window.prompt(
      `Invoice #${invoice.invoiceInfo.number} will be marked as PAID!\n\nEnter the Google Drive / Deliverables Link for this client (Optional):`,
      defaultLink
    );
    
    if (userLink === null) return; // User cancelled
    
    onUpdateStatus(invoice.id, 'paid', userLink);
    
    // Auto-prompt to send the receipt
    const confirmEmail = window.confirm(
      `Invoice #${invoice.invoiceInfo.number} has been marked as PAID!\n\nDo you want to email the updated Payment Receipt (PDF) to the client (${invoice.client.email}) now?`
    );

    if (confirmEmail) {
      handleTriggerAction({ ...invoice, status: 'paid', driveLink: userLink }, 'email');
    }
  }, [onUpdateStatus, handleTriggerAction]);

  if (invoices.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><Inbox size={28} /></div>
          <h3>No {type === 'quotation' ? 'Quotations' : 'Invoices'} Saved Yet</h3>
          <p>Go to "Create {type === 'quotation' ? 'Quotation' : 'Invoice'}" to generate and save your first one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-grid">
      {invoices.map((invoice) => {
        const discAmt = (invoice.subtotal * invoice.discount) / 100;
        const taxAmt = ((invoice.subtotal - discAmt) * invoice.taxRate) / 100;
        const status = invoice.status || (type === 'quotation' ? 'proposed' : 'pending');

        return (
          <div key={invoice.id} className="card history-card">
            {/* Left Info block */}
            <div className="history-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="history-number">#{invoice.invoiceInfo.number}</span>
                {type === 'quotation' ? (
                  status === 'accepted' ? (
                    <span className="badge badge-green">Accepted</span>
                  ) : status === 'declined' ? (
                    <span className="badge badge-red">Declined</span>
                  ) : (
                    <span className="badge badge-amber">Proposed</span>
                  )
                ) : (
                  status === 'paid' ? (
                    <span className="badge badge-green">Paid</span>
                  ) : (
                    <span className="badge badge-amber">Pending Payment</span>
                  )
                )}
              </div>
              <h4 className="history-title">
                {invoice.client.name}
              </h4>
              <div className="history-meta">
                <span><Calendar size={13} /> {invoice.invoiceInfo.date}</span>
                <span><Clock size={13} /> {type === 'quotation' ? 'Valid Until' : 'Due'}: {invoice.invoiceInfo.dueDate}</span>
                <span><FileText size={13} /> {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}</span>
                <span className="history-amount">
                  <DollarSign size={13} /> LKR {fmt(invoice.total)}
                </span>
                {type === 'invoice' && invoice.driveLink && (
                  <a
                    href={invoice.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Open Drive Link"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--emerald)',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    <Link size={13} /> Project Drive Link
                  </a>
                )}
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="history-actions">
              {type === 'invoice' && status === 'pending' && (
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
              {type === 'quotation' && status === 'proposed' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                    onClick={() => {
                      if (window.confirm('Accept this quotation?')) {
                        onUpdateStatus(invoice.id, 'accepted');
                      }
                    }}
                    title="Accept Quotation"
                  >
                    <CheckCircle size={15} />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm('Decline this quotation?')) {
                        onUpdateStatus(invoice.id, 'declined');
                      }
                    }}
                    title="Decline Quotation"
                  >
                    <Trash2 size={15} />
                    <span>Decline</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleTriggerAction(invoice, 'email')}
                disabled={activeCapture?.id === invoice.id}
                title={`Email PDF to Client`}
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
                  if (window.confirm(`Delete ${type === 'quotation' ? 'quotation' : 'invoice'} ${invoice.invoiceInfo.number}?`)) onDelete(invoice.id);
                }}
                title={`Delete ${type === 'quotation' ? 'Quotation' : 'Invoice'}`}
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
                         <strong>{type === 'quotation' ? 'Quotation No:' : 'Invoice No:'}</strong> {invoice.invoiceInfo.number}<br />
                         <strong>Date:</strong> {invoice.invoiceInfo.date}<br />
                         <strong>{type === 'quotation' ? 'Valid Until:' : 'Due Date:'}</strong> {invoice.invoiceInfo.dueDate}
                       </div>
                     </div>
                  </div>

                  <div className="invoice-pdf-body">
                    <div className="invoice-pdf-details">
                      <div className="pdf-address-col">
                        <h4>{type === 'quotation' ? 'Quotation For' : 'Billed To'}</h4>
                        <p>
                          <strong>{invoice.client.name}</strong><br />
                          {invoice.client.address && <>{invoice.client.address}<br /></>}
                          {invoice.client.email && <>{invoice.client.email}<br /></>}
                          {invoice.client.phone && <>{invoice.client.phone}</>}
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
                        <h5>{type === 'quotation' ? 'Estimate Notes' : 'Terms & Conditions'}</h5>
                        <p>
                          {type === 'quotation'
                            ? 'This is an estimate only. Actual costs may vary depending on design modifications or scope changes.'
                            : 'Please send payments within the due date. Contact us for any invoice-related queries.'}
                        </p>
                        {type === 'invoice' && status === 'paid' && invoice.driveLink && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16,185,129,0.08)', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <h5 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--emerald)' }}>Project / Deliverables Link</h5>
                            <a href={invoice.driveLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--emerald)', wordBreak: 'break-all', textDecoration: 'underline' }}>
                              {invoice.driveLink}
                            </a>
                          </div>
                        )}
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
                          <span>{type === 'quotation' ? 'Estimated Total:' : 'Total Due:'}</span>
                          <span>LKR {fmt(invoice.total)}</span>
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
