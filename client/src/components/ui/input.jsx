import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export function Input({ className, ...props }) {
    return (_jsx("input", { className: cn('flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:bg-slate-100', className), ...props }));
}
