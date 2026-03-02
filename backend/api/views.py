from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.http import Http404
from rest_framework import generics, permissions
from .serializers import UserSerializer, ReviewSerializer, GlobalBusinessSerializer
from .models import Review, GlobalBusiness, SavedBusiness
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
import re
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.models import AnonymousUser as AnnoymousUser
from django.db.models import Avg, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
# In every view, api_view["GET"] means that the data will be viewed, while POST means that data will be created 
# permissions_classes[IsAuthenticated] means that the user must be logged in to access the view, while AllowAny means that anyone can access the view

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Get business data from frontend
        business_id = request.data.get("business_id")
        business_name = request.data.get("business_name")
        business_address = request.data.get("business_address", "")
        business_phone = request.data.get("business_phone", "")
        business_website = request.data.get("business_website", "")
        name = request.data.get("name")
        rating = request.data.get("rating")
        review_text = request.data.get("review_text")
        

        # Check if GlobalBusiness exists, if not, create it
        business, created = GlobalBusiness.objects.get_or_create(
            id=business_id,
            defaults={
                "name": business_name,
                "address": business_address,
                "phone_number": business_phone,
                "website": business_website,
            }
        )

        # Create the review
        review = Review.objects.create(
            business=business,
            name=name,
            rating=rating,
            review_text=review_text,
            user=request.user
        )

        serializer = ReviewSerializer(review)

        return Response(serializer.data)

class BusinessReviewsView(generics.ListAPIView):
    # This is used to get the reviews for a business
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny] 

    def get_queryset(self):
        # First, this gets the business, then it filters Review objects go only get those for this business,
        business_id = self.kwargs.get("business_id")
        return Review.objects.filter(business__id=business_id).order_by("-created_at")  # newest first


@api_view(["GET"])
@permission_classes([AllowAny])  
def check_login(request):
    if request.user.is_authenticated:
        return Response({"logged_in": True})
    else:
        return Response({"logged_in": False})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    user = request.user
    return Response({'id': user.id, 'username': user.username, 'email': user.email})

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def forgot_username(request):
    email = request.data.get('email')
    users = User.objects.filter(email=email)

    if not users.exists():  # if the username is not found
        return Response({"error": "No users found with that email"}, status=404)

    usernames = [user.username for user in users]
    message = f"The username(s) associated with your email are:\n\n" + "\n".join(usernames)
    subject = "Your Username(s)"
    recipient = email

    # sends an email to the user
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )
    except:
        return Response({"Error": "unknown"}, status=400)

    return Response({"success": "Email sent to user"})

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    username = request.data.get('username')

    try:
        user = User.objects.get(username=username)
        email = user.email
        if not email:  # If there is no email with that username
            return Response({"error": "No email associated with that username"}, status=400)
    except User.DoesNotExist:  # If the username is invalid
        return Response({"error": "User not found"}, status=404)

    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    reset_url = f"{settings.FRONTEND_URL}/reset_password/{uid}/{token}"

    subject = "Password Reset Request"
    message = f"Hi {user.username},\n\nClick the link below to reset your password:\n{reset_url}\n\nIf you didn’t request this, you can ignore this email."
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,  # throw an error if the email fails to send
    )

    return Response({"success": "Reset link sent to email"})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    # This view is for when a user is changing their password on the reset password screen after they've recieved an email

    uidb64 = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Invalid link"}, status=400)

    if default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return Response({"success": "Password has been reset successfully"})
    else:
        return Response({"error": "Invalid or expired token"}, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    user.delete()
    return Response({'detail': 'Account deleted successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_username(request):
    new_username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=request.user.username, password=password)
    if user is None:  # If the password doesn't match any usernames
        return Response({'detail': 'Invalid password'}, status=401)  # 401 - Unauthorized
    elif User.objects.filter(username=new_username).exists():
        return Response({'detail': 'Username already taken'}, status=409)  # 409 - Conflict
    else:
        request.user.username = new_username
        request.user.save()
        return Response({'detail': 'Username changed successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    user = authenticate(username=request.user.username, password=old_password)
    if user is None:  # If password doesn't match the username
        return Response({'detail': 'Invalid password'}, status=401)
    elif len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters long'}, status=400)
    elif new_password != confirm_password:    
        return Response({'detail': 'New passwords do not match'}, status=409)
    else:
        request.user.set_password(new_password)
        request.user.save()
        return Response({'detail': 'Password changed successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_email(request):
    email = request.data.get('email')

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        return Response({"error": "Invalid email format"}, status=401)
    else:
        request.user.email = email
        request.user.save()
        return Response({'detail': 'Email changed successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(username=request.user.username, password=password)

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        return Response({"error": "Invalid email format"}, status=401)
    elif user is None:  # If the username and password combo didn't yield anything
        return Response({'detail': 'Invalid password'}, status=400)
    else:
        request.user.email = email
        request.user.save()
        return Response({'detail': 'Email changed successfully'})

@api_view(['POST'])
@permission_classes([AllowAny])
def contact_us(request):
    # Used to allow the users to send an email to the website
    email = request.data.get("email")  # They would be contacted from this email
    subject = request.data.get("subject")
    message = request.data.get("message")

    if request.user.is_authenicated:
        final_message = f"Username: {request.user.username}\nEmail: {email} \nmessage: {message}"
    else:
        final_message = f"Username: N/A\nEmail: {email} \nmessage: {message}"

    send_mail(
        subject,
        final_message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.DEFAULT_FROM_EMAIL],
        fail_silently=False,
    )

    return Response({'detail': 'Message sent'})


@api_view(["POST"])
@permission_classes([AllowAny])
def view_business_rating(request):
    """This view gets the average rating and number of reviews when a user searches for businsses on the home page"""
    business_ids = request.data.get("business_ids")

    # matches each business id to a business, and gets the number of reviews and average rating
    businesses = (
        GlobalBusiness.objects.filter(id__in=business_ids).annotate(
            num_reviews=Count("reviews"),
            avg_rating=Avg("reviews__rating")
        ))

    business_map = {business.id: business for business in businesses}  # creates an id-business dict 

    business_review_data = []  # to be sent to frontend

    for business_id in business_ids:
        if business_id in business_map:  # if it's not, then it's not in database yet, meaning there's zero reviews
            business = business_map[business_id]

            if business.num_reviews == 0:  # if no reviews
                business_review_data.append({"num_reviews": 0, "average_rating_display": "N/A"})
            else:  # a dictionary with the information
                business_review_data.append({"num_reviews": business.num_reviews, "average_rating_display":f"{business.avg_rating:.2f} / 5"})
        else:
            business_review_data.append({"num_reviews": 0, "average_rating_display": "N/A"})

    return Response({'business_review_data': business_review_data})

@api_view(["POST"])
@permission_classes([AllowAny])
def check_if_review_left(request):
    """This checks if a user has left a review on a business, and if so, returns info about that review"""
    business_id = request.data.get("business_id")
    
    try:
        business = get_object_or_404(GlobalBusiness, id=business_id)
        if not request.user.is_authenticated:
            return Response({"review": False})
        try:
            review = Review.objects.get(business=business, user=request.user)
            serializer = ReviewSerializer(review)
            return Response({"review": serializer.data})
        except Review.DoesNotExist:  # if the user has not left a review on this business
            return Response({"review": False})
    except Http404:  # If the business isn't in the database, then it's certain there's no reviews for it as creating a review puts it in the database
        return Response({"review": False})
    


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_business(request):
    business_id = request.data.get("business_id")
    name = request.data.get("name")
    address = request.data.get("address")
    phone_number = request.data.get("phone_number")
    website = request.data.get("website")

    # The business iis either fetched from the database or put into it
    business, created = GlobalBusiness.objects.get_or_create(
        id=business_id, name=name, address=address, phone_number=phone_number, website=website)
    SavedBusiness.objects.get_or_create(business=business, user=request.user)

    return Response({"message": "success!"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unsave_business(request):
    business_id = request.data.get("business_id")
    SavedBusiness.objects.filter(business_id=business_id, user=request.user).delete()
    return Response({"message": "success!"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_saved_businesses(request):
    # This is called on the Saved Businesses Page
    # All of the user's saved businesses with review annotations are fetched
    businesses = (GlobalBusiness.objects.filter(saved_business__user=request.user).annotate(
                num_reviews=Count("reviews"), average_rating=Avg("reviews__rating")))
    serializer = GlobalBusinessSerializer(businesses, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_review(request):
    id = request.data.get("review_id")
    Review.objects.get(id=id).delete()
    return Response({"message": "success!"})


@api_view(["POST"])
@permission_classes([AllowAny])
def fetch_average_rating_and_save_status(request):
    """This is only called on the reviews page, and is called to dynamically update the info when the user makes/deletes a view"""
    business_id = request.data.get("business_id")
    
    try:
        business = GlobalBusiness.objects.get(id=business_id)
        stats = business.reviews.aggregate(num_reviews=Count('id'),average_rating=Avg('rating'))  # summarizes review info about the business
        
        if request.user.is_authenticated:
            is_saved = SavedBusiness.objects.filter(user=request.user,business_id=business_id).exists()
        else:
            is_saved = "not_logged_in"

        if stats["num_reviews"] == 0:  # called here to allow for average_rating to be N/A instead of an erroneous 0/5
            return Response({"num_reviews": 0, "average_rating": "N/A", "is_saved": is_saved})
        average_rating = f"{stats['average_rating']:.2f} / 5"
        return Response({"num_reviews": stats["num_reviews"], "average_rating": average_rating, "is_saved": is_saved})
    except GlobalBusiness.DoesNotExist:  # if the business isn't in the Database
         return Response({"num_reviews": 0, "average_rating": "N/A", "is_saved": False})
