import React, { useState } from 'react';
import { Plus, Trash2, Tag, DollarSign } from 'lucide-react';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

interface ServiceSettingsProps {
  services: ServiceOption[];
  onAddService: (name: string, price: number) => void;
  onDeleteService: (id: string) => void;
}

export default function ServiceSettings({ services, onAddService, onDeleteService }: ServiceSettingsProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;
    onAddService(name, Number(price) || 0);
    setName('');
    setPrice('');
  };

  return (
    <div className="card">
      <h3 className="section-subtitle">Configure Predefined Service & Design Prices</h3>
      <p style={{ color: 'var(--clr-text-secondary)', marginBottom: '1.5rem' }}>
        Add or remove presets for services and designs. These presets will instantly populate options on the invoice builder.
      </p>

      <form onSubmit={handleSubmit} className="add-service-form">
        <div className="form-group">
          <label>Service / Design Title</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Social Media Design Package"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          <Plus size={18} /> Add Preset
        </button>
      </form>

      <div className="services-list">
        <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Current Preset Catalog</h4>
        {services.length === 0 ? (
          <p style={{ color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>No preset services configured.</p>
        ) : (
          services.map((svc) => (
            <div key={svc.id} className="service-item-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Tag size={16} style={{ color: 'var(--clr-primary-hover)' }} />
                <span className="service-name">{svc.name}</span>
              </div>
              <div className="service-item-actions">
                <span className="service-price">
                  LKR {svc.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => onDeleteService(svc.id)}
                  title="Delete Preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
