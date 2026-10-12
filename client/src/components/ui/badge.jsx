import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export function Badge({ className, ...props }) {
    return (_jsx("span", { className: cn('inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700', className), ...props }));
}
