import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axioss from '../../api/axios';
import { BASE_IMAGE_URL, BASE_URL } from '../../utils/urls';
import { toast } from 'react-toastify';

type ProductInfo = {
  id: number;
  name: string;
  type_product_display?: string | null;
  size?: string;
};

type EmployeeInfo = {
  id: number;
  slug: string;
  first_name: string;
  last_name: string;
  surname: string;
  full_name: string;
  tabel_number: string;
  position?: string | null;
  base_image?: string | null;
  base_image_data?: string | null;
};

type PendingIssueData = {
  id: number;
  status: string;
  employee_signature_present?: boolean;
  warehouse_signature_present?: boolean;
  requires_warehouse_signature?: boolean;
  expires_at: string;
  time_remaining_seconds: number;
  employee: EmployeeInfo;
  products: ProductInfo[];
  created_at: string;
};

type CurrentUserInfo = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  role: 'admin' | 'shift_head' | 'sttl_head' | 'czl_head' | 'dispatcher' | 'user' | string;
  position?: string | null;
  base_avatar?: string | null;
};

type SignatureStage = 'employee' | 'warehouse';

const resolveImageUrl = (value?: string | null) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.startsWith('data:')) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `${BASE_IMAGE_URL}${raw}`;
  }

  try {
    const parsed = new URL(raw);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isHttp = parsed.protocol === 'http:';

    if (isLocalHost || isHttp) {
      return `${BASE_IMAGE_URL}${parsed.pathname}${parsed.search}`;
    }

    return raw;
  } catch {
    return `${BASE_IMAGE_URL}/${raw.replace(/^\/+/, '')}`;
  }
};

const toBackendImageUrl = (value?: string | null) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('/')) return `${BASE_IMAGE_URL}${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;

  return `${BASE_IMAGE_URL}/${raw.replace(/^\/+/, '')}`;
};

const SignaturePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [pendingData, setPendingData] = useState<PendingIssueData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [signatureStage, setSignatureStage] = useState<SignatureStage>('employee');
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePoints, setSignaturePoints] = useState<{ x: number; y: number }[]>([]);
  const [validationError, setValidationError] = useState('');

  // Fetch pending issue data
  useEffect(() => {
    if (!id) {
      setError('ID не найден');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axioss.get(`${BASE_URL}/pending-issue/${id}/`);
        setPendingData(response.data);
        setTimeRemaining(response.data.time_remaining_seconds || 0);
        if (response.data.requires_warehouse_signature) {
          setSignatureStage('warehouse');
        } else {
          setSignatureStage('employee');
        }
        setError('');
      } catch (err: any) {
        const errorData = err?.response?.data;
        if (errorData?.expired) {
          setExpired(true);
          setError('Время истекло. Начните процесс выдачи заново.');
        } else if (errorData?.confirmed) {
          toast.success('Выдача уже подтверждена');
          navigate(errorData.item_slug ? `/item-view/${errorData.item_slug}` : '/');
        } else {
          setError(errorData?.error || 'Ошибка при загрузке данных');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axioss.get('/users/user/');
        setCurrentUser(response.data as CurrentUserInfo);
      } catch {
        setCurrentUser(null);
      }
    };

    fetchCurrentUser();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setExpired(true);
          setError('Время истекло. Начните процесс выдачи заново.');
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [pendingData]);

  // Get position from event (supports both mouse and touch)
  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setValidationError('');
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setSignaturePoints((prev) => [...prev, pos]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    // Sample every 3rd point to avoid too many points
    setSignaturePoints((prev) => {
      if (prev.length % 3 === 0) {
        return [...prev, pos];
      }
      return prev;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignaturePoints([]);
    setValidationError('');
  };

  const getSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  // Validate signature to ensure it's not empty
  const validateSignature = (): { valid: boolean; error?: string } => {
    // Basic check - minimum points required
    if (!hasSignature || signaturePoints.length < 5) {
      return { valid: false, error: 'Подпись слишком короткая' };
    }

    return { valid: true };
  };

  const handleSubmit = async () => {
    if (!id || !hasSignature) {
      toast.error('Подпись обязательна');
      return;
    }

    // Validate signature
    const validation = validateSignature();
    if (!validation.valid) {
      setValidationError(validation.error || 'Недействительная подпись');
      toast.error(validation.error || 'Недействительная подпись');
      return;
    }

    const signatureData = getSignatureDataUrl();
    if (!signatureData) {
      toast.error('Не удалось получить подпись');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axioss.post(`${BASE_URL}/pending-issue/${id}/confirm/`, {
        signature: signatureData,
      });

      if (response.data?.step === 'employee_signed' || response.data?.requires_warehouse_signature) {
        toast.success(response.data?.message || 'Подпись сотрудника сохранена');
        setSignatureStage('warehouse');
        clearSignature();
        return;
      }

      toast.success('Выдача подтверждена');
      
      const itemSlug = response.data?.item_slug;
      if (itemSlug) {
        navigate(`/item-view/${itemSlug}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.expired) {
        setExpired(true);
        setError('Время истекло. Начните процесс выдачи заново.');
      } else {
        toast.error(errorData?.error || 'Ошибка при подтверждении');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (expired || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg text-center">
          <div className="mb-4 text-6xl">⏰</div>
          <h2 className="mb-2 text-xl font-semibold text-red-600">
            {expired ? 'Время истекло' : 'Ошибка'}
          </h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

   
  if (!pendingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-lg text-red-600">Данные не найдены</div>
      </div>
    );
  }

  const timeClass = timeRemaining <= 30 ? 'text-red-600 animate-pulse' : timeRemaining <= 60 ? 'text-amber-600' : 'text-green-600';
  const employeeBaseImageUrl = resolveImageUrl(
    pendingData.employee.base_image_data || pendingData.employee.base_image,
  );
  const currentUserAvatarUrl = resolveImageUrl(currentUser?.base_avatar || null);

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Timer */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow text-center">
          <div className="text-sm text-gray-500 mb-1">Оставшееся время</div>
          <div className={`text-4xl font-bold ${timeClass}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Employee info */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold border-b pb-2">Сотрудник</h2>
          <div className="flex gap-4">
            {/* Base image */}
            <div className="flex-shrink-0">
              {employeeBaseImageUrl ? (
                <img
                  src={employeeBaseImageUrl}
                  alt="Фото сотрудника"
                  className="h-32 w-24 rounded border object-cover"
                  onError={(event) => {
                    const currentSrc = event.currentTarget.getAttribute('src');
                    const fallbackSrc = toBackendImageUrl(currentSrc);
                    const alreadyRetried = event.currentTarget.dataset.retryWithBackend === '1';

                    if (!alreadyRetried && fallbackSrc && fallbackSrc !== currentSrc) {
                      event.currentTarget.dataset.retryWithBackend = '1';
                      event.currentTarget.src = fallbackSrc;
                      return;
                    }

                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-32 w-24 items-center justify-center rounded border bg-slate-100 text-xs text-gray-400">
                  Нет фото
                </div>
              )}
            </div>
            {/* Employee details */}
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Фамилия:</div>
                <div className="font-medium">{pendingData.employee.last_name}</div>
                <div className="text-gray-500">Имя:</div>
                <div className="font-medium">{pendingData.employee.first_name}</div>
                <div className="text-gray-500">Отчество:</div>
                <div className="font-medium">{pendingData.employee.surname}</div>
                <div className="text-gray-500">Табельный №:</div>
                <div className="font-medium">{pendingData.employee.tabel_number}</div>
                {pendingData.employee.position && (
                  <>
                    <div className="text-gray-500">Должность:</div>
                    <div className="font-medium">{pendingData.employee.position}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products list */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold border-b pb-2">Средства защиты</h2>
          <div className="space-y-2">
            {pendingData.products.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <span className="text-gray-500 mr-2">{index + 1}.</span>
                  <span className="font-medium">{product.name}</span>
                  {product.type_product_display && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({product.type_product_display})
                    </span>
                  )}
                </div>
                {product.size && (
                  <div className="rounded bg-slate-100 px-2 py-1 text-sm">
                    Размер: {product.size}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Signature area */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold border-b pb-2">
            {signatureStage === 'employee' ? 'Подпись сотрудника' : 'Подпись кладовщика'}
          </h2>

          {signatureStage === 'warehouse' && currentUser && (
            <div className="mb-3 rounded border border-stroke bg-slate-50 p-3 text-sm">
              <div className="mb-2 font-semibold text-slate-700">Текущий пользователь</div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {currentUserAvatarUrl ? (
                    <img
                      src={currentUserAvatarUrl}
                      alt="Аватар пользователя"
                      className="h-24 w-18 rounded border object-cover"
                      onError={(event) => {
                        const currentSrc = event.currentTarget.getAttribute('src');
                        const fallbackSrc = toBackendImageUrl(currentSrc);
                        const alreadyRetried = event.currentTarget.dataset.retryWithBackend === '1';

                        if (!alreadyRetried && fallbackSrc && fallbackSrc !== currentSrc) {
                          event.currentTarget.dataset.retryWithBackend = '1';
                          event.currentTarget.src = fallbackSrc;
                          return;
                        }

                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-24 w-18 items-center justify-center rounded border bg-slate-100 text-xs text-gray-400">
                      Нет фото
                    </div>
                  )}
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="text-slate-500">Фамилия:</div>
                  <div className="font-medium">{currentUser.lastname || '-'}</div>
                  <div className="text-slate-500">Имя:</div>
                  <div className="font-medium">{currentUser.firstname || '-'}</div>
                  <div className="text-slate-500">Должность:</div>
                  <div className="font-medium">{currentUser.position || '-'}</div>
                </div>
              </div>
            </div>
          )}

          <p className="mb-3 text-sm text-gray-600">
            {signatureStage === 'employee'
              ? 'Сотрудник ставит подпись в области ниже'
              : 'Кладовщик ставит подпись для финального подтверждения'}
          </p>
          
          <div className="relative mb-3 rounded border-2 border-dashed border-slate-300 bg-slate-50">
            <canvas
              ref={canvasRef}
              className="w-full touch-none"
              style={{ height: '200px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
                {signatureStage === 'employee' ? 'Подпись сотрудника' : 'Подпись кладовщика'}
              </div>
            )}
          </div>

          {validationError && (
            <div className="mb-3 rounded bg-red-50 border border-red-200 p-2 text-sm text-red-600">
              ⚠️ {validationError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSignature}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Очистить
            </button>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded bg-slate-500 py-3 text-white hover:bg-slate-600"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSignature || submitting}
            className="flex-1 rounded bg-green-600 py-3 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Отправка...' : signatureStage === 'employee' ? 'Продолжить' : 'Подтвердить получение'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePage;
