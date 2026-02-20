from __future__ import annotations

from datetime import datetime, timezone

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


DEALER_NOTIFICATIONS_GROUP = "dealer-notifications"


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

