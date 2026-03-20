import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://screening.steven.com";

export async function POST(request: NextRequest) {
  try {
    await request.json(); // consume body

    const supabase = createServerClient();

    // Get all registrations
    const { data: users, error } = await supabase
      .from("registrations")
      .select("first_name, email, magic_token")
      .order("created_at");

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: "No registrations found" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10);

      const results = await Promise.allSettled(
        batch.map((user) => {
          const magicLink = `${APP_URL}?token=${user.magic_token}`;

          return getResend().emails.send({
            from: "BTD Private Screening <screening@steven.com>",
            to: user.email,
            subject: "Your Private Screening Starts Soon",
            html: `
              <div style="background-color: #0a0a0a; color: #f5f5f5; padding: 40px 20px; font-family: Georgia, serif; text-align: center;">
                <p style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px;">
                  BTD Private Screening
                </p>
                <h1 style="font-size: 28px; margin-bottom: 24px; color: #f5f5f5;">
                  ${user.first_name}, we're starting soon.
                </h1>
                <p style="color: #999; font-size: 16px; margin-bottom: 32px;">
                  Tap below to join the screening. Your personal link is ready.
                </p>
                <a href="${magicLink}" style="display: inline-block; background-color: #e91e8c; color: white; padding: 16px 40px; border-radius: 999px; text-decoration: none; font-size: 16px; font-family: sans-serif; font-weight: 600;">
                  Enter Screening
                </a>
                <p style="color: #666; font-size: 12px; margin-top: 32px;">
                  This link is personal to you. Do not share it.
                </p>
              </div>
            `,
          });
        })
      );

      results.forEach((r) => {
        if (r.status === "fulfilled") sent++;
        else failed++;
      });

      // Brief pause between batches
      if (i + 10 < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ sent, failed, total: users.length });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
