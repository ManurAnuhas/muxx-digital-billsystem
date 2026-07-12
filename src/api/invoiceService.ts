// ── localStorage-based storage (no backend required on Vercel) ──────────────
const STORAGE_KEY = 'muxx_invoices';

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

