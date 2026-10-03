import { redirect } from 'next/navigation';

/** Area reports is the front page; the reporting start page lives at /start. */
export default function RootPage() {
  redirect('/area-reports');
}
