import type { UserRole } from '@auto-present/shared';
import { ArrowRight, LoaderCircle, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';

const roles: UserRole[] = ['STUDENT', 'CAPTAIN', 'ADMIN'];

const roleIcons = {
  STUDENT: UserRound,
  CAPTAIN: UsersRound,
  ADMIN: ShieldCheck,
} as const;

const roleStyle = {
  STUDENT: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    btnBorder: 'border-emerald-200 dark:border-emerald-500/20',
    btnBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    btnText: 'text-emerald-700 dark:text-emerald-400',
    btnHover: 'hover:bg-emerald-200 dark:hover:bg-emerald-500/20',
  },
  CAPTAIN: {
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    btnBorder: 'border-cyan-200 dark:border-cyan-500/20',
    btnBg: 'bg-cyan-100 dark:bg-cyan-500/10',
    btnText: 'text-cyan-700 dark:text-cyan-400',
    btnHover: 'hover:bg-cyan-200 dark:hover:bg-cyan-500/20',
  },
  ADMIN: {
    iconBg: 'bg-purple-100 dark:bg-purple-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
    btnBorder: 'border-purple-200 dark:border-purple-500/20',
    btnBg: 'bg-purple-100 dark:bg-purple-500/10',
    btnText: 'text-purple-700 dark:text-purple-400',
    btnHover: 'hover:bg-purple-200 dark:hover:bg-purple-500/20',
  },
} as const;

export function WelcomePage(): ReactNode {
  const { t } = useTranslation();
  const { status, startSignIn, errorCode, pendingRoles, user } = useAuth();

  if (status === 'authenticated' && user) {
    if (user.requestedRole === 'CAPTAIN') return <Navigate to="/captain/setup" replace />;
    if (user.requestedRole === 'STUDENT') return <Navigate to="/student" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-4 py-10">
      <div className="text-center mb-8">
        <p className="text-xs font-black tracking-widest uppercase text-cyan-600 dark:text-cyan-400">
          {t('welcome.eyebrow')}
        </p>
        <h1 className="welcome-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-none mt-2 text-slate-900 dark:text-slate-100">
          {t('app.name')}
        </h1>
        <div className="flex justify-center my-5">
          <img
            src="/branding/app-icon.png"
            alt="Auto Present"
            className="w-20 h-20 md:w-24 md:h-24"
          />
        </div>
        <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 mt-2">
          {t('welcome.description')}
        </p>
      </div>

      {errorCode ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {t('auth.errors.AUTH_START_FAILED')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
        {roles.map((role) => {
          const Icon = roleIcons[role];
          const s = roleStyle[role];
          const isStarting = pendingRoles.includes(role);
          const isDisabled = status === 'loading' || isStarting;
          const descriptionId = `role-${role.toLowerCase()}-action-state`;
          return (
            <article
              key={role}
              className="group flex flex-col rounded-xl border bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 p-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className={`mb-3 grid size-9 place-items-center rounded-lg ${s.iconBg}`}>
                <Icon className={`size-5 ${s.iconColor}`} aria-hidden="true" />
              </span>
              <h3 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                {t(`roles.${role}`)}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t(`roles.${role}_DESCRIPTION`)}
              </p>
              <button
                type="button"
                disabled={isDisabled}
                aria-busy={isStarting}
                aria-describedby={isDisabled ? descriptionId : undefined}
                className={`mt-auto flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 border cursor-pointer disabled:cursor-not-allowed ${s.btnBg} ${s.btnBorder} ${s.btnText} ${s.btnHover}`}
                onClick={() => void startSignIn(role)}
              >
                <span className="truncate">
                  {isStarting ? t('auth.starting') : t('auth.signIn')}
                </span>
                {isStarting ? (
                  <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
              <span className="sr-only" id={descriptionId}>
                {status === 'loading' ? t('auth.bootstrapDisabled') : t('auth.requestPending')}
              </span>
            </article>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">{t('menu.loginHelp')}</span>
        <Link
          to="/how-to-login"
          className="font-semibold text-cyan-600 dark:text-cyan-400 transition-colors hover:text-cyan-500 dark:hover:text-cyan-300"
        >
          {t('nav.loginHelp')}
        </Link>
      </div>
    </div>
  );
}
