import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function AdminPage() {
    const hasAdminSession = cookies().has('admin_session');
    
    if (!hasAdminSession) {
        redirect('/admin/login');
    }

    return <AdminDashboard />;
}
