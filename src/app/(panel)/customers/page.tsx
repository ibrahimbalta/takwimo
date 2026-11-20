"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Upload,
  FileSignature,
  Tag,
  Save,
  Clock,
  CheckCircle2,
  Plus,
  X,
  UserPlus,
  Archive,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Calendar,
  ShieldCheck,
  Activity,
  Users,
  Phone,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";
import { formatDateTR, formatPhoneDisplay, formatTimeTR } from "@/lib/utils";
import { CustomScroll } from "@/components/CustomScroll";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface MemberOption {
  id: string;
  user: { name: string };
}

interface CustomerRow {
  id: string;
  name: string;
  phoneE164: string;
  notes: string | null;
  tags: string;
  kvkkConsentAt: string | null;
  createdAt: string;
  appointments: Array<{
    id: string;
    title: string;
    startAt: string;
    status: string;
    assignedMembership?: { id: string; user: { name: string } };
  }>;
  conversations: Array<{
    id: string;
    lastMessageAt: string;
    assignedMembership: { id: string; user: { name: string } } | null;
  }>;
  consentForms: Array<{ id: string; title: string; signedAt: string | null; signerName: string | null }>;
  _count: { appointments: number; conversations: number };
}

interface TimelineItem {
  id: string;
  kind: "MESSAGE" | "APPOINTMENT" | "CONSENT" | "CRM_EVENT";
  title: string;
  detail: string;
  at: string;
  meta?: string;
}

interface CustomerDetailPayload {
  contact: {
    id: string;
    name: string;
    phoneE164: string;
    notes: string | null;
    tags: string;
    kvkkConsentAt: string | null;
    createdAt: string;
    updatedAt: string;
    assignedMembership: { id: string; user: { name: string } } | null;
    consentForms: Array<{ id: string; title: string; signedAt: string | null }>;
    appointments: Array<{
      id: string;
      title: string;
      startAt: string;
      status: string;
      assignedMembership: { user: { name: string } };
    }>;
    primaryConversationId: string | null;
  };
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    confirmedAppointments: number;
    totalConversations: number;
    firstInteractionAt: string;
    lastInteractionAt: string;
    lastAppointment: { id: string; title: string; startAt: string; status: string } | null;
  };
  timeline: TimelineItem[];
}

interface WaitlistRow {
  id: string;
  preferredDate: string;
  preferredSlot: string | null;
  status: string;
  contact: { name: string; phoneE164: string };
}

const SEGMENTS = [
  { id: "ALL", label: "Tümü" },
  { id: "NEW", label: "Yeni (14g)" },
  { id: "ACTIVE", label: "Aktif" },
  { id: "HAS_APPT", label: "Randevulular" },
  { id: "INACTIVE_30", label: "30g+ Pasif" },
  { id: "INACTIVE_60", label: "60g+ Pasif" },
  { id: "INACTIVE_90", label: "90g+ Pasif" },
  { id: "HAS_CANCEL", label: "İptal Geçmişi" },
  { id: "ARCHIVED", label: "Arşiv" },
] as const;

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => Boolean(t) && t !== "__ARCHIVED__");
}

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

export default function CustomersCrmPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "waitlist">("customers");
  const [contacts, setContacts] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [userRole, setUserRole] = useState("OWNER");

  // Filters & Debounced Search
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Selected Customer Profile & Timeline
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTagList, setEditTagList] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [editMemberId, setEditMemberId] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Create Customer Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("+905");
  const [createTags, setCreateTags] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createMemberId, setCreateMemberId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Waitlist
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [wlName, setWlName] = useState("");
  const [wlPhone, setWlPhone] = useState("");
  const [wlDate, setWlDate] = useState(() => getTodayIstanbul());
  const [wlSaving, setWlSaving] = useState(false);

  // 300ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load team & waitlist once on mount
  const loadWaitlist = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) {
        const json = await res.json();
        setWaitlist(json.entries ?? []);
      }
    } catch {
      // Ignore silent background load
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/team"), fetch("/api/waitlist")])
      .then(async ([tRes, wRes]) => {
        if (!active) return;
        if (tRes.ok) {
          const tj = await tRes.json();
          setMembers(tj.memberships ?? []);
        }
        if (wRes.ok) {
          const wj = await wRes.json();
          setWaitlist(wj.entries ?? []);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Load paginated, filtered customers with AbortController
  const loadCustomers = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingList(true);
      setListError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          segment,
          sort,
        });
        if (debouncedSearch) qs.set("q", debouncedSearch);
        if (tagFilter) qs.set("tag", tagFilter);
        if (memberFilter && memberFilter !== "ALL") qs.set("memberId", memberFilter);

        const res = await fetch(`/api/customers?${qs.toString()}`, { signal });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setListError(json?.error ?? "Müşteri listesi yüklenemedi.");
          return;
        }
        const json = await res.json();
        setContacts(json.contacts ?? []);
        setTotal(Number(json.total ?? 0));
        setTotalPages(Number(json.totalPages ?? 1));
        setAvailableTags(json.availableTags ?? []);
        if (json.role) setUserRole(json.role);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setListError("Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
      } finally {
        setLoadingList(false);
      }
    },
    [page, pageSize, segment, sort, debouncedSearch, tagFilter, memberFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadCustomers(controller.signal);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadCustomers]);

  // Load single customer full profile + chronological unified timeline
  const loadCustomerDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/customers/${id}`, { signal });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setDetailError(json?.error ?? "Müşteri profili yüklenemedi.");
        return;
      }
      const json = (await res.json()) as CustomerDetailPayload;
      setDetail(json);
      setEditName(json.contact.name);
      setEditNotes(json.contact.notes ?? "");
      setEditTagList(parseTags(json.contact.tags));
      setEditMemberId(json.contact.assignedMembership?.id ?? "");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setDetailError("Bağlantı hatası: Müşteri profili alınamadı.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadCustomerDetail(selectedId, controller.signal);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedId, loadCustomerDetail]);

  // Escape key closes create modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && createOpen && !creating) {
        setCreateOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, creating]);

  function addTagChip() {
    const clean = newTagInput.trim();
    if (!clean) return;
    if (!editTagList.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setEditTagList((prev) => [...prev, clean]);
    }
    setNewTagInput("");
  }

  function removeTagChip(tagToRemove: string) {
    setEditTagList((prev) => prev.filter((t) => t !== tagToRemove));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSavingDetail(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/customers/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          notes: editNotes,
          tags: editTagList.join(", "),
          ...(userRole !== "STAFF" ? { assignedMembershipId: editMemberId || null } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Müşteri kartı güncellenemedi." });
        return;
      }
      setFeedback({ type: "ok", text: "Müşteri profili, etiketler ve notlar kaydedildi." });
      await Promise.all([loadCustomerDetail(selectedId), loadCustomers()]);
    } catch {
      setFeedback({ type: "err", text: "Bağlantı hatası: Değişiklikler kaydedilemedi." });
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          phoneE164: createPhone.trim(),
          tags: createTags.trim(),
          notes: createNotes.trim(),
          assignedMembershipId: createMemberId || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(json.error ?? "Müşteri oluşturulamadı.");
        return;
      }
      setCreateOpen(false);
      setCreateName("");
      setCreatePhone("+905");
      setCreateTags("");
      setCreateNotes("");
      setCreateMemberId("");
      setFeedback({ type: "ok", text: "Yeni müşteri CRM kaydına eklendi." });
      setPage(1);
      await loadCustomers();
      if (json.contact?.id) setSelectedId(json.contact.id);
    } catch {
      setCreateError("Sunucuya bağlanılamadı.");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchiveOrDelete() {
    if (!selectedId) return;
    setArchiving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/customers/${selectedId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "İşlem tamamlanamadı." });
        return;
      }
      setConfirmArchiveOpen(false);
      setSelectedId(null);
      setDetail(null);
      setFeedback({
        type: "ok",
        text:
          json.mode === "ARCHIVED"
            ? "Müşteri randevu geçmişi korunarak Arşiv segmentine taşındı."
            : "Müşteri kaydı kalıcı olarak silindi.",
      });
      await loadCustomers();
    } catch {
      setFeedback({ type: "err", text: "İşlem sırasında bağlantı hatası oluştu." });
    } finally {
      setArchiving(false);
    }
  }

  async function sendConsentForm(contactId: string) {
    setFeedback(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, sendViaWhatsapp: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({ type: "ok", text: `${json.message} Link: ${json.signUrl}` });
        await loadCustomerDetail(contactId);
      } else {
        setFeedback({ type: "err", text: json.error ?? "KVKK formu gönderilemedi." });
      }
    } catch {
      setFeedback({ type: "err", text: "KVKK formu gönderilirken bağlantı hatası oluştu." });
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const rows = lines
        .slice(1)
        .map((line) => {
          const [name, phone, tags, notes] = line.split(/[;,]/).map((s) => s.replace(/^"|"$/g, "").trim());
          return { name: name ?? "", phone: phone ?? "", tags, notes };
        })
        .filter((r) => r.name && r.phone);

      if (rows.length === 0) {
        setFeedback({
          type: "err",
          text: "CSV dosyasında geçerli satır bulunamadı (Sütunlar: Ad Soyad, Telefon, Etiket, Not).",
        });
        return;
      }

      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "CSV içe aktarma başarısız." });
        return;
      }
      setFeedback({ type: "ok", text: json.message ?? "İçe aktarma tamamlandı." });
      await loadCustomers();
    } catch {
      setFeedback({ type: "err", text: "CSV dosyası okunamadı." });
    }
  }

  async function handleAddWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setWlSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: wlName, contactPhone: wlPhone, preferredDate: wlDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Bekleme listesine eklenemedi." });
        return;
      }
      setWlName("");
      setWlPhone("");
      setFeedback({
        type: "ok",
        text: "Müşteri bekleme listesine eklendi. O gün iptal olursa otomatik WhatsApp mesajı gidecek.",
      });
      await loadWaitlist();
    } catch {
      setFeedback({ type: "err", text: "Sunucuya bağlanılamadı." });
    } finally {
      setWlSaving(false);
    }
  }

  const activeFilterCount =
    (tagFilter ? 1 : 0) +
    (userRole !== "STAFF" && memberFilter !== "ALL" ? 1 : 0) +
    (sort !== "recent" ? 1 : 0) +
    (pageSize !== 20 ? 1 : 0);

  return (
    <div className="space-y-3 sm:space-y-4 min-w-0">
      {/* Compact Header — Title + Actions on one clean row */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
            <span className="sm:hidden">Müşteriler</span>
            <span className="hidden sm:inline">Müşteri Yönetimi (CRM)</span>
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 mt-0.5">
            Merkezi müşteri profilleri, segmentler, kronolojik aktivite geçmişi ve KVKK onam takibi.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <label className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">CSV İçe Aktar</span>
            <span className="sm:hidden">CSV</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              className="sr-only"
              aria-label="CSV müşteri dosyası yükle"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Müşteri</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>
      </div>

      {/* Top Mode Switcher: CRM vs Bekleme Listesi — full-width 2-col on mobile */}
      <div className="grid grid-cols-2 sm:inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "customers"
              ? "bg-white text-emerald-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Müşteriler ({total})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("waitlist")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "waitlist"
              ? "bg-white text-emerald-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Bekleme Listesi ({waitlist.length})</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
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

      {activeTab === "customers" ? (
        <div className="space-y-3">
          {/* Compact Search + Collapsible Filters Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Müşteri adı, telefon, etiket veya not ara"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ad, telefon, etiket veya not ara..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 ${
                  filtersOpen || activeFilterCount > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filtre</span>
                {activeFilterCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <div
              className={`${
                filtersOpen
                  ? "grid grid-cols-2 gap-2 pt-2 border-t border-slate-100"
                  : "hidden"
              } lg:flex lg:items-center lg:gap-2 lg:pt-0 lg:border-t-0`}
            >
              <select
                aria-label="Etiket filtresi"
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full lg:w-auto px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="">Tüm Etiketler</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {userRole !== "STAFF" && (
                <select
                  aria-label="Sorumlu personel filtresi"
                  value={memberFilter}
                  onChange={(e) => {
                    setMemberFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full lg:w-auto px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Tüm Personel</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label="Sıralama"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full lg:w-auto px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="recent">En Güncel</option>
                <option value="name_asc">Ad (A → Z)</option>
                <option value="name_desc">Ad (Z → A)</option>
                <option value="appointments_desc">En Çok Randevu</option>
                <option value="oldest">En Eski Kayıt</option>
              </select>

              <select
                aria-label="Sayfa boyutu"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full lg:w-auto px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value={10}>10 / sayfa</option>
                <option value={20}>20 / sayfa</option>
                <option value={50}>50 / sayfa</option>
              </select>
            </div>
          </div>

          {/* Segments Horizontal Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {SEGMENTS.map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => {
                  setSegment(seg.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  segment === seg.id
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Master-Detail Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Paginated Directory */}
            <div
              className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col ${
                selectedId ? "hidden lg:flex" : "flex"
              }`}
            >
              {loadingList ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="h-16 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : listError ? (
                <div className="p-8 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">{listError}</p>
                  <button
                    type="button"
                    onClick={() => loadCustomers()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <>
                  <CustomScroll variant="light" className="max-h-[600px]">
                    <div className="divide-y divide-slate-100">
                      {contacts.map((c) => {
                        const active = selectedId === c.id;
                        const tags = parseTags(c.tags);
                        const signed = c.consentForms.some((f) => f.signedAt);
                        const assignee =
                          c.conversations[0]?.assignedMembership?.user.name ??
                          c.appointments[0]?.assignedMembership?.user.name ??
                          null;
                        const lastAppt = c.appointments[0] ?? null;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className={`w-full text-left p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                              active
                                ? "bg-emerald-50/75 border-l-[3px] border-l-emerald-600"
                                : "border-l-[3px] border-l-transparent"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                                active
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {getInitials(c.name)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-sm text-slate-900 truncate">
                                    {c.name}
                                  </span>
                                  {signed && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> KVKK
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                                  {c._count.appointments} randevu
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-0.5 text-xs text-slate-500">
                                <span className="truncate">{formatPhoneDisplay(c.phoneE164)}</span>
                                {lastAppt && (
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    Son: {formatDateTR(lastAppt.startAt)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                {assignee && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                    <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                                    {assignee}
                                  </span>
                                )}
                                {tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold"
                                  >
                                    {t}
                                  </span>
                                ))}
                                {tags.length > 3 && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    +{tags.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {contacts.length === 0 && (
                        <div className="p-10 text-center space-y-2">
                          <Users className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-semibold text-slate-600">
                            Seçili kriterlere uygun müşteri bulunamadı
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Arama filtresini temizleyin veya yeni bir müşteri ekleyin.
                          </p>
                        </div>
                      )}
                    </div>
                  </CustomScroll>

                  {/* Server Pagination Bar */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-medium">
                      Toplam <strong className="text-slate-800">{total}</strong> müşteri
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Önceki sayfa"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-semibold text-slate-700">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Sonraki sayfa"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Central Customer Profile & Unified Chronological Timeline */}
            <div
              className={`lg:col-span-5 space-y-4 ${selectedId ? "block" : "hidden lg:block"}`}
            >
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                  }}
                  className="lg:hidden inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Müşteri Listesine Dön</span>
                </button>
              )}

              {loadingDetail ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
                  <div className="h-6 bg-slate-100 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-14 bg-slate-100 rounded-xl" />
                    <div className="h-14 bg-slate-100 rounded-xl" />
                  </div>
                  <div className="h-24 bg-slate-100 rounded-xl" />
                </div>
              ) : detailError ? (
                <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2">
                  <p className="text-xs font-semibold text-rose-700">{detailError}</p>
                  {selectedId && (
                    <button
                      type="button"
                      onClick={() => loadCustomerDetail(selectedId)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                    >
                      Tekrar Dene
                    </button>
                  )}
                </div>
              ) : detail ? (
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    {/* Profile Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(detail.contact.name)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-slate-900 truncate">
                            {detail.contact.name}
                          </h2>
                          <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 shrink-0" />
                            {formatPhoneDisplay(detail.contact.phoneE164)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href="/inbox"
                          title="WhatsApp Gelen Kutusunda Aç"
                          aria-label="WhatsApp Gelen Kutusunda Aç"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                        {userRole !== "STAFF" && (
                          <button
                            type="button"
                            title="Müşteriyi Arşivle / Sil"
                            aria-label="Müşteriyi Arşivle veya Sil"
                            onClick={() => setConfirmArchiveOpen(true)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Real KPI Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <p className="text-base font-extrabold text-slate-900">
                          {detail.stats.totalAppointments}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500">Randevu</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                        <p className="text-base font-extrabold text-emerald-700">
                          {detail.stats.completedAppointments}
                        </p>
                        <p className="text-[10px] font-semibold text-emerald-700">Tamamlanan</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                        <p className="text-base font-extrabold text-rose-700">
                          {detail.stats.cancelledAppointments}
                        </p>
                        <p className="text-[10px] font-semibold text-rose-700">İptal</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <p className="text-base font-extrabold text-slate-900">
                          {detail.stats.totalConversations}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500">Sohbet</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <span>İlk etkileşim: {formatDateTR(detail.stats.firstInteractionAt)}</span>
                      <span>Son etkileşim: {formatDateTR(detail.stats.lastInteractionAt)}</span>
                    </div>

                    {/* KVKK Consent Action */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          detail.contact.kvkkConsentAt
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {detail.contact.kvkkConsentAt ? "KVKK Onaylı" : "KVKK Onayı Bekliyor"}
                      </span>
                      <button
                        type="button"
                        onClick={() => sendConsentForm(detail.contact.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        KVKK Formu Gönder
                      </button>
                    </div>

                    {/* Edit Form (Name, Assignee, Tag Chips, Notes) */}
                    <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label
                          htmlFor="crm-edit-name"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Müşteri Adı Soyadı
                        </label>
                        <input
                          id="crm-edit-name"
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>

                      {userRole !== "STAFF" && (
                        <div>
                          <label
                            htmlFor="crm-edit-member"
                            className="block text-xs font-semibold text-slate-700 mb-1"
                          >
                            Sorumlu Personel
                          </label>
                          <select
                            id="crm-edit-member"
                            value={editMemberId}
                            onChange={(e) => setEditMemberId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                          >
                            <option value="">Atanmamış</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.user.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="crm-add-tag"
                          className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"
                        >
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          Etiketler
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {editTagList.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                            >
                              {t}
                              <button
                                type="button"
                                aria-label={`${t} etiketini kaldır`}
                                onClick={() => removeTagChip(t)}
                                className="hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            id="crm-add-tag"
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTagChip();
                              }
                            }}
                            placeholder="Etiket yazın (Örn: VIP)..."
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                          />
                          <button
                            type="button"
                            onClick={addTagChip}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="crm-edit-notes"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Müşteri Notları
                        </label>
                        <textarea
                          id="crm-edit-notes"
                          rows={3}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Müşteriye özel notlarınızı buraya yazın..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingDetail}
                        className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingDetail ? "Kaydediliyor..." : "Müşteri Profilini Güncelle"}
                      </button>
                    </form>
                  </div>

                  {/* Unified Chronological Activity Timeline */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        Birleşik Aktivite Geçmişi
                      </h3>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {detail.timeline.length} kayıt
                      </span>
                    </div>

                    <CustomScroll variant="light" className="max-h-[340px]">
                      <div className="space-y-2.5 pr-1">
                        {detail.timeline.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                                {item.kind === "MESSAGE" ? (
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : item.kind === "APPOINTMENT" ? (
                                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                ) : item.kind === "CONSENT" ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                ) : (
                                  <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className="truncate">{item.title}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatDateTR(item.at)} {formatTimeTR(item.at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 break-words line-clamp-3">
                              {item.detail}
                            </p>
                          </div>
                        ))}
                        {detail.timeline.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-6">
                            Henüz kayıtlı aktivite bulunmuyor.
                          </p>
                        )}
                      </div>
                    </CustomScroll>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Müşteri Profili Seçin</p>
                  <p className="text-xs text-slate-400">
                    Detayları, randevu istatistiklerini ve birleşik aktivite zaman çizelgesini görmek
                    için soldan bir müşteri seçin.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Smart Waitlist View */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Akıllı Bekleme Listesi ({waitlist.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            İptal edilen randevu olduğunda o gün için bekleyen müşteriye otomatik WhatsApp mesajı gider.
          </p>
          <form onSubmit={handleAddWaitlist} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              aria-label="Bekleme listesi müşteri adı"
              placeholder="Müşteri Adı"
              value={wlName}
              onChange={(e) => setWlName(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="tel"
              required
              aria-label="Bekleme listesi telefon"
              placeholder="05XX..."
              value={wlPhone}
              onChange={(e) => setWlPhone(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="date"
              required
              aria-label="Tercih edilen tarih"
              value={wlDate}
              onChange={(e) => setWlDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="submit"
              disabled={wlSaving}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {wlSaving ? "Ekleniyor..." : "Listeye Ekle"}
            </button>
          </form>

          {waitlist.length > 0 ? (
            <div className="divide-y divide-slate-100 pt-1">
              {waitlist.map((w) => (
                <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{w.contact.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatPhoneDisplay(w.contact.phoneE164)} · {formatDateTR(w.preferredDate)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                    {w.status === "NOTIFIED" ? "Bildirildi" : "Bekliyor"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Bekleme listesinde kayıtlı müşteri yok.
            </p>
          )}
        </div>
      )}

      {/* Create Customer Modal */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-title"
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!creating) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="create-customer-title" className="text-lg font-bold text-slate-900">
                Yeni Müşteri Ekle
              </h2>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label
                  htmlFor="crm-create-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Ad Soyad
                </label>
                <input
                  id="crm-create-name"
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="crm-create-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  WhatsApp Telefon
                </label>
                <input
                  id="crm-create-phone"
                  type="tel"
                  required
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              {userRole !== "STAFF" && (
                <div>
                  <label
                    htmlFor="crm-create-member"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Sorumlu Personel (Opsiyonel)
                  </label>
                  <select
                    id="crm-create-member"
                    value={createMemberId}
                    onChange={(e) => setCreateMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">Atanmamış</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="crm-create-tags"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Etiketler (virgülle ayırın)
                </label>
                <input
                  id="crm-create-tags"
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  placeholder="VIP, İlk Ziyaret"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="crm-create-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Notlar (Opsiyonel)
                </label>
                <textarea
                  id="crm-create-notes"
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold disabled:opacity-60"
              >
                {creating ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmArchiveOpen}
        title="Müşteriyi Arşivle / Sil"
        description={`"${detail?.contact.name ?? "Bu müşteri"}" için geçmiş randevu veya konuşma kaydı varsa veriler korunarak Arşiv segmentine taşınacak; geçmiş kaydı yoksa kalıcı olarak silinecektir.`}
        confirmLabel="Evet, Devam Et"
        variant="danger"
        loading={archiving}
        onCancel={() => setConfirmArchiveOpen(false)}
        onConfirm={handleArchiveOrDelete}
      />
    </div>
  );
}
