from flask import Blueprint, request, jsonify, current_app
from app import db, jwt # Импортируем db и jwt из __init__.py
from app.models import User, Role, Book, Task, News, Test, Question, TestUser # Убедимся, что все модели импортированы
from app.schemas import (
    user_schema, users_schema, role_schema, roles_schema,
    book_schema, books_schema, task_schema, tasks_schema,
    news_item_schema, news_list_schema, test_schema, tests_schema,
    question_schema, questions_schema, test_user_schema, test_users_schema
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from functools import wraps
import json
from datetime import datetime
import random
import google.generativeai as genai

bp = Blueprint('api', __name__, url_prefix='/api')

# --- Вспомогательные функции и декораторы ---

def get_current_user():
    """Возвращает текущего аутентифицированного пользователя или None."""
    current_user_id_str = get_jwt_identity()
    if not current_user_id_str:
        return None
    try:
        user_id = int(current_user_id_str)
        return User.query.get(user_id)
    except (ValueError, TypeError):
        return None

def role_required(roles):
    """Декоратор для проверки ролей пользователя."""
    if not isinstance(roles, list):
        roles = [roles]
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"msg": "Authentication required or user not found"}), 401 # Уточнено сообщение
            if user.role.name not in roles:
                return jsonify({"msg": "Permission denied. Required roles: " + ", ".join(roles)}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- Роли ---
@bp.route('/roles', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_role():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"msg": "Missing role name"}), 400
    
    if Role.query.filter_by(name=data['name']).first():
        return jsonify({"msg": "Role already exists"}), 400
        
    new_role = Role(name=data['name'])
    db.session.add(new_role)
    db.session.commit()
    return jsonify(role_schema.dump(new_role)), 201

@bp.route('/roles', methods=['GET'])
@jwt_required() 
# @role_required(['student', 'teacher', 'admin']) # Можно добавить, если роли не должны быть видны неавторизованным
def get_roles():
    all_roles = Role.query.all()
    return jsonify(roles_schema.dump(all_roles)), 200

# --- Пользователи (Регистрация, Вход, Информация) ---
@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role_name = data.get('role', 'student') 

    if not username or not email or not password:
        return jsonify({"msg": "Missing username, email or password"}), 400

    if User.query.filter_by(username=username).first() or \
       User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    role = Role.query.filter_by(name=role_name).first()
    if not role:
        # Если стандартные роли (student, teacher, admin) не существуют, их нужно создать администратором сначала
        # Для автоматической регистрации студента, если роль 'student' не найдена, можно ее создать.
        if role_name == 'student':
             role = Role(name='student')
             db.session.add(role)
             # db.session.commit() # Лучше коммитить вместе с пользователем
        elif role_name in ['teacher', 'admin']: # Эти роли должны быть созданы заранее админом
             return jsonify({"msg": f"Role '{role_name}' must be created by an administrator before users can be assigned to it."}), 400
        else: # Для других кастомных ролей
            return jsonify({"msg": f"Role '{role_name}' not found. Allowed roles for self-registration: 'student'."}), 400
    
    new_user = User(username=username, email=email, role=role)
    new_user.set_password(password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not register user", "error": str(e)}), 500

    user_data = user_schema.dump(new_user)
    return jsonify(user_data), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        user_data = user_schema.dump(user)
        user_data['access_token'] = access_token
        user_data['id'] = user.id 
        return jsonify(user_data), 200
    else:
        return jsonify({"msg": "Bad username or password"}), 401

@bp.route('/protected', methods=['GET']) 
@jwt_required()
def protected():
    user = get_current_user()
    if not user: # Явная проверка пользователя
         return jsonify({"msg": "User not found or token invalid"}), 401 # 401 более подходит для проблем с аутентификацией
    return jsonify(logged_in_as=user_schema.dump(user)), 200

@bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_users():
    all_users = User.query.all()
    return jsonify(users_schema.dump(all_users)), 200

@bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@role_required(['admin']) 
def get_user_by_id(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user_schema.dump(user)), 200

# --- CRUD для Книг (Book) ---
@bp.route('/books', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
def create_book():
    data = request.get_json()
    user = get_current_user() # Получаем текущего пользователя
    # if not user: # Эта проверка уже есть в role_required
    #     return jsonify({"msg": "Authentication required or user not found"}), 401

    try:
        new_book = Book(
            title=data['title'],
            author=data.get('author'),
            file_url=data.get('file_url'),
            created_by_id=user.id # ИЗМЕНЕНО: устанавливаем создателя книги
        )
        db.session.add(new_book)
        db.session.commit()
        return jsonify(book_schema.dump(new_book)), 201
    except KeyError:
        return jsonify({"msg": "Missing title for the book"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not create book", "error": str(e)}), 500

@bp.route('/books', methods=['GET'])
# @jwt_required() # Книги могут быть доступны и неавторизованным пользователям для просмотра
def get_books():
    all_books = Book.query.all()
    return jsonify(books_schema.dump(all_books)), 200

@bp.route('/books/<int:book_id>', methods=['GET'])
# @jwt_required() # Детали книги также могут быть доступны всем
def get_book(book_id):
    book = Book.query.get_or_404(book_id)
    return jsonify(book_schema.dump(book)), 200

@bp.route('/books/<int:book_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
def update_book(book_id):
    book = Book.query.get_or_404(book_id)
    user = get_current_user()
    # if not user: # Проверка уже в role_required
    #     return jsonify({"msg": "Authentication required or user not found"}), 401

    # ИЗМЕНЕНО: Проверка прав - только создатель (если uploader есть) или админ
    if user.role.name != 'admin' and (book.created_by_id is not None and book.created_by_id != user.id):
        return jsonify({"msg": "Permission denied. You are not the creator of this book or an admin."}), 403
    
    data = request.get_json()
    book.title = data.get('title', book.title)
    book.author = data.get('author', book.author)
    book.file_url = data.get('file_url', book.file_url)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not update book", "error": str(e)}), 500
    return jsonify(book_schema.dump(book)), 200

@bp.route('/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
def delete_book(book_id):
    book = Book.query.get_or_404(book_id)
    user = get_current_user()
    # if not user: # Проверка уже в role_required
    #     return jsonify({"msg": "Authentication required or user not found"}), 401

    # ИЗМЕНЕНО: Проверка прав
    if user.role.name != 'admin' and (book.created_by_id is not None and book.created_by_id != user.id):
        return jsonify({"msg": "Permission denied. You are not the creator of this book or an admin."}), 403
        
    db.session.delete(book)
    db.session.commit()
    return jsonify({"msg": "Book deleted"}), 200

# --- CRUD для Заданий (Task) ---
@bp.route('/tasks', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin']) # Админ тоже может создавать задачи? Если да, то ['teacher', 'admin']
def create_task():
    data = request.get_json()
    user = get_current_user()
    try:
        new_task = Task(
            title=data['title'],
            description=data.get('description'),
            created_by_id=user.id,
            due_date=data.get('due_date') 
        )
        db.session.add(new_task)
        db.session.commit()
        return jsonify(task_schema.dump(new_task)), 201
    except KeyError:
        return jsonify({"msg": "Missing title for the task"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not create task", "error": str(e)}), 500

@bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    user = get_current_user()
    if not user:
         return jsonify({"msg": "User not found or token invalid"}), 401

    if user.role.name == 'teacher':
        tasks = Task.query.filter_by(created_by_id=user.id).all()
    elif user.role.name == 'student':
        tasks = user.assigned_tasks.all() 
    elif user.role.name == 'admin':
        tasks = Task.query.all()
    else:
        tasks = [] # На всякий случай
    return jsonify(tasks_schema.dump(tasks)), 200

@bp.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    user = get_current_user()
    if not user:
         return jsonify({"msg": "User not found or token invalid"}), 401
    
    # Админ или создатель видят задачу
    if user.role.name == 'admin' or task.created_by_id == user.id:
        return jsonify(task_schema.dump(task)), 200
    # Студент видит задачу, если она ему назначена
    if user.role.name == 'student' and task in user.assigned_tasks:
         return jsonify(task_schema.dump(task)), 200
    
    return jsonify({"msg": "Permission denied"}), 403


@bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin']) 
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    user = get_current_user()

    if user.role.name != 'admin' and task.created_by_id != user.id: 
        return jsonify({"msg": "Permission denied. You are not the creator of this task."}), 403

    data = request.get_json()
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.due_date = data.get('due_date', task.due_date)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not update task", "error": str(e)}), 500
    return jsonify(task_schema.dump(task)), 200

@bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin']) 
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    user = get_current_user()

    if user.role.name != 'admin' and task.created_by_id != user.id: 
        return jsonify({"msg": "Permission denied. You are not the creator of this task."}), 403
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({"msg": "Task deleted"}), 200

# --- CRUD для Новостей (News) ---
@bp.route('/news', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
def create_news_item():
    data = request.get_json()
    user = get_current_user()
    try:
        new_item = News(
            title=data['title'],
            content=data['content'],
            created_by_id=user.id 
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify(news_item_schema.dump(new_item)), 201
    except KeyError:
        return jsonify({"msg": "Missing title or content for the news item"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not create news item", "error": str(e)}), 500

@bp.route('/news', methods=['GET'])
# @jwt_required() # Новости могут быть доступны всем
def get_news_list():
    all_news = News.query.order_by(News.created_at.desc()).all()
    return jsonify(news_list_schema.dump(all_news)), 200

@bp.route('/news/<int:news_id>', methods=['GET'])
# @jwt_required() # Детали новости также могут быть доступны всем
def get_news_item(news_id):
    news_item = News.query.get_or_404(news_id)
    return jsonify(news_item_schema.dump(news_item)), 200

@bp.route('/news/<int:news_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
def update_news_item(news_id):
    news_item = News.query.get_or_404(news_id)
    user = get_current_user()

    if user.role.name != 'admin' and news_item.created_by_id != user.id: 
        return jsonify({"msg": "Permission denied. You are not the author or an admin."}), 403
    
    data = request.get_json()
    news_item.title = data.get('title', news_item.title)
    news_item.content = data.get('content', news_item.content)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not update news item", "error": str(e)}), 500
    return jsonify(news_item_schema.dump(news_item)), 200

@bp.route('/news/<int:news_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
def delete_news_item(news_id):
    news_item = News.query.get_or_404(news_id)
    user = get_current_user()

    if user.role.name != 'admin' and news_item.created_by_id != user.id: 
        return jsonify({"msg": "Permission denied. You are not the author or an admin."}), 403

    db.session.delete(news_item)
    db.session.commit()
    return jsonify({"msg": "News item deleted"}), 200


# --- CRUD для Тестов (Test) и Вопросов (Question) ---

@bp.route('/tests', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin']) # Админ тоже может создавать тесты?
def create_test():
    data = request.get_json()
    user = get_current_user() 
    try:
        new_test = Test(
            title=data['title'],
            description=data.get('description'),
            created_by_id=user.id
        )
        db.session.add(new_test)
        db.session.commit()
        return jsonify(test_schema.dump(new_test)), 201
    except KeyError:
        return jsonify({"msg": "Missing title for the test"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not create test", "error": str(e)}), 500

@bp.route('/tests', methods=['GET'])
@jwt_required()
def get_tests():
    current_user_identity = get_jwt_identity() # Получаем identity из токена
    user = get_current_user() # Пытаемся получить пользователя по этому identity

    current_app.logger.info(f"Accessing /api/tests. Token Identity: {current_user_identity}")
    if request.headers.get('Authorization'):
        current_app.logger.info(f"Authorization Header: {request.headers.get('Authorization')}")
    else:
        current_app.logger.warning("Authorization Header MISSING for /api/tests")

    if not user:
        current_app.logger.warning(f"No user found for identity {current_user_identity} on /api/tests. Returning 401.")
        # @jwt_required уже должен вернуть 401, но это для дополнительного логирования
        return jsonify({"msg": "User not found or token invalid based on identity"}), 401 
    
    current_app.logger.info(f"User {user.username} (Role: {user.role.name}) granted access to /api/tests.")
    all_tests = Test.query.all()
    return jsonify(tests_schema.dump(all_tests)), 200

@bp.route('/tests/<int:test_id>', methods=['GET'])
@jwt_required()
def get_test(test_id):
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    if not user:
         return jsonify({"msg": "User not found or token invalid"}), 401
         
    test_data = test_schema.dump(test)
    
    # Студенты видят информацию о тесте, но не видят ответы на вопросы
    if user.role.name == 'student':
        if 'questions' in test_data and isinstance(test_data.get('questions'), list):
            for q_data in test_data['questions']:
                q_data.pop('correct_answer', None)
                # Если студент просто смотрит информацию о тесте, а не сдает его,
                # то варианты ответов тоже можно скрыть.
                # Для эндпоинта сдачи теста (например, /tests/<id>/start) варианты должны быть видны.
                # q_data.pop('options', None) # Раскомментировать, если нужно скрыть и варианты
    return jsonify(test_data), 200

@bp.route('/tests/<int:test_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
def update_test(test_id):
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    if user.role.name != 'admin' and test.created_by_id != user.id:
         return jsonify({"msg": "Permission denied. You are not the creator of this test or an admin."}), 403
    
    data = request.get_json()
    test.title = data.get('title', test.title)
    test.description = data.get('description', test.description)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not update test", "error": str(e)}), 500
    return jsonify(test_schema.dump(test)), 200

@bp.route('/tests/<int:test_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
def delete_test(test_id):
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    if user.role.name != 'admin' and test.created_by_id != user.id: 
         return jsonify({"msg": "Permission denied. You are not the creator of this test or an admin."}), 403

    db.session.delete(test)
    db.session.commit()
    return jsonify({"msg": "Test deleted"}), 200

# Вопросы для тестов
@bp.route('/tests/<int:test_id>/questions', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
def create_question(test_id):
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    if user.role.name != 'admin' and test.created_by_id != user.id: 
        return jsonify({"msg": "Permission denied. You cannot add questions to this test."}), 403
    
    data = request.get_json()
    try:
        new_question = Question(
            test_id=test.id,
            content=data['content'],
            options=data.get('options'), 
            correct_answer=data['correct_answer'],
            question_type=data.get('question_type', 'single_choice')
        )
        db.session.add(new_question)
        db.session.commit()
        return jsonify(question_schema.dump(new_question)), 201
    except KeyError:
        return jsonify({"msg": "Missing content or correct_answer for the question"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not create question", "error": str(e)}), 500

@bp.route('/tests/<int:test_id>/questions', methods=['GET'])
@jwt_required()
def get_questions_for_test(test_id): 
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    
    if not user: # Добавлена проверка
        return jsonify({"msg": "Invalid token or user not found"}), 401
    
    # Учитель-создатель или админ видят все данные вопроса, включая ответы
    if user.role.name == 'admin' or (user.role.name == 'teacher' and test.created_by_id == user.id):
        questions = Question.query.filter_by(test_id=test.id).all()
        return jsonify(questions_schema.dump(questions)), 200
    
    # Студенты видят вопросы (например, при прохождении теста), но без правильных ответов
    # Этот эндпоинт может быть использован для загрузки вопросов перед сдачей теста
    elif user.role.name == 'student':
        questions_data = []
        for q in Question.query.filter_by(test_id=test.id).all():
            q_dump = question_schema.dump(q)
            q_dump.pop('correct_answer', None) # Удаляем правильный ответ
            # Варианты (options) оставляем, они нужны для ответа студента
            questions_data.append(q_dump)
        return jsonify(questions_data), 200
    
    return jsonify({"msg": "Permission denied"}), 403


@bp.route('/tests/<int:test_id>/questions/<int:question_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
def update_question(test_id, question_id):
    question = Question.query.filter_by(id=question_id, test_id=test_id).first_or_404()
    test = Test.query.get_or_404(test_id) 
    user = get_current_user()
    if user.role.name != 'admin' and test.created_by_id != user.id: 
         return jsonify({"msg": "Permission denied. You cannot update questions for this test."}), 403

    data = request.get_json()
    question.content = data.get('content', question.content)
    question.options = data.get('options', question.options)
    question.correct_answer = data.get('correct_answer', question.correct_answer)
    question.question_type = data.get('question_type', question.question_type)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Could not update question", "error": str(e)}), 500
    return jsonify(question_schema.dump(question)), 200

@bp.route('/tests/<int:test_id>/questions/<int:question_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
def delete_question(test_id, question_id):
   question = Question.query.filter_by(id=question_id, test_id=test_id).first_or_404()
   test = Test.query.get_or_404(test_id) 
   user = get_current_user()
   if user.role.name != 'admin' and test.created_by_id != user.id: 
         return jsonify({"msg": "Permission denied. You cannot delete questions for this test."}), 403
         
   db.session.delete(question)
   db.session.commit()
   return jsonify({"msg": "Question deleted"}), 200

   # --- Результаты тестов (TestUser) ---
@bp.route('/tests/<int:test_id>/submit', methods=['POST'])
@jwt_required()
@role_required('student') 
def submit_test_answers(test_id):
    test = Test.query.get_or_404(test_id)
    user = get_current_user()
    data = request.get_json()
       
    submitted_answers = data.get('answers') 
    if not isinstance(submitted_answers, dict):
        return jsonify({"msg": "Invalid answers format. Expected a dictionary."}), 400

    score = 0
    processed_answers = {} 

    questions_in_test_dict = {q.id: q for q in test.questions}
    # ИЗМЕНЕНО: max_score теперь это общее количество вопросов в тесте
    total_questions_in_test = len(questions_in_test_dict) 

    for q_id_str, user_answer in submitted_answers.items():
        try:
            q_id = int(q_id_str)
        except ValueError:
            return jsonify({"msg": f"Invalid question ID format: {q_id_str}"}), 400

        if q_id in questions_in_test_dict:
            question = questions_in_test_dict[q_id]
            correct_answer_val = question.correct_answer
            is_correct = False

            if question.question_type == 'multiple_choice':
                try:
                    correct_options = json.loads(correct_answer_val) if isinstance(correct_answer_val, str) else correct_answer_val
                    if not isinstance(correct_options, list) or not isinstance(user_answer, list):
                        is_correct = False
                    else:
                        is_correct = set(map(str, user_answer)) == set(map(str, correct_options)) 
                except json.JSONDecodeError:
                    is_correct = False
            elif question.question_type == 'single_choice' or question.question_type == 'text_input':
                is_correct = str(user_answer).strip().lower() == str(correct_answer_val).strip().lower() # Сравнение без учета регистра
            else: 
                is_correct = False

            if is_correct:
                score += 1
            processed_answers[q_id_str] = user_answer
        else:
            print(f"Warning: Submitted answer for question ID {q_id_str} which is not in test {test_id}")
       
    new_test_result = TestUser(
        user_id=user.id,
        test_id=test.id,
        score=score,
        max_score=total_questions_in_test, # ИЗМЕНЕНО
        answers_submitted=processed_answers
    )
    try:
        db.session.add(new_test_result)
        db.session.commit()
        return jsonify(test_user_schema.dump(new_test_result)), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting test results: {str(e)}") 
        return jsonify({"msg": "Could not submit test results", "error": str(e)}), 500

@bp.route('/test_results', methods=['GET']) 
@jwt_required()
def get_test_results():
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found or token invalid"}), 401
        
    if user.role.name == 'admin':
        results = TestUser.query.all()
    elif user.role.name == 'teacher':
        teacher_test_ids = [t.id for t in Test.query.filter_by(created_by_id=user.id).all()]
        if not teacher_test_ids:
            results = []
        else:
            results = TestUser.query.filter(TestUser.test_id.in_(teacher_test_ids)).all()
    elif user.role.name == 'student':
        results = TestUser.query.filter_by(user_id=user.id).all()
    else:
        results = []
    return jsonify(test_users_schema.dump(results)), 200


@bp.route('/tests/<int:test_id>/results', methods=['GET']) 
@jwt_required()
@role_required(['teacher', 'admin']) 
def get_results_for_test(test_id):
    test_obj = Test.query.get_or_404(test_id)
    user = get_current_user()

    if user.role.name == 'admin' or (user.role.name == 'teacher' and test_obj.created_by_id == user.id):
        results = TestUser.query.filter_by(test_id=test_obj.id).all()
        return jsonify(test_users_schema.dump(results)), 200
       
    return jsonify({"msg": "Permission denied to view results for this test."}), 403


@bp.route('/users/<int:user_id>/results', methods=['GET']) 
@jwt_required()
def get_results_for_user(user_id):
    target_user_obj = User.query.get_or_404(user_id) # Переименовал, чтобы не конфликтовать
    current_user = get_current_user()
    if not current_user:
         return jsonify({"msg": "User not found or token invalid"}), 401

    if current_user.role.name == 'admin' or current_user.id == target_user_obj.id:
        results = TestUser.query.filter_by(user_id=target_user_obj.id).all()
        return jsonify(test_users_schema.dump(results)), 200
       
    if current_user.role.name == 'teacher':
        teacher_test_ids = [t.id for t in Test.query.filter_by(created_by_id=current_user.id).all()]
        if not teacher_test_ids:
            return jsonify(test_users_schema.dump([])), 200 
           
        results = TestUser.query.filter(
            TestUser.user_id == target_user_obj.id,
            TestUser.test_id.in_(teacher_test_ids)
        ).all()
        return jsonify(test_users_schema.dump(results)), 200
       
    return jsonify({"msg": "Permission denied"}), 403

# --- Чат-бот с Gemini ---
@bp.route('/chatbot/ask', methods=['POST'])
@jwt_required()
def chatbot_ask_gemini():
    current_user = get_current_user() # Используем current_user, чтобы не пересекалось с моделью User
    if not current_user:
         # Эта проверка дублируется @jwt_required и get_current_user, но для явности можно оставить
         return jsonify({"msg": "Authentication token is invalid or user not found."}), 401
    
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({"msg": "Missing 'message' field in request body"}), 400

    user_message = data.get('message')

    # Проверяем, был ли API ключ загружен и сконфигурирован при старте приложения
    if not current_app.config.get('GEMINI_API_KEY'):
        current_app.logger.error("GEMINI_API_KEY is not configured for the application.")
        # Можно вернуть улучшенную заглушку, если Gemini недоступен
        # Например, используя логику из предыдущих примеров
        fallback_reply = (
            f"I'm currently running in a limited mode as the AI service (Gemini) is not available. "
            f"You said: '{user_message}'"
        )
        return jsonify({"reply": fallback_reply}), 503 # Service Unavailable

    try:
        # Модель уже должна быть сконфигурирована с API ключом в app/__init__.py
        # Достаточно просто создать экземпляр модели
        # Для более сложных чатов с историей, используйте model.start_chat()
        # model = genai.GenerativeModel('gemini-pro') # или 'gemini-1.5-flash-latest'
        # Использование 'gemini-1.5-flash-latest' часто является хорошим балансом скорости и качества для чатов.
        model_name = 'gemini-1.5-flash-latest' 
        model = genai.GenerativeModel(model_name)

        # Создаем промпт для Gemini
        # Важно дать модели контекст о ее роли и о пользователе
        # Можно добавить предыдущие сообщения из истории чата для лучшего контекста
        
        # Получаем информацию о задачах пользователя для контекста (пример)
        tasks_info = ""
        # Убедимся, что модель Task импортирована
        user_tasks = Task.query.filter(Task.assigned_to_users.any(id=current_user.id)).order_by(Task.due_date.asc()).limit(2).all()
        if user_tasks:
            tasks_list_str = []
            for task_item in user_tasks:
                due_date_str = f" (due: {task_item.due_date.strftime('%b %d, %Y')})" if task_item.due_date else ""
                tasks_list_str.append(f"- {task_item.title}{due_date_str}")
            if tasks_list_str:
                tasks_info = "\nHere are some of their current tasks:\n" + "\n".join(tasks_list_str) + "\n"


        # Пример структурированного промпта (можно улучшать)
        # Gemini хорошо реагирует на четко определенные роли и инструкции
        # Использование `parts` позволяет передавать более структурированный контент, но для простого текста достаточно строки.
        prompt_parts = [
            "You are 'CollegeHelper', an AI assistant integrated into a college learning platform.",
            f"You are currently assisting: {current_user.username} (Role: {current_user.role.name}).",
            "The platform features sections for Books, Tasks, News, and Tests.",
            "Your goal is to be helpful, concise, and friendly. Provide information relevant to the platform if possible.",
            "If a request is outside your capabilities or knowledge about this platform, clearly state that.",
            f"{tasks_info if tasks_info else 'The user currently has no pressing tasks visible to you.'}", # Контекст о задачах
            "\nUser's message:",
            f"\"{user_message}\"",
            "\nYour response:"
        ]
        full_prompt = "\n".join(prompt_parts)
        
        current_app.logger.debug(f"Sending prompt to Gemini ({model_name}):\n{full_prompt}")

        # Конфигурация генерации (можно настроить)
        generation_config = genai.types.GenerationConfig(
            candidate_count=1, # Обычно достаточно одного кандидата
            # stop_sequences=['...'], # Если есть специфичные последовательности для остановки
            max_output_tokens=300, # Ограничение длины ответа
            temperature=0.7, # Креативность/случайность (0.0 - более детерминированно, 1.0 - более случайно)
            # top_p=0.9, # Nucleus sampling
            # top_k=40,  # Top-k sampling
        )

        # Отправляем запрос к Gemini
        response = model.generate_content(
            contents=[full_prompt], # `contents` ожидает итерируемый объект (например, список строк)
            generation_config=generation_config,
            # safety_settings=... # Можно настроить уровни безопасности, если нужно
        )
        
        # Обработка ответа
        ai_reply = ""
        if response.parts:
            ai_reply = "".join(part.text for part in response.parts if hasattr(part, 'text')) # Убедимся, что у part есть text
        elif hasattr(response, 'text') and response.text: # Для некоторых старых/простых ответов
             ai_reply = response.text
        
        if not ai_reply: # Если ответ пустой (например, из-за safety filters)
            current_app.logger.warning(f"Gemini response was empty or blocked.")
            if response.candidates:
                 current_app.logger.warning(f"Candidate finish reason: {response.candidates[0].finish_reason}")
                 current_app.logger.warning(f"Candidate safety ratings: {response.candidates[0].safety_ratings}")
            ai_reply = "I'm sorry, I couldn't generate a response for that. This might be due to content restrictions or an issue with the request."
        
        current_app.logger.debug(f"Received reply from Gemini: {ai_reply}")
        
        return jsonify({"reply": ai_reply.strip()}), 200

    except genai.types.BlockedPromptException as bpe:
        current_app.logger.error(f"Gemini API: Prompt was blocked. {bpe}")
        return jsonify({"reply": "I'm sorry, your message could not be processed due to content restrictions. Please rephrase your request."}), 400 # Bad Request
    except genai.types.StopCandidateException as sce:
        current_app.logger.error(f"Gemini API: Candidate generation stopped unexpectedly. {sce}")
        return jsonify({"reply": "I'm sorry, I was unable to complete the response. Please try again."}), 500
    except Exception as e:
        # Логируем полную ошибку для отладки
        current_app.logger.error(f"Unexpected error interacting with Google Gemini API: {e}", exc_info=True)
        # Можно проверить тип ошибки, если это специфичная ошибка Gemini, например, связанная с аутентификацией
        # import google.auth.exceptions
        # if isinstance(e, google.auth.exceptions.RefreshError) or isinstance(e, google.auth.exceptions.DefaultCredentialsError):
        #     return jsonify({"reply": "There's an authentication issue with the AI service. Please contact support."}), 500
        
        return jsonify({"reply": "An unexpected error occurred while trying to reach the AI assistant (Gemini). Please try again later."}), 500


@bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user = get_current_user()
    if not user:
         return jsonify({"msg": "User not found or token invalid"}), 401
    # ... (логика заглушки)
    # Пример данных (лучше, чтобы `id` был числом, если это PK из БД)
    example_notifications = [
        {"id": 1, "message": f"New task assigned to {user.username}.", "read": False, "type": "task", "link": "/tasks/1", "created_at": "2024-07-15T10:00:00Z"},
        {"id": 2, "message": "Your test 'Python Basics' has been graded.", "read": True, "type": "test_result", "link": f"/tests/1/results/my", "created_at": "2024-07-14T15:30:00Z"}
    ]
    # return jsonify(example_notifications), 200
    return jsonify([{"id": "0", "message": "Notification system is under development.", "read": False, "type": "general", "created_at": datetime.utcnow().isoformat() + "Z"}]), 501