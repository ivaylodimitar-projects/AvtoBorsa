from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.authentication import JWTAuthentication

from backend.listings.realtime import user_notifications_group_name


@database_sync_to_async
def _resolve_user_id_from_query_string(query_string: bytes) -> int | None:
    raw_query = (query_string or b"").decode("utf-8", errors="ignore")
    token = (parse_qs(raw_query).get("token") or [None])[0]
    if not token:
        return None

    try:
        authenticator = JWTAuthentication()
        validated_token = authenticator.get_validated_token(token)
        user = authenticator.get_user(validated_token)
    except Exception:
        return None

    if not user or not user.is_authenticated:
        return None
    return int(user.id)


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    GROUP_NAME = "dealer-notifications"

    async def connect(self):
        self.user_group_name = None
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        user_id = await _resolve_user_id_from_query_string(self.scope.get("query_string", b""))
        if user_id:
            self.user_group_name = user_notifications_group_name(user_id)
            await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        if self.user_group_name:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def dealer_listings_updated(self, event):
        await self.send_json(
            {
                "type": "dealer_listings_updated",
                "timestamp": event.get("timestamp"),
            }
        )

    async def user_notification(self, event):
        await self.send_json(
            {
                "type": "user_notification",
                "timestamp": event.get("timestamp"),
                "notification": event.get("notification"),
            }
        )

