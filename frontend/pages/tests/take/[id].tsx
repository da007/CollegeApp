// pages/tests/take/[id].tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import apiClient from '../../../services/apiClient';
import { Test, Question, TestSubmissionPayload, TestUser } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';

// Тип для значений формы ответов
type TestAnswersForm = Record<string, string | string[]>; // { "question_id_str": "answer" }

const TakeTestPageContent = () => {
  const router = useRouter();
  const { id: testId } = router.query;
  const { user, isLoading: authLoading } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<TestAnswersForm>({});

  useEffect(() => {
    if (testId && typeof testId === 'string' && user && user.role.name === 'student') {
      const fetchTestForTaking = async () => {
        setLoading(true);
        setPageError(null);
        try {
          // Эндпоинт /api/tests/:id/questions для студента должен отдавать вопросы с опциями, но без correct_answer
          const testInfoRes = await apiClient.get<Test>(`/tests/${testId}`);
          setTest(testInfoRes.data);
          // Загружаем вопросы отдельно, если они не приходят с информацией о тесте или нужны свежие
          const questionsRes = await apiClient.get<Question[]>(`/tests/${testId}/questions`);
          setQuestions(questionsRes.data); // Бэкенд должен отфильтровать correct_answer для студента
        } catch (err: any) {
          if (err.response?.status === 404) setPageError('Test not found.');
          else setPageError(err.response?.data?.msg || 'Failed to load test.');
        } finally {
          setLoading(false);
        }
      };
      fetchTestForTaking();
    } else if (user && user.role.name !== 'student') {
        setPageError("Only students can take tests.");
        setLoading(false);
    }
  }, [testId, user]);

  const onSubmitAnswers: SubmitHandler<TestAnswersForm> = async (data) => {
    setIsSubmittingTest(true);
    setSubmissionError(null);
    const payload: TestSubmissionPayload = { answers: {} };

    questions.forEach(q => {
        const answer = data[`q_${q.id}`];
        if (answer !== undefined && answer !== null && ( (typeof answer === 'string' && answer.trim() !== '') || (Array.isArray(answer) && answer.length > 0) ) ) {
            payload.answers[String(q.id)] = answer;
        }
    });

    if (Object.keys(payload.answers).length === 0) {
        setSubmissionError("Please answer at least one question.");
        setIsSubmittingTest(false);
        return;
    }
    
    try {
      const result = await apiClient.post<TestUser>(`/tests/${testId}/submit`, payload);
      alert(`Test submitted! Your score: ${result.data.score}/${result.data.max_score}`);
      // TODO: Редирект на страницу результатов или профиль
      router.push(`/profile?testCompleted=${testId}`); // Пример
    } catch (error: any) {
      setSubmissionError(error.response?.data?.msg || "Failed to submit test answers.");
    } finally {
      setIsSubmittingTest(false);
    }
  };

  if (loading || authLoading) return <div className="text-center py-10 animate-pulse">Loading test...</div>;
  if (pageError) return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Error: {pageError}</div>;
  if (!test || questions.length === 0) return <div className="text-center py-10">Test or questions not available.</div>;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">{test.title}</h1>
        {test.description && <p className="text-gray-600 mt-2">{test.description}</p>}
      </header>

      <form onSubmit={handleSubmit(onSubmitAnswers)} className="bg-white p-6 rounded-lg shadow-md space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="py-4 border-b last:border-b-0">
            <p className="font-semibold text-lg text-gray-800 mb-3">{index + 1}. {question.content}</p>
            
            {question.question_type === 'single_choice' && question.options && (
              <Controller
                name={`q_${question.id}`}
                control={control}
                rules={{ required: 'Please select an answer' }}
                render={({ field }) => (
                  <div className="space-y-2">
                    {Object.entries(question.options!).map(([key, value]) => (
                      <label key={key} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                        <input type="radio" {...field} value={key} className="form-radio h-5 w-5 text-indigo-600" />
                        <span className="ml-3 text-gray-700">{value}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            )}

            {question.question_type === 'multiple_choice' && question.options && (
                 <div>
                    {Object.entries(question.options).map(([key, optionValue]) => (
                        <Controller
                            key={key}
                            name={`q_${question.id}`} // Для RHF массив будет формироваться автоматически
                            control={control}
                            // rules={{ required: 'Please select at least one answer' }}
                            render={({ field }) => (
                                <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        value={key}
                                        className="form-checkbox h-5 w-5 text-indigo-600"
                                        checked={field.value?.includes(key) || false}
                                        onChange={(e) => {
                                            const currentValues = field.value || [];
                                            if (e.target.checked) {
                                                field.onChange([...currentValues, key]);
                                            } else {
                                                field.onChange(currentValues.filter((v: string) => v !== key));
                                            }
                                        }}
                                    />
                                    <span className="ml-3 text-gray-700">{optionValue}</span>
                                </label>
                            )}
                        />
                    ))}
                 </div>
            )}

            {question.question_type === 'text_input' && (
              <Controller
                name={`q_${question.id}`}
                control={control}
                rules={{ required: 'Please provide an answer' }}
                render={({ field }) => (
                  <textarea {...field} rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            placeholder="Your answer here..." />
                )}
              />
            )}
            {errors[`q_${question.id}`] && <p className="text-red-500 text-xs mt-1">This field is required.</p>}
          </div>
        ))}

        {submissionError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submissionError}</p>}
        
        <div className="pt-6 text-center">
          <button type="submit" disabled={isSubmittingTest}
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 text-lg">
            {isSubmittingTest ? "Submitting..." : "Submit Answers"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Доступ только для студентов
const TakeTestPage = ProtectedRoute(TakeTestPageContent, ['student']);
export default TakeTestPage;