from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.core.mail import send_mail
from django.core.cache import cache
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from backend.listings.models import get_expiry_cutoff
from .serializers import (
    PrivateUserSerializer, BusinessUserSerializer, UserProfileSerializer,
    UserBalanceSerializer, DealerListSerializer, DealerDetailSerializer
)
from .models import PrivateUser, BusinessUser, UserProfile


def _refresh_cookie_max_age_seconds() -> int:
    return int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=_refresh_cookie_max_age_seconds(),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def send_verification_email(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = settings.FRONTEND_BASE_URL.rstrip("/")
    verify_url = f"{base_url}/verify-email?uid={uid}&token={token}"
    subject = "Потвърдете акаунта си в Kar.bg"
    message = (
        "Здравейте,\n\n"
        "Благодарим за регистрацията в Kar.bg. Моля, потвърдете акаунта си чрез линка по-долу:\n"
        f"{verify_url}\n\n"
        "Ако не сте вие, игнорирайте този имейл.\n"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register_private_user(request):
    """API endpoint for private user registration"""
    if request.method == 'POST':
        serializer = PrivateUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                send_verification_email(user.user)
                return Response(
                    {
                        'message': 'Регистрацията е успешна. Изпратихме ти имейл за потвърждение.',
                        'email': serializer.validated_data['email'],
                        'verification_required': True,
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """API endpoint for user login"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Try to authenticate with email
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        user_obj = None

    if user_obj and user_obj.check_password(password) and not user_obj.is_active:
        return Response(
            {'error': 'Акаунтът не е потвърден. Проверете пощата си.'},
            status=status.HTTP_403_FORBIDDEN
        )

    user = authenticate(username=user_obj.username, password=password) if user_obj else None

    if user is None:
        return Response(
            {'error': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)

    # Determine user type
    user_type = 'private'
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'created_at': user.date_joined,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_admin': bool(user.is_staff or user.is_superuser),
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username
        if user.business_profile.profile_image:
            user_data['profile_image_url'] = request.build_absolute_uri(
                user.business_profile.profile_image.url
            )

    # Get user balance
    try:
        profile = UserProfile.objects.get(user=user)
        balance = float(profile.balance)
    except UserProfile.DoesNotExist:
        balance = 0.0

    user_data['balance'] = balance

    response = Response({
        'access': str(refresh.access_token),
        'user': {
            **user_data,
            'userType': user_type
        }
    }, status=status.HTTP_200_OK)
    _set_refresh_cookie(response, str(refresh))
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """Refresh access token using HttpOnly refresh-token cookie."""
    refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if not refresh_token:
        # Temporary fallback for older clients still sending refresh in body.
        refresh_token = request.data.get('refresh')

    if not refresh_token:
        response = Response(
            {'error': 'Refresh token is missing.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        _clear_refresh_cookie(response)
        return response

    serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
    try:
        serializer.is_valid(raise_exception=True)
    except Exception:
        response = Response(
            {'error': 'Refresh token is invalid or expired.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        _clear_refresh_cookie(response)
        return response

    payload = serializer.validated_data
    next_access = payload.get('access')
    next_refresh = payload.get('refresh')

    response = Response({'access': next_access}, status=status.HTTP_200_OK)
    if next_refresh:
        _set_refresh_cookie(response, next_refresh)
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """API endpoint for user logout"""
    refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            pass

    response = Response(
        {'message': 'Logout successful'},
        status=status.HTTP_200_OK
    )
    _clear_refresh_cookie(response)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """API endpoint to get current user info"""
    user = request.user
    user_type = 'private'
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'created_at': user.date_joined,
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username
        if user.business_profile.profile_image:
            user_data['profile_image_url'] = request.build_absolute_uri(
                user.business_profile.profile_image.url
            )

    # Get user balance
    try:
        profile = UserProfile.objects.get(user=user)
        balance = float(profile.balance)
    except UserProfile.DoesNotExist:
        balance = 0.0

    return Response({
        'id': user.id,
        'email': user.email,
        'userType': user_type,
        'balance': balance,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_admin': bool(user.is_staff or user.is_superuser),
        **user_data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_business_user(request):
    """API endpoint for business user registration"""
    if request.method == 'POST':
        serializer = BusinessUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_verification_email(user.user)
            return Response(
                {
                    'message': 'Регистрацията е успешна. Изпратихме ти имейл за потвърждение.',
                    'dealer_name': serializer.validated_data['dealer_name'],
                    'username': serializer.validated_data['username'],
                    'verification_required': True,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email е задължителен.'}, status=status.HTTP_400_BAD_REQUEST)

    email_normalized = str(email).strip().lower()
    cooldown_seconds = getattr(settings, 'PASSWORD_RESET_COOLDOWN_SECONDS', 60)
    cache_key = f"password-reset:{email_normalized}"
    if cache.get(cache_key):
        return Response(
            {
                'error': f'Моля, изчакай {cooldown_seconds} секунди преди нов опит.',
                'retry_after': cooldown_seconds,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    cache.set(cache_key, True, timeout=cooldown_seconds)

    user = User.objects.filter(email=email_normalized).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        base_url = settings.FRONTEND_BASE_URL.rstrip("/")
        reset_url = f"{base_url}/reset-password?uid={uid}&token={token}"
        subject = "Смяна на парола в Kar.bg"
        message = (
            "Здравейте,\n\n"
            "Получихме заявка за смяна на парола. Ако това сте вие, използвайте линка по-долу:\n"
            f"{reset_url}\n\n"
            "Ако не сте вие, игнорирайте този имейл.\n"
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

    return Response(
        {'message': 'Ако този имейл съществува, ще получиш инструкции за смяна на парола.'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not uidb64 or not token or not new_password:
        return Response({'error': 'Липсва информация за смяна на парола.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({'error': 'Невалиден линк за смяна на парола.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Линкът е невалиден или изтекъл.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response({'message': 'Паролата е сменена успешно.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request):
    uidb64 = request.query_params.get('uid')
    token = request.query_params.get('token')
    if not uidb64 or not token:
        return Response({'error': 'Невалиден линк за потвърждение.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({'error': 'Невалиден линк за потвърждение.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.is_active:
        return Response({'message': 'Акаунтът вече е потвърден.'}, status=status.HTTP_200_OK)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'message': 'Акаунтът е потвърден успешно.'}, status=status.HTTP_200_OK)

    return Response({'error': 'Линкът е невалиден или изтекъл.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_balance(request):
    """API endpoint to get current user's balance"""
    try:
        profile = UserProfile.objects.get(user=request.user)
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for the current user."""
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not old_password or not new_password or not confirm_password:
        return Response({'error': 'Всички полета са задължителни.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm_password:
        return Response({'error': 'Паролите не съвпадат.'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old_password):
        return Response({'error': 'Старата парола е грешна.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()
    return Response({'message': 'Паролата е сменена успешно.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_names(request):
    """Update the first/last name for the current user."""
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    if first_name is None:
        first_name = ''
    if last_name is None:
        last_name = ''
    first_name = str(first_name).strip()
    last_name = str(last_name).strip()

    if len(first_name) > 150 or len(last_name) > 150:
        return Response({'error': 'Името е твърде дълго.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.first_name = first_name
    request.user.last_name = last_name
    request.user.save()
    return Response(
        {'first_name': first_name, 'last_name': last_name},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Delete the current user's account."""
    password = request.data.get("password")
    if not password:
        return Response({'error': 'Паролата е задължителна.'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(password):
        return Response({'error': 'Паролата е грешна.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.delete()
    return Response({'message': 'Акаунтът е изтрит.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topup_balance(request):
    """API endpoint to top-up user balance"""
    try:
        amount = request.data.get('amount')

        # Validate amount
        if amount is None:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = float(amount)
            if amount <= 0:
                return Response(
                    {'error': 'Amount must be greater than 0'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if amount > 999999.99:
                return Response(
                    {'error': 'Amount exceeds maximum limit'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        # Update balance
        from decimal import Decimal
        profile.balance += Decimal(str(amount))
        profile.save()

        serializer = UserProfileSerializer(profile)
        return Response(
            {
                'message': 'Balance updated successfully',
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def list_dealers(request):
    """List all business users / dealers"""
    dealers = BusinessUser.objects.all().order_by('-created_at')
    serializer = DealerListSerializer(dealers, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def dealer_detail(request, pk):
    """Get a single dealer's full info + their listings"""
    try:
        dealer = BusinessUser.objects.get(pk=pk)
    except BusinessUser.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DealerDetailSerializer(dealer, context={'request': request})
    data = serializer.data

    # Include dealer's active listings
    from backend.listings.serializers import CarListingSerializer
    cutoff = get_expiry_cutoff()
    listings = dealer.user.car_listings.filter(
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).order_by('-created_at')
    listings_data = CarListingSerializer(listings, many=True, context={'request': request}).data
    data['listings'] = listings_data

    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_photo(request):
    """Upload profile photo for business users (downscaled to 160x160)"""
    user = request.user
    if not hasattr(user, 'business_profile'):
        return Response(
            {'error': 'Only business users can upload a profile photo'},
            status=status.HTTP_403_FORBIDDEN
        )
    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        business = user.business_profile
        # Delete old image if exists
        if business.profile_image:
            business.profile_image.delete(save=False)
        business.profile_image = image
        business.save()  # save() handles downscaling

        image_url = request.build_absolute_uri(business.profile_image.url) if business.profile_image else None
        return Response({'profile_image_url': image_url}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_about(request):
    """Update the about_text for business users"""
    user = request.user
    if not hasattr(user, 'business_profile'):
        return Response(
            {'error': 'Only business users can update about text'},
            status=status.HTTP_403_FORBIDDEN
        )

    about_text = request.data.get('about_text', '')
    business = user.business_profile
    business.about_text = about_text
    business.save()

    return Response({'about_text': business.about_text}, status=status.HTTP_200_OK)
