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
  const lastAnswerEndRef = useRef<HTMLDivElement>(null)
  // const prevScrollTop = useRef(0) // Esta variable no se está usando, se puede eliminar si no es necesaria.

  const bottomOffset = 150 // altura del textbox + margen

  /** estado auxiliar para el streaming del asistente */
  const [lastAssistantContent, setLastAssistantContent] = useState({
    content: "",
    messageId: "",
    isStreaming: false,
  })

  /* ────────────────────── 1. Gestión del scroll ────────────────────── */

  /** Función central: hace scroll al fondo siempre que autoScroll === true */
  const scrollToBottom = () => {
    const c = messagesContainerRef.current
    if (!c) return
    c.scrollTo({ top: c.scrollHeight, behavior: "smooth" })
  }

  /** Siempre que entra un mensaje nuevo (ej. mensaje de usuario) → intentar auto-scroll */
  // Este useEffect debe dispararse cuando la lista de mensajes cambia, para asegurar
  // que el nuevo mensaje del usuario haga scroll al final.
  useLayoutEffect(() => {
    // Solo hacemos scroll al añadir un nuevo mensaje si no estamos en medio de una animación
    // o si el mensaje es del usuario. Esto evita scrolls indeseados durante el streaming.
    if (!isAnimating || messages[messages.length - 1]?.role === "user") {
      scrollToBottom();
    }
  }, [messages.length, isAnimating]);


  /** Streaming del último mensaje del asistente */
  // Este useLayoutEffect es clave para el auto-scroll durante el streaming.
  // Debe reaccionar a los cambios en `lastAssistantContent` (el contenido que se va animando)
  // y a `isAnimating` para saber si el scroll debe continuar.
  useLayoutEffect(() => {
    if (!lastAssistantContent.isStreaming) return; // Solo actuar si el streaming está activo

    const container = messagesContainerRef.current;
    const end = lastAnswerEndRef.current;
    if (!container || !end) return;

    // Calcula la posición a la que scrolllear para mantener el cursor visible
    const scrollTo = end.offsetTop - container.offsetTop - bottomOffset;

    // Solo hace scroll si el cursor está fuera de la vista actual (o casi)
    // Se ajusta ligeramente la condición para ser más proactiva.
    if (scrollTo > container.scrollTop - 20) { // Añadimos un pequeño margen
      container.scrollTo({ top: scrollTo, behavior: "smooth" });
    }
  }, [lastAssistantContent.content, lastAssistantContent.isStreaming]); // Depende del contenido para el scroll continuo

  /* ────────────────────── 2. Lógica de mensajes  ───────────────────── */

  // Mantener referencia al último assistant para el streaming
  // Ajustamos este useEffect para que `lastAssistantContent` refleje el estado correcto de streaming.
  useEffect(() => {
    const lastAssistant = messages.find((m) => m.id === lastAssistantContent.messageId);

    if (lastAssistant) {
      setLastAssistantContent((prev) => ({
        ...prev,
        content: lastAssistant.content, // Actualiza el contenido con el del mensaje real
        isStreaming: isAnimating && lastAssistant.id === prev.messageId, // Mantén isStreaming si la animación sigue y es el mismo mensaje
      }));
    } else if (messages.length > 0 && messages[messages.length - 1]?.role === "assistant") {
      // Si no encontramos el mensaje por ID (puede pasar si es el primer asistente),
      // o si es un nuevo mensaje de asistente, actualizamos.
      const newLastAssistant = messages[messages.length - 1];
      setLastAssistantContent({
        content: newLastAssistant.content,
        messageId: newLastAssistant.id,
        isStreaming: isAnimating && newLastAssistant.id === newLastAssistant.id, // isAnimating ya indica si se está animando este.
      });
    } else {
      // Si no hay mensajes o el último no es asistente, resetear
      setLastAssistantContent({ content: "", messageId: "", isStreaming: false });
    }

  }, [messages, isAnimating, lastAssistantContent.messageId]); // Se añadió lastAssistantContent.messageId como dependencia


  /** Animar respuesta char a char */
  const animateMessage = (content: string, messageId: string) => {
    setIsAnimating(true)
    // Establecer isTyping a true al inicio de la animación
    setIsTyping(true);

    // Asegurarse de que el lastAssistantContent se inicializa correctamente para la animación
    setLastAssistantContent({
      content: "", // Se inicializa vacío para que el streaming construya
      messageId: messageId,
      isStreaming: true,
    });


    const lines = content.split("\n")
    let lineIdx = 0
    let charIdx = 0
    let animated = ""

    const step = () => {
      if (lineIdx < lines.length) {
        const line = lines[lineIdx]

        if (charIdx < line.length) {
          animated += line[charIdx]
          charIdx++
        } else {
          animated += "\n"
          lineIdx++
          charIdx = 0
        }

        // Actualiza el mensaje en el estado `messages`
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: animated } : m,
          ),
        )

        // Se actualiza lastAssistantContent aquí para que el useLayoutEffect de scroll reaccione
        setLastAssistantContent(prev => ({
          ...prev,
          content: animated,
        }));

        setTimeout(step, (Math.random() * 7.5 + 5) / 2)
      } else {
        // Al finalizar la animación
        setIsTyping(false)
        setIsAnimating(false)
        setLastAssistantContent(prev => ({ ...prev, isStreaming: false })); // Desactiva el streaming
        // Asegurarse de hacer un último scroll al final del mensaje completo.
        scrollToBottom();
      }
    }
    step()
  }

  /** Envío de la pregunta */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Resetear el estado de la animación y typing antes de una nueva pregunta
    setIsTyping(false); // Asegurarse de que el cursor parpadeante se oculte para la nueva pregunta
    setIsAnimating(false);
    setLastAssistantContent({ content: "", messageId: "", isStreaming: false });


    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.toUpperCase(),
    }
    const assistantId = (Date.now() + 1).toString()

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" }, // Añadir el mensaje de asistente vacío
    ])
    setInput("")
    // setIsTyping(true) // Ya se establece en animateMessage al inicio.

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      const answer =
        data.answer ||
        data.message ||
        data.choices?.[0]?.message?.content ||
        ""
      animateMessage(answer, assistantId)
    } catch (error) { // Capturar el error para depuración
      console.error("Error fetching AI response:", error);
      animateMessage("Error obteniendo respuesta.", assistantId)
    }
  }

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
                  {/* El cursor parpadeante ahora depende de isTyping y si es el último mensaje del asistente siendo animado */}
                  {isTyping && m.id === lastAssistantContent.messageId && (
                    <span
                      ref={lastAnswerEndRef}
                      className="inline-block align-middle bg-[#404040] animate-pulse"
                      style={{ width: '8px', height: '20px', animationDuration: '1s' }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Puedes eliminar este bloque si no se usa para nada */}
          {isTyping && (
            null
          )}
        </div>
      </div>

      {/* TEXTBOX */}
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