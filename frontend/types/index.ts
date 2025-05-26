// types/index.ts
export interface Role {
  id: number;
  name: string;
}

export interface UserMinimal { // Минимальный пользователь для вложенности
  id: number;
  username: string;
  email?: string; // email может быть не всегда нужен
}

export interface User extends UserMinimal {
  role: Role;
}

export interface AuthResponse extends User {
  access_token: string;
}

export interface Book {
  id: number;
  title: string;
  author?: string;
  file_url?: string;
  // Если на бэке добавили created_by для Book
  // created_by?: UserMinimal; 
}

export interface BookPayload {
  title: string;
  author?: string;
  file_url?: string;
}

// --- Задания (Tasks) ---
export interface Task {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  due_date?: string;
  creator: UserMinimal;
  assigned_to_users?: UserMinimal[];
}

export interface TaskPayload {
  title: string;
  description?: string;
  due_date?: string; // YYYY-MM-DDTHH:mm:ss or null
  // assigned_user_ids?: number[]; // Если будете назначать при создании/редактировании
}

// --- Новости (News) ---

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  created_at: string; // ISO Date string
  created_by: UserMinimal; // Связь с автором (модель News имеет 'author', схема может использовать 'created_by')
                           // В вашем app/schemas.py NewsSchema имеет 'author = ma.Nested(UserSchemaMinimal)'
                           // поэтому на фронте ожидайте поле 'author', если не используете data_key
                           // Для согласованности с бэкенд-схемой, давайте ожидать 'author'
  author: UserMinimal;
}

export interface NewsItemPayload {
  title: string;
  content: string;
}

// --- Тесты (Tests) и Вопросы (Questions) ---
export interface QuestionOption {
  key: string; // e.g., "a", "b"
  value: string; // Text of the option
}

// Если options на бэкенде всегда JSON вида {"a": "Option A"}, то тип options может быть Record<string, string>
// Если это массив объектов {key: "a", value: "Option A"}, то QuestionOption[]

export interface Question {
  id: number;
  test_id: number;
  content: string;
  // На бэкенде 'options' это db.JSON. Фронтенд должен быть готов к объекту.
  options?: Record<string, string> | null; // Пример: {"a": "Option A", "b": "Option B"}
  correct_answer: string | string[]; // "c" или ["a", "d"]. Для text_input это просто строка.
  question_type: 'single_choice' | 'multiple_choice' | 'text_input';
}

export interface QuestionPayload { // Для создания/обновления вопроса
  content: string;
  options?: Record<string, string> | null;
  correct_answer: string | string[];
  question_type?: 'single_choice' | 'multiple_choice' | 'text_input';
}

export interface Test {
  id: number;
  title: string;
  description?: string;
  created_at: string; // ISO Date string
  // В вашей модели Test есть backref='creator' от User.tests_created.
  // В схеме TestSchema: creator = ma.Nested(UserSchemaMinimal, data_key="created_by")
  // Это значит, что в JSON будет поле "created_by".
  created_by: UserMinimal; // Используем created_by как ключ в JSON
  questions: Question[]; // Массив вопросов
}

export interface TestPayload { // Для создания/обновления теста (без вопросов)
  title: string;
  description?: string;
}

export interface TestUser { // Результаты теста
  id: number;
  user_id: number;
  test_id: number;
  score?: number | null;
  max_score?: number | null;
  taken_at: string; // ISO Date string
  answers_submitted?: Record<string, any>; // JSON {"question_id_str": "user_answer", ...}
  user: UserMinimal;
  test: {
     id: number;
     title: string;
     description?: string;
  };
}

export interface TestSubmissionPayload { // Для отправки ответов студентом
  answers: Record<string, string | string[]>; // {"question_id_str": "answer_value" or ["val1", "val2"]}
}

// --- Для чат-бота ---
export interface ChatMessage {
  id: string; // уникальный ID для ключа React
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

// --- Для уведомлений ---
export interface Notification {
  id: number | string;
  message: string;
  read: boolean;
  type: 'task' | 'test_result' | 'news' | 'general';
  link?: string; // Ссылка для перехода (например, на страницу задания)
  created_at?: string;
}