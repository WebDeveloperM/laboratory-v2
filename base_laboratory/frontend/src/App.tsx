import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'antd/dist/reset.css';
import 'primeicons/primeicons.css';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import Calendar from './pages/Calendar';
import Chart from './pages/Chart';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import Main from './pages/Dashboard/Main';
import DueSoonPage from './pages/Dashboard/DueSoonPage';
import AddCompyuter from './pages/AddCompyuter/AddCompyuter';
import PageCompyuter from './pages/ViewCompyuter/PagaCompyuter';
import EditCompyuterPage from './pages/EditCompyuter/EditCompyuterPage';
import AddItemPage from './pages/AddItem/AddItemPage';
import StatisticsPage from './pages/Statistics';
import StatisticsDetailsPage from './pages/Statistics/DetailsPage';
import PPEArrivalPage from './pages/PPEArrival';
import SignaturePage from './pages/Signature/SignaturePage';
import NastroykaPage from './pages/Nastroyka';
import NotFoundPage from './pages/NotFound';
import DepartmentPage from './pages/Nastroyka/DepartmentPage';
import SectionPage from './pages/Nastroyka/SectionPage';
import ProductPage from './pages/Nastroyka/ProductPage';
import DepartmentPPERulePage from './pages/Nastroyka/DepartmentPPERulePage';
import PersonPage from './pages/Nastroyka/PersonPage';
import UserPage from './pages/Nastroyka/UserPage';
import FaceIDPage from './pages/Nastroyka/FaceIDPage';
import PageAccessPage from './pages/Nastroyka/PageAccessPage';
import DailyPPEIssuedPage from './pages/Nastroyka/DailyPPEIssuedPage';
import BaseImageChangeLogPage from './pages/Nastroyka/BaseImageChangeLogPage';
import PasportaPage from './pages/Pasporta/PasportaPage';
import PendingApprovalsPage from './pages/Pasporta/PendingApprovalsPage';
import PasportaCreatePage from './pages/Pasporta/PasportaCreatePage';
import PasportaSelectPage from './pages/Pasporta/PasportaSelectPage';
import SpravkiPage from './pages/Spravki/SpravkiPage';
import SpravkiSelectPage from './pages/Spravki/SpravkiSelectPage';
import SpravkiCreatePage from './pages/Spravki/SpravkiCreatePage';
import PassportTemplatesPage from './pages/Nastroyka/PassportTemplatesPage';
import PassportTemplateDetailPage from './pages/Nastroyka/PassportTemplateDetailPage';
import BenzinTemplatesDetailPage from './pages/Nastroyka/BenzinTemplatesDetailPage';
import IssueQrDetailPage from './pages/IssueQr/IssueQrDetailPage';
import PassportVerifyPage from './pages/PassportVerify/PassportVerifyPage';
import { isAuthenticated } from './utils/auth';
import axioss from './api/axios';
import {
  clearStoredPageAccess,
  getDefaultFeatureAccess,
  getDefaultPageAccess,
  getFirstAccessibleRoute,
  getStoredPageAccess,
  normalizeFeatureAccess,
  normalizePageAccess,
  normalizeRole,
  storeFeatureAccess,
  PageAccess,
  FeatureAccess,
  NormalizedRole,
  storePageAccess,
  isManagerTierRole,
} from './utils/pageAccess';


function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [authResolved, setAuthResolved] = useState<boolean>(false);
  const [trustedRole, setTrustedRole] = useState<NormalizedRole>('user');
  const [pageAccess, setPageAccess] = useState<PageAccess>(() => getStoredPageAccess('user'));
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>(() => getDefaultFeatureAccess('user'));
  const { pathname } = useLocation();

  const canAccessDashboard = pageAccess.dashboard;
  const canAccessPPEArrival = pageAccess.ppe_arrival;
  const canAccessStatistics = pageAccess.statistics;
  const canAccessSettings = pageAccess.settings;
  const canAccessDueSoonDetails = featureAccess.dashboard_due_cards;
  const canAccessFaceIdControl = featureAccess.face_id_control;
  const isAdmin = trustedRole === 'admin';
  // Паспорта is its own toggle in Настройка → Доступ, deliberately independent of
  // pageAccess.settings: the passport form renders the template page, and Начальник смены
  // has to reach it without being handed the whole Настройки section.
  const canAccessPassports = pageAccess.passports;
  // The form is also the passport editor — PasportaPage offers "Tahrirlash" to every role
  // except «Обычный пользователь». This is not a way in to *creating* a passport:
  // PassportListCreateView rejects a POST from anyone but Админ and Начальник смены.
  const canOpenPassportForm = canAccessPassports && trustedRole !== 'user';
  // Справку создаёт только Начальник смены (Админ — как везде). Совпадает с canCreateSpravka
  // в SpravkiPage.tsx и с проверкой в SpravkaListCreateView. Гейтится только выбор шаблона:
  // /spravki/create с ?id=... — это ещё и редактор, открытый всем ролям кроме «Обычный пользователь».
  const canCreateSpravka = trustedRole === 'admin' || trustedRole === 'shift_head';
  const canAccessDailyPpeIssued = trustedRole === 'admin' || isManagerTierRole(trustedRole);
  const canAccessBaseImageChangeLogs = trustedRole === 'admin' || isManagerTierRole(trustedRole);
  const fallbackRoute = getFirstAccessibleRoute(pageAccess) || '/no-access';

  const getDeniedRoute = () => (fallbackRoute === pathname ? '/no-access' : fallbackRoute);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  useEffect(() => {
    const syncTrustedRole = async () => {
      if (!isAuthenticated()) {
        setTrustedRole('user');
        setPageAccess(getDefaultPageAccess('user'));
        setFeatureAccess(getDefaultFeatureAccess('user'));
        clearStoredPageAccess();
        localStorage.removeItem('base_avatar');
        setAuthResolved(true);
        return;
      }

      try {
        const response = await axioss.get('/users/user/');
        const serverRole = normalizeRole(response?.data?.role || 'user');
        const firstName = String(response?.data?.firstname || '');
        const lastName = String(response?.data?.lastname || '');
        const username = String(response?.data?.username || localStorage.getItem('username') || '');
        const employeeSlug = String(response?.data?.employee_slug || '');
        const baseAvatar = String(response?.data?.base_avatar || '');
        const permissions = response?.data?.permissions || {};
        const nextPageAccess = normalizePageAccess(response?.data?.page_access, serverRole);
        const nextFeatureAccess = normalizeFeatureAccess(response?.data?.feature_access, serverRole);

        setTrustedRole(serverRole);
        setPageAccess(nextPageAccess);
        setFeatureAccess(nextFeatureAccess);
        localStorage.setItem('role', serverRole);
        localStorage.setItem('can_edit', String(Boolean(permissions?.can_edit)));
        localStorage.setItem('can_delete', String(Boolean(permissions?.can_delete)));
        localStorage.setItem('firstname', firstName);
        localStorage.setItem('lastname', lastName);
        localStorage.setItem('username', username);
        localStorage.setItem('employee_slug', employeeSlug);
        localStorage.setItem('base_avatar', baseAvatar);
        storePageAccess(nextPageAccess);
        storeFeatureAccess(nextFeatureAccess);
      } catch {
        setTrustedRole('user');
        setPageAccess(getDefaultPageAccess('user'));
        setFeatureAccess(getDefaultFeatureAccess('user'));
        clearStoredPageAccess();
      } finally {
        setAuthResolved(true);
      }
    };

    syncTrustedRole();
  }, [pathname]);


  return loading || !authResolved ? (
    <Loader />
  ) : pathname.startsWith('/issue-qr/') ? (
    <>
      <Routes>
        <Route
          path="/issue-qr/:token"
          element={
            <>
              <PageTitle title="QR выдача СИЗ" />
              <IssueQrDetailPage />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <PageTitle title="404 - Страница не найдена" />
              <NotFoundPage />
            </>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  ) : pathname.startsWith('/passport-verify/') ? (
    <>
      <Routes>
        <Route
          path="/passport-verify/:token"
          element={
            <>
              <PageTitle title="Проверка паспорта" />
              <PassportVerifyPage />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <PageTitle title="404 - Страница не найдена" />
              <NotFoundPage />
            </>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  ) : (
    <DefaultLayout>
      <Routes>
        <Route
          index element={
            isAuthenticated() ? (
              canAccessDashboard ? (
                <>
                  <PageTitle title="Главная страница" />
                  <Main />
                </>
              ) : (
                <Navigate to={getDeniedRoute()} replace />
              )
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
        <Route
          path="/add-compyuter"
          element={
            <>
              <PageTitle title="Добавить компьютер" />
              <AddCompyuter />
            </>
          }
        />
        <Route
          path={`/edit-computer/:slug`}
          element={
            <>
              <PageTitle title="Редактирование компьютер" />
              <EditCompyuterPage />
            </>
          }
        />
        <Route
          path={`/item-view/:slug`}
          element={
            <>
              <PageCompyuter />
            </>
          }
        />
        <Route
          path={`/add-item/:slug`}
          element={
            <>
              <PageTitle title="Добавить средства защиты" />
              <AddItemPage />
            </>
          }
        />
        <Route
          path={`/signature/:id`}
          element={
            <>
              <PageTitle title="Подпись сотрудника" />
              <SignaturePage />
            </>
          }
        />
        <Route
          path="/ppe-arrival"
          element={
            isAuthenticated() && canAccessPPEArrival ? (
              <>
                <PageTitle title="Прием СИЗ" />
                <PPEArrivalPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/dashboard/due-soon"
          element={
            isAuthenticated() && canAccessDashboard && canAccessDueSoonDetails ? (
              <>
                <PageTitle title="Кому скоро нужен СИЗ" />
                <DueSoonPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/statistics"
          element={
            isAuthenticated() && canAccessStatistics ? (
              <>
                <PageTitle title="Статистика" />
                <StatisticsPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/statistics/:detailsType/:productId"
          element={
            isAuthenticated() && canAccessStatistics ? (
              <>
                <PageTitle title="Детали статистики" />
                <StatisticsDetailsPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Настройки" />
                <NastroykaPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/department"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Цех" />
                <DepartmentPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/section"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Отдел" />
                <SectionPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/product"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Средство инд. защиты" />
                <ProductPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/ppe-norms"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Нормы выдачи по должностям" />
                <DepartmentPPERulePage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/ppe-norms/create"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Нормы выдачи по должностям" />
                <DepartmentPPERulePage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/person"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Ответственное лицо" />
                <PersonPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/user"
          element={
            isAuthenticated() && canAccessSettings && isAdmin ? (
              <>
                <PageTitle title="Пользователи" />
                <UserPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/page-access"
          element={
            isAuthenticated() && canAccessSettings && isAdmin ? (
              <>
                <PageTitle title="Доступ к страницам" />
                <PageAccessPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/daily-ppe-issued"
          element={
            isAuthenticated() && canAccessSettings && canAccessDailyPpeIssued ? (
              <>
                <PageTitle title="Ежедневная выдача СИЗ" />
                <DailyPPEIssuedPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/base-image-change-logs"
          element={
            isAuthenticated() && canAccessSettings && canAccessBaseImageChangeLogs ? (
              <>
                <PageTitle title="История смены базового фото" />
                <BaseImageChangeLogPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/passport-templates"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Шаблоны паспортов" />
                <PassportTemplatesPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/passport-templates/benzin"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Шаблоны паспортов - Бензин" />
                <PassportTemplatesPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/passport-templates/benzin/detail"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Бензин - детали" />
                <BenzinTemplatesDetailPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/nastroyka/passport-templates/detail/:id"
          element={
            isAuthenticated() && canAccessSettings ? (
              <>
                <PageTitle title="Детали шаблона" />
                <PassportTemplateDetailPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/pasporta"
          element={
            isAuthenticated() && canAccessPassports ? (
              <>
                <PageTitle title="Паспорта" />
                <PasportaPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/pasporta/pending-approvals"
          element={
            isAuthenticated() && canAccessPassports ? (
              <>
                <PageTitle title="На подписи мне" />
                <PendingApprovalsPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/pasporta/select"
          element={
            isAuthenticated() && canAccessPassports ? (
              <>
                <PageTitle title="Шаблон танлаш" />
                <PasportaSelectPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/pasporta/create"
          element={
            isAuthenticated() && canAccessPassports ? (
              <>
                <PageTitle title="Новый паспорт" />
                <PasportaCreatePage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/pasporta/edit/:id"
          element={
            isAuthenticated() && canAccessPassports ? (
              <>
                <PageTitle title="Паспортни tahrirlash" />
                <PasportaCreatePage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        {/* Same component as /nastroyka/passport-templates/detail/:id, but reached from the
            passport flow and gated on canCreatePassport instead of Настройки access. */}
        <Route
          path="/pasporta/template/:id"
          element={
            isAuthenticated() && canOpenPassportForm ? (
              <>
                <PageTitle title="Новый паспорт" />
                <PassportTemplateDetailPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/spravki"
          element={
            isAuthenticated() ? (
              <>
                <PageTitle title="Справки" />
                <SpravkiPage />
              </>
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
        <Route
          path="/spravki/select"
          element={
            isAuthenticated() ? (
              canCreateSpravka ? (
                <>
                  <PageTitle title="Добавить справку — выбор шаблона" />
                  <SpravkiSelectPage />
                </>
              ) : (
                <Navigate to="/spravki" replace />
              )
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
        <Route
          path="/spravki/create"
          element={
            isAuthenticated() ? (
              <>
                <PageTitle title="Создать справку" />
                <SpravkiCreatePage />
              </>
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
        <Route
          path="/nastroyka/faceid"
          element={
            isAuthenticated() && canAccessSettings && canAccessFaceIdControl ? (
              <>
                <PageTitle title="Face ID настройки" />
                <FaceIDPage />
              </>
            ) : (
              <Navigate to={isAuthenticated() ? getDeniedRoute() : '/auth/signin'} replace />
            )
          }
        />
        <Route
          path="/no-access"
          element={
            <>
              <PageTitle title="Нет доступа" />
              <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h1 className="text-lg font-semibold text-black dark:text-white">Нет доступа к разделам меню</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Для вашей роли администратор отключил все основные разделы. Обратитесь к администратору системы.
                </p>
              </div>
            </>
          }
        />
        <Route
          path="/tables"
          element={
            <>
              <PageTitle title="Tables | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Calendar />
            </>
          }
        />
        <Route
          path="/calendar"
          element={
            <>
              <PageTitle title="Calendar | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Calendar />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <PageTitle title="Profile | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Profile />
            </>
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <>
              <PageTitle title="Form Elements | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <FormElements />
            </>
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <>
              <PageTitle title="Form Layout | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <FormLayout />
            </>
          }
        />
        <Route
          path="/tables"
          element={
            <>
              <PageTitle title="Tables | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Tables />
            </>
          }
        />
        <Route
          path="/settings"
          element={
            <>
              <PageTitle title="Settings | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Settings />
            </>
          }
        />
        <Route
          path="/chart"
          element={
            <>
              <PageTitle title="Basic Chart | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Chart />
            </>
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <>
              <PageTitle title="Alerts | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Alerts />
            </>
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <>
              <PageTitle title="Buttons | TailAdmin - Tailwind CSS Admin Dashboard Template" />
              <Buttons />
            </>
          }
        />
        <Route
          path="/auth/signin"
          element={
            <>
              <PageTitle title="Войти" />
              <SignIn />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <PageTitle title="404 - Страница не найдена" />
              <NotFoundPage />
            </>
          }
        />
      </Routes>
      <ToastContainer />
    </DefaultLayout>

  );
}

export default App;
