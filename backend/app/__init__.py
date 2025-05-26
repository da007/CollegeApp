# backend/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from config import Config

# --- НОВЫЕ ИМПОРТЫ (если используем Gemini) ---
import google.generativeai as genai
import logging # Для более явного логирования, если стандартный логгер Flask не используется здесь

# ----------------------------------------------

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
ma = Marshmallow()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)

    # --- ИНИЦИАЛИЗАЦИЯ GEMINI API ---
    gemini_api_key = app.config.get('GEMINI_API_KEY')
    if gemini_api_key:
        try:
            genai.configure(api_key=gemini_api_key)
            logger.info("Successfully configured Google Gemini API.")
            # Можно даже сделать тестовый небольшой вызов, чтобы проверить ключ, но это замедлит старт
            # Например:
            # model = genai.GenerativeModel('gemini-pro') # или flash
            # model.generate_content("test") 
            # logger.info("Gemini API test call successful.")
        except Exception as e:
            logger.error(f"Failed to configure Google Gemini API: {e}")
            # В этом случае приложение запустится, но роут Gemini вернет ошибку 503
            # Можно сделать более строгую проверку и не запускать приложение, если Gemini критичен
            # raise RuntimeError(f"Could not configure Gemini API: {e}") from e
    else:
        logger.warning("GEMINI_API_KEY not set in environment variables. "
                       "Chatbot AI functionality using Gemini will be unavailable.")
    # ----------------------------------

    from app import routes # Импортируем после инициализации, чтобы избежать циклических импортов
    app.register_blueprint(routes.bp)

    # Используем логгер Flask для последующих сообщений внутри приложения
    # app.logger.info("Flask app created and configured.") # Это если хочешь логировать через Flask логгер

    return app