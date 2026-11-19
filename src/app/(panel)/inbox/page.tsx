"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  CalendarPlus,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  Plus,
  Search,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
} from "lucide-react";
import { formatPhoneDisplay, formatTimeTR, isWithin24Hours } from "@/lib/utils";
import { HelpBubble } from "@/components/HelpBubble";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { CustomScroll } from "@/components/CustomScroll";

interface TeamMember {
  id: string;
  role: string;
  colorHex?: string;
  user: { name: string; email: string };
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: "TEXT" | "TEMPLATE" | "SYSTEM";
  body: string;
  status: string;
  isDemo: boolean;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  status: string;
  lastMessageAt: string;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  isDemo: boolean;
  assignedMembershipId: string | null;
  contact: { id: string; name: string; phoneE164: string };
  assignedMembership: { id: string; user: { name: string } } | null;
  messages: Message[];
}

const QUICK_REPLIES = [
  "Merhaba, size nasıl yardımcı olabilirim?",
  "Uygun saatlerimizi kontrol edip hemen dönüyorum.",
  "Randevunuz oluşturuldu, görüşmek üzere!",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "M";
}

export default function InboxPage() {
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [within24h, setWithin24h] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showBookingPanel, setShowBookingPanel] = useState(true);
  const [mobileShowBooking, setMobileShowBooking] = useState(false);
  const [userRole, setUserRole] = useState<string>("OWNER");
  const [currentMembershipId, setCurrentMembershipId] = useState<string>("");
  const [integrationMode, setIntegrationMode] = useState<"DEMO" | "LIVE">("DEMO");

  // Quick appointment form state
  const [apptTitle, setApptTitle] = useState("Ön Görüşme Randevusu");
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [apptTime, setApptTime] = useState("10:00");
  const [apptMemberId, setApptMemberId] = useState("");
  const [creatingAppt, setCreatingAppt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?filter=${filter}`);
    if (!res.ok) return;
    const data = await res.json();
    const convs = (data.conversations ?? []) as ConversationSummary[];
    setConversations(convs);

    if (Array.isArray(data.memberships)) {
      setMembers(data.memberships);
      setApptMemberId((prev) => {
        if (data.role === "STAFF" && data.currentMembershipId) return data.currentMembershipId;
        return prev || data.memberships[0]?.id || "";
      });
    }
    if (data.role) {
      setUserRole(data.role);
      if (data.role === "STAFF" && filter === "all") {
        setFilter("mine");
      }
    }
    if (data.currentMembershipId) setCurrentMembershipId(data.currentMembershipId);
    if (data.integrationMode) setIntegrationMode(data.integrationMode);

    setSelectedId((prev) => {
      if (prev && convs.some((c) => c.id === prev)) return prev;
      return convs[0]?.id ?? null;
    });
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.conversation?.messages ?? []);
      setWithin24h(Boolean(data.within24hWindow));
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const timer = setTimeout(() => {
      loadMessages(selectedId);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedId, loadMessages]);

  // Smooth auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  // Live background polling every 5 seconds (paused when browser tab is hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadConversations();
      if (selectedId) loadMessages(selectedId);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, selectedId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(q) ||
        c.contact.phoneE164.toLowerCase().includes(q) ||
        (c.assignedMembership?.user.name.toLowerCase().includes(q) ?? false)
    );
  }, [conversations, searchQuery]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  async function handleSendMessage(
    type: "TEXT" | "TEMPLATE",
    overrideBody?: string,
    templateName?: string
  ) {
    if (!selectedId) return;
    const text = (overrideBody ?? replyText).trim();
    if (!text) return;

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, body: text, templateName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Mesaj gönderilemedi." });
        return;
      }
      setReplyText("");
      await loadMessages(selectedId);
      await loadConversations();
    } finally {
      setSending(false);
    }
  }

  async function handleAssign(membershipId: string) {
    if (!selectedId) return;
    setFeedback(null);
    const res = await fetch(`/api/conversations/${selectedId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: membershipId || null }),
    });
    if (res.ok) {
      const memberName =
        members.find((m) => m.id === membershipId)?.user.name ?? "Atanmamış";
      setFeedback({ type: "ok", text: `Konuşma "${memberName}" üzerine atandı.` });
      await loadConversations();
    }
  }

  async function handleQuickAppointment(e: React.FormEvent) {
    e.preventDefault();
    const targetMemberId =
      userRole === "STAFF" && currentMembershipId ? currentMembershipId : apptMemberId;
    if (!selectedConv || !targetMemberId) return;
    setCreatingAppt(true);
    setFeedback(null);

    try {
      const startAt = new Date(`${apptDate}T${apptTime}:00`);
      const endAt = new Date(startAt.getTime() + 30 * 60_000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: selectedConv.contact.name,
          contactPhoneE164: selectedConv.contact.phoneE164,
          assignedMembershipId: targetMemberId,
          conversationId: selectedConv.id,
          title: apptTitle,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Randevu oluşturulamadı." });
        return;
      }
      setFeedback({
        type: "ok",
        text: "Randevu oluşturuldu, Google Takvime işlendi ve müşteriye WhatsApp onayı gönderildi.",
      });
      setMobileShowBooking(false);
      await loadMessages(selectedConv.id);
      await loadConversations();
    } finally {
      setCreatingAppt(false);
    }
  }

  async function simulateDemoInbound() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneE164: "+905351234567",
        name: "Deniz Aydın (Demo)",
        body: "Merhaba, yarın saat 11:00 uygun mu?",
      }),
    });
    if (res.ok) {
      await loadConversations();
    }
  }

  const tabs =
    userRole === "STAFF"
      ? [
          { id: "mine" as const, label: "Bana Atanan" },
          { id: "unassigned" as const, label: "Atanmamış" },
        ]
      : [
          { id: "all" as const, label: "Tümü" },
          { id: "mine" as const, label: "Bana Atanan" },
          { id: "unassigned" as const, label: "Atanmamış" },
        ];

  return (
    <div className="space-y-3">
      {/* Compact Modern Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                WhatsApp Gelen Kutusu
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Canlı
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {userRole === "STAFF"
                ? "Size atanan ve bekleyen müşteri sohbetleri."
                : "Tüm ekip tek WhatsApp hattını ortak yönetir."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {integrationMode !== "LIVE" && (
            <button
              onClick={simulateDemoInbound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Demo Mesaj Simüle Et
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBookingPanel((v) => !v)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            {showBookingPanel ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-slate-500" />
                Randevu Panelini Gizle
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-emerald-600" />
                Randevu Panelini Aç
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Unified Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-11.5rem)] min-h-[560px]">
        {/* Left: Conversation List */}
        <div
          className={`lg:col-span-4 xl:col-span-3 border-r border-slate-200 flex flex-col min-h-0 bg-white ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search + Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri adı veya telefon ara..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    filter === tab.id
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <CustomScroll variant="light" className="flex-1 min-h-0">
            <div className="divide-y divide-slate-100">
              {filteredConversations.map((conv) => {
              const active = conv.id === selectedId;
              const lastMsg = conv.messages[0];
              const in24h = isWithin24Hours(conv.lastCustomerMessageAt);
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedId(conv.id);
                    setFeedback(null);
                  }}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    active
                      ? "bg-emerald-50/70 border-l-[3px] border-l-emerald-600"
                      : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                      active
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {getInitials(conv.contact.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {conv.contact.name}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatTimeTR(conv.lastMessageAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lastMsg?.body ?? "Henüz mesaj yok"}
                    </p>

                    <div className="flex items-center justify-between gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[140px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            conv.assignedMembership ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                        {conv.assignedMembership?.user.name ?? "Atanmamış"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!in24h && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                            24s Doldu
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-600">Konuşma bulunamadı</p>
                <p className="text-[11px] text-slate-400">
                  {userRole === "STAFF"
                    ? "Size atanan yeni bir mesaj veya randevu olduğunda burada otomatik görünür."
                    : "Yeni WhatsApp mesajları geldiğinde otomatik olarak burada listelenir."}
                </p>
              </div>
            )}
            </div>
          </CustomScroll>
        </div>

        {/* Center: Modern WhatsApp Chat Canvas */}
        <div
          className={`${
            showBookingPanel ? "lg:col-span-5 xl:col-span-6" : "lg:col-span-8 xl:col-span-9"
          } ${showBookingPanel ? "lg:border-r border-slate-200" : ""} flex flex-col min-h-0 ${
            selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(selectedConv.contact.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {selectedConv.contact.name}
                      </p>
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          within24h
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {within24h ? "24s Pencere Aktif" : "24s Doldu"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowBooking((v) => !v)}
                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>{mobileShowBooking ? "Sohbet" : "Randevu"}</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <select
                      aria-label="Atanan ekip üyesi"
                      value={selectedConv.assignedMembershipId ?? ""}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none max-w-[130px]"
                    >
                      <option value="">Atanmamış</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Feedback Toast */}
              {feedback && (
                <div
                  className={`mx-4 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 ${
                    feedback.type === "ok"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  <span>{feedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="text-[11px] opacity-70 hover:opacity-100"
                  >
                    Kapat
                  </button>
                </div>
              )}

              {/* Messages Canvas */}
              <CustomScroll variant="light" className="flex-1 min-h-0 bg-[#F4F6F5]">
                <div className="p-4 sm:p-5 space-y-2.5">
                  {messages.map((msg) => {
                  const isOut = msg.direction === "OUTBOUND";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs ${
                          isOut
                            ? "bg-emerald-700 text-white rounded-br-sm"
                            : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm"
                        }`}
                      >
                        {msg.type === "TEMPLATE" && (
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                              isOut ? "text-emerald-200" : "text-slate-400"
                            }`}
                          >
                            Onaylı Şablon
                          </p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">
                          {msg.body}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isOut ? "text-emerald-100/80" : "text-slate-400"
                          }`}
                        >
                          {msg.isDemo && <span>DEMO ·</span>}
                          <span>{formatTimeTR(msg.createdAt)}</span>
                          {isOut &&
                            (msg.status === "READ" || msg.status === "DELIVERED" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                            ) : msg.status === "FAILED" ? (
                              <AlertTriangle className="w-3 h-3 text-amber-300" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                </div>
              </CustomScroll>

              {/* Composer + Quick Replies */}
              <div className="p-3 bg-white border-t border-slate-200/80 space-y-2.5">
                {within24h ? (
                  <>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {QUICK_REPLIES.map((qr) => (
                        <button
                          key={qr}
                          type="button"
                          onClick={() => setReplyText(qr)}
                          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200/80 text-[11px] font-medium text-slate-600 transition-colors"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage("TEXT");
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="WhatsApp mesajınızı yazın..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={sending || !replyText.trim()}
                        className="p-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Gönder</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>
                        24 saatlik müşteri yanıt penceresi doldu — yalnızca onaylı şablon
                        gönderilebilir.
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() =>
                        handleSendMessage(
                          "TEMPLATE",
                          `Merhaba ${selectedConv.contact.name}, randevu talebiniz için size dönüş yapıyoruz.`,
                          "randevu_onay_v1"
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                    >
                      Onaylı Şablon Gönder (randevu_onay_v1)
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F4F6F5] space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shadow-2xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Bir konuşma seçin</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Soldaki listeden bir müşteriye tıklayarak WhatsApp sohbetini görüntüleyebilir ve
                tek tıkla randevu oluşturabilirsiniz.
              </p>
            </div>
          )}
        </div>

        {/* Right: Quick Appointment Panel (collapsible on desktop) */}
        {showBookingPanel && (
          <CustomScroll
            variant="light"
            className={`lg:col-span-3 xl:col-span-3 bg-slate-50/70 min-h-0 ${
              mobileShowBooking ? "block" : "hidden lg:block"
            }`}
          >
            <div className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Hızlı Randevu</h3>
              </div>
              <HelpBubble
                title="Hızlı Randevu Oluşturma"
                text="İşlem adını, uzmanı ve boş yeşil saati seçip kaydettiğinizde randevu Google Takvime işlenir, konuşma seçilen uzmana atanır ve müşteriye WhatsApp onayı gider."
              />
            </div>

            {selectedConv ? (
              <form onSubmit={handleQuickAppointment} className="space-y-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                    {getInitials(selectedConv.contact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{selectedConv.contact.name}</p>
                    <p className="text-slate-500 truncate">
                      {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    İşlem / Başlık
                  </label>
                  <input
                    type="text"
                    required
                    value={apptTitle}
                    onChange={(e) => setApptTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ekip Üyesi
                  </label>
                  <select
                    value={
                      userRole === "STAFF" && currentMembershipId
                        ? currentMembershipId
                        : apptMemberId
                    }
                    disabled={userRole === "STAFF"}
                    onChange={(e) => setApptMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium disabled:bg-slate-100 disabled:text-slate-600"
                  >
                    {members
                      .filter(
                        (m) =>
                          userRole !== "STAFF" ||
                          !currentMembershipId ||
                          m.id === currentMembershipId
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>

                <TimeSlotPicker
                  membershipId={
                    userRole === "STAFF" && currentMembershipId
                      ? currentMembershipId
                      : apptMemberId
                  }
                  date={apptDate}
                  selectedTime={apptTime}
                  onSelectTime={setApptTime}
                />

                <button
                  type="submit"
                  disabled={creatingAppt}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{creatingAppt ? "Kaydediliyor..." : "Randevu Kaydet & Onay Gönder"}</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-400">Önce soldan bir konuşma seçin.</p>
            )}
            </div>
          </CustomScroll>
        )}
      </div>
    </div>
  );
}
