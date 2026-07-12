import { useState, useEffect } from 'react';
import muxxLogo from './assets/logo.png';
import { PlusCircle, History, Settings, TrendingUp, Users, LayoutDashboard } from 'lucide-react';
import InvoiceGenerator from './components/InvoiceGenerator';
import InvoiceHistory from './components/InvoiceHistory';
import ServiceSettings from './components/ServiceSettings';
import { fetchInvoices, createInvoice, updateInvoice, deleteInvoice } from './api/invoiceService';
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
  status?: 'pending' | 'paid';
}

interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  attachPdf?: boolean;
}

const DEFAULT_SERVICES: ServiceOption[] = [
  { id: 'preset-1', name: 'Logo Design & Branding Package', price: 15000 },
  { id: 'preset-2', name: 'UI/UX Design (Figma Prototype)', price: 25000 },
  { id: 'preset-3', name: 'Static Landing Page Development', price: 35000 },
  { id: 'preset-4', name: 'Full-Stack Web App Development', price: 85000 },
  { id: 'preset-5', name: 'Social Media Banner Design (Pack of 5)', price: 7500 },
  { id: 'preset-6', name: 'SEO Auditing & Optimization', price: 12000 }
];

type TabType = 'create' | 'history' | 'settings';

const TAB_META: Record<TabType, { title: string; subtitle: string }> = {
  create:   { title: 'Create Invoice',   subtitle: 'Generate and send professional billing receipts to clients' },
  history:  { title: 'Invoice History',  subtitle: 'Search, download, and manage all generated invoices' },
  settings: { title: 'Service Catalog',  subtitle: 'Configure pricing presets and email integration settings' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('create');

  const [services, setServices] = useState<ServiceOption[]>(() => {
    const saved = localStorage.getItem('muxx_preset_services');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  });

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
    const saved = localStorage.getItem('muxx_email_config');
    const defaults = { serviceId: 'service_ik3gpdb', templateId: 'template_nhznk2t', publicKey: 'S4Uim_Y_gCrnTkNyS', attachPdf: false };
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        serviceId: parsed.serviceId || defaults.serviceId,
        templateId: parsed.templateId || defaults.templateId,
        publicKey: parsed.publicKey || defaults.publicKey,
        attachPdf: parsed.attachPdf !== undefined ? parsed.attachPdf : defaults.attachPdf
      };
    }
    return defaults;
  });

  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);

  useEffect(() => {
    fetchInvoices()
      .then(data => setInvoices(data as SavedInvoice[]))
      .catch(err => console.error('Failed to load invoices:', err));
  }, []);

  useEffect(() => { localStorage.setItem('muxx_preset_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('muxx_email_config', JSON.stringify(emailConfig)); }, [emailConfig]);

  const handleAddService = (name: string, price: number) =>
    setServices(prev => [...prev, { id: `preset-${Date.now()}`, name, price }]);

  const handleDeleteService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id));

  const handleSaveInvoice = async (invoice: Omit<SavedInvoice, 'id'>) => {
    try {
      const newInv = await createInvoice(invoice as Record<string, unknown>) as SavedInvoice;
      setInvoices(prev => [newInv, ...prev]);
    } catch (err) {
      console.error('Error saving invoice:', err);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: 'pending' | 'paid') => {
    try {
      const updated = await updateInvoice(id, { status }) as SavedInvoice;
      setInvoices(prev => prev.map(inv => (inv.id === id ? updated : inv)));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const clientCount = new Set(invoices.map(inv => inv.client.name.toLowerCase())).size;

  const navItems = [
    { id: 'create'   as TabType, label: 'Create Invoice',  Icon: PlusCircle },
    { id: 'history'  as TabType, label: 'Invoice History', Icon: History },
    { id: 'settings' as TabType, label: 'Service Catalog', Icon: Settings },
  ];

  return (
    <div className="app-container">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand-section">
          <img src={muxxLogo} alt="Muxx Digital" />
          <div className="brand-badge">Billing Portal</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navigation</span>
          {navItems.map(({ id, label, Icon }) => (
            <div
              key={id}
              className={`menu-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setActiveTab(id)}
            >
              <span className="menu-icon-wrap"><Icon size={16} /></span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <span><strong>© {new Date().getFullYear()} Muxx Digital</strong></span>
            <span>v1.0.0 · Production</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>{TAB_META[activeTab].title}</h2>
            <p>{TAB_META[activeTab].subtitle}</p>
          </div>
          <div className="top-bar-right">
            <div className="stat-pill">
              <div className="stat-pill-icon green">
                <TrendingUp size={15} />
              </div>
              <div className="stat-pill-text">
                <span className="stat-pill-label">Total Billed</span>
                <span className="stat-pill-value">
                  LKR {totalBilled.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-icon blue">
                <Users size={15} />
              </div>
              <div className="stat-pill-text">
                <span className="stat-pill-label">Clients</span>
                <span className="stat-pill-value">{clientCount}</span>
              </div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-icon" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                <LayoutDashboard size={15} />
              </div>
              <div className="stat-pill-text">
                <span className="stat-pill-label">Invoices</span>
                <span className="stat-pill-value">{invoices.length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-body">
          {activeTab === 'create' && (
            <InvoiceGenerator
              services={services}
              onSave={handleSaveInvoice}
              emailConfig={emailConfig}
            />
          )}
          {activeTab === 'history' && (
            <InvoiceHistory
              invoices={invoices}
              onDelete={handleDeleteInvoice}
              onUpdateStatus={handleUpdateInvoiceStatus}
              emailConfig={emailConfig}
            />
          )}
          {activeTab === 'settings' && (
            <ServiceSettings
              services={services}
              onAddService={handleAddService}
              onDeleteService={handleDeleteService}
              emailConfig={emailConfig}
              onSaveEmailConfig={setEmailConfig}
            />
          )}
        </div>
      </main>
    </div>
  );
}
