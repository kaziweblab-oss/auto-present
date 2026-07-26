import {
  type CSSProperties,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { GraduationCap, Shield } from 'lucide-react';

interface RoleSwitchProps {
  requestedRole: 'CAPTAIN' | 'STUDENT';
  onSwitch: () => void;
  disabled: boolean;
}

export function RoleSwitch({ requestedRole, onSwitch, disabled }: RoleSwitchProps): ReactNode {
  const [animState, setAnimState] = useState<'idle' | 'converging' | 'crossing'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const leftIconRef = useRef<HTMLSpanElement>(null);
  const rightIconRef = useRef<HTMLSpanElement>(null);
  const [distances, setDistances] = useState({ left: 0, right: 0 });
  const mountedRef = useRef(true);

  const isCaptain = requestedRole === 'CAPTAIN';
  const label = isCaptain ? 'View as Student' : 'Return to Captain';
  const ariaLabel = isCaptain ? 'Switch to Student Dashboard' : 'Switch to Captain Dashboard';

  const measure = useCallback((): void => {
    if (!containerRef.current || !leftIconRef.current || !rightIconRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const lr = leftIconRef.current.getBoundingClientRect();
    const rr = rightIconRef.current.getBoundingClientRect();
    const centerX = cr.left + cr.width / 2;
    setDistances({
      left: centerX - (lr.left + lr.width / 2),
      right: centerX - (rr.left + rr.width / 2),
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, requestedRole]);

  const handleClick = useCallback((): void => {
    if (animState !== 'idle' || disabled) return;
    measure();
    setAnimState('converging');
    setTimeout(() => {
      if (!mountedRef.current) return;
      setAnimState('crossing');
      setTimeout(() => {
        if (!mountedRef.current) return;
        onSwitch();
        setAnimState('idle');
      }, 150);
    }, 200);
  }, [animState, disabled, measure, onSwitch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const isAnimating = animState !== 'idle';

  const captainColor = 'var(--sidebar-active-text)';
  const captainBg = 'color-mix(in srgb, var(--sidebar-active-text) 12%, transparent)';
  const captainGlow = 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))';

  const studentColor = '#a78bfa';
  const studentBg = 'rgba(167, 139, 250, 0.12)';
  const studentGlow = 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.4))';

  const leftIsCaptain = isCaptain;
  const rightIsCaptain = !isCaptain;

  const leftTranslateX = animState === 'idle' ? 0 : distances.left;
  const rightTranslateX = animState === 'idle' ? 0 : distances.right;

  const leftScale = animState === 'crossing' ? 1.08 : 1;
  const rightScale = animState === 'crossing' ? 1.08 : 1;

  const leftZIndex = animState === 'crossing' && !isCaptain ? 2 : 1;
  const rightZIndex = animState === 'crossing' && isCaptain ? 2 : 1;

  const makeTransition = (captureFilter: boolean) =>
    animState === 'converging'
      ? `transform 200ms cubic-bezier(0.4, 0, 0.2, 1)${captureFilter ? ', filter 200ms ease' : ''}`
      : animState === 'crossing'
        ? `transform 100ms cubic-bezier(0.4, 0, 0.2, 1)${captureFilter ? ', filter 100ms ease' : ''}`
        : 'none';

  const iconBase: Partial<CSSProperties> = {
    position: 'absolute',
    top: '50%',
    display: 'grid',
    placeItems: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    pointerEvents: 'none',
    willChange: 'transform, filter',
  };

  const leftStyle: CSSProperties = {
    ...iconBase,
    left: '10px',
    transform: `translateY(-50%) translateX(${leftTranslateX}px) scale(${leftScale})`,
    transition: makeTransition(true),
    zIndex: leftZIndex,
    color: leftIsCaptain ? captainColor : studentColor,
    background: leftIsCaptain ? captainBg : studentBg,
    filter: animState === 'crossing' ? (leftIsCaptain ? captainGlow : studentGlow) : 'none',
  };

  const rightStyle: CSSProperties = {
    ...iconBase,
    right: '10px',
    transform: `translateY(-50%) translateX(${rightTranslateX}px) scale(${rightScale})`,
    transition: makeTransition(true),
    zIndex: rightZIndex,
    color: rightIsCaptain ? captainColor : studentColor,
    background: rightIsCaptain ? captainBg : studentBg,
    filter: animState === 'crossing' ? (rightIsCaptain ? captainGlow : studentGlow) : 'none',
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={disabled || isAnimating}
      className="role-switch"
      data-animating={isAnimating || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span ref={leftIconRef} style={leftStyle}>
        {isCaptain ? <Shield size={16} /> : <GraduationCap size={16} />}
      </span>
      <span className="role-switch-label">{label}</span>
      <span ref={rightIconRef} style={rightStyle}>
        {isCaptain ? <GraduationCap size={16} /> : <Shield size={16} />}
      </span>
    </div>
  );
}
