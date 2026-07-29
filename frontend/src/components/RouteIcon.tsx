import { ArrowLeftRight, Calculator, ShieldCheck } from 'lucide-react';
import type { CaseLine } from '../api/types';

interface RouteIconProps {
  line: CaseLine | string;
  size?: number;
}

/** 三条业务路线的统一图标 */
export function RouteIcon({ line, size = 20 }: RouteIconProps) {
  switch (line) {
    case 'CLEARING':
      return <ArrowLeftRight size={size} strokeWidth={2} aria-hidden="true" />;
    case 'ACCOUNTING':
      return <Calculator size={size} strokeWidth={2} aria-hidden="true" />;
    case 'SUPERVISION':
      return <ShieldCheck size={size} strokeWidth={2} aria-hidden="true" />;
    default:
      return <ArrowLeftRight size={size} strokeWidth={2} aria-hidden="true" />;
  }
}
