"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { CustomScroll } from "@/components/CustomScroll";

interface Slot {
  time: string;
  available: boolean;
  source?: string;
}

export function TimeSlotPicker({
  membershipId,
  date,
  selectedTime,
  onSelectTime,
}: {
  membershipId: string;
  date: string;
  selectedTime: string;
  onSelectTime: (time: string) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [workHours, setWorkHours] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!membershipId || !date) return;
    let active = true;
    setLoading(true);
    fetch(
      `/api/appointments/availability?membershipId=${encodeURIComponent(membershipId)}&date=${encodeURIComponent(date)}`
    )
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((data) => {
        if (!active) return;
        const nextSlots = (data.slots ?? []) as Slot[];
        setSlots(nextSlots);
        if (data.workHours) setWorkHours(data.workHours);

        // If current selectedTime isn't in available slots, pick first green slot
        const currentOk = nextSlots.some((s) => s.time === selectedTime && s.available);
        if (!currentOk) {
          const firstFree = nextSlots.find((s) => s.available);
          if (firstFree) onSelectTime(firstFree.time);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [membershipId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-600" />
          Canlı Müsaitlik (Yeşil: Boş • Kırmızı: Dolu)
        </span>
        {workHours && (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Mesai: {workHours.start} - {workHours.end}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-1.5 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <CustomScroll variant="light" className="max-h-44">
          <div className="grid grid-cols-4 gap-1.5 pr-1">
            {slots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              if (!slot.available) {
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled
                    title={
                      slot.source === "GOOGLE"
                        ? "Google Takviminde dolu"
                        : "TAKWİMO'da randevusu var"
                    }
                    className="py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-500 border border-rose-200 cursor-not-allowed line-through opacity-75"
                  >
                    {slot.time}
                  </button>
                );
              }
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => onSelectTime(slot.time)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </CustomScroll>
      )}
    </div>
  );
}
