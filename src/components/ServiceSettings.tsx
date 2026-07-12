import React, { useState } from 'react';
import { Plus, Trash2, Tag, Mail, Key, Zap, Shield, ExternalLink } from 'lucide-react';

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

interface ServiceSettingsProps {
  services: ServiceOption[];
  onAddService: (name: string, price: number) => void;
  onDeleteService: (id: string) => void;
  emailConfig: EmailConfig;
  onSaveEmailConfig: (config: EmailConfig) => void;
}

export default function ServiceSettings({
  services, onAddService, onDeleteService, emailConfig, onSaveEmailConfig
}: ServiceSettingsProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState(emailConfig.serviceId);
  const [templateId, setTemplateId] = useState(emailConfig.templateId);
  const [publicKey, setPublicKey] = useState(emailConfig.publicKey);
  const [attachPdf, setAttachPdf] = useState(emailConfig.attachPdf ?? false);
  const [emailSaved, setEmailSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;
    onAddService(name, Number(price) || 0);
    setName('');
    setPrice('');
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveEmailConfig({ serviceId, templateId, publicKey, attachPdf });
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2500);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

      {/* Service Presets */}
      <div className="card">
        <h3 className="section-subtitle">
          <Tag size={15} /> Predefined Service Catalog
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--txt-lo)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Add service presets that can be instantly applied to any invoice. Presets save time and keep pricing consistent.
        </p>

        {/* Add Form */}
        <form onSubmit={handleSubmit} className="add-service-form">
          <div className="form-group">
            <label>Service / Design Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Social Media Design Package"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Default Price (LKR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              placeholder="5000"
              value={price}
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Add
          </button>
        </form>

        {/* List */}
        {services.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--txt-lo)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No preset services configured yet. Add one above.
          </div>
        ) : (
          <div className="services-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt-lo)' }}>
                {services.length} Preset{services.length !== 1 ? 's' : ''} Configured
              </h4>
            </div>
            {services.map(svc => (
              <div key={svc.id} className="service-item-row">
                <div className="service-item-left">
                  <div className="service-tag-icon"><Tag size={13} /></div>
                  <span className="service-name">{svc.name}</span>
                </div>
                <div className="service-item-actions">
                  <span className="service-price">LKR {fmt(svc.price)}</span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => onDeleteService(svc.id)}
                    title="Delete preset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EmailJS Config */}
      <div className="card">
        <h3 className="section-subtitle">
          <Mail size={15} /> Email Integration · EmailJS
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--txt-lo)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Connect your{' '}
          <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer">
            EmailJS <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
          </a>{' '}
          account to send invoice PDFs directly to clients from the browser — no backend needed.
        </p>

        {/* Info pills */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { icon: Zap, label: 'No backend needed', clr: 'amber' },
            { icon: Shield, label: 'Secure & free tier available', clr: 'green' },
          ].map(({ icon: Icon, label, clr }) => (
            <div key={label} className={`badge badge-${clr === 'amber' ? 'violet' : 'green'}`}
              style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
              <Icon size={11} /> {label}
            </div>
          ))}
        </div>

        <form onSubmit={handleSaveEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Service ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. service_xxxxxx"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Template ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. template_xxxxxx"
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Public Key</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. user_xxxxxxxxxxxxxxxxxxxxx"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              id="attach-pdf-checkbox"
              checked={attachPdf}
              onChange={e => setAttachPdf(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="attach-pdf-checkbox" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--txt-mid)', cursor: 'pointer', userSelect: 'none' }}>
              Attach PDF Invoice (Requires Paid EmailJS Plan - Max 50KB payload limit on free tier)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Key size={15} /> Save Configuration
            </button>
            {emailSaved && (
              <span style={{ fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 600,
                animation: 'fadeIn 0.3s ease' }}>
                ✓ Configuration saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
