import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://screening.steven.com";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Look up registration by email
    const { data: user, error } = await supabase
      .from("registrations")
      .select("first_name, magic_token, email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !user) {
      // Don't reveal whether email exists
      return NextResponse.json({ success: true });
    }

    const magicLink = `${APP_URL}?token=${user.magic_token}`;

    await resend.emails.send({
      from: "BTD Private Screening <screening@steven.com>",
      to: user.email,
      subject: "Your Private Screening Link",
      html: `
        <div style="background-color: #0a0a0a; color: #f5f5f5; padding: 40px 20px; font-family: Georgia, serif; text-align: center;">
          <p style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px;">
            BTD Private Screening
          </p>
          <h1 style="font-size: 28px; margin-bottom: 24px; color: #f5f5f5;">
            Hey ${user.first_name}, you're in.
          </h1>
          <p style="color: #999; font-size: 16px; margin-bottom: 32px;">
            Your personal screening link is ready. Tap below to join.
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
