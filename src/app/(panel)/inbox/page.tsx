"use client";

import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { formatPhoneDisplay, formatTimeTR, isWithin24Hours } from "@/lib/utils";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";

interface TeamMember {
  id: string;
  role: string;
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

export default function InboxPage() {
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [within24h, setWithin24h] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mobileShowBooking, setMobileShowBooking] = useState(false);

  // Quick appointment form state
  const [apptTitle, setApptTitle] = useState("Ön Görüşme Randevusu");
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [apptTime, setApptTime] = useState("16:00");
  const [apptMemberId, setApptMemberId] = useState("");
  const [creatingAppt, setCreatingAppt] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?filter=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
      if (!selectedId && data.conversations?.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    }
  }, [filter, selectedId]);

  useEffect(() => {
    loadConversations();
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.memberships ?? []);
        if (d.memberships?.[0]?.id) setApptMemberId(d.memberships[0].id);
      });
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
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  async function handleSendMessage(type: "TEXT" | "TEMPLATE", overrideBody?: string, templateName?: string) {
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
        setFeedback(data.error ?? "Mesaj gönderilemedi.");
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
    await fetch(`/api/conversations/${selectedId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: membershipId || null }),
    });
    await loadConversations();
  }

  async function handleQuickAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv || !apptMemberId) return;
    setCreatingAppt(true);
    setFeedback(null);
    try {
      const startAt = new Date(`${apptDate}T${apptTime}:00`);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: selectedConv.contact.name,
          contactPhoneE164: selectedConv.contact.phoneE164,
          assignedMembershipId: apptMemberId,
          conversationId: selectedConv.id,
          title: apptTitle,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error ?? "Randevu oluşturulamadı.");
        return;
      }
      setFeedback("Randevu oluşturuldu, onay bildirimi kuyruğa eklendi.");
      await loadMessages(selectedConv.id);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp Ortak Gelen Kutusu</h1>
          <p className="text-xs text-slate-500">Tüm ekip aynı WhatsApp numarasını ortak yönetir.</p>
        </div>
        <button
          onClick={simulateDemoInbound}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition-colors self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          Demo Gelen Mesaj Simüle Et
        </button>
      </div>

      <PageGuideBanner
        title="WhatsApp Mesajlarını Buradan Yönetin"
        description="Soldan müşteriyi seçin, ortadan mesajlaşıp kimin ilgileneceğini seçin, sağdaki kutudan tek tıkla randevu oluşturun."
        steps={[
          "1. Soldan müşteri seç",
          "2. Aşağıdan mesaj yaz ve gönder",
          "3. Sağdan tarih/saat seçip randevu kaydet",
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left: Conversation List */}
        <div
          className={`lg:col-span-4 border-r border-slate-200 flex flex-col ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-slate-100 flex gap-1">
            {[
              { id: "all", label: "Tümü" },
              { id: "mine", label: "Bana Atanan" },
              { id: "unassigned", label: "Atanmamış" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as "all" | "mine" | "unassigned")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab.id
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.map((conv) => {
              const active = conv.id === selectedId;
              const lastMsg = conv.messages[0];
              const in24h = isWithin24Hours(conv.lastCustomerMessageAt);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    active ? "bg-violet-50/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {conv.contact.name}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatTimeTR(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {lastMsg?.body ?? "Mesaj yok"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {conv.assignedMembership?.user.name ?? "Atanmamış"}
                    </span>
                    {!in24h && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        24s Doldu
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">Konuşma bulunamadı.</div>
            )}
          </div>
        </div>

        {/* Center: Message Thread */}
        <div
          className={`lg:col-span-5 border-r border-slate-200 flex flex-col ${
            selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConv ? (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-1 rounded-lg hover:bg-slate-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {selectedConv.contact.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileShowBooking((v) => !v)}
                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-200"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>{mobileShowBooking ? "Sohbet" : "Randevu"}</span>
                  </button>
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  <select
                    value={selectedConv.assignedMembershipId ?? ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 max-w-[120px] sm:max-w-none"
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

              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/40 max-h-[420px]">
                {messages.map((m) => {
                  const isOut = m.direction === "OUTBOUND";
                  return (
                    <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs ${
                          isOut
                            ? "bg-violet-600 text-white rounded-br-xs"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                        }`}
                      >
                        {m.type === "TEMPLATE" && (
                          <span
                            className={`block text-[10px] font-semibold mb-1 ${
                              isOut ? "text-violet-200" : "text-violet-600"
                            }`}
                          >
                            Şablon Mesajı
                          </span>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isOut ? "text-violet-200" : "text-slate-400"
                          }`}
                        >
                          <span>{formatTimeTR(m.createdAt)}</span>
                          {isOut &&
                            (m.status === "READ" || m.status === "DELIVERED" ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {feedback && (
                <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs border-t border-blue-100">
                  {feedback}
                </div>
              )}

              {/* Composer with 24h WhatsApp Policy Guard */}
              <div className="p-3 border-t border-slate-200 bg-white">
                {within24h ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage("TEXT");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="WhatsApp mesajı yazın..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-600"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>24 Saatlik Pencere Doldu — Yalnızca Onaylı Şablon Gönderilebilir</span>
                    </div>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() =>
                        handleSendMessage(
                          "TEMPLATE",
                          `Merhaba ${selectedConv.contact.name}, randevunuzla ilgili size ulaşmak istedik. Uygun olduğunuzda yanıt verebilirsiniz.`,
                          "randevu_hatirlatma_v1"
                        )
                      }
                      className="w-full py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                    >
                      Onaylı Hatırlatma Şablonu Gönder
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              Görüntülemek için soldan bir konuşma seçin.
            </div>
          )}
        </div>

        {/* Right: Quick Appointment Creation from Conversation */}
        <div
          className={`lg:col-span-3 p-4 bg-slate-50/50 ${
            selectedId && mobileShowBooking ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Konuşmadan Randevu Oluştur</h3>
            </div>
            <HelpBubble
              title="Hızlı Randevu Oluşturma"
              text="Müşterinin adını ve telefonunu tekrar yazmanıza gerek yok. İşlem adını, uzmanı ve saati seçip kaydettiğinizde randevu takvime işlenir ve müşteriye WhatsApp'tan onay mesajı gider."
            />
          </div>

          {selectedConv ? (
            <form onSubmit={handleQuickAppointment} className="space-y-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                <p className="font-semibold text-slate-800">{selectedConv.contact.name}</p>
                <p className="text-slate-500 mt-0.5">
                  {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">İşlem / Başlık</label>
                <input
                  type="text"
                  required
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Ekip Üyesi</label>
                <select
                  value={apptMemberId}
                  onChange={(e) => setApptMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tarih</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Saat</label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingAppt}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold shadow-xs hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{creatingAppt ? "Oluşturuluyor..." : "Randevu Kaydet & Onay Gönder"}</span>
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-400">Önce bir konuşma seçin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
