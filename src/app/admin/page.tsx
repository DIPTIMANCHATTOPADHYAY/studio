import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { getCurrentUser } from '@/app/actions/auth';

export default async function AdminPage() {
    const user = await getCurrentUser();
    
    if (!user || !user.isAdmin) {
        redirect('/login');
    }

    return <AdminDashboard />;
}
