import express, { Request, Response } from 'express';
import cors from 'cors';
import { Low, JSONFile } from 'lowdb';
import { v4 as uuidv4 } from 'uuid';

type Invoice = {
  id: string;
  invoiceInfo: { number: string; date: string; dueDate: string };
  client: { name: string; email: string; phone: string; address: string };
  items: { description: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  taxRate: number;
  total: number;
  status: 'pending' | 'paid';
};

type DB = { invoices: Invoice[] };

const adapter = new JSONFile<DB>('db.json');
const db = new Low<DB>(adapter);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

async function init() {
  await db.read();
  db.data ??= { invoices: [] };

  // GET all invoices
  app.get('/invoices', (_req: Request, res: Response) => {
    res.json(db.data!.invoices);
  });

  // GET single invoice
  app.get('/invoices/:id', (req: Request, res: Response) => {
    const invoice = db.data!.invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  });

  // CREATE invoice
  app.post('/invoices', async (req: Request, res: Response) => {
    const payload = req.body as Omit<Invoice, 'id'>;
    const newInvoice: Invoice = { ...payload, id: uuidv4(), status: payload.status || 'pending' };
    db.data!.invoices.push(newInvoice);
    await db.write();
    res.status(201).json(newInvoice);
  });

  // UPDATE invoice
  app.put('/invoices/:id', async (req: Request, res: Response) => {
    const idx = db.data!.invoices.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.data!.invoices[idx] = { ...db.data!.invoices[idx], ...req.body };
    await db.write();
    res.json(db.data!.invoices[idx]);
  });

  // DELETE invoice
  app.delete('/invoices/:id', async (req: Request, res: Response) => {
    const exists = db.data!.invoices.some(i => i.id === req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });
    db.data!.invoices = db.data!.invoices.filter(i => i.id !== req.params.id);
    await db.write();
    res.status(204).end();
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
}

init();

