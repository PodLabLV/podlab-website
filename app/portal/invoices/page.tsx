'use client';

type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
}

const invoices: Invoice[] = [
  { id: 'PL-2026-031', date: 'Mar 15, 2026', description: 'ExpansionLab — March 2026 (2/2)', amount: 1500, status: 'Paid' },
  { id: 'PL-2026-030', date: 'Mar 1, 2026', description: 'ExpansionLab — March 2026 (1/2)', amount: 1500, status: 'Paid' },
  { id: 'PL-2026-028', date: 'Feb 15, 2026', description: 'ExpansionLab — February 2026 (2/2)', amount: 1500, status: 'Paid' },
  { id: 'PL-2026-027', date: 'Feb 1, 2026', description: 'ExpansionLab — February 2026 (1/2)', amount: 1500, status: 'Paid' },
  { id: 'PL-2026-018', date: 'Jan 15, 2026', description: 'ExpansionLab — January 2026 (2/2)', amount: 2000, status: 'Paid' },
  { id: 'PL-2026-017', date: 'Jan 1, 2026', description: 'ExpansionLab — January 2026 (1/2)', amount: 1500, status: 'Paid' },
  { id: 'PL-2025-098', date: 'Dec 8, 2025', description: 'VideoSalesLab — Founder Video Package', amount: 10000, status: 'Paid' },
  { id: 'PL-2025-072', date: 'Nov 10, 2025', description: 'AssetsLab — DNA + Hook Bank + Roadmap', amount: 1500, status: 'Paid' },
];

const statusStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-[#2ADD1B]/15 text-[#2ADD1B]',
  Pending: 'bg-yellow-500/15 text-yellow-400',
  Overdue: 'bg-red-500/15 text-red-400',
};

export default function InvoicesPage() {
  const totalInvested = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const currentMonthly = 3500;
  const nextPayment = 'Apr 1, 2026';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Invoices & Billing
        </h1>
        <p className="mt-2 text-white/50 text-sm">Payment history and receipts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Invested</p>
          <p className="mt-2 text-3xl font-display text-white">${totalInvested.toLocaleString()}</p>
          <p className="mt-1 text-xs text-white/30">{invoices.length} invoices</p>
        </div>
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider">Current Monthly</p>
          <p className="mt-2 text-3xl font-display text-[#2ADD1B]">${currentMonthly.toLocaleString()}</p>
          <p className="mt-1 text-xs text-white/30">ExpansionLab</p>
        </div>
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider">Next Payment</p>
          <p className="mt-2 text-3xl font-display text-white">{nextPayment}</p>
          <p className="mt-1 text-xs text-white/30">$1,500.00</p>
        </div>
      </div>

      {/* Invoice table — mobile cards, desktop table */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider p-4">Invoice</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider p-4">Date</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider p-4">Description</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider p-4">Amount</th>
                <th className="text-center text-[10px] text-white/30 uppercase tracking-wider p-4">Status</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider p-4">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition">
                  <td className="p-4 text-white/50 font-mono text-xs">{inv.id}</td>
                  <td className="p-4 text-white/50">{inv.date}</td>
                  <td className="p-4 text-white/80">{inv.description}</td>
                  <td className="p-4 text-right text-white font-medium">${inv.amount.toLocaleString()}.00</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <a href="#" className="text-xs text-[#2ADD1B] hover:text-[#2ADD1B]/70 font-medium transition flex items-center justify-end gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-white/[0.03]">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/80">{inv.description}</p>
                  <p className="text-xs text-white/30 mt-0.5">{inv.id} • {inv.date}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyles[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg font-display text-white">${inv.amount.toLocaleString()}.00</p>
                <a href="#" className="text-xs text-[#2ADD1B] font-medium">View Receipt →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
