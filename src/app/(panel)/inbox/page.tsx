"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Tag,
  ShieldCheck,
  User,
  FileText,
  Image as ImageIcon,
  Mic,
  MapPin,
  Video,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatDateTR, formatPhoneDisplay, formatTimeTR, isWithin24Hours } from "@/lib/utils";
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
  optimistic?: boolean;
}

interface ContactAppointment {
  id: string;
  title: string;
  startAt: string;
  status: string;
  assignedMembership: { user: { name: string } };
}

interface ConversationSummary {
  id: string;
  status: string;
  channel?: string;
  lastMessageAt: string;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  isDemo: boolean;
  assignedMembershipId: string | null;
  contact: {
    id: string;
    name: string;
    phoneE164: string;
    tags?: string;
    notes?: string | null;
    kvkkConsentAt?: string | null;
  };
  assignedMembership: { id: string; user: { name: string } } | null;
  messages: Message[];
}

type InboxFilter = "all" | "mine" | "unassigned" | "unread";
type MobileView = "list" | "chat" | "details";
type RightTab = "booking" | "customer";

const QUICK_REPLIES = [
  "Merhaba, size nasıl yardımcı olabilirim?",
  "Uygun saatlerimizi kontrol edip hemen dönüyorum.",
  "Randevunuz oluşturuldu, görüşmek üzere!",
];

const APPT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Onaylı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Bekleyen", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  RESCHEDULED: { label: "Ertelendi", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  CANCELLED: { label: "İptal", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  COMPLETED: { label: "Tamamlandı", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "M";
}

function getTodayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseTags(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function renderMessageBody(body: string, isOut: boolean) {
  const mediaMatch =
    body.startsWith("📷")
      ? { icon: ImageIcon, label: "Görsel", text: body.replace(/^📷\s*/, "") }
      : body.startsWith("🎙️")
      ? { icon: Mic, label: "Sesli Mesaj", text: body.replace(/^🎙️\s*/, "") }
      : body.startsWith("📄")
      ? { icon: FileText, label: "Belge", text: body.replace(/^📄\s*/, "") }
      : body.startsWith("🎬")
      ? { icon: Video, label: "Video", text: body.replace(/^🎬\s*/, "") }
      : body.startsWith("📍")
      ? { icon: MapPin, label: "Konum", text: body.replace(/^📍\s*/, "") }
      : null;

  if (!mediaMatch) {
    return <p className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">{body}</p>;
  }

  const Icon = mediaMatch.icon;
  return (
    <div className="space-y-1.5">
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          isOut ? "bg-white/15 text-emerald-100" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{mediaMatch.label}</span>
      </div>
      <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">{mediaMatch.text}</p>
    </div>
  );
}

export default function InboxPage() {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [limit, setLimit] = useState(50);
  const [hasMoreConvs, setHasMoreConvs] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [contactAppointments, setContactAppointments] = useState<ContactAppointment[]>([]);
  const [within24h, setWithin24h] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("booking");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [userRole, setUserRole] = useState<string>("OWNER");
  const [currentMembershipId, setCurrentMembershipId] = useState<string>("");
  const [integrationMode, setIntegrationMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Quick appointment form state
  const [apptTitle, setApptTitle] = useState("Ön Görüşme Randevusu");
  const [apptDate, setApptDate] = useState(() => getTodayIstanbul());
  const [apptTime, setApptTime] = useState("10:00");
  const [apptMemberId, setApptMemberId] = useState("");
  const [creatingAppt, setCreatingAppt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollingInFlightRef = useRef(false);
  const hasAutoSelectedDesktopRef = useRef(false);

  const loadConversations = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      if (!opts?.silent) setLoadError(null);
      try {
        const res = await fetch(`/api/conversations?filter=${filter}&limit=${limit}`, {
          signal: opts?.signal,
        });
        if (!res.ok) {
          if (!opts?.silent) {
            const errJson = await res.json().catch(() => null);
            setLoadError(errJson?.error ?? "Konuşmalar yüklenemedi. Lütfen tekrar deneyin.");
          }
          return;
        }
        const data = await res.json();
        const convs = (data.conversations ?? []) as ConversationSummary[];
        setConversations(convs);
        setHasMoreConvs(Boolean(data.hasMore));
        setUnreadTotal(Number(data.unreadConversations ?? 0));

        if (Array.isArray(data.memberships)) {
          setMembers(data.memberships);
          setApptMemberId((prev) => {
            if (data.role === "STAFF" && data.currentMembershipId) return data.currentMembershipId;
            return prev || data.memberships[0]?.id || "";
          });
        }
        if (data.role) {
          setUserRole(data.role);
          if (data.role === "STAFF" && filter === "all" && data.appliedFilter === "mine") {
            setFilter("mine");
          }
        }
        if (data.currentMembershipId) setCurrentMembershipId(data.currentMembershipId);
        if (data.integrationMode) setIntegrationMode(data.integrationMode);

        // Auto-select first conversation ONLY on desktop (>= 1024px) so mobile lands on the list cleanly
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
        setSelectedId((prev) => {
          if (prev && convs.some((c) => c.id === prev)) return prev;
          if (isDesktop && !hasAutoSelectedDesktopRef.current && convs[0]) {
            hasAutoSelectedDesktopRef.current = true;
            return convs[0].id;
          }
          if (isDesktop && prev && !convs.some((c) => c.id === prev)) {
            return convs[0]?.id ?? null;
          }
          return prev && convs.some((c) => c.id === prev) ? prev : null;
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (!opts?.silent) {
          setLoadError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
        }
      } finally {
        setLoadingConvs(false);
      }
    },
    [filter, limit]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadConversations({ signal: controller.signal });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadConversations]);

  const loadMessages = useCallback(
    async (convId: string, opts?: { silent?: boolean; before?: string; signal?: AbortSignal }) => {
      if (!opts?.silent && !opts?.before) setLoadingMsgs(true);
      try {
        const qs = new URLSearchParams({ limit: "60" });
        if (opts?.before) qs.set("before", opts.before);
        const res = await fetch(`/api/conversations/${convId}/messages?${qs.toString()}`, {
          signal: opts?.signal,
        });
        if (!res.ok) {
          if (!opts?.silent) {
            const errJson = await res.json().catch(() => null);
            setFeedback({ type: "err", text: errJson?.error ?? "Mesajlar yüklenemedi." });
          }
          return;
        }
        const data = await res.json();
        const fetched = (data.conversation?.messages ?? []) as Message[];
        setHasMoreMessages(Boolean(data.hasMoreMessages));
        setWithin24h(Boolean(data.within24hWindow));
        if (Array.isArray(data.contactAppointments)) {
          setContactAppointments(data.contactAppointments);
        }

        if (opts?.before) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const olderUnique = fetched.filter((m) => !existingIds.has(m.id));
            return [...olderUnique, ...prev];
          });
        } else {
          setMessages(fetched);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (!opts?.silent) {
          setFeedback({ type: "err", text: "Mesaj geçmişi alınırken bağlantı hatası oluştu." });
        }
      } finally {
        setLoadingMsgs(false);
        setLoadingOlder(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadMessages(selectedId, { signal: controller.signal });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedId, loadMessages]);

  // Smooth auto-scroll on new latest message or conversation change (skip when prepending older messages)
  const lastMsgId = messages[messages.length - 1]?.id ?? null;
  useEffect(() => {
    if (!lastMsgId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMsgId, selectedId]);

  // Controlled live polling every 8s (pauses when tab hidden, never overlaps in-flight requests)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      try {
        await Promise.all([
          loadConversations({ silent: true }),
          selectedId ? loadMessages(selectedId, { silent: true }) : Promise.resolve(),
        ]);
      } finally {
        pollingInFlightRef.current = false;
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, selectedId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(q) ||
        c.contact.phoneE164.toLowerCase().includes(q) ||
        (c.contact.tags?.toLowerCase().includes(q) ?? false) ||
        (c.assignedMembership?.user.name.toLowerCase().includes(q) ?? false)
    );
  }, [conversations, searchQuery]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  function openConversation(convId: string) {
    setSelectedId(convId);
    setMobileView("chat");
    setFeedback(null);
    // Clear unread badge optimistically in list
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
  }

  async function handleLoadOlderMessages() {
    if (!selectedId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    await loadMessages(selectedId, { before: messages[0].createdAt, silent: true });
  }

  async function handleSendMessage(
    type: "TEXT" | "TEMPLATE",
    overrideBody?: string,
    templateName?: string
  ) {
    if (!selectedId) return;
    const text = (overrideBody ?? replyText).trim();
    if (!text) return;

    const tempId = `opt_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      direction: "OUTBOUND",
      type,
      body: text,
      status: "SENDING",
      isDemo: integrationMode !== "LIVE",
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setSending(true);
    setFeedback(null);
    setMessages((prev) => [...prev, optimisticMsg]);
    if (type === "TEXT") setReplyText("");

    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, body: text, templateName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (type === "TEXT") setReplyText(text);
        setFeedback({ type: "err", text: data.error ?? "Mesaj gönderilemedi." });
        return;
      }
      await Promise.all([
        loadMessages(selectedId, { silent: true }),
        loadConversations({ silent: true }),
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (type === "TEXT") setReplyText(text);
      setFeedback({ type: "err", text: "Bağlantı hatası: Mesaj gönderilemedi." });
    } finally {
      setSending(false);
    }
  }

  async function handleAssign(membershipId: string) {
    if (!selectedId) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedMembershipId: membershipId || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Atama güncellenemedi." });
        return;
      }
      const memberName = members.find((m) => m.id === membershipId)?.user.name ?? "Atanmamış";
      setFeedback({ type: "ok", text: `Konuşma "${memberName}" üzerine atandı.` });
      await loadConversations({ silent: true });
    } catch {
      setFeedback({ type: "err", text: "Atama sırasında bağlantı hatası oluştu." });
    }
  }

  async function handleToggleConversationStatus() {
    if (!selectedConv) return;
    const nextStatus = selectedConv.status === "RESOLVED" ? "OPEN" : "RESOLVED";
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Durum güncellenemedi." });
        return;
      }
      setFeedback({
        type: "ok",
        text: nextStatus === "RESOLVED" ? "Konuşma çözüldü olarak işaretlendi." : "Konuşma tekrar açıldı.",
      });
      await loadConversations({ silent: true });
    } catch {
      setFeedback({ type: "err", text: "Durum güncellenirken bağlantı hatası oluştu." });
    } finally {
      setUpdatingStatus(false);
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
      const startAt = new Date(`${apptDate}T${apptTime}:00+03:00`);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Randevu oluşturulamadı." });
        return;
      }
      setFeedback({
        type: "ok",
        text: "Randevu oluşturuldu, Google Takvime işlendi ve müşteriye WhatsApp onayı gönderildi.",
      });
      setMobileView("chat");
      await Promise.all([
        loadMessages(selectedConv.id, { silent: true }),
        loadConversations({ silent: true }),
      ]);
    } catch {
      setFeedback({ type: "err", text: "Randevu kaydedilirken bağlantı hatası oluştu." });
    } finally {
      setCreatingAppt(false);
    }
  }

  async function simulateDemoInbound() {
    setFeedback(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneE164: "+905351234567",
          name: "Deniz Aydın (Demo)",
          body: "Merhaba, yarın saat 11:00 uygun mu?",
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFeedback({ type: "err", text: json.error ?? "Demo mesajı oluşturulamadı." });
        return;
      }
      await loadConversations({ silent: true });
    } catch {
      setFeedback({ type: "err", text: "Sunucuya bağlanılamadı." });
    }
  }

  const tabs: Array<{ id: InboxFilter; label: string; badge?: number }> =
    userRole === "STAFF"
      ? [
          { id: "mine", label: "Bana Atanan" },
          { id: "unassigned", label: "Atanmamış" },
          { id: "unread", label: "Okunmamış", badge: unreadTotal },
        ]
      : [
          { id: "all", label: "Tümü" },
          { id: "mine", label: "Benim" },
          { id: "unassigned", label: "Bekleyen" },
          { id: "unread", label: "Okunmamış", badge: unreadTotal },
        ];

  const selectedTags = parseTags(selectedConv?.contact.tags);

  return (
    <div className="space-y-3 min-w-0">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-tight truncate">
                WhatsApp Gelen Kutusu
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Canlı
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {userRole === "STAFF"
                ? "Size atanan ve bekleyen müşteri sohbetleri."
                : "Tüm ekip tek WhatsApp hattını ortak yönetir."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {integrationMode !== "LIVE" && (
            <button
              type="button"
              onClick={simulateDemoInbound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Demo Mesaj Simüle Et</span>
              <span className="sm:hidden">Demo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRightPanel((v) => !v)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            {showRightPanel ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-slate-500" />
                Detay Panelini Gizle
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-emerald-600" />
                Detay Panelini Aç
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Unified Workspace — uses 100dvh on mobile so virtual keyboard never covers composer */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100dvh-13.5rem)] sm:h-[calc(100dvh-12.5rem)] lg:h-[calc(100vh-11rem)] min-h-[480px]">
        {/* COLUMN 1: Conversation List */}
        <div
          className={`lg:col-span-4 xl:col-span-3 lg:border-r border-slate-200 flex-col min-h-0 min-w-0 bg-white ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Search + Filter Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/60 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Müşteri adı, telefon veya etiket ara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri, telefon veya etiket ara..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex-1 min-w-fit px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                    filter === tab.id
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List Body */}
          <CustomScroll variant="light" className="flex-1 min-h-0">
            {loadingConvs ? (
              <div className="p-3 space-y-2.5 animate-pulse">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-start gap-3 p-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadingConvs(true);
                    loadConversations();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tekrar Dene
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConversations.map((conv) => {
                  const active = conv.id === selectedId;
                  const lastMsg = conv.messages[0];
                  const in24h = isWithin24Hours(conv.lastCustomerMessageAt);
                  const tags = parseTags(conv.contact.tags);
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => openConversation(conv.id)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                        active
                          ? "bg-emerald-50/75 border-l-[3px] border-l-emerald-600"
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

                        <div className="flex items-center justify-between gap-1.5 mt-2 flex-wrap">
                          <div className="flex items-center gap-1 min-w-0 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[125px]">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  conv.assignedMembership ? "bg-emerald-500" : "bg-amber-400"
                                }`}
                              />
                              <span className="truncate">
                                {conv.assignedMembership?.user.name ?? "Atanmamış"}
                              </span>
                            </span>
                            {conv.status === "RESOLVED" && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                Çözüldü
                              </span>
                            )}
                            {tags[0] && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 truncate max-w-[80px]">
                                {tags[0]}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
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

                {hasMoreConvs && !searchQuery.trim() && (
                  <div className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setLimit((prev) => Math.min(prev + 50, 100))}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Daha Fazla Konuşma Yükle
                    </button>
                  </div>
                )}

                {filteredConversations.length === 0 && (
                  <div className="p-10 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">Konuşma bulunamadı</p>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery.trim()
                        ? "Aramanızla eşleşen konuşma yok."
                        : filter === "unread"
                        ? "Harika! Okunmamış mesajınız bulunmuyor."
                        : userRole === "STAFF"
                        ? "Size atanan yeni bir mesaj veya randevu olduğunda burada otomatik görünür."
                        : "Yeni WhatsApp mesajları geldiğinde otomatik olarak burada listelenir."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CustomScroll>
        </div>

        {/* COLUMN 2: Chat Canvas */}
        <div
          className={`${
            showRightPanel ? "lg:col-span-5 xl:col-span-6" : "lg:col-span-8 xl:col-span-9"
          } ${showRightPanel ? "lg:border-r border-slate-200" : ""} flex-col min-h-0 min-w-0 ${
            mobileView === "chat" && selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    aria-label="Konuşma listesine dön"
                    onClick={() => setMobileView("list")}
                    className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(selectedConv.contact.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {selectedConv.contact.name}
                      </p>
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          within24h
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {within24h ? "24s Aktif" : "24s Doldu"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={handleToggleConversationStatus}
                    title={selectedConv.status === "RESOLVED" ? "Konuşmayı Tekrar Aç" : "Çözüldü İşaretle"}
                    aria-label={selectedConv.status === "RESOLVED" ? "Konuşmayı Tekrar Aç" : "Çözüldü İşaretle"}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                      selectedConv.status === "RESOLVED"
                        ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70"
                        : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    {selectedConv.status === "RESOLVED" ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Tekrar Aç</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden xl:inline">Çözüldü</span>
                      </>
                    )}
                  </button>

                  <div className="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <select
                      aria-label="Atanan ekip üyesi"
                      value={selectedConv.assignedMembershipId ?? ""}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none max-w-[115px]"
                    >
                      <option value="">Atanmamış</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileView("details")}
                    aria-label="Müşteri detayı ve randevu panelini aç"
                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Randevu</span>
                  </button>
                </div>
              </div>

              {/* Feedback Banner */}
              {feedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mx-3 sm:mx-4 mt-2.5 px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 shrink-0 ${
                    feedback.type === "ok"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  <span className="break-words">{feedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="text-[11px] opacity-75 hover:opacity-100 shrink-0"
                  >
                    Kapat
                  </button>
                </div>
              )}

              {/* Messages Canvas */}
              <CustomScroll variant="light" className="flex-1 min-h-0 bg-[#F4F6F5]">
                <div className="p-3 sm:p-5 space-y-2.5">
                  {hasMoreMessages && (
                    <div className="text-center pb-1">
                      <button
                        type="button"
                        disabled={loadingOlder}
                        onClick={handleLoadOlderMessages}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 shadow-2xs disabled:opacity-50"
                      >
                        {loadingOlder && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{loadingOlder ? "Yükleniyor..." : "Eski mesajları yükle"}</span>
                      </button>
                    </div>
                  )}

                  {loadingMsgs ? (
                    <div className="space-y-3 animate-pulse py-4">
                      <div className="h-12 bg-white rounded-2xl w-2/3" />
                      <div className="h-12 bg-emerald-100/70 rounded-2xl w-1/2 ml-auto" />
                      <div className="h-14 bg-white rounded-2xl w-3/5" />
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOut = msg.direction === "OUTBOUND";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs ${
                              isOut
                                ? `bg-emerald-700 text-white rounded-br-sm ${
                                    msg.optimistic ? "opacity-80" : ""
                                  }`
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
                            {renderMessageBody(msg.body, isOut)}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isOut ? "text-emerald-100/80" : "text-slate-400"
                              }`}
                            >
                              {msg.isDemo && <span>DEMO ·</span>}
                              <span>
                                {msg.optimistic ? "Gönderiliyor..." : formatTimeTR(msg.createdAt)}
                              </span>
                              {isOut &&
                                !msg.optimistic &&
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
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CustomScroll>

              {/* Composer + Quick Replies (pinned at bottom, keyboard-safe) */}
              <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200/80 space-y-2 shrink-0">
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
                        aria-label="WhatsApp mesajı yazın"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="WhatsApp mesajınızı yazın..."
                        className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                      />
                      <button
                        type="submit"
                        aria-label="Mesaj gönder"
                        disabled={sending || !replyText.trim()}
                        className="p-2.5 sm:px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold shrink-0"
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
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
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

        {/* COLUMN 3: Right Panel — Quick Appointment & Customer CRM Details */}
        {(showRightPanel || mobileView === "details") && (
          <CustomScroll
            variant="light"
            className={`lg:col-span-3 xl:col-span-3 bg-slate-50/70 min-h-0 min-w-0 ${
              mobileView === "details" && selectedId
                ? "block"
                : showRightPanel
                ? "hidden lg:block"
                : "hidden"
            }`}
          >
            <div className="p-4 space-y-3.5">
              {/* Mobile back header */}
              <div className="flex items-center justify-between gap-2 lg:hidden pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setMobileView("chat")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sohbete Dön</span>
                </button>
                <span className="text-xs font-bold text-slate-900">Müşteri & Randevu</span>
              </div>

              {/* Right Panel Mode Switcher */}
              <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRightTab("booking")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 transition-all ${
                    rightTab === "booking"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Hızlı Randevu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("customer")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 transition-all ${
                    rightTab === "customer"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Müşteri Detayı</span>
                </button>
              </div>

              {selectedConv ? (
                rightTab === "booking" ? (
                  <form onSubmit={handleQuickAppointment} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Randevu Oluştur</span>
                      <HelpBubble
                        title="Hızlı Randevu Oluşturma"
                        text="İşlem adını, uzmanı ve boş yeşil saati seçip kaydettiğinizde randevu Google Takvime işlenir, konuşma seçilen uzmana atanır ve müşteriye WhatsApp onayı gider."
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {getInitials(selectedConv.contact.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {selectedConv.contact.name}
                        </p>
                        <p className="text-slate-500 truncate">
                          {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="inbox-appt-title"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        İşlem / Başlık
                      </label>
                      <input
                        id="inbox-appt-title"
                        type="text"
                        required
                        value={apptTitle}
                        onChange={(e) => setApptTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inbox-appt-member"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        Ekip Üyesi
                      </label>
                      <select
                        id="inbox-appt-member"
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
                      <label
                        htmlFor="inbox-appt-date"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        Tarih
                      </label>
                      <input
                        id="inbox-appt-date"
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
                      <span>
                        {creatingAppt ? "Kaydediliyor..." : "Randevu Kaydet & Onay Gönder"}
                      </span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {/* Customer Profile Card */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(selectedConv.contact.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">
                            {selectedConv.contact.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {formatPhoneDisplay(selectedConv.contact.phoneE164)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {selectedConv.contact.kvkkConsentAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            KVKK Onaylı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            KVKK Bekliyor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile-accessible Assignee Control */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <label
                        htmlFor="inbox-detail-assignee"
                        className="block text-[11px] font-semibold text-slate-600"
                      >
                        Sorumlu Ekip Üyesi
                      </label>
                      <select
                        id="inbox-detail-assignee"
                        value={selectedConv.assignedMembershipId ?? ""}
                        onChange={(e) => handleAssign(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                      >
                        <option value="">Atanmamış</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tags & Notes */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Etiketler & Notlar</span>
                      </div>
                      {selectedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedTags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Henüz etiket eklenmemiş.</p>
                      )}
                      {selectedConv.contact.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {selectedConv.contact.notes}
                        </p>
                      )}
                    </div>

                    {/* Recent Appointments */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700">Son Randevular</p>
                      {contactAppointments.length > 0 ? (
                        <div className="space-y-1.5">
                          {contactAppointments.map((a) => {
                            const st = APPT_STATUS_LABELS[a.status] ?? {
                              label: a.status,
                              cls: "bg-slate-100 text-slate-700 border-slate-200",
                            };
                            return (
                              <div
                                key={a.id}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-semibold text-slate-800 truncate">
                                    {a.title}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${st.cls}`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                  {formatDateTR(a.startAt)} · {formatTimeTR(a.startAt)} ·{" "}
                                  {a.assignedMembership.user.name}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Kayıtlı randevu yok.</p>
                      )}
                    </div>

                    <Link
                      href="/customers"
                      className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>CRM Kartında Düzenle</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
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
