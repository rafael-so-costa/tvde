import {
    Navigate,
    Outlet,
} from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
    const {
        user,
        loading,
    } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return <Outlet />;
}
