import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-very-secret-key-for-dev'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    'mysql+mysqlconnector://user:password@host:port/dbname'
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key'