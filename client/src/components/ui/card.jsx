import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export function Card({ className, ...props }) {
    return _jsx("div", { className: cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5', className), ...props });
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { className: cn('border-b border-slate-100 px-5 py-4', className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { className: cn('px-5 py-4', className), ...props });
}
