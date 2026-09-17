import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { toast } from 'react-toastify';
import axioss from '../../api/axios';
import { BASE_URL } from '../../utils/urls';
import { isAuthenticated } from '../../utils/auth';

type UserRole = 'admin' | 'it_center' | 'user';

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Администратор' },
  { value: 'it_center', label: 'IT Center' },
  { value: 'user', label: 'Пользователь' },
];

const SignUp = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [baseAvatarFile, setBaseAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [faceCapture, setFaceCapture] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentRole = (localStorage.getItem('role') || 'user').toLowerCase();
  const isAdmin = currentRole === 'admin';

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraLive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const pickPreferredFrontCamera = (devices: MediaDeviceInfo[]) => {
    if (!devices.length) return '';
    const frontKeywords = ['front', 'user', 'face', 'facetime', 'selfie'];
    const integratedKeywords = ['integrated', 'internal', 'built-in', 'default'];
    const rearKeywords = ['back', 'rear', 'environment', 'world'];

    const frontDevice = devices.find((device) => {
      const label = String(device.label || '').toLowerCase();
      const hasFrontKeyword = frontKeywords.some((keyword) => label.includes(keyword));
      const hasRearKeyword = rearKeywords.some((keyword) => label.includes(keyword));
      return hasFrontKeyword && !hasRearKeyword;
    });

    if (frontDevice) return frontDevice.deviceId;

    const integratedDevice = devices.find((device) => {
      const label = String(device.label || '').toLowerCase();
      const hasIntegratedKeyword = integratedKeywords.some((keyword) => label.includes(keyword));
      const hasRearKeyword = rearKeywords.some((keyword) => label.includes(keyword));
      return hasIntegratedKeyword && !hasRearKeyword;
    });

    if (integratedDevice) return integratedDevice.deviceId;
    return devices[0].deviceId;
  };

  const isRearFacingStream = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const facingMode = String(track.getSettings?.().facingMode || '').toLowerCase();
    if (facingMode === 'environment') return true;

    const label = String(track.label || '').toLowerCase();
    return ['back', 'rear', 'environment', 'world', 'traseira'].some((keyword) => label.includes(keyword));
  };

  const loadVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [] as MediaDeviceInfo[];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    setVideoDevices(cameras);

    if (!selectedDeviceId || !cameras.some((camera) => camera.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(pickPreferredFrontCamera(cameras));
    }

    return cameras;
  };

  useEffect(() => {
    loadVideoDevices().catch(() => {
      setVideoDevices([]);
    });
  }, []);

  const attachAndPlayStream = async (stream: MediaStream) => {
    if (!videoRef.current) return false;
    const video = videoRef.current;
    video.srcObject = stream;

    try {
      await video.play();
    } catch {
      return false;
    }

    const hasLiveTrack = stream.getVideoTracks().some((track) => track.readyState === 'live');
    return hasLiveTrack;
  };

  const openStreamForDevice = async (deviceId: string) => {
    const deviceConstraints: MediaStreamConstraints[] = [
      {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          deviceId: { ideal: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
    ];

    let lastError: unknown = null;

    for (const constraints of deviceConstraints) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (cameraError) {
        lastError = cameraError;
      }
    }

    throw lastError;
  };

  const openPreferredCameraStream = async () => {
    let cameras = await loadVideoDevices();

    if (!cameras.length || cameras.every((camera) => !camera.label)) {
      const warmupStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      warmupStream.getTracks().forEach((track) => track.stop());
      cameras = await loadVideoDevices();
    }

    const preferredDeviceId = selectedDeviceId || pickPreferredFrontCamera(cameras);
    const constraintsList: MediaStreamConstraints[] = selectedDeviceId
      ? [
          {
            video: {
              deviceId: { exact: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: {
              deviceId: { ideal: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
        ]
      : [
          {
            video: {
              facingMode: { exact: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: preferredDeviceId
              ? {
                  deviceId: { ideal: preferredDeviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
            audio: false,
          },
        ];

    let lastError: unknown = null;

    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isRearFacingStream(stream) || !preferredDeviceId) {
          return stream;
        }

        stream.getTracks().forEach((track) => track.stop());
        return await openStreamForDevice(preferredDeviceId);
      } catch (cameraError) {
        lastError = cameraError;
      }
    }

    throw lastError;
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      stopCamera();
      setCameraOpen(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const stream = await openPreferredCameraStream();
      const started = await attachAndPlayStream(stream);
      if (!started) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('camera_not_started');
      }

      streamRef.current = stream;
      setCameraLive(stream.getVideoTracks().some((track) => track.readyState === 'live'));
    } catch (error: any) {
      const errorName = String(error?.name || '');
      if (errorName === 'NotReadableError') {
        setCameraError('Камера занята (используется другой программой). Закройте её и повторите попытку');
      } else if (errorName === 'NotAllowedError') {
        setCameraError('Доступ к камере запрещён. Разрешите доступ в браузере.');
      } else if (errorName === 'NotFoundError') {
        setCameraError('Камера не найдена.');
      } else {
        setCameraError('Не удалось открыть камеру.');
      }
      setCameraOpen(false);
      setCameraLive(false);
    }
  };

  const handleCameraDeviceChange = async (nextDeviceId: string) => {
    setSelectedDeviceId(nextDeviceId);
    if (!cameraOpen) return;

    try {
      setCameraError('');
      stopCamera();
      setCameraOpen(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const stream = await openPreferredCameraStream();
      const started = await attachAndPlayStream(stream);
      if (!started) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('camera_not_started');
      }

      streamRef.current = stream;
      setCameraLive(stream.getVideoTracks().some((track) => track.readyState === 'live'));
    } catch {
      setCameraError('Выбранная камера не запустилась');
      setCameraOpen(false);
      setCameraLive(false);
    }
  };

  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFaceCapture(dataUrl);
    if (!baseAvatarFile) {
      setAvatarPreview(dataUrl);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setBaseAvatarFile(file);

    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview('');
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Логин и пароль обязательны');
      return;
    }

    if (username.trim().length < 3) {
      toast.error('Логин должен содержать минимум 3 символа');
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (!passwordConfirm.trim()) {
      toast.error('Подтверждение пароля обязательно');
      return;
    }

    if (password !== passwordConfirm) {
      toast.error('Пароль и подтверждение пароля не совпадают');
      return;
    }

    if (!baseAvatarFile && !faceCapture) {
      toast.error('Загрузите аватар файлом или сделайте снимок с камеры');
      return;
    }

    if (!faceCapture) {
      toast.error('Сделайте Face ID подтверждение через камеру');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('password', password);
      formData.append('password_confirm', passwordConfirm);
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      formData.append('role', role);
      if (baseAvatarFile) {
        formData.append('base_avatar', baseAvatarFile);
      } else if (faceCapture) {
        formData.append('base_avatar_data', faceCapture);
      }
      formData.append('face_capture', faceCapture);

      const response = await axioss.post(`${BASE_URL}/users/register/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        `${response.data?.message || 'Пользователь зарегистрирован'} (FaceID: ${response.data?.similarity ?? '-'}%)`,
      );

      setUsername('');
      setPassword('');
      setPasswordConfirm('');
      setFirstName('');
      setLastName('');
      setRole('user');
      setBaseAvatarFile(null);
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview('');
      setFaceCapture('');
      stopCamera();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        'Ошибка регистрации';
      toast.error(String(message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Breadcrumb pageName="Регистрация" />

      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">Регистрация пользователя</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Логин</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Подтверждение пароля</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Имя</label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Фамилия</label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Роль</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Роль Администратор может создавать только суперпользователь.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-black dark:text-white">Базовое фото 3x4</label>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-md border border-stroke bg-transparent py-2 px-3 text-black file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />

                <div className="mt-2 rounded border p-3">
                  <label className="mb-1 block text-sm text-gray-700">Камера</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(event) => handleCameraDeviceChange(event.target.value)}
                    className="mb-2 w-full rounded border px-2 py-2 text-sm"
                  >
                    {videoDevices.length === 0 ? (
                      <option value="">Камера не найдена</option>
                    ) : (
                      videoDevices.map((device, index) => (
                        <option key={device.deviceId || `cam-${index}`} value={device.deviceId}>
                          {device.label || `Камера ${index + 1}`}
                        </option>
                      ))
                    )}
                  </select>

                  {!cameraOpen ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Открыть камеру
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full max-w-md rounded border bg-black"
                        autoPlay
                        playsInline
                        muted
                        onPlaying={() => setCameraLive(true)}
                        onPause={() => setCameraLive(false)}
                        onEmptied={() => setCameraLive(false)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={captureFace}
                          disabled={!cameraLive}
                          className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Снять фото
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="rounded bg-slate-500 px-3 py-2 text-sm text-white hover:bg-slate-600"
                        >
                          Закрыть камеру
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError ? <p className="mt-2 text-xs text-red-600">{cameraError}</p> : null}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              <div className="sm:col-span-5">
                <div className="h-full rounded border p-3">
                  <div className="mb-2 text-sm text-gray-600">Текущее фото</div>
                  {avatarPreview ? (
                    <div className="mx-auto h-56 w-40 rounded border bg-black/5 p-1">
                      <img
                        src={avatarPreview}
                        alt="avatar-preview"
                        className="h-full w-full rounded object-contain bg-black"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Фото не выбрано</p>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Можно выбрать файл или использовать снимок с камеры как базовый аватар и Face ID.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-primary px-5 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-70"
          >
            {submitting ? 'Регистрация...' : 'Зарегистрировать'}
          </button>
        </form>
      </div>
    </>
  );
};

export default SignUp;
