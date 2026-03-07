"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type ConversationSummary = {
  id: string
  updatedAt: string
  otherUser: {
    id: string
    name: string | null
    preferredName: string | null
    email: string
    image: string | null
    department: string | null
    position: string | null
  }
  latestMessage: {
    id: string
    body: string
    createdAt: string
    senderId: string
  } | null
  hasUnread: boolean
}

type ConversationMessage = {
  id: string
  body: string
  createdAt: string
  senderId: string
  sender: {
    id: string
    name: string | null
    preferredName: string | null
    email: string
  }
}

type ConversationDetail = {
  id: string
  otherUser: {
    id: string
    name: string | null
    preferredName: string | null
    email: string
    image: string | null
    department: string | null
    position: string | null
  } | null
}

export default function MessagesInbox({ currentUserId }: { currentUserId: string }) {
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get("userId")

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageBody, setMessageBody] = useState("")
  const [error, setError] = useState("")

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load conversations")

      const data = await res.json()
      const nextConversations = data.conversations as ConversationSummary[]
      setConversations(nextConversations)

      if (!selectedConversationId && nextConversations.length > 0 && !targetUserId) {
        setSelectedConversationId(nextConversations[0].id)
      }
    } catch {
      setError("Failed to load conversations")
    } finally {
      setLoadingList(false)
    }
  }, [selectedConversationId, targetUserId])

  const fetchThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true)
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}/messages`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load messages")

      const data = await res.json()
      setConversation(data.conversation as ConversationDetail)
      setMessages(data.messages as ConversationMessage[])
      setConversations((prev: ConversationSummary[]) =>
        prev.map((item: ConversationSummary) =>
          item.id === conversationId ? { ...item, hasUnread: false } : item
        )
      )
    } catch {
      setError("Failed to load messages")
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel(`user-inbox:${currentUserId}`, {
      config: { private: true },
    })

    channel
      .on("broadcast", { event: "message.created" }, (payload: { payload: { conversationId: string; message: ConversationMessage } }) => {
        const eventPayload = payload.payload as {
          conversationId: string
          message: ConversationMessage
        }

        void fetchConversations()

        if (eventPayload.conversationId === selectedConversationId) {
          setMessages((prev: ConversationMessage[]) =>
            prev.some((message: ConversationMessage) => message.id === eventPayload.message.id)
              ? prev
              : [...prev, eventPayload.message]
          )
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      setConversation(null)
      setMessages([])
      return
    }

    void fetchThread(selectedConversationId)
  }, [fetchThread, selectedConversationId])

  useEffect(() => {
    if (!targetUserId || targetUserId === currentUserId) return

    let isMounted = true

    const openDirectConversation = async () => {
      try {
        const res = await fetch("/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        })
        if (!res.ok) throw new Error("Failed to open conversation")

        const data = await res.json()
        if (isMounted) {
          setSelectedConversationId(data.conversationId as string)
          void fetchConversations()
        }
      } catch {
        if (isMounted) setError("Failed to open conversation")
      }
    }

    void openDirectConversation()
    return () => { isMounted = false }
  }, [currentUserId, fetchConversations, targetUserId])

  const handleSend = async () => {
    if (!selectedConversationId || !messageBody.trim()) return

    setSending(true)
    setError("")
    try {
      const res = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody }),
      })
      if (!res.ok) throw new Error("Failed to send message")

      const data = await res.json()
      const nextMessage = data.message as ConversationMessage

      setMessages((prev: ConversationMessage[]) => [...prev, nextMessage])
      setConversations((prev: ConversationSummary[]) =>
        prev
          .map((item: ConversationSummary) =>
            item.id === selectedConversationId
              ? {
                  ...item,
                  updatedAt: nextMessage.createdAt,
                  latestMessage: {
                    id: nextMessage.id,
                    body: nextMessage.body,
                    createdAt: nextMessage.createdAt,
                    senderId: nextMessage.senderId,
                  },
                  hasUnread: false,
                }
              : item
          )
          .sort((a: ConversationSummary, b: ConversationSummary) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      )
      setMessageBody("")
    } catch {
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="panel-soft mb-6 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-gray-900">Messages</h1>
        <p className="mt-2 text-sm text-gray-600">Direct staff messaging inside the portal.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <p className="mt-1 text-xs text-gray-500">{conversations.length} conversation(s)</p>
          </div>

          {loadingList ? (
            <p className="px-5 py-6 text-sm text-gray-500">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-500">
              No conversations yet. Start one from the <Link href="/directory" className="text-brand-brown hover:text-brand-brown-light">directory</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {conversations.map((item: ConversationSummary) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(item.id)}
                    className={`w-full px-5 py-4 text-left ${selectedConversationId === item.id ? "bg-[#fff8e8]" : "hover:bg-[#f8fbff]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.otherUser.preferredName || item.otherUser.name || item.otherUser.email}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {item.otherUser.position || "No title"} • {item.otherUser.department || "No department"}
                        </p>
                        <p className="mt-2 truncate text-sm text-gray-600">
                          {item.latestMessage?.body || "No messages yet"}
                        </p>
                      </div>
                      <div className="text-right">
                        {item.hasUnread && (
                          <span className="inline-flex rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-semibold text-brand-brown">
                            Unread
                          </span>
                        )}
                        <p className="mt-2 text-[11px] text-gray-400">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel flex min-h-[520px] flex-col overflow-hidden">
          {selectedConversationId && conversation ? (
            <>
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {conversation.otherUser?.preferredName || conversation.otherUser?.name || conversation.otherUser?.email}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {conversation.otherUser?.position || "No title"} • {conversation.otherUser?.department || "No department"}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#fcfcfd] px-5 py-4">
                {loadingThread ? (
                  <p className="text-sm text-gray-500">Loading messages...</p>
                ) : messages.length > 0 ? (
                  messages.map((message: ConversationMessage) => {
                    const isMine = message.senderId === currentUserId
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${isMine ? "bg-brand-gold text-brand-brown" : "bg-white text-gray-800 border border-gray-200"}`}>
                          <p>{message.body}</p>
                          <p className={`mt-2 text-[11px] ${isMine ? "text-brand-brown/80" : "text-gray-400"}`}>
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
                )}
              </div>

              <div className="border-t border-gray-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Write a message..."
                    className="min-h-[96px] flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !messageBody.trim()}
                    className="rounded-xl border border-[#e3bc68] bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-brown disabled:opacity-60"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
              Select a conversation from the inbox or start one from the directory.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
