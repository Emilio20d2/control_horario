

'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const SettingsPageContent = dynamic(
    () => import('@/components/settings/settings-page-content'),
    { 
        ssr: false,
        loading: () => (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }
);

export default function SettingsPage() {
    return <SettingsPageContent />;
}
