import {
    Navigate,
    Outlet,
} from "react-router-dom";
import {
    LoaderCircle,
} from "lucide-react";

import {
    useAuth,
} from "../contexts/AuthContext";

export default function SuperAdminRoute() {
    const {
        user,
        loading,
    } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    if (!user?.super_admin) {
        return (
            <Navigate
                to="/painel"
                replace
            />
        );
    }

    return <Outlet />;
}
