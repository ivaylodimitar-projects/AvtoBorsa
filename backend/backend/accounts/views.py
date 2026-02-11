from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.parsers import MultiPartParser, FormParser
from backend.listings.models import get_expiry_cutoff
from .serializers import (
    PrivateUserSerializer, BusinessUserSerializer, UserProfileSerializer,
    UserBalanceSerializer, DealerListSerializer, DealerDetailSerializer
)
from .models import PrivateUser, BusinessUser, UserProfile


@api_view(['POST'])
@permission_classes([AllowAny])
def register_private_user(request):
    """API endpoint for private user registration"""
    if request.method == 'POST':
        serializer = PrivateUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                # Create token for the user
                token, created = Token.objects.get_or_create(user=user.user)
                return Response(
                    {
                        'message': 'Профилът е създаден успешно',
                        'email': serializer.validated_data['email'],
                        'token': token.key,
                        'user': {
                            'id': user.user.id,
                            'email': user.email,
                            'userType': 'private'
                        }
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
        user = User.objects.get(email=email)
        user = authenticate(username=user.username, password=password)
    except User.DoesNotExist:
        user = None

    if user is None:
        return Response(
            {'error': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Get or create token
    token, created = Token.objects.get_or_create(user=user)

    # Determine user type
    user_type = 'private'
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username

    return Response({
        'token': token.key,
        'user': {
            **user_data,
            'userType': user_type
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """API endpoint for user logout"""
    # Delete the token
    request.user.auth_token.delete()
    return Response(
        {'message': 'Logout successful'},
        status=status.HTTP_200_OK
    )


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
            # Create token for the user
            token, created = Token.objects.get_or_create(user=user.user)
            return Response(
                {
                    'message': 'Бизнес профилът е създаден успешно',
                    'dealer_name': serializer.validated_data['dealer_name'],
                    'username': serializer.validated_data['username'],
                    'token': token.key,
                    'user': {
                        'id': user.user.id,
                        'email': user.email,
                        'username': user.username,
                        'userType': 'business'
                    }
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
