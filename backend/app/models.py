from app import db # Импортируем db из __init__.py
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Таблица для связи многие-ко-многим между Task и User (студентами, которым назначено задание)
task_assignments = db.Table('task_assignments',
    db.Column('task_id', db.Integer, db.ForeignKey('task.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user_account.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow) # Опционально: когда назначено
)

class Role(db.Model):
    __tablename__ = 'role'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True) # e.g., 'student', 'teacher', 'admin'
    # ИЗМЕНЕНО: lazy='dynamic' для эффективности
    users = db.relationship('User', backref='role', lazy='dynamic') 

    def __repr__(self):
        return f'<Role {self.name}>'

class User(db.Model):
    __tablename__ = 'user_account'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.Text, nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False) 

    # Задачи, созданные пользователем (обычно преподавателем)
    tasks_created = db.relationship('Task', backref='creator', lazy=True, foreign_keys='Task.created_by_id')
    # Новости, созданные пользователем
    news_created = db.relationship('News', backref='author', lazy=True, foreign_keys='News.created_by_id')
    # Тесты, созданные пользователем (обычно преподавателем)
    tests_created = db.relationship('Test', backref='creator', lazy=True, foreign_keys='Test.created_by_id')
    # Результаты тестов этого пользователя
    test_results = db.relationship('TestUser', backref='user', lazy=True, foreign_keys='TestUser.user_id')

    # Задачи, назначенные этому пользователю (студенту) - через таблицу task_assignments
    assigned_tasks = db.relationship(
        'Task', secondary=task_assignments,
        backref=db.backref('assigned_to_users', lazy='dynamic'), 
        lazy='dynamic' 
    )
    
    # ИЗМЕНЕНО: Добавлена связь для книг, загруженных пользователем
    uploaded_books = db.relationship('Book', backref='uploader', lazy=True, foreign_keys='Book.created_by_id')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Task(db.Model):
    __tablename__ = 'task'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=False) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f'<Task {self.title}>'

class Book(db.Model):
    __tablename__ = 'book'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100))
    file_url = db.Column(db.Text) 
    # ИЗМЕНЕНО: Добавлено created_by_id
    created_by_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=True) 
    
    def __repr__(self):
        return f'<Book {self.title}>'

class News(db.Model):
    __tablename__ = 'news'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # ИЗМЕНЕНО: nullable=False, новость должна иметь автора
    created_by_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=False) 

    def __repr__(self):
        return f'<News {self.title}>'

class Test(db.Model):
    __tablename__ = 'test'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=False) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship('Question', backref='test', lazy='dynamic', cascade="all, delete-orphan")
    user_results = db.relationship('TestUser', backref='test', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Test {self.title}>'

class Question(db.Model):
    __tablename__ = 'question'
    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey('test.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=True) 
    correct_answer = db.Column(db.Text, nullable=False) 
    question_type = db.Column(db.String(50), default='single_choice') 

    def __repr__(self):
        return f'<Question {self.id} for Test {self.test_id}>'

class TestUser(db.Model): 
    __tablename__ = 'test_user'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('test.id'), nullable=False)
    score = db.Column(db.Integer, nullable=True) 
    max_score = db.Column(db.Integer, nullable=True) 
    taken_at = db.Column(db.DateTime, default=datetime.utcnow)
    answers_submitted = db.Column(db.JSON, nullable=True) 

    def __repr__(self):
        return f'<TestUser User {self.user_id} Test {self.test_id} Score {self.score}>'

# Важно: После изменения моделей не забудьте создать и применить миграции:
# 1. flask db migrate -m "updated_models_for_book_news_role" (или другое осмысленное сообщение)
# 2. flask db upgrade
# Если вы будете создавать схему вручную с помощью SQL-скрипта, то после этого выполните:
# flask db stamp head  (чтобы Flask-Migrate знал, что схема актуальна)