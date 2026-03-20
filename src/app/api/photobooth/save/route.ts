import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { authenticateToken, getActiveSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { magic_token, image_data } = await request.json();

    const user = await authenticateToken(magic_token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await getActiveSession();
    if (!session) return NextResponse.json({ error: "No active session" }, { status: 400 });

    const supabase = createServerClient();

    // In production, you'd upload to Supabase Storage and get a URL
    // For now, store the data URL reference
    const { error } = await supabase.from("photobooth_entries").insert({
      registration_id: user.id,
      session_id: session.id,
      image_url: image_data.substring(0, 200) + "...", // Placeholder — use Storage in prod
      shared_to: null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
