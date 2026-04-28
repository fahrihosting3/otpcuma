import { NextRequest, NextResponse } from "next/server";
import { getFile, writeFile } from "@/lib/githubDB";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    // Cek apakah email sudah terdaftar di index
    const index = await getFile("users/index.json");
    const users: Record<string, string> = index?.content ?? {};

    if (users[email]) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    // Buat user baru
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      profile: {
        avatar: null,
        bio: "",
      },
      settings: {
        notifications: true,
        theme: "retro",
      },
    };

    // 1. Simpan file user individual: users/{userId}.json
    await writeFile(`users/${userId}.json`, userData);

    // 2. Update index email -> userId
    users[email] = userId;
    await writeFile("users/index.json", users, index?.sha);

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
