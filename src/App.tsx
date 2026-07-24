import { useState, useEffect } from 'react';
import muxxLogo from './assets/logo.png';
import { PlusCircle, History, Settings, TrendingUp, Users, LayoutDashboard, FileText, FileSpreadsheet, LogOut, Loader2, Menu, X } from 'lucide-react';
import InvoiceGenerator from './components/InvoiceGenerator';
import InvoiceHistory from './components/InvoiceHistory';
import ServiceSettings from './components/ServiceSettings';
import AdminLogin from './components/AdminLogin';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  fetchInvoices, createInvoice, updateInvoice, deleteInvoice,
  fetchQuotations, createQuotation, updateQuotation, deleteQuotation
} from './api/invoiceService';
import { ToastContainer, type ToastMessage } from './components/Toast';
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
  status?: any;
  driveLink?: string;
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

type TabType = 'create' | 'create_quotation' | 'history' | 'quotation_history' | 'settings';

const TAB_META: Record<TabType, { title: string; subtitle: string }> = {
  create:            { title: 'Create Invoice',      subtitle: 'Generate and send professional billing receipts to clients' },
  create_quotation:  { title: 'Create Quotation',    subtitle: 'Generate and send professional price estimates to clients' },
  history:           { title: 'Invoice History',     subtitle: 'Search, download, and manage all generated invoices' },
  quotation_history: { title: 'Quotation History',   subtitle: 'Search, download, and manage all generated quotations' },
  settings:          { title: 'Service Catalog',     subtitle: 'Configure pricing presets and email integration settings' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [services, setServices] = useState<ServiceOption[]>(() => {
    const saved = localStorage.getItem('muxx_preset_services');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  });

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
    const saved = localStorage.getItem('muxx_email_config');
    const defaults = { serviceId: 'service_ik3gpdb', templateId: 'template_nhznk2t', publicKey: 'S4Uim_Y_gCrnTkNyS', attachPdf: true };
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
  const [quotations, setQuotations] = useState<SavedInvoice[]>([]);

  useEffect(() => {
    fetchInvoices()
      .then(data => setInvoices(data as SavedInvoice[]))
      .catch(err => console.error('Failed to load invoices:', err));

    fetchQuotations()
      .then(data => setQuotations(data as SavedInvoice[]))
      .catch(err => console.error('Failed to load quotations:', err));
  }, []);

  useEffect(() => { localStorage.setItem('muxx_preset_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('muxx_email_config', JSON.stringify(emailConfig)); }, [emailConfig]);

  const handleAddService = (name: string, price: number) =>
    setServices(prev => [...prev, { id: `preset-${Date.now()}`, name, price }]);

  const handleDeleteService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id));

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Invoice Handlers
  const handleSaveInvoice = async (invoice: Omit<SavedInvoice, 'id'>) => {
    try {
      const newInv = await createInvoice(invoice as Record<string, unknown>) as SavedInvoice;
      setInvoices(prev => [newInv, ...prev]);
    } catch (err) {
      console.error('Error saving invoice:', err);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: 'pending' | 'paid', driveLink?: string) => {
    try {
      const updated = await updateInvoice(id, { status, driveLink }) as SavedInvoice;
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

  // Quotation Handlers
  const handleSaveQuotation = async (quotation: Omit<SavedInvoice, 'id'>) => {
    try {
      const newQuo = await createQuotation(quotation as Record<string, unknown>) as SavedInvoice;
      setQuotations(prev => [newQuo, ...prev]);
    } catch (err) {
      console.error('Error saving quotation:', err);
    }
  };

  const handleUpdateQuotationStatus = async (id: string, status: any, driveLink?: string) => {
    try {
      const updated = await updateQuotation(id, { status, driveLink }) as SavedInvoice;
      setQuotations(prev => prev.map(quo => (quo.id === id ? updated : quo)));
    } catch (err) {
      console.error('Error updating quotation status:', err);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    try {
      await deleteQuotation(id);
      setQuotations(prev => prev.filter(quo => quo.id !== id));
    } catch (err) {
      console.error('Error deleting quotation:', err);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const clientCount = new Set([
    ...invoices.map(inv => inv.client.name.toLowerCase().trim()),
    ...quotations.map(quo => quo.client.name.toLowerCase().trim())
  ].filter(Boolean)).size;

  const navItems = [
    { id: 'create'            as TabType, label: 'Create Invoice',      Icon: PlusCircle },
    { id: 'create_quotation'  as TabType, label: 'Create Quotation',    Icon: FileSpreadsheet },
    { id: 'history'           as TabType, label: 'Invoice History',     Icon: History },
    { id: 'quotation_history' as TabType, label: 'Quotation History',   Icon: FileText },
    { id: 'settings'          as TabType, label: 'Service Catalog',     Icon: Settings },
  ];

  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <Loader2 className="spinner" style={{ color: '#10b981' }} size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
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
              onClick={() => {
                setActiveTab(id);
                setMobileMenuOpen(false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }
              }}
            >
              <span className="menu-icon-wrap"><Icon size={16} /></span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <div className="sidebar-footer-info" style={{ marginTop: '1rem' }}>
            <span><strong>© {new Date().getFullYear()} Muxx Digital</strong></span>
            <span>v1.1.0 · Production</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left-wrapper">
            <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle Menu">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="top-bar-left">
              <h2>{TAB_META[activeTab].title}</h2>
              <p>{TAB_META[activeTab].subtitle}</p>
            </div>
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
            <div className="stat-pill">
              <div className="stat-pill-icon" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--violet-lt)' }}>
                <FileText size={15} />
              </div>
              <div className="stat-pill-text">
                <span className="stat-pill-label">Quotations</span>
                <span className="stat-pill-value">{quotations.length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-body">
          {activeTab === 'create' && (
            <InvoiceGenerator
              type="invoice"
              services={services}
              onSave={handleSaveInvoice}
              emailConfig={emailConfig}
              invoices={invoices}
              showToast={showToast}
            />
          )}
          {activeTab === 'create_quotation' && (
            <InvoiceGenerator
              type="quotation"
              services={services}
              onSave={handleSaveQuotation}
              emailConfig={emailConfig}
              invoices={quotations}
              showToast={showToast}
            />
          )}
          {activeTab === 'history' && (
            <InvoiceHistory
              type="invoice"
              invoices={invoices}
              onDelete={handleDeleteInvoice}
              onUpdateStatus={handleUpdateInvoiceStatus}
              emailConfig={emailConfig}
              showToast={showToast}
            />
          )}
          {activeTab === 'quotation_history' && (
            <InvoiceHistory
              type="quotation"
              invoices={quotations}
              onDelete={handleDeleteQuotation}
              onUpdateStatus={handleUpdateQuotationStatus}
              emailConfig={emailConfig}
              showToast={showToast}
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

