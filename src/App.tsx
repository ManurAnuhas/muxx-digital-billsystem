import React, { useState, useEffect } from 'react';
import { PlusCircle, History, Settings, LogOut, TrendingUp, Users, FileCheck } from 'lucide-react';
import InvoiceGenerator from './components/InvoiceGenerator';
import InvoiceHistory from './components/InvoiceHistory';
import ServiceSettings from './components/ServiceSettings';
import './App.css';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

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

const DEFAULT_SERVICES: ServiceOption[] = [
  { id: 'preset-1', name: 'Logo Design & Branding Package', price: 15000 },
  { id: 'preset-2', name: 'UI/UX Design (Figma Prototype)', price: 25000 },
  { id: 'preset-3', name: 'Static Landing Page Development', price: 35000 },
  { id: 'preset-4', name: 'Full-Stack Web App Development', price: 85000 },
  { id: 'preset-5', name: 'Social Media Banner Design (Pack of 5)', price: 7500 },
  { id: 'preset-6', name: 'SEO Auditing & Optimization', price: 12000 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'settings'>('create');
  
  // Load and state management for preset services
  const [services, setServices] = useState<ServiceOption[]>(() => {
    const saved = localStorage.getItem('muxx_preset_services');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  });

  // Load and state management for invoice history
  const [invoices, setInvoices] = useState<SavedInvoice[]>(() => {
    const saved = localStorage.getItem('muxx_invoices_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Synchronize preset services to localStorage
  useEffect(() => {
    localStorage.setItem('muxx_preset_services', JSON.stringify(services));
  }, [services]);

  // Synchronize invoice history to localStorage
  useEffect(() => {
    localStorage.setItem('muxx_invoices_history', JSON.stringify(invoices));
  }, [invoices]);

  // Pricing preset state actions
  const handleAddService = (name: string, price: number) => {
    const newService: ServiceOption = {
      id: `preset-${Date.now()}`,
      name,
      price
    };
    setServices((prev) => [...prev, newService]);
  };

  const handleDeleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Invoice saving state actions
  const handleSaveInvoice = (invoice: Omit<SavedInvoice, 'id'> & { id: string }) => {
    setInvoices((prev) => [invoice, ...prev]);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Key stats calculation
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const clientCount = new Set(invoices.map((inv) => inv.client.name.toLowerCase())).size;

  return (
    <div className="app-container">
      {/* Background glow animations */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo-container">
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>M</span>
          </div>
          <div>
            <h1 className="brand-logo-text">MUXX</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '-2px' }}>
              Billing Portal
            </p>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`menu-item ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusCircle size={20} />
            <span>Create Invoice</span>
          </li>
          <li 
            className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>Invoice History</span>
          </li>
          <li 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Configure Catalog</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <p>© {new Date().getFullYear()} Muxx Digital</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>v1.0.0 · Production</p>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Main Dashboard Info Cards / Row */}
        <div className="page-header">
          <div>
            <h2 className="page-title">
              {activeTab === 'create' && 'New Invoice Builder'}
              {activeTab === 'history' && 'Saved Invoices'}
              {activeTab === 'settings' && 'Predefined Pricing Settings'}
            </h2>
            <p className="page-subtitle">
              {activeTab === 'create' && 'Generate and download custom client billing receipts'}
              {activeTab === 'history' && 'Search, download, and review generated customer records'}
              {activeTab === 'settings' && 'Customize default billing packages and service design prices'}
            </p>
          </div>

          {/* Stats Badges */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
              <TrendingUp size={20} style={{ color: 'var(--clr-success)' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-secondary)', textTransform: 'uppercase' }}>Total Invoiced</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>LKR {totalBilled.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
              <Users size={20} style={{ color: 'var(--clr-secondary)' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-secondary)', textTransform: 'uppercase' }}>Clients</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{clientCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic page container */}
        <div className="page-body">
          {activeTab === 'create' && (
            <InvoiceGenerator services={services} onSave={handleSaveInvoice} />
          )}
          {activeTab === 'history' && (
            <InvoiceHistory invoices={invoices} onDelete={handleDeleteInvoice} />
          )}
          {activeTab === 'settings' && (
            <ServiceSettings 
              services={services} 
              onAddService={handleAddService} 
              onDeleteService={handleDeleteService} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
