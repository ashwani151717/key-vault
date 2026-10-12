import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UpdateVaultPage } from './pages/UpdateVault';
import { ViewVaultPage } from './pages/ViewVault';
export function App() {
    return (_jsx(BrowserRouter, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ViewVaultPage, {}) }), _jsx(Route, { path: "/update", element: _jsx(UpdateVaultPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
}
