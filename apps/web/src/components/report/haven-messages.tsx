import { MessageSquare } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ResidentMessage } from '@haven/shared';

/** Messages from Haven to the resident: kind, body and time only — never who sent them. */
export async function HavenMessages({ messages }: { messages: ResidentMessage[] }) {
  const [t, format] = await Promise.all([getTranslations('messages'), getFormatter()]);
  const ordered = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-labelledby="messages-title" className="flex flex-col gap-4">
      <h2 id="messages-title">{t('title')}</h2>
      {ordered.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordered.map((message) => (
            <li key={message.id} className="resident-card">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <MessageSquare aria-hidden className="size-4 text-primary" />
                {t(`kind.${message.kind}`)}
              </p>
              <p className="whitespace-pre-line text-foreground">
                {/* The notice is fixed text, so it can follow the resident's language. */}
                {message.kind === 'cancellation_notice' ? t('cancellationNotice') : message.body}
              </p>
              <p>
                <time dateTime={message.createdAt}>
                  {format.dateTime(new Date(message.createdAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </p>
              {message.id === ordered[0]?.id && message.kind === 'request_information' ? (
                <a href="#edit-title" className="resident-button self-start">
                  {t('editCta')}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
