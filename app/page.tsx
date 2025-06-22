"use client"

import type React from "react"
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function MinimalAIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false) // Indica si una animación de escritura está en curso

  /** refs y scroll */
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  // Usaremos un único ref para el elemento "fantasma" al final del chat
  const chatEndRef = useRef<HTMLDivElement>(null)

  const bottomOffset = 150 // altura del textbox + margen (esto ya no será tan crítico con scrollIntoView)

  /** estado auxiliar para el streaming del asistente */
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  /* ────────────────────── 1. Gestión del scroll (Simplificada) ────────────────────── */

  // Este efecto se encargará de todo el auto-scroll.
useLayoutEffect(() => {
  if (chatEndRef.current) {
    // Cambiamos block: "end" a block: "start" o "center"
    // "start" intentará colocar el inicio del elemento al inicio del contenedor visible.
    // "center" intentará centrarlo.
    // Con un padding-bottom generoso, "start" suele funcionar mejor para asegurar visibilidad superior.
    chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [messages.length, messages.find(m => m.id === streamingMessageId)?.content]);


  /* ────────────────────── 2. Lógica de mensajes  ───────────────────── */

  /** Animar respuesta char a char */
  const animateMessage = (content: string, messageId: string) => {
    setIsAnimating(true);
    setIsTyping(true);
    setStreamingMessageId(messageId); // Identificamos qué mensaje se está animando

    const lines = content.split("\n");
    let lineIdx = 0;
    let charIdx = 0;
    let animated = "";

    const step = () => {
      if (lineIdx < lines.length) {
        const line = lines[lineIdx];

        if (charIdx < line.length) {
          animated += line[charIdx];
          charIdx++;
        } else {
          animated += "\n";
          lineIdx++;
          charIdx = 0;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: animated } : m,
          ),
        );

        // Se programa el siguiente paso de la animación
        setTimeout(step, (Math.random() * 7.5 + 5) / 2);
      } else {
        // Al finalizar la animación
        setIsTyping(false);
        setIsAnimating(false);
        setStreamingMessageId(null); // No hay mensaje en streaming
        // El useLayoutEffect ya se encargará del scroll final.
      }
    };
    step();
  };

  /** Envío de la pregunta */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Resetear estados relacionados con la animación de respuesta anterior
    setIsTyping(false);
    setIsAnimating(false);
    setStreamingMessageId(null); // Asegurarse de que no hay un ID de streaming activo

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.toUpperCase(),
    };
    const assistantId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" }, // Añadir el mensaje de asistente vacío
    ]);
    setInput("");
    // setIsTyping se activa dentro de animateMessage

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const answer =
        data.answer ||
        data.message ||
        data.choices?.[0]?.message?.content ||
        "";
      animateMessage(answer, assistantId);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      animateMessage("Error obteniendo respuesta.", assistantId);
    }
  };

  /* ────────────────────── 3. Render  ───────────────────── */

  const formatInlineText = (t: string) =>
    t
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>',
      )

  const formatContent = (c: string) =>
    c.split("\n").map((line, i) => {
      if (line.startsWith("### "))
        return (
          <h3 key={i} className="text-lg font-semibold mb-2 mt-4 first:mt-0">
            {line.replace("### ", "")}
          </h3>
        )
      if (line.startsWith("• ")) {
        const txt = line.replace("• ", "")
        return (
          <div key={i} className="flex items-start mb-1">
            <span className="mr-2">•</span>
            <span
              dangerouslySetInnerHTML={{ __html: formatInlineText(txt) }}
            />
          </div>
        )
      }
      if (line.trim() === "") return <br key={i} />
      return (
        <p
          key={i}
          className="mb-2"
          dangerouslySetInnerHTML={{ __html: formatInlineText(line) }}
        />
      )
    })

  return (
    <div className="min-h-screen bg-white">
      <div className="w-[640px] mx-auto h-[90vh] flex flex-col">
        {/* LISTADO MENSAJES */}
        <div
          ref={messagesContainerRef}
          className="flex-1 w-full overflow-y-auto pb-[150px] pt-[100px] relative"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {messages.map((m, idx) => (
            <div key={m.id} className="text-left ml-[60px] relative">
              {m.role === "user" ? (
                <>
                  <div className="absolute -left-[40px] top-1 w-3 h-3 bg-black rounded-full" />
                  <div className="text-[#404040] font-medium text-lg max-w-[440px]">
                    {m.content}
                  </div>
                </>
              ) : (
                <div className="text-[#404040] text-xs max-w-[440px]">
                  {formatContent(m.content)}
                  {/* El cursor parpadeante debe aparecer inmediatamente en el mensaje del asistente vacío o mientras se anima */}
                  {(
                    (m.content === "" && idx === messages.length - 1 && m.role === "assistant") ||
                    (isTyping && m.id === streamingMessageId)
                  ) && (
                    <span
                      ref={m.id === streamingMessageId ? chatEndRef : null}
                      className="inline-block align-middle bg-[#404040] animate-pulse"
                      style={{ width: '8px', height: '20px', animationDuration: '1s' }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Elemento fantasma al final del chat para el scroll, solo si no hay un cursor parpadeante activo */}
          {(!isTyping || messages[messages.length - 1]?.id !== streamingMessageId) && (
             <div ref={chatEndRef} className="h-0 w-0" />
          )}

        </div>
      </div>

      {/* TEXTBOX (sin cambios) */}
      <div className="fixed bottom-0 left-0 w-full z-10">
        <div className="w-[600px] mx-auto mb-20">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center w-full border-2 border-[#404040] rounded-full p-1 pr-1.5 bg-white">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta lo que necesitas, encuentra lo que buscas."
                className="flex-1 bg-transparent px-5 py-2 focus:outline-none text-base placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  input.trim()
                    ? "bg-[#404040] text-white hover:bg-black"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}