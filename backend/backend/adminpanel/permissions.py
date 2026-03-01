from __future__ import annotations

from rest_framework.permissions import BasePermission


class AdminPanelAccessPermission(BasePermission):
    message = "Нужно е потвърждение с код за достъп до админ панела."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if not (user.is_staff or user.is_superuser):
            self.message = "Нужни са администраторски права."
            return False

        token = getattr(request, "auth", None)
        if not token:
            self.message = "Нужно е потвърждение с код за достъп до админ панела."
            return False

        token_getter = getattr(token, "get", None)
        is_verified = bool(token_getter("admin_panel_verified")) if callable(token_getter) else False
        if not is_verified:
            self.message = "Нужно е потвърждение с код за достъп до админ панела."
            return False

        return True
