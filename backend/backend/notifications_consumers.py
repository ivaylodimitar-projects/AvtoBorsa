from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    GROUP_NAME = "dealer-notifications"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def dealer_listings_updated(self, event):
        await self.send_json(
            {
                "type": "dealer_listings_updated",
                "timestamp": event.get("timestamp"),
            }
        )

