import { jsx as _jsx } from "react/jsx-runtime";
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800', {
    variants: {
        variant: {
            default: 'bg-teal-700 text-white shadow-sm shadow-teal-900/20 hover:bg-teal-800',
            secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
            ghost: 'text-slate-700 hover:bg-slate-200/70',
            danger: 'bg-red-700 text-white hover:bg-red-800',
        },
        size: {
            default: 'h-10 px-4',
            sm: 'h-8 px-3 text-xs',
            lg: 'h-11 px-5',
        },
    },
    defaultVariants: { variant: 'default', size: 'default' },
});
export function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? Slot : 'button';
    return _jsx(Comp, { className: cn(buttonVariants({ variant, size }), className), ...props });
}
