// frontend/pages/tests/edit/[id].tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import apiClient from '../../../services/apiClient';
import { Test, TestPayload, Question, QuestionPayload } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';

// Тип для формы редактирования/создания вопроса
interface QuestionFormFields extends QuestionPayload {
  id?: number; // Для существующих вопросов
}

const EditTestPageContent = () => {
  const router = useRouter();
  const { id: testId } = router.query;
  const { user, isLoading: authLoading } = useAuth();

  const [testData, setTestData] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [testDetailsSubmitError, setTestDetailsSubmitError] = useState<string | null>(null);
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);


  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Форма для редактирования информации о тесте
  const { 
    register: registerTest, 
    handleSubmit: handleSubmitTest, 
    setValue: setTestValue, 
    formState: { errors: testErrors, isSubmitting: isTestSubmitting } 
  } = useForm<TestPayload>();

  // Форма для добавления/редактирования вопроса
  const { 
    register: registerQuestion, 
    handleSubmit: handleSubmitQuestion, 
    reset: resetQuestionForm, 
    control: questionControl, 
    watch: watchQuestionType, // Для отслеживания типа вопроса
    formState: { errors: questionErrors, isSubmitting: isQuestionSubmitting } 
  } = useForm<QuestionFormFields>({
    defaultValues: {
        content: '',
        options: {}, // Инициализируем как пустой объект
        correct_answer: '',
        question_type: 'single_choice'
    }
  });

  const currentQuestionType = watchQuestionType("question_type");

  const fetchTestAndQuestions = useCallback(async () => {
    if (testId && typeof testId === 'string' && user) { // Убедимся, что user загружен
      setLoading(true);
      setPageError(null);
      try {
        const testRes = await apiClient.get<Test>(`/tests/${testId}`);
        if (user.role.name !== 'admin' && testRes.data.created_by.id !== user.id) {
          setPageError("You don't have permission to edit this test.");
          setLoading(false);
          return;
        }
        setTestData(testRes.data);
        setTestValue('title', testRes.data.title);
        setTestValue('description', testRes.data.description || '');

        const questionsRes = await apiClient.get<Question[]>(`/tests/${testId}/questions`);
        setQuestions(questionsRes.data);

      } catch (err: any) {
        if (err.response?.status === 404) setPageError('Test not found.');
        else if (err.response?.status === 403) setPageError("Permission denied.");
        else setPageError(err.response?.data?.msg || 'Failed to fetch test data.');
        console.error("Error fetching test/questions:", err);
      } finally {
        setLoading(false);
      }
    } else if (testId && typeof testId === 'string' && !user && !authLoading) {
        setPageError("Authentication data not available. Please ensure you are logged in.");
        setLoading(false);
    }
  }, [testId, user, authLoading, setTestValue]);

  useEffect(() => {
    if (!authLoading) { // Вызываем только когда статус аутентификации известен
        fetchTestAndQuestions();
    }
  }, [testId, authLoading, fetchTestAndQuestions]);


  const onTestSubmit: SubmitHandler<TestPayload> = async (data) => {
    setTestDetailsSubmitError(null);
    try {
      await apiClient.put(`/tests/${testId}`, data);
      if (testData) {
        setTestData({ ...testData, ...data });
      }
      alert("Test details updated successfully!");
    } catch (error: any) {
      console.error("Error updating test details:", error);
      setTestDetailsSubmitError(error.response?.data?.msg || "Failed to update test details.");
    }
  };

  const openQuestionModal = (question: Question | null = null) => {
    setQuestionModalError(null); // Сброс ошибки при открытии модалки
    setEditingQuestion(question);
    if (question) {
      resetQuestionForm({
        id: question.id,
        content: question.content,
        // Убедимся, что options это объект, даже если null/undefined из API
        options: question.options && typeof question.options === 'object' ? question.options : {},
        correct_answer: typeof question.correct_answer === 'string' ? question.correct_answer : JSON.stringify(question.correct_answer),
        question_type: question.question_type,
      });
    } else {
      resetQuestionForm({
        content: '',
        options: {},
        correct_answer: '',
        question_type: 'single_choice',
        id: undefined
      });
    }
    setIsQuestionModalOpen(true);
  };

  const onQuestionSubmit: SubmitHandler<QuestionFormFields> = async (data) => {
    setQuestionModalError(null);
    let payload: QuestionPayload = {
      content: data.content,
      correct_answer: data.correct_answer,
      question_type: data.question_type || 'single_choice',
      options: data.options // Бэкенд ожидает JSON или null
    };

    // Обработка options и correct_answer в зависимости от типа вопроса
    if (payload.question_type === 'text_input') {
        payload.options = null;
    } else {
        // Если options пустой объект или строка, пробуем парсить, если строка
        if (typeof payload.options === 'string') {
            try {
                const parsedOptions = JSON.parse(payload.options);
                payload.options = parsedOptions;
            } catch (e) {
                setQuestionModalError("Invalid JSON format for options.");
                return;
            }
        } else if (!payload.options || Object.keys(payload.options).length === 0) {
             // Если тип не text_input, а опций нет, это ошибка
            setQuestionModalError("Options are required for choice-based questions.");
            return;
        }
    }
    
    // Для multiple_choice correct_answer должен быть массивом (или JSON-строкой массива)
    if (payload.question_type === 'multiple_choice') {
        try {
            // Пытаемся распарсить, если это строка JSON-массива
            if (typeof payload.correct_answer === 'string') {
                const parsedAnswer = JSON.parse(payload.correct_answer);
                if (!Array.isArray(parsedAnswer)) throw new Error("Must be an array.");
                payload.correct_answer = parsedAnswer;
            } else if (!Array.isArray(payload.correct_answer)) { // Если не строка и не массив
                 throw new Error("Must be an array or JSON string of an array.");
            }
        } catch (e) {
            setQuestionModalError("For multiple choice, correct answer must be a valid JSON array (e.g., [\"a\", \"c\"]).");
            return;
        }
    }


    try {
      if (editingQuestion && editingQuestion.id) {
        await apiClient.put(`/tests/${testId}/questions/${editingQuestion.id}`, payload);
      } else {
        await apiClient.post(`/tests/${testId}/questions`, payload);
      }
      setIsQuestionModalOpen(false);
      fetchTestAndQuestions(); 
      alert(`Question ${editingQuestion ? 'updated' : 'added'} successfully!`);
    } catch (error: any) {
      console.error("Error saving question:", error);
      setQuestionModalError(error.response?.data?.msg || `Failed to ${editingQuestion ? 'update' : 'add'} question.`);
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await apiClient.delete(`/tests/${testId}/questions/${questionId}`);
        fetchTestAndQuestions();
        alert("Question deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting question:", error);
        alert(error.response?.data?.msg || "Failed to delete question.");
      }
    }
  };


  if (authLoading || loading) {
    return <div className="text-center py-10 animate-pulse">Loading test editor...</div>;
  }
  if (pageError) {
    return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Error: {pageError}</div>;
  }
  if (!testData) {
    // Это может случиться, если pageError был установлен, но рендер дошел сюда
    return <div className="text-center py-10">Test data not available or access denied.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/tests" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Tests List
        </Link>
      </div>
      
      <form onSubmit={handleSubmitTest(onTestSubmit)} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Edit Test Details: {testData.title}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="testTitle" className="block text-sm font-medium text-gray-700">Title</label>
            <input 
              id="testTitle" 
              type="text" 
              {...registerTest('title', { required: "Title is required" })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${testErrors.title ? 'border-red-500' : ''}`} 
            />
            {testErrors.title && <p className="text-red-500 text-xs mt-1">{testErrors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="testDescription" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              id="testDescription" 
              {...registerTest('description')} 
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" 
            />
          </div>
          {testDetailsSubmitError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{testDetailsSubmitError}</p>}
          <button 
            type="submit" 
            disabled={isTestSubmitting} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isTestSubmitting ? "Saving Test Details..." : "Save Test Details"}
          </button>
        </div>
      </form>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Manage Questions</h2>
          <button 
            onClick={() => openQuestionModal(null)} 
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Add New Question
          </button>
        </div>
        {questions.length === 0 ? (
          <p className="text-gray-500">No questions have been added to this test yet.</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q, index) => (
              <li key={q.id} className="p-3 border rounded-md flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex-grow">
                    <span className="font-medium text-gray-800">{index + 1}. {q.content.substring(0, 100)}{q.content.length > 100 && '...'}</span>
                    <span className="text-xs text-gray-500 ml-2">({q.question_type})</span>
                </div>
                <div className="space-x-2 flex-shrink-0 ml-4">
                  <button onClick={() => openQuestionModal(q)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="relative bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">{editingQuestion ? "Edit Question" : "Add New Question"}</h3>
                <button onClick={() => setIsQuestionModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmitQuestion(onQuestionSubmit)} className="space-y-4">
              <div>
                <label htmlFor="qContent" className="block text-sm font-medium text-gray-700">Question Content</label>
                <textarea 
                    id="qContent" 
                    {...registerQuestion('content', { required: "Content is required" })} 
                    rows={3}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${questionErrors.content ? 'border-red-500' : ''}`} 
                />
                {questionErrors.content && <p className="text-red-500 text-xs mt-1">{questionErrors.content.message}</p>}
              </div>
              <div>
                <label htmlFor="qType" className="block text-sm font-medium text-gray-700">Question Type</label>
                <select 
                    id="qType" 
                    {...registerQuestion('question_type')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 bg-white"
                >
                  <option value="single_choice">Single Choice</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="text_input">Text Input (Exact Match)</option>
                </select>
              </div>
              
              {currentQuestionType !== 'text_input' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Options (JSON format, e.g., {`{"a": "Option A", "b": "Option B"}`})
                  </label>
                  <Controller
                      name="options"
                      control={questionControl}
                      rules={{
                          validate: value => {
                              if (currentQuestionType === 'text_input') return true; // Опции не нужны для text_input
                              if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
                                  return "Options are required for choice questions.";
                              }
                              // Если строка, то должна быть валидным JSON
                              if (typeof value === 'string') {
                                  try {
                                      JSON.parse(value);
                                  } catch (e) {
                                      return "Invalid JSON format for options. Please use e.g., {\"a\": \"text\"}";
                                  }
                              }
                              return true;
                          }
                      }}
                      render={({ field }) => (
                          <textarea
                              {...field}
                              rows={4}
                              value={field.value ? (typeof field.value === 'string' ? field.value : JSON.stringify(field.value, null, 2)) : ''}
                              onChange={(e) => {
                                  // Не пытаемся парсить на каждое изменение, чтобы пользователь мог вводить JSON
                                  field.onChange(e.target.value);
                              }}
                              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${questionErrors.options ? 'border-red-500' : ''}`}
                              placeholder={`{\n  "a": "Option text A",\n  "b": "Option text B"\n}`}
                          />
                      )}
                  />
                  {questionErrors.options && <p className="text-red-500 text-xs mt-1">{questionErrors.options.message}</p>}
                </div>
              )}

              <div>
                <label htmlFor="qCorrect" className="block text-sm font-medium text-gray-700">Correct Answer</label>
                <input 
                    id="qCorrect" 
                    type="text" 
                    {...registerQuestion('correct_answer', { required: "Correct answer is required" })}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${questionErrors.correct_answer ? 'border-red-500' : ''}`}
                    placeholder={currentQuestionType === 'multiple_choice' ? 'JSON array: ["a", "c"]' : (currentQuestionType === 'single_choice' ? 'Key of correct option: e.g., "a"' : 'Exact text of answer')} 
                />
                {questionErrors.correct_answer && <p className="text-red-500 text-xs mt-1">{questionErrors.correct_answer.message}</p>}
                 <p className="text-xs text-gray-500 mt-1">
                    {currentQuestionType === 'single_choice' && "Enter the key of the correct option (e.g., 'a')."}
                    {currentQuestionType === 'multiple_choice' && "Enter a JSON array of correct option keys (e.g., [\"a\", \"c\"])."}
                    {currentQuestionType === 'text_input' && "Enter the exact text expected for a correct answer (case-insensitive on backend)."}
                </p>
              </div>

              {questionModalError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{questionModalError}</p>}
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                    type="button" 
                    onClick={() => setIsQuestionModalOpen(false)} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={isQuestionSubmitting} 
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isQuestionSubmitting ? "Saving Question..." : (editingQuestion ? "Update Question" : "Add Question")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const EditTestPage = ProtectedRoute(EditTestPageContent, ['admin', 'teacher']);
export default EditTestPage;