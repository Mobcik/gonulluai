"""Tek veya çoklu etkinlik için iCalendar (.ics) üretimi (RFC 5545 basit alt küme)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.config import settings
from app.models.event import Event


def _utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _fmt_utc(dt: datetime) -> str:
    return _utc(dt).strftime("%Y%m%dT%H%M%SZ")


def _escape(text: str) -> str:
    s = (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = s.replace("\n", "\\n")
    return s


def _vevent(event: Event, detail_url: str) -> list[str]:
    uid = f"{event.id}@gonulluai"
    start = event.event_date
    if start is None:
        return []
    end = event.end_time
    if end is None:
        end = start + timedelta(hours=2)

    loc_parts = [event.city or "", event.address or "", event.meeting_point or ""]
    location = _escape(", ".join(p for p in loc_parts if p).strip() or (event.city or ""))

    desc_bits = [
        (event.short_description or "").strip(),
        (event.description or "")[:1200],
        f"Detay: {detail_url}",
    ]
    description = _escape("\n\n".join(b for b in desc_bits if b))

    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_fmt_utc(datetime.now(timezone.utc))}",
        f"DTSTART:{_fmt_utc(start)}",
        f"DTEND:{_fmt_utc(end)}",
        f"SUMMARY:{_escape(event.title or 'Etkinlik')}",
        f"DESCRIPTION:{description}",
        f"LOCATION:{location}",
        f"URL:{detail_url}",
        "END:VEVENT",
    ]
    return lines


def calendar_bytes_for_events(events: Iterable[Event], prod_id: str = "-//GonulluAI//TR//TR") -> bytes:
    base = (settings.FRONTEND_URL or "http://localhost:5175").rstrip("/")
    all_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{prod_id}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    for e in events:
        url = f"{base}/events/{e.id}"
        all_lines.extend(_vevent(e, url))
    all_lines.append("END:VCALENDAR")

    body = "\r\n".join(all_lines) + "\r\n"
    return body.encode("utf-8")
