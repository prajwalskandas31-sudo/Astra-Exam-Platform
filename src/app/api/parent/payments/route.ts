import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = [
      {
        id: "INV-2026-001",
        title: "Annual CBT Exam Platform & Mock Test Series Fee (2026-27)",
        studentName: session.user.name ? `${session.user.name.split(" ")[0]}'s Child` : "Rahul Sharma",
        dueDate: "2026-10-15",
        amount: 15000,
        paidAmount: 15000,
        status: "PAID",
        paymentDate: "2026-09-01",
        paymentMethod: "UPI (Google Pay)",
        transactionId: "TXN98421038"
      },
      {
        id: "INV-2026-002",
        title: "Term 2 Intensive Mock Test Pack & Proctored Remote Access",
        studentName: session.user.name ? `${session.user.name.split(" ")[0]}'s Child` : "Rahul Sharma",
        dueDate: "2026-10-25",
        amount: 8500,
        paidAmount: 0,
        status: "PENDING",
        paymentDate: null,
        paymentMethod: null,
        transactionId: null
      },
      {
        id: "INV-2026-003",
        title: "AFCAT & GATE Special Exam Prep Extension Pack",
        studentName: session.user.name ? `${session.user.name.split(" ")[0]}'s Child` : "Rahul Sharma",
        dueDate: "2026-11-10",
        amount: 4500,
        paidAmount: 0,
        status: "SCHEDULED",
        paymentDate: null,
        paymentMethod: null,
        transactionId: null
      }
    ];

    const summary = {
      totalFee: 28000,
      totalPaid: 15000,
      totalPending: 8500,
      upcomingScheduled: 4500,
      nextDueDate: "2026-10-25"
    };

    return NextResponse.json({ summary, invoices });
  } catch (error) {
    console.error("[PARENT_PAYMENTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId, paymentMethod = "UPI" } = await req.json();

    return NextResponse.json({
      success: true,
      message: `Payment of ₹8,500 for ${invoiceId} processed successfully via ${paymentMethod}!`,
      transactionId: `TXN${Math.floor(10000000 + Math.random() * 90000000)}`
    });
  } catch (error) {
    console.error("[PARENT_PAYMENTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}


