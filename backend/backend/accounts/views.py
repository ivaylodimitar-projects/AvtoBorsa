from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import PrivateUserSerializer, BusinessUserSerializer, UserProfileSerializer, UserBalanceSerializer
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
    user_data = {'id': user.id, 'email': user.email}

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
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username

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
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )


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
