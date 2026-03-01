from __future__ import annotations

from datetime import datetime, timezone

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache


DEALER_NOTIFICATIONS_GROUP = "dealer-notifications"
USER_NOTIFICATIONS_GROUP_PREFIX = "user-notifications"
USER_NOTIFICATION_QUEUE_CACHE_PREFIX = "user-notification-queue"
USER_NOTIFICATION_QUEUE_TTL_SECONDS = 7 * 24 * 60 * 60
USER_NOTIFICATION_QUEUE_MAX_ITEMS = 50


def broadcast_dealer_listings_updated() -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        DEALER_NOTIFICATIONS_GROUP,
        {
            "type": "dealer_listings_updated",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def user_notifications_group_name(user_id: int) -> str:
    return f"{USER_NOTIFICATIONS_GROUP_PREFIX}-{int(user_id)}"


def _user_notification_queue_cache_key(user_id: int) -> str:
    return f"{USER_NOTIFICATION_QUEUE_CACHE_PREFIX}:{int(user_id)}"


def queue_user_notification(user_id: int, notification: dict) -> None:
    if not user_id or not isinstance(notification, dict):
        return

    cache_key = _user_notification_queue_cache_key(user_id)
    queue = cache.get(cache_key)
    if not isinstance(queue, list):
        queue = []

    notification_id = str(notification.get("id") or "").strip()
    if notification_id:
        queue = [item for item in queue if str(item.get("id") or "").strip() != notification_id]

    queue.insert(0, notification)
    cache.set(
        cache_key,
        queue[:USER_NOTIFICATION_QUEUE_MAX_ITEMS],
        timeout=USER_NOTIFICATION_QUEUE_TTL_SECONDS,
    )


def drain_user_notifications(user_id: int, limit: int = 20) -> list[dict]:
    if not user_id:
        return []

    safe_limit = max(1, min(int(limit or 20), USER_NOTIFICATION_QUEUE_MAX_ITEMS))
    cache_key = _user_notification_queue_cache_key(user_id)
    queue = cache.get(cache_key)
    if not isinstance(queue, list) or not queue:
        return []

    drained = queue[:safe_limit]
    remaining = queue[safe_limit:]
    if remaining:
        cache.set(cache_key, remaining, timeout=USER_NOTIFICATION_QUEUE_TTL_SECONDS)
    else:
        cache.delete(cache_key)
    return drained


def broadcast_user_notification(user_id: int, notification: dict) -> None:
    if not user_id or not isinstance(notification, dict):
        return

    queue_user_notification(user_id, notification)

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        user_notifications_group_name(user_id),
        {
            "type": "user_notification",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "notification": notification,
        },
    )

