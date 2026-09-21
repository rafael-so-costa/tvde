import {Navigate,Outlet} from 'react-router-dom';
import {LoaderCircle} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';

interface Props {
    allowedRoles:string[];
    redirectTo?:string;
}

export default function RoleRoute({
    allowedRoles,
    redirectTo='/',
}:Props){
    const {user,loading}=useAuth();

    if(loading){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(!user){
        return <Navigate to="/login" replace/>;
    }

    const allowed=
        (user.super_admin && allowedRoles.includes('super_admin')) ||
        user.roles?.some(role=>allowedRoles.includes(role.codigo));

    if(!allowed){
        return <Navigate to={redirectTo} replace/>;
    }

    return <Outlet/>;
}
