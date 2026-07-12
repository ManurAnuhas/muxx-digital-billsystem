export const API_BASE = 'http://localhost:4000';

export const fetchInvoices = async (): Promise<unknown[]> => {
  const res = await fetch(`${API_BASE}/invoices`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
};

export const createInvoice = async (invoice: Record<string, unknown>): Promise<unknown> => {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error('Failed to create invoice');
  return res.json();
};

export const updateInvoice = async (id: string, data: Record<string, unknown>): Promise<unknown> => {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update invoice');
  return res.json();
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete invoice');
};

