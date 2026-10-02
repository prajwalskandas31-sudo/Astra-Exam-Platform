"use client";

import { useEffect, useState } from "react";
import { CreditCard, DollarSign, Download, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Filter, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ParentPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/parent/payments");
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/parent/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          paymentMethod: selectedPaymentMethod
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message);
        setPayingInvoice(null);
        fetchPayments();
      } else {
        toast.error("Failed to process payment");
      }
    } catch (err) {
      toast.error("Error connecting to payment gateway");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-xs">Loading fee & payment records...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalFee: 28000, totalPaid: 15000, totalPending: 8500, nextDueDate: "2026-10-25" };
  const invoices = data?.invoices || [];

  const filteredInvoices = invoices.filter((inv: any) => {
    if (filterStatus === "ALL") return true;
    return inv.status === filterStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Fee Payments & Financial Oversight</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track tuition fee balances, upcoming due dates, payment receipts, and pay online securely.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Academic Fee</p>
          <p className="text-3xl font-black text-white mt-1">₹{summary.totalFee.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1">Session 2026-2027</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Amount Paid</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">₹{summary.totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">✓ Receipts Verified</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Pending Balance</p>
          <p className="text-3xl font-black text-rose-300 mt-1">₹{summary.totalPending.toLocaleString()}</p>
          <p className="text-[10px] text-rose-400 mt-1">Due Date: {summary.nextDueDate}</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Upcoming Scheduled</p>
          <p className="text-3xl font-black text-amber-300 mt-1">₹{(summary.upcomingScheduled || 4500).toLocaleString()}</p>
          <p className="text-[10px] text-amber-400/80 mt-1">Term 3 Installment</p>
        </div>

      </div>

      {/* Payment Reminder Notice Banner */}
      {summary.totalPending > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/60 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Payment Reminder: Term 2 Online CBT Fee Due</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pending amount of <strong>₹{summary.totalPending.toLocaleString()}</strong> is due on <strong>{summary.nextDueDate}</strong>. Pay now to avoid uninterrupted access to mock exams.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setPayingInvoice(invoices.find((i: any) => i.status === "PENDING") || invoices[0])}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-emerald-600/30 shrink-0"
          >
            💳 Pay ₹{summary.totalPending.toLocaleString()} Now
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filter Payment Invoices:</span>
        </div>

        <div className="flex gap-2">
          {["ALL", "PAID", "PENDING", "SCHEDULED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                filterStatus === status
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Catalog */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Fee Invoices & Payment Statements ({filteredInvoices.length})
        </h2>

        <div className="space-y-4">
          {filteredInvoices.map((inv: any) => (
            <div 
              key={inv.id}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {inv.id}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                    inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    inv.status === 'PENDING' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mt-1">{inv.title}</h3>
                <p className="text-xs text-slate-400">
                  Student: <strong className="text-slate-200">{inv.studentName}</strong> • Due Date: {inv.dueDate}
                </p>

                {inv.paymentDate && (
                  <p className="text-[11px] text-emerald-400">
                    Paid on {inv.paymentDate} via {inv.paymentMethod} (Txn ID: {inv.transactionId})
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xl font-black text-white">₹{inv.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{inv.status === 'PAID' ? 'Settled' : 'Outstanding'}</p>
                </div>

                {inv.status === 'PENDING' ? (
                  <Button
                    onClick={() => setPayingInvoice(inv)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 rounded-xl text-xs shadow-lg shadow-emerald-600/30"
                  >
                    Pay Now
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-10 px-3 rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Receipt PDF
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAYMENT GATEWAY MODAL SIMULATION */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Secure Online Fee Payment
                </h3>
                <p className="text-[11px] text-slate-400">{payingInvoice.id} • {payingInvoice.title}</p>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Amount Payable</span>
                <p className="text-2xl font-black text-emerald-300">₹{payingInvoice.amount.toLocaleString()}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded uppercase">
                Instant Confirmation
              </span>
            </div>

            <form onSubmit={handlePayNow} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {["UPI", "CREDIT_CARD", "NET_BANKING"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        selectedPaymentMethod === method
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {method.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMethod === "UPI" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase block">UPI ID / VPA</label>
                  <input
                    type="text"
                    placeholder="e.g. parent@okaxis / 9876543210@paytm"
                    defaultValue="parent@okicici"
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayingInvoice(null)}
                  className="border-white/10 text-xs text-slate-300 h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-emerald-600/30"
                >
                  {processing ? "Authorizing..." : `Confirm Payment (₹${payingInvoice.amount.toLocaleString()})`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
