import { useEffect, useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Bot, SendHorizontal, Sparkles } from "lucide-react"
import type { ChatMessage } from "@/types/football"
import { ChatBubble, TypingBubble } from "@/components/assistant/ChatBubble"
import { Button } from "@/components/ui/Button"

const SUGGESTIONS = [
  "Who won El Clásico?",
  "Show Premier League results",
  "What matches were played yesterday?",
  "How many goals did Haaland score?",
]

function WelcomeCard({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#15803d] text-background shadow-[0_16px_40px_-16px_rgba(34,197,94,0.8)]">
        <Bot className="h-8 w-8" />
      </span>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
          Ask anything about football
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
          Scores, results, fixtures and player stats — just ask in plain language and the
          assistant will find the answer.
        </p>
      </div>

      <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group flex items-center gap-2.5 rounded-2xl bg-card/80 px-4 py-3.5 text-left text-sm text-foreground border-hairline transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-card"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-pretty">{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isTyping])

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // UI-only placeholder. Real answers come from POST /ai/ask via aiService.
    typingTimer.current = setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm the football assistant interface. Connect the backend AI endpoint (POST /ai/ask) and your answers will stream in right here.",
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, reply])
      setIsTyping(false)
    }, 1400)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      send(input)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 8rem)" }}>
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeCard onPick={send} />
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {isTyping && <TypingBubble />}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-20 z-20 mt-4 md:bottom-4">
        {hasMessages && (
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full bg-surface/60 px-3.5 py-2 text-xs font-medium text-muted border-hairline transition-colors hover:bg-surface hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="glass flex items-center gap-2 rounded-full p-2 pl-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about scores, fixtures, players…"
            aria-label="Message the football assistant"
            className="h-10 w-full bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <SendHorizontal className="h-[18px] w-[18px]" />
          </Button>
        </form>
      </div>
    </div>
  )
}
