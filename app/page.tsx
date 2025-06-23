"use client"

import type React from "react"
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react"
import ReactMarkdown from 'react-markdown'

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
  const chatEndRef = useRef<HTMLDivElement>(null)

  // bottomOffset ya no es tan crítico con scrollIntoView, pero lo mantenemos como referencia
  const bottomOffset = 150

  /** estado auxiliar para el streaming del asistente */
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  /* ────────────────────── 1. Gestión del scroll (Simplificada) ────────────────────── */

  // Este efecto se encargará de todo el auto-scroll.
  useLayoutEffect(() => {
    if (chatEndRef.current) {
      // Ajustado a 'end' de nuevo para trabajar mejor con el espacio fijo de `chatEndRef` al final
      // Esto asegura que el final del espaciador sea visible, empujando el contenido hacia arriba.
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
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

  const formatContent = (content: string) => {
    // Reemplazar los encabezados #### por h2 y h3 y dar formato a las listas
    const formattedContent = content
      .replace(/#### (.*?)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/### (.*?)$/gm, '<h3 class="text-base font-medium mt-3 mb-2">$1</h3>')
      .replace(/^• (.*?)$/gm, '<div class="flex items-start mb-1"><span class="mr-2">•</span><span>$1</span></div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>'
      );

    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  // Componente para renderizar mensajes con estilos personalizados
  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold mt-8 mb-[1opx] tracking-wide">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-8 mb-[10px] tracking-wide">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-8 mb-[10px] tracking-wide">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 tracking-wide leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 space-y-2 tracking-wide list-disc list-inside">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 space-y-2 tracking-wide list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => {
          // Si el contenido es solo un punto o está vacío, no renderizar la viñeta
          const text = Array.isArray(children) ? children.join("") : children;
          if (typeof text === "string" && text.trim() === "•") return null;
          if (typeof text === "string" && text.trim() === "") return null;
          return <li>{children}</li>;
        },
        code: ({ children }) => (
          <code className="bg-gray-100 px-1 rounded tracking-wide">{children}</code>
        ),
        a: ({ href, children }) => (
          <a 
            href={href}
            className="text-blue-600 hover:text-blue-800 underline tracking-wide"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Contenedor principal del chat */}
      {/* En móviles (sin prefijo), ocupa todo el ancho y alto del viewport. */}
      {/* En pantallas 'md' (768px y más), el ancho se fija a 640px y se centra. */}
      <div className="flex flex-col h-screen md:h-[90vh] w-full md:w-[640px] mx-auto">
        {/* LISTADO MENSAJES */}
        {/* En móviles, el padding-bottom debe ser suficiente para el textbox. */}
        <div
          ref={messagesContainerRef}
          className="flex-1 w-full overflow-y-auto pb-[150px] pt-[100px] relative pl-5 md:pl-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {messages.map((m, idx) => (
            <div key={m.id} className="text-left ml-4 md:ml-[60px] relative">
              {m.role === "user" ? (
                <div className="flex items-baseline">
                  <div className="w-3 h-3 bg-black rounded-full mr-[5px] md:mr-[10px] mt-[2px]" />
                  <div className="text-[#404040] font-medium text-base md:text-lg max-w-[calc(100%-20px)] md:max-w-[440px] tracking-wide">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="text-[#404040] text-sm max-w-[calc(100%-20px)] md:max-w-[440px]">
                  <MarkdownContent content={m.content} />
                  {((m.content === "" && idx === messages.length - 1 && m.role === "assistant") ||
                    (isTyping && m.id === streamingMessageId)) && (
                    <span
                      className="inline-block align-middle bg-[#404040] animate-pulse"
                      style={{ width: '8px', height: '20px', animationDuration: '1s' }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Elemento espaciador al final del chat. Su `height` empuja el contenido hacia arriba. */}
          {/* Su `ref` siempre recibe el `chatEndRef`. */}
          {/* Ajusta la altura para que el cursor siempre quede por encima del textbox. */}
          {/* Un valor de 100px a 150px suele ser bueno, dependiendo de la altura de tu textbox. */}
          <div ref={chatEndRef} className="h-[100px] w-0" />
          {/* Nota: Eliminé la lógica condicional que asignaba el ref al cursor o a este div.
               Ahora el ref siempre va a este div, y el useLayoutEffect siempre scrollea a este div,
               asegurando el espacio inferior. El cursor simplemente es parte del contenido. */}

        </div>
      </div>

      {/* TEXTBOX */}
      {/* En móviles, el textbox debe ocupar todo el ancho y tener un padding lateral. */}
      <div className="fixed bottom-0 left-0 w-full z-10 p-4 md:p-0"> {/* p-4 para móviles (16px de padding), md:p-0 lo quita en desktop */}
        {/* w-full en móviles, md:w-[600px] en desktop. */}
        {/* mb-4 para móviles (margen inferior reducido), md:mb-20 para desktop. */}
        <div className="w-full md:w-[600px] mx-auto mb-4 md:mb-20">
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