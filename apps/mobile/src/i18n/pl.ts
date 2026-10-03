import type { AppStrings } from './en';

export const pl: AppStrings = {
  tabs: {
    home: 'Start',
    myReports: 'Moje zgłoszenia',
    capture: 'Nagrywanie',
    account: 'Konto',
  },
  home: {
    title: 'Zacznij od tego, co masz',
    intro:
      'Możesz zapisać, co się wydarzyło, własnymi słowami i we własnym tempie. Nic nie zostanie wysłane, dopóki sam(a) tego nie zdecydujesz.',
    noAccount: 'Nie potrzebujesz konta, aby zacząć.',
    emergencyTitle: 'W niebezpieczeństwie dzwoń pod 112.',
    emergencyBody: 'Haven to prototyp; żadne prawdziwe służby nie są powiadamiane.',
  },
  myReports: {
    title: 'Moje zgłoszenia',
    empty: 'Nie masz jeszcze żadnych zgłoszeń.',
    later: 'Zapisane zgłoszenia pojawią się tutaj w kolejnym etapie prototypu.',
  },
  capture: {
    title: 'Nagrywanie',
    later: 'Nagrywanie będzie dostępne w kolejnym etapie.',
    note: 'Gdy się pojawi, to Ty zdecydujesz, co zostanie nagrane i zachowane.',
  },
  account: {
    title: 'Konto',
    intro: 'Te ustawienia są przechowywane wyłącznie na tym urządzeniu.',
    appearance: 'Wygląd',
    language: 'Język',
  },
  session: {
    loading: 'Przygotowujemy wszystko…',
    guest: 'Korzystasz z Haven jako gość.',
    guestHint: 'Możesz zalogować się w dowolnej chwili. Logowanie nigdy nie jest wymagane.',
    signedInAs: 'Zalogowano jako {{name}}',
    signOut: 'Wyloguj się',
    offline:
      'Nie można teraz połączyć się z Haven. Nadal możesz korzystać z aplikacji na tym urządzeniu.',
    retry: 'Spróbuj ponownie',
  },
  signIn: {
    title: 'Logowanie',
    username: 'Nazwa użytkownika',
    password: 'Hasło',
    submit: 'Zaloguj się',
    submitting: 'Logowanie…',
    missing: 'Wpisz nazwę użytkownika i hasło.',
    errors: {
      invalidCredentials: 'Nieprawidłowa nazwa użytkownika lub hasło.',
      rateLimited: 'Zbyt wiele prób logowania. Odczekaj minutę i spróbuj ponownie.',
      staffUseWeb: 'Pracownicy korzystają z obszaru roboczego w przeglądarce.',
      unreachable: 'Nie można teraz połączyć się z Haven.',
    },
    demoTitle: 'Konta demonstracyjne',
    demoNote: 'To fikcyjne konta demonstracyjne. Nie należą do prawdziwych osób.',
    demoAction: 'Zaloguj się jako {{name}}',
    demoHint: 'Loguje przy użyciu opublikowanego hasła demonstracyjnego',
  },
  theme: {
    system: 'Systemowy',
    light: 'Jasny',
    dark: 'Ciemny',
    systemHint: 'Zgodnie z ustawieniem urządzenia',
  },
  language: {
    en: 'English',
    pl: 'Polski',
  },
  notFound: {
    title: 'Nie znaleziono',
    body: 'Ten ekran nie istnieje.',
    home: 'Przejdź do ekranu startowego',
  },
};
