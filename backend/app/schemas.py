from app import ma # Импортируем ma из __init__.py
from app.models import User, Role, Task, Book, News, Test, Question, TestUser

# --- Базовые схемы для вложенности ---
class RoleSchemaMinimal(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Role
        fields = ("id", "name") # Только основная информация
        load_instance = True

class UserSchemaMinimal(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        fields = ("id", "username", "email") # Без роли, чтобы избежать цикла при глубокой вложенности
        load_instance = True

# --- Основные схемы ---

class RoleSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Role
        load_instance = True
        include_fk = True # Если нужно видеть users.id в роли (редко)
        # users = ma.List(ma.Nested(UserSchemaMinimal)) # Если нужно показать пользователей с этой ролью

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash",) # Никогда не возвращаем хэш пароля
        include_fk = True # Показывает role_id
    role = ma.Nested(RoleSchemaMinimal) # Показываем минимальную информацию о роли

class TaskSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Task
        load_instance = True
        include_fk = True
    creator = ma.Nested(UserSchemaMinimal) # Кто создал задачу
    # Если нужно показывать, кому назначена задача:
    assigned_to_users = ma.List(ma.Nested(UserSchemaMinimal, only=("id", "username")))

class BookSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Book
        load_instance = True
        include_fk = True # Будет включать created_by_id
    # ИЗМЕНЕНО: Добавляем uploader, если он есть в модели
    uploader = ma.Nested(UserSchemaMinimal, attribute="uploader", data_key="created_by") 
    # 'attribute="uploader"' указывает на имя отношения в модели Book
    # 'data_key="created_by"' сделает так, что в JSON поле будет называться 'created_by'

class NewsSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = News
        load_instance = True
        include_fk = True
    # ИЗМЕНЕНО: Убрал data_key, так как отношение в модели называется author.
    # Если хотите, чтобы в JSON было "creator", а в модели "author", то:
    # creator = ma.Nested(UserSchemaMinimal, attribute="author")
    author = ma.Nested(UserSchemaMinimal) # Используем имя отношения из модели

class QuestionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Question
        load_instance = True
        include_fk = True # test_id
        # Исключаем 'test', чтобы избежать циклической зависимости, когда TestSchema включает QuestionSchema
        exclude = ("test",)
    # Если вы хотите, чтобы 'options' и 'correct_answer' всегда были строками (например, JSON-строками)
    # options = ma.String()
    # correct_answer = ma.String()
    # Иначе Marshmallow попытается их десериализовать/сериализовать как есть (для JSON поля это ок)

class TestSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Test
        load_instance = True
        include_fk = True
    creator = ma.Nested(UserSchemaMinimal, data_key="created_by") # data_key для соответствия модели
    questions = ma.List(ma.Nested("QuestionSchema")) 

class TestUserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = TestUser
        load_instance = True
        include_fk = True
    user = ma.Nested(UserSchemaMinimal)
    test = ma.Nested(TestSchema, only=("id", "title", "description")) # Показываем основную информацию о тесте
    # answers_submitted = ma.String() # Если храните как JSON-строку и хотите чтобы так и отдавалось

# --- Инициализация схем для использования ---

# Роли
role_schema = RoleSchema()
roles_schema = RoleSchema(many=True)

# Пользователи
user_schema = UserSchema()
users_schema = UserSchema(many=True)

# Задачи
task_schema = TaskSchema()
tasks_schema = TaskSchema(many=True)

# Книги
book_schema = BookSchema()
books_schema = BookSchema(many=True)

# Новости
news_item_schema = NewsSchema() # Отдельное имя для избежания конфликта с news_list_schema
news_list_schema = NewsSchema(many=True)

# Тесты
test_schema = TestSchema()
tests_schema = TestSchema(many=True)

# Вопросы
question_schema = QuestionSchema()
questions_schema = QuestionSchema(many=True)

# Результаты тестов
test_user_schema = TestUserSchema()
test_users_schema = TestUserSchema(many=True)