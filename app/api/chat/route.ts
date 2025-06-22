import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // --- CORRECCIONES Y DEPURACIÓN ---
    // 1. Construcción robusta de la URL de la API
    const baseApiUrl = (process.env.DIFY_API_URL || "https://api.dify.ai/v1").replace(/\/+$/, "");
    const apiUrl = `${baseApiUrl}/chat-messages`;

    // 2. Carga de la clave de API
    const apiKey = process.env.DIFY_API_KEY;

    // 3. Registros para depuración en la terminal
    console.log("--- Intento de conexión a Dify ---");
    console.log("URL de API construida:", apiUrl);
    console.log("¿Clave de API cargada? (DIFY_API_KEY):", !!apiKey);
    // --- FIN DE CORRECCiones ---

    if (!apiKey) {
      console.error("ERROR CRÍTICO: La variable de entorno DIFY_API_KEY no se encontró.");
      return NextResponse.json({ error: "Missing DIFY_API_KEY in server environment" }, { status: 500 });
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: message,
        response_mode: "blocking",
        user: "v0-chat",
        inputs: {
          text: message
        },
      }),
    });

    // Si la respuesta de Dify no es exitosa, muestra más detalles
    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Error desde la API de Dify:", res.status, res.statusText, errorBody);
      return NextResponse.json({ error: `Dify API Error: ${res.statusText}`, details: errorBody }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("[ERROR EN /api/chat]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}