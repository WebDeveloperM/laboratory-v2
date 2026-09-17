import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axioss from '../../api/axios';
import { BASE_URL, resolveEmployeeImageUrl } from '../../utils/urls';
import { isAuthenticated } from '../../utils/auth';
import { FaLongArrowAltLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';


type PpeOption = {
  id: number;
  name: string;
  type_product: string | null;
  type_product_display?: string | null;
  renewal_months: number;
  can_issue?: boolean;
  months_left?: number;
  remaining_text?: string | null;
  not_due_message?: string | null;
  size?: string;
  last_issued_at?: string | null;
  next_due_date?: string | null;
  default_size?: string | null;
  size_type?: 'shoe' | 'headdress' | 'clothe' | null;
  default_size_remaining?: number | null;
  stock_available?: boolean | null;
  stock_message?: string | null;
};

type EmployeeSizes = {
  clothe_size?: string | null;
  shoe_size?: string | null;
};

type AddItemResponse = {
  item?: {
    employee?: {
      slug?: string;
      first_name?: string;
      last_name?: string;
      surname?: string;
      tabel_number?: string;
      base_image?: string | null;
      base_image_url?: string | null;
      position?: string;
      department?: { name?: string };
      section?: { name?: string };
      requires_face_id_checkout?: boolean;
    };
    ppeproduct_info?: Array<{ id: number; size?: string }>;
    issued_at?: string | null;
  };
  ppe_products?: PpeOption[];
  employee_sizes?: EmployeeSizes | null;
};

type PendingConfirmResponse = {
  pending_issue_id?: number;
  item_slug?: string;
  qr_frontend_path?: string;
  qr_scan_url?: string;
};

type FaceBox = { x: number; y: number; width: number; height: number };

type StockCheckState = {
  checking: boolean;
  available: boolean | null;
  remaining: number;
  size: string;
  error?: string;
};

type AvailableSizeItem = {
  size: string;
  remaining: number;
};

type AvailableSizesState = {
  loading: boolean;
  sizes: AvailableSizeItem[];
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${filename}.${extension}`, { type: blob.type || 'image/jpeg' });
};

const AddItemPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'user';
  const isManagerTier = role === 'shift_head' || role === 'sttl_head' || role === 'czl_head' || role === 'dispatcher';
  const canAddItem = role === 'admin' || role === 'it_center' || isManagerTier;
  const canEditEmployeeBaseImage = role === 'admin' || isManagerTier;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingBaseImage, setUpdatingBaseImage] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AddItemResponse | null>(null);
  const baseImageInputRef = useRef<HTMLInputElement | null>(null);
  const toIssueDateTime24 = (value?: string | null) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const [issuedAt] = useState<string>(() => toIssueDateTime24());
  const [selectedPpeIds, setSelectedPpeIds] = useState<number[]>([]);
  const [ppeSizes, setPpeSizes] = useState<Record<number, string>>({});
  const [stockChecks, setStockChecks] = useState<Record<number, StockCheckState>>({});
  const [availableSizes, setAvailableSizes] = useState<Record<number, AvailableSizesState>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceMessage, setFaceMessage] = useState('');
  const [cameraLive, setCameraLive] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<any>(null);
  const detectFaceIntervalRef = useRef<number | null>(null);
  const detectInProgressRef = useRef(false);
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);
  const [faceDetectAvailable, setFaceDetectAvailable] = useState(false);

  const employee = data?.item?.employee;
  const employeeBaseImageUrl = resolveEmployeeImageUrl(employee?.base_image_url || employee?.base_image);
  const employeeSlug = String(employee?.slug || slug || '').trim();
  const ppeOptions = data?.ppe_products ?? [];
  const selectedPpeOptions = useMemo(
    () => ppeOptions.filter((item) => selectedPpeIds.includes(item.id)),
    [ppeOptions, selectedPpeIds],
  );

  const applyEmployeeImage = (nextImageUrl: string) => {
    setData((prev) => {
      if (!prev?.item?.employee) return prev;
      return {
        ...prev,
        item: {
          ...prev.item,
          employee: {
            ...prev.item.employee,
            base_image: nextImageUrl,
            base_image_url: nextImageUrl,
          },
        },
      };
    });
  };

  const uploadEmployeeBaseImage = async (file: File) => {
    if (!employeeSlug) return;

    const formData = new FormData();
    formData.append('base_image', file);

    const response = await axioss.put(`${BASE_URL}/employee-service/employees/${employeeSlug}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const nextImageUrl = String(response.data?.base_image_url || response.data?.base_image || '').trim();
    if (nextImageUrl) {
      applyEmployeeImage(nextImageUrl);
    }

    setFaceVerified(false);
    setFaceMessage('');
    stopCamera();
  };

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError('');
    axioss
      .get(`${BASE_URL}/add-item/${slug}`)
      .then((response) => {
        const payload = response.data as AddItemResponse;
        setData(payload);
        setError('');

        const preselected = (payload.item?.ppeproduct_info ?? [])
          .map((x) => Number(x.id))
          .filter((x) => Number.isFinite(x))
          .filter((id) => {
            const option = (payload.ppe_products ?? []).find((entry) => Number(entry.id) === id);
            return option ? option.can_issue !== false : true;
          });

        if (preselected.length > 0) {
          setSelectedPpeIds(preselected);
        }

        const prefilledSizes = (payload.item?.ppeproduct_info ?? []).reduce((acc, product) => {
          const productId = Number(product.id);
          if (Number.isFinite(productId) && product.size) {
            acc[productId] = String(product.size);
          }
          return acc;
        }, {} as Record<number, string>);
        setPpeSizes(prefilledSizes);

      })
        .catch(() => setError('Ошибка при загрузке данных'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBaseImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = '';

    if (!selectedFile || !employeeSlug) return;
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Faqat rasm faylini yuklash mumkin');
      return;
    }

    try {
      setUpdatingBaseImage(true);
      await uploadEmployeeBaseImage(selectedFile);
      setCapturedImage(null);
      toast.success('Bazaviy rasm yangilandi');
    } catch (uploadError: any) {
      const backendError = uploadError?.response?.data?.error;
      toast.error(backendError || 'Bazaviy rasmni yangilab bo‘lmadi');
    } finally {
      setUpdatingBaseImage(false);
    }
  };

  const handleUseCapturedImageAsBase = async () => {
    if (!capturedImage || !employeeSlug) {
      toast.error('Сначала сделайте снимок с камеры');
      return;
    }

    try {
      setUpdatingBaseImage(true);
      const safeName = String(employee?.tabel_number || employeeSlug || 'employee').replace(/[^a-zA-Z0-9-_]/g, '_');
      const capturedFile = await dataUrlToFile(capturedImage, `employee-base-${safeName}`);
      await uploadEmployeeBaseImage(capturedFile);
      toast.success('Сохранено как базовое изображение сотрудника');
    } catch (uploadError: any) {
      const backendError = uploadError?.response?.data?.error;
      toast.error(backendError || 'Не удалось сохранить изображение с камеры как базовое');
    } finally {
      setUpdatingBaseImage(false);
    }
  };

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
    };
  }, []);

  useEffect(() => {
    const FaceDetectorClass = (window as any)?.FaceDetector;
    if (!FaceDetectorClass) {
      setFaceDetectAvailable(false);
      return;
    }

    try {
      faceDetectorRef.current = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 5 });
      setFaceDetectAvailable(true);
    } catch {
      faceDetectorRef.current = null;
      setFaceDetectAvailable(false);
    }
  }, []);

  const clearFaceOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawFaceOverlay = (boxes: FaceBox[]) => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas) return;

    const width = video.clientWidth || 0;
    const height = video.clientHeight || 0;
    if (width < 2 || height < 2) {
      clearFaceOverlay();
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const sourceWidth = video.videoWidth || width;
    const sourceHeight = video.videoHeight || height;
    const scaleX = width / sourceWidth;
    const scaleY = height / sourceHeight;

    context.strokeStyle = '#22c55e';
    context.lineWidth = 2;

    boxes.forEach((box) => {
      context.strokeRect(
        box.x * scaleX,
        box.y * scaleY,
        box.width * scaleX,
        box.height * scaleY,
      );
    });
  };

  const detectFacesViaBackend = async (): Promise<FaceBox[]> => {
    if (!videoRef.current || !canvasRef.current) return [];

    const video = videoRef.current;
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    if (sourceWidth < 2 || sourceHeight < 2) return [];

    const maxWidth = 640;
    const targetWidth = Math.min(sourceWidth, maxWidth);
    const targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / sourceWidth));

    const canvas = canvasRef.current;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) return [];

    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.65);

    const response = await axioss.post(`${BASE_URL}/detect-face-boxes/`, {
      captured_image: imageDataUrl,
    });

    const ratioX = sourceWidth / targetWidth;
    const ratioY = sourceHeight / targetHeight;

    const boxes = (response.data?.boxes || [])
      .map((box: any) => ({
        x: Number(box?.x || 0) * ratioX,
        y: Number(box?.y || 0) * ratioY,
        width: Number(box?.width || 0) * ratioX,
        height: Number(box?.height || 0) * ratioY,
      }))
      .filter((box: FaceBox) => box.width > 0 && box.height > 0);

    return boxes;
  };

  useEffect(() => {
    if (!cameraOpen || !cameraLive || !videoRef.current) {
      if (detectFaceIntervalRef.current) {
        window.clearInterval(detectFaceIntervalRef.current);
        detectFaceIntervalRef.current = null;
      }
      setFaceBoxes([]);
      clearFaceOverlay();
      return;
    }

    const detectFaces = async () => {
      if (detectInProgressRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if ((video.videoWidth || 0) < 2 || (video.videoHeight || 0) < 2) return;

      detectInProgressRef.current = true;
      try {
        let boxes: FaceBox[] = [];

        if (faceDetectorRef.current) {
          const faces = await faceDetectorRef.current.detect(video);
          boxes = (faces || [])
            .map((face: any) => {
              const bb = face?.boundingBox;
              if (!bb) return null;
              return {
                x: Number(bb.x || 0),
                y: Number(bb.y || 0),
                width: Number(bb.width || 0),
                height: Number(bb.height || 0),
              };
            })
            .filter((box: FaceBox | null): box is FaceBox => !!box && box.width > 0 && box.height > 0);
        } else {
          boxes = await detectFacesViaBackend();
        }

        setFaceBoxes(boxes);
        drawFaceOverlay(boxes);
      } catch {
        setFaceBoxes([]);
        clearFaceOverlay();
      } finally {
        detectInProgressRef.current = false;
      }
    };

    detectFaces();
  detectFaceIntervalRef.current = window.setInterval(detectFaces, faceDetectorRef.current ? 220 : 480);

    return () => {
      if (detectFaceIntervalRef.current) {
        window.clearInterval(detectFaceIntervalRef.current);
        detectFaceIntervalRef.current = null;
      }
      detectInProgressRef.current = false;
      setFaceBoxes([]);
      clearFaceOverlay();
    };
  }, [cameraOpen, cameraLive]);

  const pickPreferredExternalCamera = (devices: MediaDeviceInfo[]) => {
    if (!devices.length) return '';

    const externalKeywords = ['usb', 'webcam', 'logitech', 'external', 'hd pro'];
    const integratedKeywords = ['integrated', 'internal', 'built-in', 'facetime', 'default'];

    const externalDevice = devices.find((device) => {
      const label = String(device.label || '').toLowerCase();
      const hasExternalKeyword = externalKeywords.some((keyword) => label.includes(keyword));
      const hasIntegratedKeyword = integratedKeywords.some((keyword) => label.includes(keyword));
      return hasExternalKeyword && !hasIntegratedKeyword;
    });

    if (externalDevice) return externalDevice.deviceId;
    if (devices.length > 1) return devices[devices.length - 1].deviceId;
    return devices[0].deviceId;
  };

  const loadVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [] as MediaDeviceInfo[];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    setVideoDevices(cameras);

    if (!selectedDeviceId || !cameras.some((camera) => camera.deviceId === selectedDeviceId)) {
      const preferredId = pickPreferredExternalCamera(cameras);
      setSelectedDeviceId(preferredId);
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
    if (!hasLiveTrack) {
      return false;
    }

    const started = await new Promise<boolean>((resolve) => {
      let settled = false;

      const finalize = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const timeout = window.setTimeout(() => {
        finalize((video.videoWidth || 0) > 0 && (video.videoHeight || 0) > 0);
      }, 2500);

      const onCanPlay = () => {
        window.clearTimeout(timeout);
        finalize((video.videoWidth || 0) > 0 && (video.videoHeight || 0) > 0);
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
    });

    return started || hasLiveTrack;
  };

  const openPreferredCameraStream = async () => {
    let cameras = await loadVideoDevices();

    if (!cameras.length || cameras.every((camera) => !camera.label)) {
      const warmupStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      warmupStream.getTracks().forEach((track) => track.stop());
      cameras = await loadVideoDevices();
    }

    const preferredDeviceId = selectedDeviceId || pickPreferredExternalCamera(cameras);

    const primaryConstraints: MediaStreamConstraints = {
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
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    let started = await attachAndPlayStream(stream);

    if (!started) {
      stream.getTracks().forEach((track) => track.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      await attachAndPlayStream(stream);
    }

    return stream;
  };

  const startCamera = async () => {
    if (!employee?.base_image && !canEditEmployeeBaseImage) {
      setError('Не загружена базовая фотография сотрудника 3×4');
      return;
    }

    try {
      setError('');
      stopCamera();

      // First open cameraOpen so video element renders
      setCameraOpen(true);
      setFaceVerified(false);
      setFaceMessage('');

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const stream = await openPreferredCameraStream();
      streamRef.current = stream;

      setCameraLive(stream.getVideoTracks().some((track) => track.readyState === 'live'));
    } catch (error: any) {
      setCameraOpen(false);
      setCameraLive(false);
      const errorName = String(error?.name || '');
      const errorMessage = String(error?.message || '');
      if (errorName === 'NotReadableError') {
        setError('Камера занята (используется другой программой). Закройте её и повторите попытку');
        return;
      }
      if (errorName === 'NotAllowedError') {
        setError('Доступ к камере запрещён. Проверьте разрешения браузера');
        return;
      }
      if (errorName === 'NotFoundError') {
        setError('Устройство камеры не найдено');
        return;
      }
      if (errorName || errorMessage) {
        setError(`Не удалось открыть камеру: ${errorName || 'Error'} ${errorMessage}`.trim());
        return;
      }
      setError('Не удалось открыть камеру. Проверьте устройство и настройки браузера');
    }
  };

  const handleCameraDeviceChange = async (nextDeviceId: string) => {
    setSelectedDeviceId(nextDeviceId);
    if (!cameraOpen) return;

    try {
      setError('');
      stopCamera();
      setCameraOpen(true);

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const stream = await openPreferredCameraStream();
      streamRef.current = stream;
      setCameraLive(stream.getVideoTracks().some((track) => track.readyState === 'live'));
    } catch {
      setError('Tanlangan kamera ishga tushmadi');
      setCameraOpen(false);
      setCameraLive(false);
    }
  };

  const captureAndVerifyFace = async () => {
    if (!slug || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (!cameraLive) {
      setError('Камера ещё не готова. Подождите несколько секунд и повторите попытку');
      return;
    }

    if ((video.videoWidth || 0) < 2 || (video.videoHeight || 0) < 2) {
      setError('Не удалось получить изображение с камеры. Выберите другую камеру и повторите попытку');
      return;
    }

    if (faceBoxes.length === 0) {
      setError('Yuz kadrda aniqlanmadi. Kameraga tik qarang va yuzni markazga olib qayta urinib ko‘ring');
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const captureFrame = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.88);
    };

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const capturedFrames: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      capturedFrames.push(captureFrame());
      if (index < 4) {
        await sleep(220);
      }
    }

    setCapturedImage(capturedFrames[capturedFrames.length - 1] || null);

    setVerifyingFace(true);
    setFaceMessage('Проверка...');

    try {
      const response = await axioss.post(`${BASE_URL}/verify-employee-face/${slug}`, {
        captured_image: capturedFrames[0],
        captured_images: capturedFrames,
      });

      const isVerified = Boolean(response.data?.verified);
      const similarity = Number(response.data?.similarity || 0).toFixed(2);
      const samples = Number(response.data?.samples || 1);
      const rawMessage = String(response.data?.message || (isVerified ? 'Сотрудник подтвержден' : 'Сотрудник не подтвержден'));
      const message = rawMessage === 'Hodim tasdiqlandi'
        ? 'Сотрудник подтвержден'
        : rawMessage === 'Hodim emas'
          ? 'Сотрудник не подтвержден'
          : rawMessage;

      setFaceVerified(isVerified);
      setFaceMessage(`${message} (${similarity}%) • кадров: ${samples}`);
      if (isVerified) {
        stopCamera();
      }
    } catch (err: any) {
      const backendError = err?.response?.data?.error;
      setFaceVerified(false);
      setFaceMessage(backendError || 'Ошибка при проверке лица');
    } finally {
      setVerifyingFace(false);
    }
  };

  // Determine if requirement Face ID verification: skip if employee not required
  const requiresFaceId = employee?.requires_face_id_checkout !== false;

  const canSubmit = useMemo(() => selectedPpeIds.length > 0 && (!requiresFaceId || faceVerified), [selectedPpeIds, faceVerified, requiresFaceId]);

  const hasUnavailableSize = useMemo(() => {
    return selectedPpeIds.some((id) => {
      const sizeValue = (ppeSizes[id] || '').trim();
      if (!sizeValue) return false;
      const check = stockChecks[id];
      if (!check) return false;
      if (check.size !== sizeValue) return false;
      return check.available === false;
    });
  }, [selectedPpeIds, ppeSizes, stockChecks]);

  const hasPendingSizeCheck = useMemo(() => {
    return selectedPpeIds.some((id) => {
      const sizeValue = (ppeSizes[id] || '').trim();
      if (!sizeValue) return false;
      const check = stockChecks[id];
      if (!check) return true;
      if (check.size !== sizeValue) return true;
      return check.checking;
    });
  }, [selectedPpeIds, ppeSizes, stockChecks]);

  // Check if any selected PPE is missing a required size
  const hasMissingSize = useMemo(() => {
    return selectedPpeIds.some((id) => {
      const sizeValue = (ppeSizes[id] || '').trim();
      return !sizeValue;
    });
  }, [selectedPpeIds, ppeSizes]);

  const canSubmitWithStock = canSubmit && !hasUnavailableSize && !hasPendingSizeCheck && !hasMissingSize;
  
  const productsLocked = requiresFaceId && !faceVerified;

  useEffect(() => {
    const targets = selectedPpeIds
      .map((id) => ({ id, size: (ppeSizes[id] || '').trim() }))
      .filter((entry) => Boolean(entry.size));

    const targetIds = new Set(targets.map((entry) => entry.id));
    setStockChecks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((rawId) => {
        const id = Number(rawId);
        if (!targetIds.has(id)) {
          delete next[id];
        }
      });
      return next;
    });

    if (!targets.length) {
      return;
    }

    const timerId = window.setTimeout(() => {
      targets.forEach(({ id, size }) => {
        setStockChecks((prev) => ({
          ...prev,
          [id]: {
            checking: true,
            available: prev[id]?.available ?? null,
            remaining: prev[id]?.remaining ?? 0,
            size,
          },
        }));

        axioss
          .post(`${BASE_URL}/item-stock-check/`, {
            ppeproduct_id: id,
            size,
          })
          .then((response) => {
            const payload = response.data || {};
            setStockChecks((prev) => ({
              ...prev,
              [id]: {
                checking: false,
                available: Boolean(payload.available),
                remaining: Number(payload.remaining || 0),
                size,
              },
            }));
          })
          .catch((err) => {
            const backendError = String(err?.response?.data?.error || 'Размер bo\'yicha ombor tekshiruvi muvaffaqiyatsiz').trim();
            setStockChecks((prev) => ({
              ...prev,
              [id]: {
                checking: false,
                available: false,
                remaining: 0,
                size,
                error: backendError,
              },
            }));
          });
      });
    }, 350);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [selectedPpeIds, ppeSizes]);

  // Fetch available sizes when a product is selected
  useEffect(() => {
    const idsToFetch = selectedPpeIds.filter((id) => !availableSizes[id]);

    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => {
      setAvailableSizes((prev) => ({
        ...prev,
        [id]: { loading: true, sizes: [] },
      }));

      axioss
        .get(`${BASE_URL}/item-available-sizes/${id}/`)
        .then((response) => {
          const sizes = response.data?.available_sizes || [];
          setAvailableSizes((prev) => ({
            ...prev,
            [id]: { loading: false, sizes },
          }));
        })
        .catch(() => {
          setAvailableSizes((prev) => ({
            ...prev,
            [id]: { loading: false, sizes: [] },
          }));
        });
    });
  }, [selectedPpeIds]);

  const togglePpe = (id: number) => {
    if (productsLocked) {
      toast.info('Сначала подтвердите сотрудника через камеру');
      return;
    }
    setSelectedPpeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const setPpeSizeValue = (id: number, value: string) => {
    setPpeSizes((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = () => {
    if (!slug || !canSubmit || saving) return;

    setSaving(true);
    setError('');

    axioss
      .post(`${BASE_URL}/add-item/${slug}`, {
        ppeproduct: selectedPpeIds,
        ppe_sizes: Object.fromEntries(
          selectedPpeIds
            .map((id) => [String(id), (ppeSizes[id] || '').trim()])
            .filter(([, size]) => Boolean(size)),
        ),
        verified_image: capturedImage,
      })
      .then((response) => {
        const pendingIssueId = response.data?.pending_issue_id;
        if (pendingIssueId) {
          return axioss.post<PendingConfirmResponse>(`${BASE_URL}/pending-issue/${pendingIssueId}/confirm-direct/`);
        }

        return { data: response.data as PendingConfirmResponse };
      })
      .then((response) => {
        setConfirmModalOpen(false);
        toast.success('Выдача подтверждена', {
          position: 'top-right',
          autoClose: 2500,
        });
        const newSlug = response.data?.item_slug;
        if (newSlug) {
          navigate(`/item-view/${newSlug}`);
          return;
        }
        navigate(-1);
      })
      .catch((err) => {
        const responseData = err?.response?.data;
        const backendError = responseData?.error;
        const notDueProducts = Array.isArray(responseData?.not_due_products)
          ? responseData.not_due_products
          : [];

        if (!backendError && notDueProducts.length > 0) {
          const details = notDueProducts
            .map((entry: any) => `${entry?.name || 'Средство защиты'} — еще ${entry?.months_left || '?'} мес. (до ${entry?.due_date || '-'})`)
            .join('\n');
          setError(`Выдача недоступна:\n${details}`);
          return;
        }

        setError(backendError || 'Ошибка при сохранении');
      })
      .finally(() => setSaving(false));
  };

  const openConfirmModal = () => {
    if (!slug || !canSubmitWithStock || saving) return;
    setError('');
    setConfirmModalOpen(true);
  };

  if (!isAuthenticated()) {
    return <Navigate to="/auth/signin" />;
  }

  if (!canAddItem) {
    return <Navigate to={slug ? `/item-view/${slug}` : '/'} replace />;
  }

  return (
    <>
      <Breadcrumb pageName="Информация о сотрудниках" />

      <div className="grid grid-cols-1 sm:grid-cols-4">
        <div className="col-span-4">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">Добавить средства защиты</h3>
            </div>

            <div className="p-6.5">
              {loading ? (
                <div>Загрузка...</div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-5 gap-4 mb-6">
                    <div>
                      <label className="mb-2 block">Фамилия</label>
                      <input className="w-full rounded border px-3 py-2" value={employee?.last_name || '-'} disabled />
                    </div>
                    <div>
                      <label className="mb-2 block">Имя</label>
                      <input className="w-full rounded border px-3 py-2" value={employee?.first_name || '-'} disabled />
                    </div>
                    <div>
                      <label className="mb-2 block">Отчество</label>
                      <input className="w-full rounded border px-3 py-2" value={employee?.surname || '-'} disabled />
                    </div>
                    <div>
                      <label className="mb-2 block">Табельный номер</label>
                      <input className="w-full rounded border px-3 py-2" value={employee?.tabel_number || '-'} disabled />
                    </div>
                    <div>
                      <label className="mb-2 block">Дата выдачи</label>
                      <input className="w-full rounded border px-3 py-2" value={issuedAt} disabled />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-3 block">Средства защиты</label>

                    {requiresFaceId && (
                    <div className="mb-4 rounded border p-3">
                      <div className="mb-2 font-medium">Подтверждение сотрудника (камера)</div>
                      <p className="mb-3 text-sm text-gray-600">
                        Сначала подтвердите сотрудника: сходство с базовым фото должно быть не менее 80%.
                      </p>

                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 text-sm font-medium text-gray-700">Базовое фото (сервер)</div>
                          {!employeeBaseImageUrl && (
                            <div className="mb-2 text-sm text-red-600">
                              Не загружена базовая фотография сотрудника 3×4
                            </div>
                          )}
                          {employeeBaseImageUrl ? (
                            <div className="h-56 w-full max-w-xs rounded border bg-black/5 p-1">
                              <img
                                src={employeeBaseImageUrl}
                                alt="Base"
                                className="h-full w-full rounded object-contain bg-black"
                              />
                            </div>
                          ) : (
                            <div className="h-56 w-full max-w-xs rounded border border-dashed p-3 text-sm text-gray-500">
                              Базовое фото отсутствует
                            </div>
                          )}
                          {canEditEmployeeBaseImage && employeeSlug && (
                            <div className="mt-3">
                              <input
                                ref={baseImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBaseImageFileChange}
                              />
                              {/* <button
                                type="button"
                                onClick={handleBaseImageButtonClick}
                                disabled={updatingBaseImage}
                                className="rounded border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updatingBaseImage ? 'Фотография обновляется...' : 'Изменить базовое фото'}
                              </button> */}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-sm font-medium text-gray-700">Последний кадр (камера)</div>
                          {capturedImage ? (
                            <div className="h-56 w-full max-w-xs rounded border bg-black/5 p-1">
                              <img
                                src={capturedImage}
                                alt="Captured"
                                className="h-full w-full rounded object-contain bg-black"
                              />
                            </div>
                          ) : (
                            <div className="h-56 w-full max-w-xs rounded border border-dashed p-3 text-sm text-gray-500">
                              Кадр еще не снят
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 max-w-md">
                        <label className="mb-1 block text-sm text-gray-700">Камера</label>
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => handleCameraDeviceChange(e.target.value)}
                          className="w-full rounded border px-3 py-2 text-sm"
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

                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${cameraLive ? 'bg-green-500' : 'bg-gray-400'}`}
                          />
                          <span className={cameraLive ? 'text-green-700' : 'text-gray-500'}>
                            {cameraLive ? 'Камера работает' : 'Камера не активна'}
                          </span>
                        </div>
                      </div>

                      {!cameraOpen ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          Открыть камеру
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative w-full max-w-md">
                            <video
                              ref={videoRef}
                              className="w-full rounded border bg-black"
                              autoPlay
                              playsInline
                              muted
                              onPlaying={() => setCameraLive(true)}
                              onPause={() => setCameraLive(false)}
                              onEmptied={() => setCameraLive(false)}
                            />
                            <canvas ref={overlayCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                          </div>
                          {faceDetectAvailable && (
                            <div className="text-xs text-gray-500">Yuz aniqlandi: {faceBoxes.length}</div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={captureAndVerifyFace}
                              disabled={verifyingFace || !cameraLive}
                              className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                              title={!cameraLive ? 'Сначала дождитесь запуска видеопотока камеры' : ''}
                            >
                              {verifyingFace ? 'Проверка...' : 'Снять и проверить'}
                            </button>
                            {canEditEmployeeBaseImage && capturedImage && (
                              <button
                                type="button"
                                onClick={handleUseCapturedImageAsBase}
                                disabled={updatingBaseImage}
                                className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {updatingBaseImage ? 'Сохранение...' : 'Использовать как базовое'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="rounded bg-slate-500 px-3 py-2 text-sm text-white hover:bg-slate-600"
                            >
                              Закрыть камеру
                            </button>
                          </div>
                          {!cameraLive && (
                            <div className="text-sm text-amber-600">
                              Видеопоток пока не активен. Проверьте разрешение камеры и выбранное устройство.
                            </div>
                          )}
                        </div>
                      )}

                      <canvas ref={canvasRef} className="hidden" />

                      {faceMessage && (
                        <div className={`mt-3 text-sm ${faceVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {faceMessage}
                        </div>
                      )}
                    </div>
                    )}

                    <div
                      className={`mb-4 rounded border px-4 py-3 text-sm ${
                        productsLocked
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {productsLocked
                        ? 'Перед выбором подтвердите личность сотрудника через Face ID.'
                        : 'Личность подтверждена. Можно выбирать средства защиты и фиксировать размеры.'}
                    </div>

                    <div className={`grid sm:grid-cols-2 gap-3 ${productsLocked ? 'pointer-events-none opacity-60' : ''}`}>
                      {ppeOptions.map((item) => {
                        const isSelected = selectedPpeIds.includes(item.id);
                        const disabledByRules = item.can_issue === false;
                        const isDisabled = disabledByRules || productsLocked;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 border rounded p-3 ${isDisabled ? 'opacity-60' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePpe(item.id)}
                              disabled={isDisabled}
                              className="mt-1"
                              title={
                                productsLocked
                                  ? 'Подтвердите сотрудника через Face ID, чтобы выбрать средство защиты'
                                  : disabledByRules
                                    ? 'Выдача временно недоступна'
                                    : ''
                              }
                            />
                            <div className="w-full">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">
                                {(item.type_product_display || item.type_product || '-') + ` • ${item.renewal_months} мес.`}
                              </div>

                              <div className="mt-1 text-xs">
                                <div className="text-gray-500">
                                  Следующая выдача:&nbsp;
                                  <span className={item.next_due_date ? 'text-red-500 font-medium' : 'text-gray-600 italic'}>
                                    {item.next_due_date || 'не получил'}
                                  </span>
                                </div>
                              </div>

                              {item.can_issue === false && null}

                              {isSelected && item.can_issue !== false && !productsLocked && (
                                <div className="mt-2">
                                  <label className="mb-1 block text-sm text-gray-700">
                                    Размер <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={ppeSizes[item.id] || ''}
                                    onChange={(e) => setPpeSizeValue(item.id, e.target.value)}
                                    placeholder={item.default_size ? `Ваш размер: ${item.default_size}` : 'Введите размер'}
                                    className={`w-full rounded border px-2 py-1 text-sm ${
                                      !(ppeSizes[item.id] || '').trim() ? 'border-red-300' : ''
                                    }`}
                                  />
                                  {/* Available sizes from warehouse */}
                                  {(() => {
                                    const sizesState = availableSizes[item.id];
                                    if (!sizesState) return null;
                                    if (sizesState.loading) {
                                      return (
                                        <div className="mt-2 text-xs text-gray-500">
                                          Загрузка доступных размеров...
                                        </div>
                                      );
                                    }
                                    if (sizesState.sizes.length === 0) {
                                      return (
                                        <div className="mt-2 text-xs text-gray-400">
                                          На складе нет доступных размеров
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="mt-2">
                                        <div className="mb-1 text-xs text-gray-500">Доступные размеры на складе:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {sizesState.sizes.map((sizeItem) => {
                                            const isCurrentSize = (ppeSizes[item.id] || '').trim().toLowerCase() === sizeItem.size.toLowerCase();
                                            return (
                                              <button
                                                key={sizeItem.size}
                                                type="button"
                                                onClick={() => setPpeSizeValue(item.id, sizeItem.size)}
                                                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                                                  isCurrentSize
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-meta-4 dark:text-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                              >
                                                Размер {sizeItem.size} ({sizeItem.remaining})
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {!(ppeSizes[item.id] || '').trim() && (
                                    <div className="mt-1 text-xs text-red-500">Размер обязателен</div>
                                  )}
                                  {(() => {
                                    const sizeValue = (ppeSizes[item.id] || '').trim();
                                    const defaultSize = (item.default_size || '').trim();
                                    const sizeType = item.size_type;

                                    // Show warning if size differs from default
                                    if (sizeValue && defaultSize && sizeValue !== defaultSize) {
                                      let sizeTypeLabel = '';
                                      if (sizeType === 'shoe') {
                                        sizeTypeLabel = 'обуви';
                                      } else if (sizeType === 'headdress') {
                                        sizeTypeLabel = 'головного убора';
                                      } else if (sizeType === 'clothe') {
                                        sizeTypeLabel = 'одежды';
                                      }
                                      return (
                                        <div className="mt-1 text-xs text-amber-600">
                                          Ваш размер {sizeTypeLabel}: {defaultSize}.
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(() => {
                                    const sizeValue = (ppeSizes[item.id] || '').trim();
                                    const check = stockChecks[item.id];
                                    if (!sizeValue) return null;
                                    if (!check || check.size !== sizeValue || check.checking) {
                                      return <div className="mt-1 text-xs text-gray-500">Проверка остатка...</div>;
                                    }
                                    if (check.available) {
                                      return <div className="mt-1 text-xs text-green-600">На складе есть: {check.remaining}</div>;
                                    }
                                    return <div className="mt-1 text-xs text-red-600">{check.error || 'На складе нет такого размера'}</div>;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {error && <div className="mb-4 whitespace-pre-line text-red-600">{error}</div>}

                  <div className="flex justify-between border-t border-stroke pt-4 dark:border-strokedark">
                    <Link
                      to={slug ? `/item-view/${slug}` : '/'}
                      className="flex items-center justify-center gap-2 rounded-md bg-slate-500 py-2 px-3 font-medium text-white hover:bg-opacity-90"
                    >
                      <FaLongArrowAltLeft className="text-xl" />
                      Назад
                    </Link>

                    <button
                      type="button"
                      onClick={openConfirmModal}
                      disabled={!canSubmitWithStock || saving}
                      className="rounded-md bg-meta-3 py-2 px-5 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                      title={
                        !faceVerified
                          ? 'Сначала подтвердите сотрудника через камеру'
                          : hasMissingSize
                            ? 'Укажите размер для всех выбранных СИЗ'
                            : hasPendingSizeCheck
                              ? 'Проверяется наличие размера на складе'
                              : hasUnavailableSize
                                ? 'Для выбранного размера нет остатка на складе'
                                : ''
                      }
                    >
                      {saving ? 'Сохранение...' : 'Добавить'}
                    </button>
                  </div>

                  {confirmModalOpen ? (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/50 px-4 py-6">
                      <div className="relative z-[100001] flex h-[70vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-boxdark">
                        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Подтверждение выдачи</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Проверьте полную информацию перед созданием QR-кода.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => !saving && setConfirmModalOpen(false)}
                            className="rounded px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-boxdark-2"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-4">
                            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Сотрудник</div>
                              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                                <div className="h-32 w-28 overflow-hidden rounded border border-stroke bg-slate-50 dark:border-strokedark dark:bg-boxdark-2">
                                  {employeeBaseImageUrl ? (
                                    <img src={employeeBaseImageUrl} alt="employee" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Нет фото</div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <div className="text-slate-500">Фамилия</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.last_name || '-'}</div>
                                  <div className="text-slate-500">Имя</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.first_name || '-'}</div>
                                  <div className="text-slate-500">Отчество</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.surname || '-'}</div>
                                  <div className="text-slate-500">Табельный номер</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.tabel_number || '-'}</div>
                                  <div className="text-slate-500">Должность</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.position || '-'}</div>
                                  <div className="text-slate-500">Цех</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.department?.name || '-'}</div>
                                  <div className="text-slate-500">Отдел</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{employee?.section?.name || '-'}</div>
                                  <div className="text-slate-500">Дата выдачи</div>
                                  <div className="font-medium text-slate-900 dark:text-white">{issuedAt}</div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Средства защиты</div>
                              <div className="overflow-hidden rounded border border-stroke dark:border-strokedark">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-left dark:bg-boxdark-2">
                                    <tr>
                                      <th className="px-3 py-2">№</th>
                                      <th className="px-3 py-2">Наименование</th>
                                      <th className="px-3 py-2">Ед. изм.</th>
                                      <th className="px-3 py-2">Размер</th>
                                      <th className="px-3 py-2">Срок</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedPpeOptions.map((item, index) => (
                                      <tr key={item.id} className="border-t border-stroke dark:border-strokedark">
                                        <td className="px-3 py-2">{index + 1}</td>
                                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                        <td className="px-3 py-2">{item.type_product_display || item.type_product || '-'}</td>
                                        <td className="px-3 py-2">{(ppeSizes[item.id] || '').trim() || '-'}</td>
                                        <td className="px-3 py-2">{item.renewal_months} мес.</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Проверка</div>
                              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <div>Face ID: <span className="font-medium text-slate-900 dark:text-white">{requiresFaceId ? (faceVerified ? 'Подтвержден' : 'Не подтвержден') : 'Не требуется'}</span></div>
                                <div>Выбрано СИЗ: <span className="font-medium text-slate-900 dark:text-white">{selectedPpeOptions.length}</span></div>
                                <div>Все размеры указаны: <span className="font-medium text-slate-900 dark:text-white">{hasMissingSize ? 'Нет' : 'Да'}</span></div>
                                <div>Проверка остатков: <span className="font-medium text-slate-900 dark:text-white">{hasPendingSizeCheck ? 'В процессе' : 'Завершена'}</span></div>
                              </div>
                            </div>

                            {capturedImage ? (
                              <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Фото подтверждения</div>
                                <img src={capturedImage} alt="captured" className="h-56 w-full rounded border border-stroke object-contain dark:border-strokedark" />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-stroke px-6 py-4 dark:border-strokedark">
                          <button
                            type="button"
                            onClick={() => !saving && setConfirmModalOpen(false)}
                            className="rounded border border-stroke px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-strokedark dark:text-slate-200 dark:hover:bg-boxdark-2"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmitWithStock || saving}
                            className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? 'Сохранение...' : 'Подтвердить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddItemPage;
