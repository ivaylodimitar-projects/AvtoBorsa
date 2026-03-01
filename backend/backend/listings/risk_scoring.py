import re
from dataclasses import dataclass


HIGH_RISK_THRESHOLD = 70

URL_SCHEME_PATTERN = re.compile(r"(?i)\b(?:https?://|www\.)[^\s<>()]+")
URL_DOMAIN_PATTERN = re.compile(
    r"(?i)(?<!@)\b(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)"
    r"(?:bg|com|net|org|eu|io|co|de|uk|ru|gr|ro|tr|me|app|site|online|xyz|info|biz)"
    r"(?:/[^\s<>()]*)?"
)
OBFUSCATED_LINK_PATTERN = re.compile(
    r"(?i)\b(?:h\s*[\.\-_:]?\s*t\s*[\.\-_:]?\s*t\s*[\.\-_:]?\s*p\s*s?)\b|"
    r"(?<!@)\b[a-z0-9][a-z0-9-]{1,30}\s*(?:\(dot\)|\sdot\s|\sточка\s)\s*"
    r"(?:bg|com|net|org|eu|io|co|de|uk|ru|gr|ro|tr|me|app|site|online|xyz|info|biz)\b"
)
PHONE_PATTERN = re.compile(r"(?:\+?\d[\d\-\s().]{7,}\d)")
REPEATED_CHAR_PATTERN = re.compile(r"(.)\1{6,}")
EXCESSIVE_PUNCTUATION_PATTERN = re.compile(r"([!?])\1{3,}")

CONTACT_BYPASS_KEYWORDS = (
    "telegram",
    "whatsapp",
    "viber",
    "messenger",
    "instagram",
    "facebook",
    "tiktok",
    "signal",
    "snapchat",
    "пиши на лично",
    "лс",
    "dm",
)
PAYMENT_RISK_KEYWORDS = (
    "revolut",
    "western union",
    "moneygram",
    "crypto",
    "paypal",
    "cashapp",
    "телеграм",
    "вайбър",
    "смс",
    "bitcoin",
    "usdt",
    "gift card",
    "ваучер",
    "капаро по",
    "deposit only",
)

RISK_FLAG_LABELS_BG = {
    "external_links": "външни линкове",
    "obfuscated_links": "обфускирани линкове",
    "contact_bypass_keywords": "заобикаляне на контактния канал",
    "payment_risk_keywords": "рискови платежни условия",
    "multiple_phone_numbers": "множество телефони в текста",
    "repeated_characters": "повтарящи се символи",
    "excessive_punctuation": "прекомерна пунктуация",
    "excessive_caps": "прекалено главни букви",
}


@dataclass
class ListingRiskAssessment:
    score: int
    flags: list[str]
    link_hits_by_field: dict[str, list[str]]

    @property
    def has_links(self) -> bool:
        return bool(self.link_hits_by_field)

    @property
    def is_high_risk(self) -> bool:
        return self.score >= HIGH_RISK_THRESHOLD


def _normalize_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return " ".join(str(item) for item in value if item is not None).strip()
    return str(value).strip()


def _keyword_hits(text: str, keywords: tuple[str, ...]) -> int:
    lowered = text.lower()
    return sum(1 for keyword in keywords if keyword in lowered)


def _extract_links(text: str) -> list[str]:
    matches = []
    for pattern in (URL_SCHEME_PATTERN, URL_DOMAIN_PATTERN):
        for match in pattern.finditer(text):
            token = match.group(0).strip()
            if token:
                matches.append(token)

    unique = []
    seen = set()
    for item in matches:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def evaluate_listing_risk(
    *,
    text_fields: dict[str, str],
    phone: str = "",
    email: str = "",
) -> ListingRiskAssessment:
    normalized_text_fields = {
        field: _normalize_text(value)
        for field, value in (text_fields or {}).items()
    }

    link_hits_by_field: dict[str, list[str]] = {}
    for field_name, text_value in normalized_text_fields.items():
        link_hits = _extract_links(text_value)
        if link_hits:
            link_hits_by_field[field_name] = link_hits

    concatenated_text = " ".join(filter(None, normalized_text_fields.values()))
    contact_payload = " ".join(filter(None, [concatenated_text, _normalize_text(phone), _normalize_text(email)]))

    flags: list[str] = []
    score = 0

    if link_hits_by_field:
        flags.append("external_links")
        score += 80

    obfuscated_hits = len(OBFUSCATED_LINK_PATTERN.findall(concatenated_text))
    if obfuscated_hits:
        flags.append("obfuscated_links")
        score += min(35, 15 + (obfuscated_hits * 8))

    contact_keyword_hits = _keyword_hits(contact_payload, CONTACT_BYPASS_KEYWORDS)
    if contact_keyword_hits:
        flags.append("contact_bypass_keywords")
        score += min(35, 10 + (contact_keyword_hits * 6))

    payment_keyword_hits = _keyword_hits(contact_payload, PAYMENT_RISK_KEYWORDS)
    if payment_keyword_hits:
        flags.append("payment_risk_keywords")
        score += min(35, 12 + (payment_keyword_hits * 7))

    phone_hits = len(PHONE_PATTERN.findall(contact_payload))
    if phone_hits >= 2:
        flags.append("multiple_phone_numbers")
        score += min(20, 10 + ((phone_hits - 2) * 5))

    if REPEATED_CHAR_PATTERN.search(concatenated_text):
        flags.append("repeated_characters")
        score += 10

    if EXCESSIVE_PUNCTUATION_PATTERN.search(concatenated_text):
        flags.append("excessive_punctuation")
        score += 10

    title_text = _normalize_text(normalized_text_fields.get("title", ""))
    alpha_chars = [char for char in title_text if char.isalpha()]
    if len(alpha_chars) >= 8:
        upper_ratio = sum(1 for char in alpha_chars if char.isupper()) / max(1, len(alpha_chars))
        if upper_ratio >= 0.85:
            flags.append("excessive_caps")
            score += 10

    return ListingRiskAssessment(
        score=min(100, score),
        flags=flags,
        link_hits_by_field=link_hits_by_field,
    )


def describe_risk_flags_bg(flags: list[str]) -> list[str]:
    normalized = []
    for flag in flags or []:
        label = RISK_FLAG_LABELS_BG.get(str(flag), str(flag))
        if label not in normalized:
            normalized.append(label)
    return normalized
