import { motion } from "framer-motion"
import { Bot } from "lucide-react"
import type { ChatMessage } from "@/types/football"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-end gap-2.5", isUser && "flex-row-reverse")}
    >
      {isUser ? (
        <Avatar alt="You" fallback="YOU" size="sm" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#15803d] text-background">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-br-lg bg-secondary text-background"
            : "rounded-bl-lg bg-surface text-foreground border-hairline",
        )}
      >
        {message.content}
      </div>
    </motion.div>
  )
}

export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2.5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#15803d] text-background">
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-surface px-4 py-3.5 border-hairline">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted animate-typing-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </motion.div>
  )
}
