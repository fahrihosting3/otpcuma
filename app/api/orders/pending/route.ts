// app/api/orders/pending/route.ts
// API untuk manage pending orders menggunakan GitHub sebagai database

import { NextRequest, NextResponse } from "next/server";
import { getFile, writeFile } from "@/lib/githubDB";

const PENDING_ORDERS_FILE = "data/pending_orders.json";

export interface PendingOrder {
  orderId: string;
  userEmail: string;
  phoneNumber: string;
  serviceName: string;
  serviceCode: string;
  countryName: string;
  countryCode: string;
  sellingPrice: number;
  originalPrice: number;
  profit: number;
  status: "pending" | "success" | "expired" | "cancel";
  otpCode?: string;
  createdAt: string;
  expiredAt: number;
}

// GET - Ambil semua pending orders atau filter by user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");

    const file = await getFile(PENDING_ORDERS_FILE);
    let orders: PendingOrder[] = file?.content?.orders || [];

    // Filter by user jika ada parameter
    if (userEmail) {
      orders = orders.filter((o) => o.userEmail === userEmail && o.status === "pending");
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error("Error getting pending orders:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tambah pending order baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      userEmail,
      phoneNumber,
      serviceName,
      serviceCode,
      countryName,
      countryCode,
      sellingPrice,
      originalPrice,
      profit,
    } = body;

    if (!orderId || !userEmail || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get existing file or create new
    const file = await getFile(PENDING_ORDERS_FILE);
    const orders: PendingOrder[] = file?.content?.orders || [];

    const now = new Date();
    const newOrder: PendingOrder = {
      orderId,
      userEmail,
      phoneNumber,
      serviceName: serviceName || "",
      serviceCode: serviceCode || "",
      countryName: countryName || "",
      countryCode: countryCode || "",
      sellingPrice: sellingPrice || 0,
      originalPrice: originalPrice || 0,
      profit: profit || 0,
      status: "pending",
      createdAt: now.toISOString(),
      expiredAt: now.getTime() + 20 * 60 * 1000, // 20 minutes
    };

    orders.push(newOrder);

    // Save to GitHub
    await writeFile(
      PENDING_ORDERS_FILE,
      { orders, updatedAt: now.toISOString() },
      file?.sha
    );

    return NextResponse.json({ success: true, data: newOrder });
  } catch (error: any) {
    console.error("Error creating pending order:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update pending order (status, OTP, etc)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, otpCode } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    const file = await getFile(PENDING_ORDERS_FILE);
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No orders found" },
        { status: 404 }
      );
    }

    const orders: PendingOrder[] = file.content.orders || [];
    const orderIndex = orders.findIndex((o) => o.orderId === orderId);

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Update order
    if (status) orders[orderIndex].status = status;
    if (otpCode) orders[orderIndex].otpCode = otpCode;

    // Save to GitHub
    await writeFile(
      PENDING_ORDERS_FILE,
      { orders, updatedAt: new Date().toISOString() },
      file.sha
    );

    return NextResponse.json({ success: true, data: orders[orderIndex] });
  } catch (error: any) {
    console.error("Error updating pending order:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
