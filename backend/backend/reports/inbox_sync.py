import imaplib
import logging
import re
from email import message_from_bytes, policy
from email.header import decode_header
from email.message import Message
from email.utils import parseaddr, parsedate_to_datetime
from html import unescape

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .models import ContactInquiry

logger = logging.getLogger(__name__)

INQUIRY_ID_SUBJECT_RE = re.compile(r"\[inquiry\s*#\s*(\d+)\]", re.IGNORECASE)
INQUIRY_ID_REF_RE = re.compile(r"kar-inquiry-(\d+)-", re.IGNORECASE)
REPLY_BREAK_RE = re.compile(r"^on .+ wrote:\s*$", re.IGNORECASE)
HTML_TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"[ \t]+")

SYNC_LOCK_KEY = "contact_inquiry_inbox_sync_lock"
SYNC_LAST_KEY = "contact_inquiry_inbox_sync_last"


def _to_positive_int(value, default_value, min_value=1):
    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return default_value
    if parsed < min_value:
        return default_value
    return parsed


def _decode_header_value(value):
    if not value:
        return ""

    parts = []
    for chunk, encoding in decode_header(value):
        if isinstance(chunk, bytes):
            try:
                parts.append(chunk.decode(encoding or "utf-8", errors="replace"))
            except Exception:
                parts.append(chunk.decode("utf-8", errors="replace"))
        else:
            parts.append(str(chunk))
    return "".join(parts).strip()


def _strip_html(value):
    text = HTML_TAG_RE.sub(" ", value or "")
    text = unescape(text)
    text = WHITESPACE_RE.sub(" ", text)
    return text.strip()


def _extract_text_payload(email_message: Message):
    plain_text = ""
    html_text = ""

    if email_message.is_multipart():
        for part in email_message.walk():
            disposition = str(part.get("Content-Disposition") or "").lower()
            if "attachment" in disposition:
                continue

            content_type = part.get_content_type()
            if content_type not in {"text/plain", "text/html"}:
                continue

            try:
                content = part.get_content()
            except Exception:
                payload = part.get_payload(decode=True) or b""
                charset = part.get_content_charset() or "utf-8"
                content = payload.decode(charset, errors="replace")

            if content_type == "text/plain" and not plain_text:
                plain_text = str(content or "")
            if content_type == "text/html" and not html_text:
                html_text = str(content or "")
    else:
        content_type = email_message.get_content_type()
        try:
            content = email_message.get_content()
        except Exception:
            payload = email_message.get_payload(decode=True) or b""
            charset = email_message.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")

        if content_type == "text/plain":
            plain_text = str(content or "")
        elif content_type == "text/html":
            html_text = str(content or "")

    if plain_text.strip():
        return plain_text
    if html_text.strip():
        return _strip_html(html_text)
    return ""


def _clean_reply_text(raw_text):
    if not raw_text:
        return ""

    text = str(raw_text).replace("\r\n", "\n").replace("\r", "\n")
    cleaned_lines = []
    for line in text.split("\n"):
        line_stripped = line.strip()
        if REPLY_BREAK_RE.match(line_stripped):
            break
        if line_stripped.startswith(">"):
            continue
        if line_stripped == "-----Original Message-----":
            break
        if cleaned_lines and line_stripped.startswith(("From:", "Sent:", "Subject:", "To:")):
            break
        cleaned_lines.append(line.rstrip())

    cleaned = "\n".join(cleaned_lines).strip()
    if not cleaned:
        cleaned = text.strip()
    return cleaned[:8000]


def _extract_inquiry_id(subject, in_reply_to, references):
    for candidate in (subject, in_reply_to, references):
        value = str(candidate or "")
        if not value:
            continue
        subject_match = INQUIRY_ID_SUBJECT_RE.search(value)
        if subject_match:
            try:
                return int(subject_match.group(1))
            except (TypeError, ValueError):
                continue

        ref_match = INQUIRY_ID_REF_RE.search(value)
        if ref_match:
            try:
                return int(ref_match.group(1))
            except (TypeError, ValueError):
                continue

    return None


def _parse_received_at(date_header):
    if not date_header:
        return None
    try:
        received_at = parsedate_to_datetime(str(date_header))
    except (TypeError, ValueError):
        return None

    if received_at is None:
        return None
    if timezone.is_naive(received_at):
        return timezone.make_aware(received_at, timezone.get_current_timezone())
    return received_at


def _resolve_inquiry(sender_email, subject, in_reply_to, references):
    inquiry_id = _extract_inquiry_id(subject, in_reply_to, references)
    if inquiry_id:
        inquiry = ContactInquiry.objects.filter(pk=inquiry_id).first()
        if inquiry and str(inquiry.email or "").strip().lower() == sender_email:
            return inquiry

    inquiry = (
        ContactInquiry.objects.filter(email__iexact=sender_email, replied_at__isnull=False)
        .order_by("-replied_at", "-created_at")
        .first()
    )
    if inquiry:
        return inquiry

    return ContactInquiry.objects.filter(email__iexact=sender_email).order_by("-created_at").first()


def _sync_contact_inquiries_from_inbox():
    host = str(getattr(settings, "SUPPORT_INBOX_IMAP_HOST", "") or "").strip()
    user = str(getattr(settings, "SUPPORT_INBOX_IMAP_USER", "") or "").strip()
    password = str(getattr(settings, "SUPPORT_INBOX_IMAP_PASSWORD", "") or "").strip()
    mailbox_name = str(getattr(settings, "SUPPORT_INBOX_IMAP_MAILBOX", "INBOX") or "INBOX").strip() or "INBOX"
    port = _to_positive_int(getattr(settings, "SUPPORT_INBOX_IMAP_PORT", 993), 993)
    timeout_seconds = _to_positive_int(
        getattr(settings, "SUPPORT_INBOX_IMAP_TIMEOUT_SECONDS", 12),
        12,
    )
    use_ssl = bool(getattr(settings, "SUPPORT_INBOX_IMAP_USE_SSL", True))
    max_messages = _to_positive_int(getattr(settings, "SUPPORT_INBOX_SYNC_MAX_MESSAGES", 100), 100)
    allow_self_reply = bool(getattr(settings, "SUPPORT_INBOX_ALLOW_SELF_REPLY", False))
    support_from_email = str(
        getattr(settings, "SUPPORT_FROM_EMAIL", "")
        or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        or ""
    ).strip().lower()

    if not host or not user or not password:
        return

    client = None
    try:
        if use_ssl:
            client = imaplib.IMAP4_SSL(host, port, timeout=timeout_seconds)
        else:
            client = imaplib.IMAP4(host, port, timeout=timeout_seconds)

        client.login(user, password)
        select_status, _ = client.select(mailbox_name)
        if select_status != "OK":
            return

        search_status, search_payload = client.search(None, "UNSEEN")
        if search_status != "OK" or not search_payload or not search_payload[0]:
            return

        message_numbers = search_payload[0].split()
        if not message_numbers:
            return
        message_numbers = message_numbers[-max_messages:]

        for message_number in message_numbers:
            fetch_status, fetch_payload = client.fetch(message_number, "(BODY.PEEK[])")
            if fetch_status != "OK" or not fetch_payload:
                continue

            raw_email = None
            for entry in fetch_payload:
                if isinstance(entry, tuple) and len(entry) >= 2:
                    raw_email = entry[1]
                    break
            if not raw_email:
                continue

            parsed_email = message_from_bytes(raw_email, policy=policy.default)
            sender_email = parseaddr(str(parsed_email.get("From") or ""))[1].strip().lower()
            if not sender_email:
                continue
            if not allow_self_reply and sender_email in {support_from_email, user.lower()}:
                continue

            subject = _decode_header_value(str(parsed_email.get("Subject") or ""))
            in_reply_to = str(parsed_email.get("In-Reply-To") or "")
            references = str(parsed_email.get("References") or "")
            message_id = str(parsed_email.get("Message-ID") or "").strip()[:255]

            inquiry = _resolve_inquiry(sender_email, subject, in_reply_to, references)
            if not inquiry:
                continue
            if message_id and inquiry.last_inbound_message_id == message_id:
                client.store(message_number, "+FLAGS", "\\Seen")
                continue

            payload_text = _clean_reply_text(_extract_text_payload(parsed_email))
            if not payload_text:
                continue

            inquiry.customer_reply = payload_text
            inquiry.customer_replied_at = _parse_received_at(parsed_email.get("Date")) or timezone.now()
            inquiry.status = ContactInquiry.STATUS_NEW
            inquiry.last_inbound_message_id = message_id
            inquiry.save(
                update_fields=[
                    "customer_reply",
                    "customer_replied_at",
                    "status",
                    "last_inbound_message_id",
                    "updated_at",
                ]
            )

            client.store(message_number, "+FLAGS", "\\Seen")
    except Exception:
        logger.exception(
            "Failed to sync contact inquiry inbox (host=%r, port=%s, mailbox=%r).",
            host,
            port,
            mailbox_name,
        )
    finally:
        if client is not None:
            try:
                client.logout()
            except Exception:
                pass


def sync_contact_inquiries_from_inbox():
    if not bool(getattr(settings, "SUPPORT_INBOX_SYNC_ENABLED", False)):
        return

    min_interval = _to_positive_int(
        getattr(settings, "SUPPORT_INBOX_SYNC_MIN_INTERVAL_SECONDS", 20),
        20,
    )
    now_ts = timezone.now().timestamp()
    last_synced_ts = cache.get(SYNC_LAST_KEY)
    if isinstance(last_synced_ts, (int, float)) and (now_ts - float(last_synced_ts)) < min_interval:
        return

    if not cache.add(SYNC_LOCK_KEY, "1", timeout=max(min_interval, 30)):
        return

    try:
        _sync_contact_inquiries_from_inbox()
    finally:
        cache.set(SYNC_LAST_KEY, now_ts, timeout=max(min_interval * 5, 300))
        cache.delete(SYNC_LOCK_KEY)
