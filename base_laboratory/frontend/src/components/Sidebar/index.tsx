import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaCertificate, FaFileSignature, FaIdCard } from 'react-icons/fa';
import SidebarLinkGroup from './SidebarLinkGroup';
import Logo from '../../images/logo/logo.png';
import axioss from '../../api/axios';
import { getFirstAccessibleRoute, getStoredFeatureAccess, getStoredPageAccess, normalizeRole, isManagerTierRole } from '../../utils/pageAccess';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate()
  const sidebar = useRef<any>(null);
  const isLogin = localStorage.getItem('isLogin')
  const role = normalizeRole(localStorage.getItem('role'));
  const pageAccess = getStoredPageAccess(role);
  const featureAccess = getStoredFeatureAccess(role);
  const firstAccessibleRoute = getFirstAccessibleRoute(pageAccess) || '/no-access';
  const isAdmin = role === 'admin';
  // const canSeeDailyPpeIssued = role === 'admin' || isManagerTierRole(role);
  // const canSeeBaseImageChangeLogs = role === 'admin' || isManagerTierRole(role);
  const canSeeDashboard = pageAccess.dashboard;
  const canSeePassports = pageAccess.passports;
  const canSeeSettings = pageAccess.settings;
  // const canSeePPEArrival = pageAccess.ppe_arrival;
  // const canSeeStatistics = pageAccess.statistics;
  const canEditBaseSettings = role === 'admin' || role === 'it_center' || isManagerTierRole(role);
  const canSeePendingApprovals = isAdmin || role === 'sttl_head' || role === 'czl_head' || role === 'dispatcher';
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const canManageFaceIdControl = featureAccess.face_id_control;
  const isSettingsRoute = pathname === '/nastroyka' || pathname.startsWith('/nastroyka/');
  const settingsMenuItems = [
    /* canEditBaseSettings
      ? {
          to: '/nastroyka/product',
          label: 'Средство инд. защиты',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L19 6V11C19 15.4183 16.1402 19.3007 12 21C7.85979 19.3007 5 15.4183 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9.5 12L11.2 13.7L14.8 10.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        }
      : null, */
    /* canEditBaseSettings
      ? {
          to: '/nastroyka/ppe-norms',
          label: 'Нормы выдачи по должностям',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M8 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M8 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M4 6H4.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M4 12H4.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M4 18H4.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ),
        }
      : null, */
    canEditBaseSettings
      ? {
          to: '/nastroyka/person',
          label: 'Ответственное лицо',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 20V18C16 15.7909 14.2091 14 12 14H8C5.79086 14 4 15.7909 4 18V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17 10L18.5 11.5L21 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        }
      : null,
    isAdmin
      ? {
          to: '/nastroyka/user',
          label: 'Пользователи',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M2 20C2 16.6863 4.68629 14 8 14C11.3137 14 14 16.6863 14 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M17 11C18.6569 11 20 9.65685 20 8C20 6.34315 18.6569 5 17 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M17 14C19.2091 14 21 15.7909 21 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ),
        }
      : null,
    isAdmin
      ? {
          to: '/nastroyka/page-access',
          label: 'Доступ к страницам',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 11V8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ),
        }
      : null,
    canManageFaceIdControl
      ? {
          to: '/nastroyka/faceid',
          label: 'Face ID настройки',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 10V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M8 6V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M12 3V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M16 8V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M20 10V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ),
        }
      : null,
  ].filter(Boolean) as Array<{ to: string; label: string; icon: React.ReactNode }>;
  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  useEffect(() => {
    const fetchPendingApprovalsCount = () => {
      if (!canSeePendingApprovals) {
        setPendingApprovalsCount(0);
        return;
      }
      Promise.all([
        axioss.get('/passports/pending-approvals/').then((r: any) => (Array.isArray(r.data) ? r.data.length : 0)).catch(() => 0),
        axioss.get('/spravki/pending-approvals/').then((r: any) => (Array.isArray(r.data) ? r.data.length : 0)).catch(() => 0),
      ]).then(([passportsCount, spravkiCount]) => setPendingApprovalsCount(passportsCount + spravkiCount));
    };

    fetchPendingApprovalsCount();
    window.addEventListener('passport-approval-changed', fetchPendingApprovalsCount);
    window.addEventListener('spravka-approval-changed', fetchPendingApprovalsCount);
    return () => {
      window.removeEventListener('passport-approval-changed', fetchPendingApprovalsCount);
      window.removeEventListener('spravka-approval-changed', fetchPendingApprovalsCount);
    };
  }, [canSeePendingApprovals, pathname]);

  const handlerLogOut = () => {
    localStorage.clear()
    navigate("/auth/signin")
  }


  return (
    <aside
      ref={sidebar}
      className={`fixed left-0 top-0 z-50 flex h-full flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        lg:static lg:min-h-screen lg:translate-x-0
        ${sidebarOpen ? 'lg:w-72.5' : 'lg:w-20'}`}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className={`flex items-center gap-2 pt-5 ${sidebarOpen ? 'justify-between px-6' : 'justify-center px-2'}`}>
        <NavLink to={firstAccessibleRoute} className={sidebarOpen ? 'mx-auto' : 'hidden'}>
          <img src={Logo} alt="Logo" className={sidebarOpen ? 'w-[150px]' : 'w-10'} />
        </NavLink>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          aria-label="Toggle sidebar"
          className="block"
        >
          <svg
            className="stroke-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 5H17M3 10H17M3 15H17"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className={`py-2 ${sidebarOpen ? 'px-4 lg:mt-9 lg:px-6' : 'px-2 lg:mt-9'}`}>
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className={`mb-4 text-sm font-semibold text-bodydark2 ${sidebarOpen ? 'ml-4' : 'text-center'}`}>
              Меню
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {canSeeDashboard && (
                <li>
                  <NavLink
                    to="/"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname.includes('calendar') &&
                      'bg-graydark dark:bg-meta-4'
                      }`}
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
                        fill=""
                      />
                      <path
                        d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
                        fill=""
                      />
                      <path
                        d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
                        fill=""
                      />
                      <path
                        d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
                        fill=""
                      />
                    </svg>
                    {sidebarOpen && 'Главная страница'}
                  </NavLink>
                </li>
              )}
              {/* canSeePPEArrival && (
                <li>
                  <NavLink
                    to="/ppe-arrival"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname.includes('/ppe-arrival') &&
                      'bg-graydark dark:bg-meta-4'
                      }`}
                  >
                    <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 9H15V3H9V9H5L12 16L19 9Z" fill=""/>
                      <path d="M5 18V20H19V18H5Z" fill=""/>
                    </svg>
                    {sidebarOpen && 'Прием СИЗ'}
                  </NavLink>
                </li>
              ) */}
              {/* canSeeStatistics && (
                <li>
                  <NavLink
                    to="/statistics"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname.includes('/statistics') &&
                      'bg-graydark dark:bg-meta-4'
                      }`}
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.25 15.75C1.83579 15.75 1.5 15.4142 1.5 15V3C1.5 2.58579 1.83579 2.25 2.25 2.25C2.66421 2.25 3 2.58579 3 3V15C3 15.4142 2.66421 15.75 2.25 15.75Z"
                        fill=""
                      />
                      <path
                        d="M7.125 15.75C6.71079 15.75 6.375 15.4142 6.375 15V9C6.375 8.58579 6.71079 8.25 7.125 8.25C7.53921 8.25 7.875 8.58579 7.875 9V15C7.875 15.4142 7.53921 15.75 7.125 15.75Z"
                        fill=""
                      />
                      <path
                        d="M12 15.75C11.5858 15.75 11.25 15.4142 11.25 15V6C11.25 5.58579 11.5858 5.25 12 5.25C12.4142 5.25 12.75 5.58579 12.75 6V15C12.75 15.4142 12.4142 15.75 12 15.75Z"
                        fill=""
                      />
                      <path
                        d="M16.875 15.75C16.4608 15.75 16.125 15.4142 16.125 15V11.25C16.125 10.8358 16.4608 10.5 16.875 10.5C17.2892 10.5 17.625 10.8358 17.625 11.25V15C17.625 15.4142 17.2892 15.75 16.875 15.75Z"
                        fill=""
                      />
                    </svg>
                    {sidebarOpen && 'Статистика'}
                  </NavLink>
                </li>
              ) */}
              {/* canSeeDailyPpeIssued && (
                <li>
                  <NavLink
                    to="/nastroyka/daily-ppe-issued"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname.includes('/nastroyka/daily-ppe-issued') && 'bg-graydark dark:bg-meta-4'}`}
                  >
                    <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V8L14 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M14 3V8H19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M9 13H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M9 17H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    {sidebarOpen && 'Ежедневная выдача СИЗ'}
                  </NavLink>
                </li>
              ) */}
              {/* canSeeBaseImageChangeLogs && (
                <li>
                  <NavLink
                    to="/nastroyka/base-image-change-logs"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname.includes('/nastroyka/base-image-change-logs') && 'bg-graydark dark:bg-meta-4'}`}
                  >
                    <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 5.75C5 5.33579 5.33579 5 5.75 5H18.25C18.6642 5 19 5.33579 19 5.75V18.25C19 18.6642 18.6642 19 18.25 19H5.75C5.33579 19 5 18.6642 5 18.25V5.75Z" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M8 9H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M8 12H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M8 16L10 14L11.5 15.5L15 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {sidebarOpen && 'История смены фото'}
                  </NavLink>
                </li>
              ) */}
              {canSeePassports && (
                <li>
                  <NavLink
                    to="/pasporta"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname === '/pasporta' && 'bg-graydark dark:bg-meta-4'}`}
                  >
                    <FaIdCard className="fill-current" size={18} />
                    {sidebarOpen && 'Паспорта'}
                  </NavLink>
                </li>
              )}
              {canSeePassports && canSeePendingApprovals && (
                <li>
                  <NavLink
                    to="/pasporta/pending-approvals"
                    className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname === '/pasporta/pending-approvals' && 'bg-graydark dark:bg-meta-4'}`}
                  >
                    <span className="relative inline-flex">
                      <FaFileSignature className="fill-current" size={18} />
                      {pendingApprovalsCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                          {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
                        </span>
                      )}
                    </span>
                    {sidebarOpen && 'На подписи мне'}
                  </NavLink>
                </li>
              )}
              <li>
                <NavLink
                  to="/spravki"
                  className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${pathname === '/spravki' && 'bg-graydark dark:bg-meta-4'}`}
                >
                  <FaCertificate className="fill-current" size={18} />
                  {sidebarOpen && 'Справки'}
                </NavLink>
              </li>
              {canSeeSettings && settingsMenuItems.length > 0 && (
                <SidebarLinkGroup activeCondition={isSettingsRoute}>
                  {(handleClick, open) => {
                    return (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${isSettingsRoute && 'bg-graydark dark:bg-meta-4'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                          }}
                        >
                          <svg
                            className="fill-current"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.22 7.22 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" fill=""/>
                          </svg>
                          {sidebarOpen && 'Настройки'}
                          {sidebarOpen && (
                            <svg
                              className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${open && 'rotate-180'}`}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                                fill=""
                              />
                            </svg>
                          )}
                        </NavLink>
                        <div className={`translate transform overflow-hidden ${(!open || !sidebarOpen) && 'hidden'}`}>
                          <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                            {settingsMenuItems.map((item) => (
                              <li key={item.to}>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive ? '!text-white' : '')
                                  }
                                >
                                  <span className="flex h-[18px] w-[18px] items-center justify-center text-current">
                                    {item.icon}
                                  </span>
                                  <span>{item.label}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </React.Fragment>
                    );
                  }}
                </SidebarLinkGroup>
              )}
              {/* <!-- Menu Item Calendar --> */}


              
            </ul>
          </div>

          {/* <!-- Others Group --> */}
          <div>
            <h3 className={`mb-4 text-sm font-semibold text-bodydark2 ${sidebarOpen ? 'ml-4' : 'text-center'}`}>
              Другой
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Auth Pages --> */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/auth' || pathname.includes('auth')
                }
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center rounded-sm py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${sidebarOpen ? 'gap-2.5 px-4 justify-start' : 'justify-center px-2'} ${(pathname === '/auth' || pathname.includes('auth')) &&
                          'bg-graydark dark:bg-meta-4'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="19"
                          viewBox="0 0 18 19"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_130_9814)">
                            <path
                              d="M12.7127 0.55835H9.53457C8.80332 0.55835 8.18457 1.1771 8.18457 1.90835V3.84897C8.18457 4.18647 8.46582 4.46772 8.80332 4.46772C9.14082 4.46772 9.45019 4.18647 9.45019 3.84897V1.88022C9.45019 1.82397 9.47832 1.79585 9.53457 1.79585H12.7127C13.3877 1.79585 13.9221 2.33022 13.9221 3.00522V15.0709C13.9221 15.7459 13.3877 16.2802 12.7127 16.2802H9.53457C9.47832 16.2802 9.45019 16.2521 9.45019 16.1959V14.2552C9.45019 13.9177 9.16894 13.6365 8.80332 13.6365C8.43769 13.6365 8.18457 13.9177 8.18457 14.2552V16.1959C8.18457 16.9271 8.80332 17.5459 9.53457 17.5459H12.7127C14.0908 17.5459 15.1877 16.4209 15.1877 15.0709V3.03335C15.1877 1.65522 14.0627 0.55835 12.7127 0.55835Z"
                              fill=""
                            />
                            <path
                              d="M10.4346 8.60205L7.62207 5.7333C7.36895 5.48018 6.97519 5.48018 6.72207 5.7333C6.46895 5.98643 6.46895 6.38018 6.72207 6.6333L8.46582 8.40518H3.45957C3.12207 8.40518 2.84082 8.68643 2.84082 9.02393C2.84082 9.36143 3.12207 9.64268 3.45957 9.64268H8.49395L6.72207 11.4427C6.46895 11.6958 6.46895 12.0896 6.72207 12.3427C6.83457 12.4552 7.00332 12.5114 7.17207 12.5114C7.34082 12.5114 7.50957 12.4552 7.62207 12.3145L10.4346 9.4458C10.6877 9.24893 10.6877 8.85518 10.4346 8.60205Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_130_9814">
                              <rect
                                width="18"
                                height="18"
                                fill="white"
                                transform="translate(0 0.052124)"
                              />
                            </clipPath>
                          </defs>
                        </svg>
                        {sidebarOpen && 'Авторизация'}
                        {sidebarOpen && (
                          <svg
                            className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${open && 'rotate-180'
                              }`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                              fill=""
                            />
                          </svg>
                        )}
                      </NavLink>
                      {/* <!-- Dropdown Menu Start --> */}
                      <div
                        className={`translate transform overflow-hidden ${(!open || !sidebarOpen) && 'hidden'
                          }`}
                      >
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">

                         

                          {isLogin === 'true' && isAdmin && (
                            <li>
                              <NavLink
                                to="/auth/signup"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M19 10H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M17 8V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Регистрация
                              </NavLink>
                            </li>
                          )}


                           {isLogin == 'true' ?
                            <li>
                              <NavLink
                                onClick={handlerLogOut}
                                to="/"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Выход
                              </NavLink>
                            </li>
                            :
                            <li>
                              <NavLink
                                to="/auth/signin"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Войти
                              </NavLink>
                            </li>
                          }
                        </ul>
                      </div>
                      {/* <!-- Dropdown Menu End --> */}
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
              {/* <!-- Menu Item Auth Pages --> */}
            </ul>
          </div>
        </nav>
        {/* <!-- Sidebar Menu --> */}
      </div>
    </aside>
  );
};

export default Sidebar;
