from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import PrivateUserSerializer, BusinessUserSerializer
from .models import PrivateUser, BusinessUser


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

    return Response({
        'id': user.id,
        'email': user.email,
        'userType': user_type,
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
