import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export function Table({ className, ...props }) {
    return (_jsx("div", { className: "w-full overflow-auto", children: _jsx("table", { className: cn('w-full caption-bottom text-sm', className), ...props }) }));
}
export function TableHeader({ className, ...props }) {
    return _jsx("thead", { className: cn('bg-slate-50 text-left', className), ...props });
}
export function TableBody({ className, ...props }) {
    return _jsx("tbody", { className: cn('divide-y divide-slate-100', className), ...props });
}
export function TableRow({ className, ...props }) {
    return _jsx("tr", { className: cn('align-top', className), ...props });
}
export function TableHead({ className, ...props }) {
    return _jsx("th", { className: cn('px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500', className), ...props });
}
export function TableCell({ className, ...props }) {
    return _jsx("td", { className: cn('px-4 py-3', className), ...props });
}
