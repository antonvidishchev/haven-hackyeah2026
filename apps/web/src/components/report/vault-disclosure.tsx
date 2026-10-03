import { LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SimulationNote } from '@/components/haven/simulation-note';

/** What happens to uploaded files, stated plainly next to the upload control. */
export function VaultDisclosure() {
  const t = useTranslations('evidence');
  return (
    <aside aria-labelledby="vault-title" className="resident-card">
      <h3 id="vault-title" className="flex items-center gap-2 font-semibold">
        <LockKeyhole aria-hidden className="size-5 text-primary" />
        {t('vaultTitle')}
      </h3>
      <p>{t('vaultBody')}</p>
      <SimulationNote>{t('notScanned')}</SimulationNote>
    </aside>
  );
}
