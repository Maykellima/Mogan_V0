import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

const apiKey = process.env.DIFY_API_KEY;
const apiUrl = process.env.DIFY_API_URL ?? "https://api.dify.ai/v1/chat/completions";

    if (!apiKey) {
      return NextResponse.json({ error: "Missing DIFY_API_KEY" }, { status: 500 });
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
