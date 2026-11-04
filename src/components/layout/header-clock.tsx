"use client";

import { useSyncExternalStore } from "react";
import { Clock3 } from "lucide-react";

let currentSecond = Math.floor(Date.now() / 1000);
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (timer === undefined) {
    timer = window.setInterval(() => {
      const next = Math.floor(Date.now() / 1000);
      if (next === currentSecond) return;
      currentSecond = next;
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  return currentSecond;
}

function getServerSnapshot() {
  return null;
}

const timeFormatter = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function HeaderClock() {
  const seconds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (seconds === null) {
    return (
      <span className="topbar-clock" aria-hidden="true">
        <Clock3 size={14} />
        <span className="clock-time">--:--</span>
      </span>
    );
  }

  const date = new Date(seconds * 1000);
  const parts = timeFormatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  const second = parts.find((part) => part.type === "second")?.value ?? "--";
  const label = `${hour}:${minute}:${second}`;

  return (
    <time
      className="topbar-clock"
      dateTime={date.toISOString()}
      title={dateFormatter.format(date)}
      aria-label={`Ora locală ${label}`}
    >
      <Clock3 size={14} />
      <span className="clock-time">
        {hour}:{minute}
        <span className="clock-seconds">:{second}</span>
      </span>
    </time>
  );
}
