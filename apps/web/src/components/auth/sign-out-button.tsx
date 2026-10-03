import { LogOut } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { signOut } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

export async function SignOutButton({ className }: { className?: string }) {
  const t = await getTranslations('settings');
  return (
    <form action={signOut}>
      <button type="submit" className={cn('inline-flex items-center gap-2', className)}>
        <LogOut aria-hidden className="size-4" />
        {t('signOut')}
      </button>
    </form>
  );
}
