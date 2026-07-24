// ── localStorage-based storage (no backend required on Vercel) ──────────────
const STORAGE_KEY = 'muxx_invoices';
const QUOTATION_STORAGE_KEY = 'muxx_quotations';

const getAll = (): Record<string, unknown>[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveAll = (invoices: Record<string, unknown>[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

const getAllQuotations = (): Record<string, unknown>[] => {
  try {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveAllQuotations = (quotations: Record<string, unknown>[]) => {
  localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(quotations));
};

// ── Public API (same signatures as before) ───────────────────────────────────

export const fetchInvoices = async (): Promise<unknown[]> => {
  return getAll();
};

export const createInvoice = async (invoice: Record<string, unknown>): Promise<unknown> => {
  const invoices = getAll();
  const newInvoice = { ...invoice, id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  saveAll([newInvoice, ...invoices]);
  return newInvoice;
};

export const updateInvoice = async (id: string, data: Record<string, unknown>): Promise<unknown> => {
  const invoices = getAll();
  const updated = invoices.map(inv =>
    (inv as { id: string }).id === id ? { ...inv, ...data } : inv
  );
  saveAll(updated);
  return updated.find(inv => (inv as { id: string }).id === id);
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const invoices = getAll();
  saveAll(invoices.filter(inv => (inv as { id: string }).id !== id));
};

// ── Quotations API ──────────────────────────────────────────────────────────

export const fetchQuotations = async (): Promise<unknown[]> => {
  return getAllQuotations();
};

export const createQuotation = async (quotation: Record<string, unknown>): Promise<unknown> => {
  const quotations = getAllQuotations();
  const newQuotation = { ...quotation, id: `quo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  saveAllQuotations([newQuotation, ...quotations]);
  return newQuotation;
};

export const updateQuotation = async (id: string, data: Record<string, unknown>): Promise<unknown> => {
  const quotations = getAllQuotations();
  const updated = quotations.map(quo =>
    (quo as { id: string }).id === id ? { ...quo, ...data } : quo
  );
  saveAllQuotations(updated);
  return updated.find(quo => (quo as { id: string }).id === id);
};

export const deleteQuotation = async (id: string): Promise<void> => {
  const quotations = getAllQuotations();
  saveAllQuotations(quotations.filter(quo => (quo as { id: string }).id !== id));
};

// ── Auth API (Now using Firebase Auth directly in AdminLogin) ────────────────


