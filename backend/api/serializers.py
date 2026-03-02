from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Review, GlobalBusiness
import re

class UserSerializer(serializers.ModelSerializer):
    """Allows for serialization of user objets"""
    confirmPassword = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, default=" ", allow_blank=True)

    class Meta:
        model = User  # corresponds to the User Model
        fields = ["id", "username", "password", "confirmPassword", "email"]
        extra_kwargs = {"password": {"write_only": True},   # modifies the existing fields          
                        "email": {"required": False, "allow_blank": True},}

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value
    
    def validate_email(self, data):
        if data.strip() == "":
            return data
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, data):
            raise serializers.ValidationError("Invalid email format.")
        return data

    def validate(self, data):
        if data["password"] != data["confirmPassword"]:
            print("Passwords do not match.")
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop("confirmPassword")
        user = User.objects.create_user(**validated_data)
        return user

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "business", "name", "rating", "review_text", "created_at"]

class GlobalBusinessSerializer(serializers.ModelSerializer):
    num_reviews = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    average_rating_display = serializers.SerializerMethodField()

    class Meta:
        model = GlobalBusiness
        fields = ["id", "name", "address", "phone_number", "website", "num_reviews", "average_rating", "average_rating_display"]

    def get_average_rating_display(self, obj):
        """This turns the average rating from a number or null to a formatted string"""
        if obj.average_rating is None:
            return "N/A"
        return f"{obj.average_rating:.2f}/5"
    