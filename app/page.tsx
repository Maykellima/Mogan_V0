"use client"

import type React from "react"

import { useState } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}


export default function MinimalAIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

// Simular carga inicial de mensajes
useEffect(() => {
  const timer = setTimeout(() => {
    if (currentMessageIndex < simulatedMessages.length) {
      const currentMessage = simulatedMessages[currentMessageIndex]

      if (currentMessage.role === "user") {
        // Mostrar mensaje del usuario inmediatamente
        setMessages((prev) => [...prev, currentMessage])
        setCurrentMessageIndex((prev) => prev + 1)
      } else {
        // Mostrar mensaje del usuario primero, luego animar la respuesta
        setMessages((prev) => [...prev, { ...currentMessage, content: "" }])
        setIsTyping(true)
        animateMessage(currentMessage.content, currentMessage.id, true)
      }
    }
  }, currentMessageIndex === 0 ? 1000 : 2000)

  return () => clearTimeout(timer)
}, [currentMessageIndex])

const animateMessage = (
  content: string,
  messageId: string,
  advance: boolean = false,
) => {
  // aquí va la lógica de animación...
}
  ) => {
    const lines = content.split("\n")
    let currentLineIndex = 0
    let currentCharIndex = 0
    let animatedContent = ""

    const animateNextChar = () => {
      if (currentLineIndex < lines.length) {
        const currentLine = lines[currentLineIndex]

        if (currentCharIndex < currentLine.length) {
          animatedContent += currentLine[currentCharIndex]
          currentCharIndex++
        } else {
          // Línea completada, pasar a la siguiente
          animatedContent += "\n"
          currentLineIndex++
          currentCharIndex = 0
        }

        // Actualizar el mensaje en el estado
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, content: animatedContent } : msg)))

        // Continuar animación
        setTimeout(animateNextChar, Math.random() * 7.5 + 5)
      } else {
        // Animación completada
        setIsTyping(false)
if (advance) {
  setTimeout(() => {
    setCurrentMessageIndex((prev) => prev + 1)
  }, 1000)
}

    animateNextChar()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.toUpperCase(),
    }

    const assistantId = (Date.now() + 1).toString()

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      const data = await res.json()
      const answer = data.answer || data.message || data.choices?.[0]?.message?.content || ""
      animateMessage(answer, assistantId)
    } catch (error) {
      animateMessage("Error obteniendo respuesta.", assistantId)
    }
  }

  const formatContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      // Títulos h3
      if (line.startsWith("### ")) {
        return (
          <h3 key={index} className="text-lg font-semibold mb-2 mt-4 first:mt-0">
            {line.replace("### ", "")}
          </h3>
        )
      }

      // Lista con bullet points
      if (line.startsWith("• ")) {
        const text = line.replace("• ", "")
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="mr-2">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(text) }} />
          </div>
        )
      }

      // Líneas vacías
      if (line.trim() === "") {
        return <br key={index} />
      }

      // Texto normal
      return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: formatInlineText(line) }} />
    })
  }

  const formatInlineText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(
        /\[([^\]]+)\]$$([^)]+)$$/g,
        '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>',
      )
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-[640px] py-8">
        {/* Zona de mensajes */}
        <div className="mb-6 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="text-left ml-[60px] relative">
              {message.role === "user" ? (
                <>
                  <div className="absolute -left-[40px] top-1 w-3 h-3 bg-black rounded-full"></div>
                  <div className="text-[#404040] font-medium text-lg max-w-[440px]">{message.content}</div>
                </>
              ) : (
                <div className="text-[#404040] text-xs max-w-[440px]">{formatContent(message.content)}</div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="text-[#666666] ml-[60px]">
              <span className="inline-block w-2 h-5 bg-[#404040] animate-pulse"></span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta lo que necesitas, encuentra lo que buscas."
            className="w-[600px] px-6 py-4 pr-16 border-2 border-[#404040] rounded-full focus:outline-none focus:border-[#404040] text-base"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              input.trim() ? "bg-[#404040] text-white hover:bg-black" : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
        </form>
      </div>
    </div>
  )
}
