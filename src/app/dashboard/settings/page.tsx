import { getPublicSettings, getCurrentUser } from "@/app/actions";
import { UserSettingsForm } from "@/components/user-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    const { emailChangeEnabled } = await getPublicSettings();

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account settings and personal information.
                </p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        This information will be used for your account. Make sure it's up to date.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <UserSettingsForm user={user} emailChangeEnabled={emailChangeEnabled} />
                </CardContent>
            </Card>
        </div>
    )
}
