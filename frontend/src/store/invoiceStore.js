const store = [
  {
    id: "inv-1",
    invoice_number: "INV-2024-0341",
    po_number: "PO-2024-00891",
    supplier_name: "TechCore Industries",
    invoice_date: "2024-07-28",
    due_date: "2024-08-28",
    total_amount: 45200,
    matching_status: "3-Way Matched",
    fraud_risk_score: 8
  },
  {
    id: "inv-2",
    invoice_number: "INV-2024-0342",
    po_number: "PO-2024-00892",
    supplier_name: "GlobalSupply Co.",
    invoice_date: "2024-07-30",
    due_date: "2024-08-30",
    total_amount: 18900,
    matching_status: "Discrepancy",
    fraud_risk_score: 72,
    fraud_flags: ["Line unit price is 12% higher than agreed PO rate", "Potential duplicate invoice hash"]
  },
  {
    id: "inv-3",
    invoice_number: "INV-2024-0343",
    po_number: "PO-2024-00895",
    supplier_name: "PrimeParts Ltd.",
    invoice_date: "2024-08-01",
    due_date: "2024-08-31",
    total_amount: 89e3,
    matching_status: "3-Way Matched",
    fraud_risk_score: 14
  }
];
export const invoiceStore = {
  getAll: () => [...store],
  add: (inv) => {
    if (!store.find((i) => i.id === inv.id)) {
      store.unshift(inv);
    }
  },
  update: (id, patch) => {
    const idx = store.findIndex((i) => i.id === id);
    if (idx !== -1) {
      store[idx] = { ...store[idx], ...patch };
    }
  },
  /** Auto-generate an invoice from a received PO */
  createFromPO: (po) => {
    const invoiceNumber = `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const due = new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0];
    const inv = {
      id: `inv-po-${po.id}`,
      invoice_number: invoiceNumber,
      po_number: po.po_number,
      supplier_name: po.supplier?.company_name || "TechCore Industries",
      invoice_date: today,
      due_date: due,
      total_amount: po.total_amount || 0,
      matching_status: "3-Way Matched",
      fraud_risk_score: 6,
      status: "pending"
    };
    invoiceStore.add(inv);
    return inv;
  }
};
