// app/api/orders/history/route.ts
// API untuk mendapatkan semua order history user

import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/githubDB";

const PENDING_ORDERS_FILE = "data/pending_orders.json";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Ambil semua orders (termasuk yang sudah selesai)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");

    const file = await getFile(PENDING_ORDERS_FILE);
    let orders = file?.content?.orders || [];

    // Filter by user jika ada parameter
    if (userEmail) {
      orders = orders.filter((o: any) => o.userEmail === userEmail);
    }

    // Sort by newest first
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Return with no-cache headers
    return NextResponse.json(
      { success: true, data: orders, count: orders.length },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Error getting order history:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
