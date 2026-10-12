import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export function Label({ className, ...props }) {
    return _jsx("label", { className: cn('mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500', className), ...props });
}
