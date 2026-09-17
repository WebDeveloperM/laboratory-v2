import React, { useEffect, useRef, useState } from 'react'
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb'
import Logo from "../../images/logo/logo.png"
import { FaKey } from "react-icons/fa6"
import { AiOutlineLogin } from "react-icons/ai"
import { useNavigate } from 'react-router-dom'
import { BASE_URL, EMPLOYEE_SERVICE_WEB_URL } from '../../utils/urls'
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios'
import { RiLockPasswordLine } from "react-icons/ri";
import { normalizeFeatureAccess, normalizePageAccess, normalizeRole, storeFeatureAccess, storePageAccess } from '../../utils/pageAccess';

type FaceBounds = {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

type BrowserFaceDetector = {
  detect: (input: HTMLVideoElement) => Promise<Array<{ boundingBox?: { x: number; y: number; width: number; height: number } }>>;
};

type BrowserFaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector;

const getRequestErrorMessage = (error: any, fallback: string) => {
  const status = Number(error?.response?.status || 0);
  const responseData = error?.response?.data || {};

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (status >= 500) {
    return `Сервер временно недоступен (HTTP ${status}).`;
  }

  if (!error?.response) {
    return 'Не удалось подключиться к серверу.';
  }

  return fallback;
};

const FACE_DETECTION_INTERVAL_MS = 250;
const FACE_OVERLAY_PADDING = 4;
const BNPZID_CLIENT_ID = String(import.meta.env.VITE_BNPZID_CLIENT_ID || 'base-laboratory').trim() || 'base-laboratory';
const BNPZID_CALLBACK_PATH = '/auth/signin';

const SignIn: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [faceCapture, setFaceCapture] = useState("");
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceTargetUser, setFaceTargetUser] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [faceVerifyError, setFaceVerifyError] = useState('');
  const [faceBurstStatus, setFaceBurstStatus] = useState('');
  const [faceBounds, setFaceBounds] = useState<FaceBounds | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [faceDetectionSupported, setFaceDetectionSupported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [_, setResData] = useState("");
  const [error, setError] = useState<any>(null);
  const [bnpzIdLoading, setBnpzIdLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<BrowserFaceDetector | null>(null);
  const faceDetectionTimerRef = useRef<number | null>(null);
  const faceDetectionBusyRef = useRef(false);
  const bnpzIdHandledRef = useRef(false);
  const navigate = useNavigate();

  const stopFaceDetectionLoop = () => {
    if (faceDetectionTimerRef.current !== null) {
      window.clearTimeout(faceDetectionTimerRef.current);
      faceDetectionTimerRef.current = null;
    }
    faceDetectionBusyRef.current = false;
  };

  const toPercent = (value: number, total: number) => {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  };

  const normalizeDetectedFace = (boundingBox: { x: number; y: number; width: number; height: number }, video: HTMLVideoElement): FaceBounds => {
    const left = Math.max(0, boundingBox.x - (boundingBox.width * FACE_OVERLAY_PADDING) / 100);
    const top = Math.max(0, boundingBox.y - (boundingBox.height * FACE_OVERLAY_PADDING) / 100);
    const width = Math.min(video.videoWidth - left, boundingBox.width * (1 + (FACE_OVERLAY_PADDING * 2) / 100));
    const height = Math.min(video.videoHeight - top, boundingBox.height * (1 + (FACE_OVERLAY_PADDING * 2) / 100));

    return {
      leftPct: toPercent(left, video.videoWidth),
      topPct: toPercent(top, video.videoHeight),
      widthPct: toPercent(width, video.videoWidth),
      heightPct: toPercent(height, video.videoHeight),
    };
  };

  const scheduleFaceDetection = (delay = FACE_DETECTION_INTERVAL_MS) => {
    stopFaceDetectionLoop();
    if (!faceModalOpen || !cameraLive || !faceDetectorRef.current) {
      return;
    }

    faceDetectionTimerRef.current = window.setTimeout(() => {
      void detectFaceInVideo();
    }, delay);
  };

  const detectFaceInVideo = async () => {
    if (faceDetectionBusyRef.current || !faceModalOpen || !cameraLive || !videoRef.current || !faceDetectorRef.current) {
      scheduleFaceDetection();
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      scheduleFaceDetection();
      return;
    }

    faceDetectionBusyRef.current = true;
    try {
      const detectedFaces = await faceDetectorRef.current.detect(video);
      const bestFace = (detectedFaces || [])
        .map((item: { boundingBox?: { x: number; y: number; width: number; height: number } }) => item?.boundingBox)
        .filter((item: { x: number; y: number; width: number; height: number } | undefined): item is { x: number; y: number; width: number; height: number } => Boolean(item))
        .sort(
          (left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }) =>
            (right.width * right.height) - (left.width * left.height),
        )[0];

      setFaceBounds(bestFace ? normalizeDetectedFace(bestFace, video) : null);
    } catch {
      setFaceBounds(null);
    } finally {
      faceDetectionBusyRef.current = false;
      scheduleFaceDetection();
    }
  };

  const stopCamera = () => {
    stopFaceDetectionLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraLive(false);
    setFaceBounds(null);
    setCaptureProgress(0);
  };

  useEffect(() => {
    const FaceDetectorApi = (window as Window & { FaceDetector?: BrowserFaceDetectorConstructor }).FaceDetector;
    if (FaceDetectorApi) {
      faceDetectorRef.current = new FaceDetectorApi({ fastMode: true, maxDetectedFaces: 1 });
      setFaceDetectionSupported(true);
      return;
    }

    faceDetectorRef.current = null;
    setFaceDetectionSupported(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!faceModalOpen || !cameraLive) {
      stopFaceDetectionLoop();
      setFaceBounds(null);
      return;
    }

    if (!faceDetectorRef.current) {
      setFaceBounds({
        leftPct: 30,
        topPct: 16,
        widthPct: 40,
        heightPct: 58,
      });
      return;
    }

    scheduleFaceDetection(0);
    return () => {
      stopFaceDetectionLoop();
    };
  }, [faceModalOpen, cameraLive]);

  const persistBnpzIdState = (state: string) => {
    sessionStorage.setItem('bnpzid_state', state);
  };

  const consumeBnpzIdState = () => {
    const value = sessionStorage.getItem('bnpzid_state') || '';
    sessionStorage.removeItem('bnpzid_state');
    return value;
  };

  const createBnpzIdState = () => {
    if (window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getBnpzIdRedirectUri = () => {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.origin}${BNPZID_CALLBACK_PATH}`;
  };

  const startBnpzIdLogin = () => {
    const state = createBnpzIdState();
    persistBnpzIdState(state);

    const authorizeUrl = new URL('/bnpzid/authorize/', EMPLOYEE_SERVICE_WEB_URL);
    authorizeUrl.searchParams.set('client_id', BNPZID_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', getBnpzIdRedirectUri());
    authorizeUrl.searchParams.set('state', state);

    window.location.href = authorizeUrl.toString();
  };

  const completeBnpzIdLogin = async (code: string, state: string) => {
    const expectedState = consumeBnpzIdState();
    if (!expectedState || expectedState !== state) {
      toast.error('Состояние bnpzID не совпало. Повторите вход.');
      navigate('/auth/signin', { replace: true });
      return;
    }

    setBnpzIdLoading(true);
    setSubmitting(true);
    try {
      const response = await axios.post(`${BASE_URL}/users/bnpzid/login/`, {
        code,
        redirect_uri: getBnpzIdRedirectUri(),
      });
      toast.success('Вы успешно вошли через bnpzID.');
      persistLoginData(response);
      navigate('/', { replace: true });
    } catch (err: any) {
      const message = getRequestErrorMessage(err, 'Не удалось завершить вход через bnpzID');
      navigate('/auth/signin', { replace: true });
      toast.error(String(message));
    } finally {
      setSubmitting(false);
      setBnpzIdLoading(false);
    }
  };

  useEffect(() => {
    if (bnpzIdHandledRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('bnpzid_code');
    const state = params.get('state');
    if (!code) {
      return;
    }

    bnpzIdHandledRef.current = true;
    void completeBnpzIdLogin(code, state || '');
  }, [navigate]);

  const pickPreferredFrontCamera = (devices: MediaDeviceInfo[]) => {
    if (!devices.length) return '';
    const frontKeywords = ['front', 'user', 'face', 'facetime', 'selfie', 'frontal'];
    const integratedKeywords = ['integrated', 'internal', 'built-in', 'default'];
    const rearKeywords = ['back', 'rear', 'environment', 'world', 'traseira'];

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

  const loadVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [] as MediaDeviceInfo[];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');

    if (!selectedDeviceId || !cameras.some((camera) => camera.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(pickPreferredFrontCamera(cameras));
    }

    return cameras;
  };

  const isRearFacingStream = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const facingMode = String(track.getSettings?.().facingMode || '').toLowerCase();
    if (facingMode === 'environment') return true;

    const label = String(track.label || '').toLowerCase();
    return ['back', 'rear', 'environment', 'world', 'traseira'].some((keyword) => label.includes(keyword));
  };

  useEffect(() => {
    if (faceModalOpen) {
      setFaceCapture('');
      setFaceVerifyError('');
      setFaceBurstStatus('');
      startCamera();
      return;
    }
    stopCamera();
  }, [faceModalOpen]);

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

  const getFaceIdCameraStream = async () => {
    let cameras = await loadVideoDevices();

    if (!cameras.length || cameras.every((camera) => !camera.label)) {
      const warmupStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      warmupStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      cameras = await loadVideoDevices();
    }

    const preferredDeviceId = selectedDeviceId || pickPreferredFrontCamera(cameras);
    const preferredConstraints: MediaStreamConstraints[] = [
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
      {
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      },
    ];

    let lastError: unknown = null;

    for (const constraints of preferredConstraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isRearFacingStream(stream) || !preferredDeviceId) {
          return stream;
        }

        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
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

      const stream = await getFaceIdCameraStream();

      if (!videoRef.current) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        throw new Error('video_not_ready');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      streamRef.current = stream;
      setCameraLive(stream.getVideoTracks().some((track: MediaStreamTrack) => track.readyState === 'live'));
    } catch (error: any) {
      const errorName = String(error?.name || '');
      if (errorName === 'NotAllowedError') {
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

  const captureCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return '';
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return '';

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!faceBounds) {
      setFaceVerifyError('Сначала дождитесь, пока система найдет лицо в кадре.');
      return;
    }
    setFaceVerifyError('');
    setCaptureProgress(0);
    setFaceBurstStatus('Снимок получен, выполняется проверка...');
    setCaptureProgress(1);

    const frame = captureCurrentFrame();
    if (!frame) {
      setFaceBurstStatus('');
      setCaptureProgress(0);
      return;
    }

    setFaceCapture(frame);
    try {
      await performLogin(true, frame);
    } finally {
      setCaptureProgress(0);
    }
  };

  const closeFaceModal = () => {
    setFaceModalOpen(false);
    setFaceCapture('');
    setFaceBurstStatus('');
    setFaceTargetUser('');
    setCameraError('');
    setFaceVerifyError('');
    setFaceBounds(null);
    setCaptureProgress(0);
    stopCamera();
  };

  const persistLoginData = (response: any) => {
    const nextRole = normalizeRole(response.data.role || 'user');
    const nextPageAccess = normalizePageAccess(response.data?.page_access, nextRole);
    const nextFeatureAccess = normalizeFeatureAccess(response.data?.feature_access, nextRole);

    setResData(response.data);
    localStorage.setItem("token", response.data.token)
    localStorage.setItem("expires_at", response.data.expires_at)
    localStorage.setItem("firstname", response.data.firstname)
    localStorage.setItem("lastname", response.data.lastname)
    localStorage.setItem("base_avatar", response.data.base_avatar || '')
    localStorage.setItem("username", response.data.username || username)
    localStorage.setItem("role", nextRole)
    localStorage.setItem("can_edit", String(Boolean(response.data?.permissions?.can_edit)))
    localStorage.setItem("can_delete", String(Boolean(response.data?.permissions?.can_delete)))
    storePageAccess(nextPageAccess)
    storeFeatureAccess(nextFeatureAccess)
    localStorage.setItem("isLogin", "true")
  };

  const performLogin = async (withFaceId: boolean, capturedFace?: string) => {
    const payload: Record<string, string | string[]> = {
      username,
      password,
    };

    const facePayload = capturedFace || faceCapture;
    if (withFaceId && facePayload) {
      payload.face_capture = facePayload;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${BASE_URL}/users/login/`, payload);
      toast.success("Вы успешно вошли в систему.");
      persistLoginData(response);
      closeFaceModal();
      navigate("/");
    } catch (err: any) {
      const responseData = err?.response?.data || {};
      const requiresFaceId = Boolean(responseData?.requires_face_id);
      if (requiresFaceId && !withFaceId) {
        const fullName = [responseData?.lastname, responseData?.firstname]
          .filter((item: string) => String(item || '').trim())
          .join(' ')
          .trim();

        setFaceTargetUser(fullName || responseData?.username || username);
        setFaceVerifyError('');
        setFaceBurstStatus('');
        setFaceModalOpen(true);
        toast.info('Для этой роли требуется Face ID подтверждение');
        return;
      }

      if (requiresFaceId && withFaceId) {
        const message = getRequestErrorMessage(err, 'Face ID не подтвержден');
        setFaceVerifyError(String(message));
        setFaceBurstStatus('');
        toast.error(String(message));
        return;
      }

      const message = Number(err?.response?.status || 0) === 401
        ? 'Неправильный логин или пароль'
        : getRequestErrorMessage(err, 'Ошибка входа в систему');
      if (faceModalOpen) {
        setFaceVerifyError(String(message));
      }
      toast.error(String(message));
      setError(err)
    } finally {
      if (!faceModalOpen) {
        setFaceBurstStatus('');
      }
      setSubmitting(false);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.warning("Требуется логин и пароль")
      return
    }
    await performLogin(false);
  };

  console.log(error, 1111111);

  const faceGuideDetected = Boolean(faceBounds);
  const autofocusFrameWidth = faceBounds
    ? Math.min(100, faceBounds.widthPct + 6)
    : 64;
  const autofocusFrameLeft = faceBounds
    ? Math.max(0, 100 - (Math.max(0, faceBounds.leftPct - 3) + autofocusFrameWidth))
    : 18;
  const autofocusFrameStyle = faceBounds
    ? {
        left: `${autofocusFrameLeft}%`,
        top: `${Math.max(0, faceBounds.topPct - 3)}%`,
        width: `${autofocusFrameWidth}%`,
        height: `${Math.min(100, faceBounds.heightPct + 6)}%`,
      }
    : {
        left: '18%',
        top: '14%',
        width: '64%',
        height: '70%',
      };
  const autofocusFrameVisualStyle = {
    borderColor: faceGuideDetected ? 'rgb(34 197 94)' : 'rgba(34, 197, 94, 0.8)',
    borderStyle: faceGuideDetected ? 'solid' as const : 'dashed' as const,
    boxShadow: captureProgress > 0
      ? '0 0 0 2px rgba(34,197,94,0.28), 0 0 24px rgba(34,197,94,0.45)'
      : '0 0 0 1px rgba(34,197,94,0.2), 0 0 16px rgba(34,197,94,0.24)',
  };


  return (
    <>
      <Breadcrumb pageName="Войти в систему" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="hidden w-full xl:block xl:w-1/2">
            <div className="py-17.5 px-26 text-center">
              <a className="inline-block" href='https://bnpz.uz' target='_blank'>
                <img className="w-[120px] mb-2" src={Logo} alt="Logo" />
                {/* <img className="dark:hidden" src={LogoDark} alt="Logo" /> */}
              </a>

              <p className="2xl:px-20 text-4xl mb-2">
                Войти в систему
              </p>
              <p className="2xl:px-20 ">
                Для входа в систему введите логин и пароль
              </p>

              <span className="mt-5 inline-block">
                <svg
                  width="350"
                  height="350"
                  viewBox="0 0 350 350"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M33.5825 294.844L30.5069 282.723C25.0538 280.414 19.4747 278.414 13.7961 276.732L13.4079 282.365L11.8335 276.159C4.79107 274.148 0 273.263 0 273.263C0 273.263 6.46998 297.853 20.0448 316.653L35.8606 319.429L23.5737 321.2C25.2813 323.253 27.1164 325.196 29.0681 327.019C48.8132 345.333 70.8061 353.736 78.1898 345.787C85.5736 337.838 75.5526 316.547 55.8074 298.235C49.6862 292.557 41.9968 288.001 34.2994 284.415L33.5825 294.844Z"
                    fill="#F2F2F2"
                  />
                  <path
                    d="M62.8332 281.679L66.4705 269.714C62.9973 264.921 59.2562 260.327 55.2652 255.954L52.019 260.576L53.8812 254.45C48.8923 249.092 45.2489 245.86 45.2489 245.86C45.2489 245.86 38.0686 270.253 39.9627 293.358L52.0658 303.903L40.6299 299.072C41.0301 301.712 41.596 304.324 42.3243 306.893C49.7535 332.77 64.2336 351.323 74.6663 348.332C85.0989 345.341 87.534 321.939 80.1048 296.063C77.8019 288.041 73.5758 280.169 68.8419 273.123L62.8332 281.679Z"
                    fill="#F2F2F2"
                  />
                  <path
                    d="M243.681 82.9153H241.762V30.3972C241.762 26.4054 240.975 22.4527 239.447 18.7647C237.918 15.0768 235.677 11.7258 232.853 8.90314C230.028 6.0805 226.674 3.84145 222.984 2.31385C219.293 0.786245 215.337 0 211.343 0H99.99C91.9222 0 84.1848 3.20256 78.48 8.90314C72.7752 14.6037 69.5703 22.3354 69.5703 30.3972V318.52C69.5703 322.512 70.3571 326.465 71.8859 330.153C73.4146 333.841 75.6553 337.192 78.48 340.015C81.3048 342.837 84.6582 345.076 88.3489 346.604C92.0396 348.131 95.9952 348.918 99.99 348.918H211.343C219.41 348.918 227.148 345.715 232.852 340.014C238.557 334.314 241.762 326.582 241.762 318.52V120.299H243.68L243.681 82.9153Z"
                    fill="#E6E6E6"
                  />
                  <path
                    d="M212.567 7.9054H198.033C198.701 9.54305 198.957 11.3199 198.776 13.0793C198.595 14.8387 197.984 16.5267 196.997 17.9946C196.01 19.4625 194.676 20.6652 193.114 21.4967C191.552 22.3283 189.809 22.7632 188.039 22.7632H124.247C122.477 22.7631 120.734 22.3281 119.172 21.4964C117.61 20.6648 116.277 19.462 115.289 17.9942C114.302 16.5263 113.691 14.8384 113.511 13.079C113.33 11.3197 113.585 9.54298 114.254 7.9054H100.678C94.6531 7.9054 88.8749 10.297 84.6146 14.5542C80.3543 18.8113 77.9609 24.5852 77.9609 30.6057V318.31C77.9609 324.331 80.3543 330.105 84.6146 334.362C88.8749 338.619 94.6531 341.011 100.678 341.011H212.567C218.592 341.011 224.37 338.619 228.63 334.362C232.891 330.105 235.284 324.331 235.284 318.31V30.6053C235.284 24.5848 232.891 18.811 228.63 14.554C224.37 10.297 218.592 7.9054 212.567 7.9054Z"
                    fill="white"
                  />
                  <path
                    d="M142.368 122.512C142.368 120.501 142.898 118.526 143.904 116.784C144.911 115.043 146.359 113.597 148.102 112.592C146.36 111.587 144.383 111.057 142.371 111.057C140.358 111.057 138.381 111.586 136.639 112.591C134.896 113.596 133.448 115.042 132.442 116.784C131.436 118.525 130.906 120.501 130.906 122.512C130.906 124.522 131.436 126.498 132.442 128.239C133.448 129.981 134.896 131.427 136.639 132.432C138.381 133.437 140.358 133.966 142.371 133.966C144.383 133.966 146.36 133.436 148.102 132.431C146.359 131.426 144.911 129.981 143.905 128.24C142.898 126.499 142.368 124.523 142.368 122.512Z"
                    fill="#CCCCCC"
                  />
                  <path
                    d="M156.779 122.512C156.778 120.501 157.308 118.526 158.315 116.784C159.321 115.043 160.769 113.597 162.513 112.592C160.77 111.587 158.793 111.057 156.781 111.057C154.769 111.057 152.792 111.586 151.049 112.591C149.306 113.596 147.859 115.042 146.852 116.784C145.846 118.525 145.316 120.501 145.316 122.512C145.316 124.522 145.846 126.498 146.852 128.239C147.859 129.981 149.306 131.427 151.049 132.432C152.792 133.437 154.769 133.966 156.781 133.966C158.793 133.966 160.77 133.436 162.513 132.431C160.769 131.426 159.322 129.981 158.315 128.24C157.308 126.499 156.779 124.523 156.779 122.512Z"
                    fill="#CCCCCC"
                  />
                  <path
                    d="M170.862 133.966C177.192 133.966 182.325 128.838 182.325 122.512C182.325 116.186 177.192 111.057 170.862 111.057C164.531 111.057 159.398 116.186 159.398 122.512C159.398 128.838 164.531 133.966 170.862 133.966Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M190.017 158.289H123.208C122.572 158.288 121.962 158.035 121.512 157.586C121.062 157.137 120.809 156.527 120.809 155.892V89.1315C120.809 88.496 121.062 87.8866 121.512 87.4372C121.962 86.9878 122.572 86.735 123.208 86.7343H190.017C190.653 86.735 191.263 86.9878 191.713 87.4372C192.163 87.8866 192.416 88.496 192.416 89.1315V155.892C192.416 156.527 192.163 157.137 191.713 157.586C191.263 158.035 190.653 158.288 190.017 158.289ZM123.208 87.6937C122.826 87.6941 122.46 87.8457 122.19 88.1154C121.92 88.385 121.769 88.7507 121.768 89.132V155.892C121.769 156.274 121.92 156.639 122.19 156.909C122.46 157.178 122.826 157.33 123.208 157.33H190.017C190.399 157.33 190.765 157.178 191.035 156.909C191.304 156.639 191.456 156.274 191.457 155.892V89.132C191.456 88.7507 191.304 88.385 191.035 88.1154C190.765 87.8457 190.399 87.6941 190.017 87.6937H123.208Z"
                    fill="#CCCCCC"
                  />
                  <path
                    d="M204.934 209.464H102.469V210.423H204.934V209.464Z"
                    fill="#CCCCCC"
                  />
                  <path
                    d="M105.705 203.477C107.492 203.477 108.941 202.029 108.941 200.243C108.941 198.457 107.492 197.01 105.705 197.01C103.918 197.01 102.469 198.457 102.469 200.243C102.469 202.029 103.918 203.477 105.705 203.477Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M204.934 241.797H102.469V242.757H204.934V241.797Z"
                    fill="#CCCCCC"
                  />
                  <path
                    d="M105.705 235.811C107.492 235.811 108.941 234.363 108.941 232.577C108.941 230.791 107.492 229.344 105.705 229.344C103.918 229.344 102.469 230.791 102.469 232.577C102.469 234.363 103.918 235.811 105.705 235.811Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M203.062 278.617H170.68C170.121 278.617 169.584 278.394 169.189 277.999C168.793 277.604 168.571 277.068 168.57 276.509V265.168C168.571 264.609 168.793 264.073 169.189 263.678C169.584 263.283 170.121 263.06 170.68 263.06H203.062C203.621 263.06 204.158 263.283 204.553 263.678C204.949 264.073 205.171 264.609 205.172 265.168V276.509C205.171 277.068 204.949 277.604 204.553 277.999C204.158 278.394 203.621 278.617 203.062 278.617Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M116.263 203.477C118.05 203.477 119.499 202.029 119.499 200.243C119.499 198.457 118.05 197.01 116.263 197.01C114.476 197.01 113.027 198.457 113.027 200.243C113.027 202.029 114.476 203.477 116.263 203.477Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M126.818 203.477C128.605 203.477 130.054 202.029 130.054 200.243C130.054 198.457 128.605 197.01 126.818 197.01C125.031 197.01 123.582 198.457 123.582 200.243C123.582 202.029 125.031 203.477 126.818 203.477Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M116.263 235.811C118.05 235.811 119.499 234.363 119.499 232.577C119.499 230.791 118.05 229.344 116.263 229.344C114.476 229.344 113.027 230.791 113.027 232.577C113.027 234.363 114.476 235.811 116.263 235.811Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M126.818 235.811C128.605 235.811 130.054 234.363 130.054 232.577C130.054 230.791 128.605 229.344 126.818 229.344C125.031 229.344 123.582 230.791 123.582 232.577C123.582 234.363 125.031 235.811 126.818 235.811Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M264.742 229.309C264.972 229.414 265.193 229.537 265.404 229.678L286.432 220.709L287.183 215.174L295.585 215.123L295.089 227.818L267.334 235.153C267.275 235.345 267.205 235.535 267.124 235.719C266.722 236.574 266.077 237.292 265.269 237.783C264.46 238.273 263.525 238.514 262.58 238.475C261.636 238.436 260.723 238.119 259.958 237.563C259.193 237.008 258.61 236.239 258.28 235.353C257.951 234.467 257.892 233.504 258.108 232.584C258.325 231.664 258.809 230.829 259.5 230.183C260.19 229.538 261.056 229.11 261.989 228.955C262.922 228.799 263.879 228.922 264.742 229.309Z"
                    fill="#FFB8B8"
                  />
                  <path
                    d="M298.642 344.352H292.894L290.16 322.198L298.643 322.198L298.642 344.352Z"
                    fill="#FFB8B8"
                  />
                  <path
                    d="M288.788 342.711H299.873V349.685H281.809C281.809 347.835 282.544 346.062 283.853 344.754C285.162 343.446 286.937 342.711 288.788 342.711Z"
                    fill="#1C2434"
                  />
                  <path
                    d="M320.995 342.729L315.274 343.292L310.379 321.513L318.822 320.682L320.995 342.729Z"
                    fill="#FFB8B8"
                  />
                  <path
                    d="M311.028 342.061L322.059 340.975L322.744 347.916L304.766 349.685C304.676 348.774 304.767 347.854 305.033 346.977C305.299 346.101 305.735 345.285 306.317 344.577C306.898 343.869 307.614 343.283 308.422 342.851C309.23 342.419 310.116 342.151 311.028 342.061Z"
                    fill="#1C2434"
                  />
                  <path
                    d="M300.242 191.677C306.601 191.677 311.757 186.525 311.757 180.17C311.757 173.815 306.601 168.663 300.242 168.663C293.882 168.663 288.727 173.815 288.727 180.17C288.727 186.525 293.882 191.677 300.242 191.677Z"
                    fill="#FFB8B8"
                  />
                  <path
                    d="M291.607 339.872C291.113 339.873 290.635 339.7 290.256 339.383C289.877 339.066 289.623 338.626 289.537 338.139C286.562 321.636 276.838 267.676 276.605 266.181C276.6 266.147 276.597 266.112 276.598 266.077V262.054C276.597 261.907 276.643 261.764 276.729 261.645L278.013 259.847C278.074 259.761 278.154 259.689 278.247 259.639C278.34 259.588 278.444 259.559 278.549 259.554C285.874 259.211 309.86 258.206 311.019 259.652C312.183 261.106 311.772 265.512 311.678 266.38L311.682 266.471L322.459 335.337C322.543 335.886 322.408 336.446 322.082 336.896C321.756 337.347 321.265 337.65 320.717 337.742L313.986 338.85C313.485 338.931 312.971 338.829 312.539 338.563C312.107 338.297 311.784 337.885 311.63 337.401C309.548 330.754 302.568 308.393 300.149 299.741C300.133 299.686 300.099 299.639 300.051 299.607C300.004 299.576 299.946 299.563 299.89 299.571C299.834 299.579 299.782 299.608 299.745 299.651C299.708 299.694 299.688 299.749 299.689 299.806C299.81 308.054 300.102 329.098 300.203 336.366L300.214 337.148C300.218 337.678 300.023 338.191 299.668 338.584C299.313 338.978 298.823 339.224 298.295 339.274L291.804 339.863C291.738 339.869 291.672 339.872 291.607 339.872Z"
                    fill="#1C2434"
                  />
                  <path
                    d="M292.933 196.201C290.924 197.395 289.721 199.588 289.031 201.821C287.754 205.953 286.985 210.226 286.741 214.545L286.012 227.475L276.984 261.755C284.809 268.37 289.322 266.867 299.855 261.455C310.387 256.044 311.591 263.26 311.591 263.26L313.697 234.092L316.706 202.219C316.031 201.407 315.266 200.672 314.427 200.03C311.645 197.868 308.409 196.366 304.962 195.636C301.516 194.906 297.948 194.967 294.528 195.815L292.933 196.201Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M290.001 236.232C290.244 236.324 290.479 236.434 290.704 236.562L311.497 226.163L311.842 220.529L320.419 219.938L320.878 232.781L293.092 241.963C292.865 242.935 292.347 243.816 291.608 244.487C290.868 245.158 289.941 245.588 288.951 245.72C287.96 245.852 286.953 245.68 286.063 245.226C285.173 244.772 284.442 244.058 283.968 243.179C283.494 242.301 283.299 241.298 283.409 240.306C283.519 239.313 283.928 238.378 284.583 237.624C285.238 236.869 286.107 236.332 287.075 236.084C288.043 235.835 289.063 235.887 290.001 236.232Z"
                    fill="#FFB8B8"
                  />
                  <path
                    d="M316.556 202.365C321.672 204.17 322.573 223.716 322.573 223.716C316.554 220.409 309.332 225.821 309.332 225.821C309.332 225.821 307.827 220.709 306.022 214.094C305.477 212.233 305.412 210.265 305.832 208.372C306.253 206.479 307.147 204.724 308.429 203.269C308.429 203.269 311.44 200.56 316.556 202.365Z"
                    fill="#3056D3"
                  />
                  <path
                    d="M310.566 183.213C309.132 182.066 307.174 184.151 307.174 184.151L306.026 173.828C306.026 173.828 298.853 174.687 294.261 173.542C289.67 172.396 288.953 177.7 288.953 177.7C288.716 175.557 288.668 173.399 288.81 171.248C289.096 168.667 292.827 166.087 299.427 164.366C306.026 162.646 309.47 170.101 309.47 170.101C314.061 172.395 312.001 184.36 310.566 183.213Z"
                    fill="#1C2434"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">

              <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Войдите с помощью логина и пароля
              </h2>

              <form onSubmit={handleLogin}>
                <ToastContainer />
                {bnpzIdLoading ? (
                  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                    Выполняется вход через bnpzID...
                  </div>
                ) : null}
                <div className="mb-4">
                  <label className="mb-2.5 block font-medium text-black dark:text-white">Логин</label><div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Логин"
                      className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary" />
                    <span className="absolute right-4 top-4">
                      <AiOutlineLogin className='text-2xl text-[#333]' />
                    </span></div>
                </div>
                <div className="mb-4">
                  <label className="mb-2.5 block font-medium text-black dark:text-white">Пароль</label><div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Пароль"
                      className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary" />
                    <span className="absolute right-4 top-4">
                      <RiLockPasswordLine className='text-2xl text-[#333]' />
                    </span>
                  </div>
                </div>
                <div className="mb-5">
                  <input
                    type="submit"
                    value="Войти"
                    disabled={submitting || bnpzIdLoading}
                    className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90"
                  />
                </div>

                <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  <span className="h-px flex-1 bg-stroke dark:bg-strokedark"></span>
                  <span>или</span>
                  <span className="h-px flex-1 bg-stroke dark:bg-strokedark"></span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-1">
                  <button
                    type="button"
                    onClick={startBnpzIdLogin}
                    disabled={submitting || bnpzIdLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-stroke bg-gray p-4 font-medium hover:bg-opacity-50 disabled:opacity-60 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-opacity-50"
                  >
                    <FaKey className='text-primary' />
                    Через bnpzID
                  </button>
                </div>

                {/* <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Прямой вход через Face ID отключен из соображений безопасности. Для входа используйте логин и пароль, а затем подтвердите личность через Face ID.
                </div> */}

                {/* <a href='https://t.me/marufshabonov1514' target='_blank' className="flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-gray p-4 hover:bg-opacity-50 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-opacity-50">
                  <FaKey className='text-primary' />
                  Получить логин и пароль
                </a> */}

              </form>
            </div>
          </div>
        </div>
      </div>

      {faceModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full md:w-1/2 rounded-lg bg-white p-4 shadow-xl dark:bg-boxdark">
            <h3 className="mb-3 text-lg font-semibold text-black dark:text-white">
              Face ID подтверждение
            </h3>
            {faceTargetUser ? (
              <p className="mb-2 text-sm font-medium text-black dark:text-white">Пользователь: {faceTargetUser}</p>
            ) : null}

            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Посмотрите в камеру и сделайте один четкий снимок лица для сравнения с базовым фото.
            </p>

            {!cameraOpen ? (
              <div className="rounded border border-stroke px-3 py-2 text-sm text-slate-600 dark:border-strokedark dark:text-slate-300">
                Запуск камеры...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded border bg-black">
                  <div className="aspect-video w-full">
                    <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
                      <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        autoPlay
                        playsInline
                        muted
                        onPlaying={() => setCameraLive(true)}
                        onPause={() => setCameraLive(false)}
                        onEmptied={() => setCameraLive(false)}
                      />
                      <div
                        className="pointer-events-none absolute rounded-2xl border-[3px] transition-all duration-200"
                        style={{
                          ...autofocusFrameStyle,
                          ...autofocusFrameVisualStyle,
                        }}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 py-3 text-xs text-white">
                      {faceGuideDetected
                        ? (submitting
                          ? 'Проверка продолжается...'
                          : 'Готово. Смотрите в камеру и сделайте снимок.')
                        : faceDetectionSupported
                          ? 'Смотрите прямо в камеру. Система должна определить лицо.'
                          : 'Браузер не поддерживает детектор лица. Удерживайте лицо по центру и начните проверку.'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureFace}
                    disabled={!cameraLive || submitting || !faceGuideDetected}
                    className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Проверка...'
                      : 'Снять и проверить Face ID'}
                  </button>
                </div>
              </div>
            )}

            {cameraError ? <p className="mt-2 text-xs text-red-600">{cameraError}</p> : null}
            {faceVerifyError ? <p className="mt-2 text-xs text-red-600">{faceVerifyError}</p> : null}
            {faceBurstStatus ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{faceBurstStatus}</p> : null}
            {faceCapture ? <p className="mt-2 text-xs text-green-600">Снимок для Face ID подготовлен</p> : null}
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeFaceModal}
                disabled={submitting}
                className="rounded border border-stroke px-4 py-2 dark:border-strokedark"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  );
};

export default SignIn;



