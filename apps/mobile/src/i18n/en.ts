export const en = {
  tabs: {
    home: 'Home',
    myReports: 'My reports',
    capture: 'Capture',
    account: 'Account',
  },
  home: {
    title: 'Start with what you have',
    intro:
      'You can write down what happened, in your own words and at your own pace. Nothing is sent anywhere until you choose to.',
    noAccount: 'No account is needed to start.',
    emergencyTitle: 'In danger, call 112.',
    emergencyBody: 'Haven is a prototype; no real services are contacted.',
  },
  myReports: {
    title: 'My reports',
    empty: 'You have no reports yet.',
    later: 'Saved reports will appear here in a later phase of this prototype.',
  },
  capture: {
    title: 'Capture',
    later: 'Capture will be available in a later phase.',
    note: 'When it arrives, you will decide what is recorded and what is kept.',
  },
  account: {
    title: 'Account',
    intro: 'These settings are stored only on this device.',
    appearance: 'Appearance',
    language: 'Language',
  },
  session: {
    loading: 'Getting things ready…',
    guest: 'You are using Haven as a guest.',
    guestHint: 'You can sign in at any time. Signing in is never required.',
    signedInAs: 'Signed in as {{name}}',
    signOut: 'Sign out',
    offline: 'Haven can’t be reached right now. You can keep using the app on this device.',
    retry: 'Try again',
  },
  signIn: {
    title: 'Sign in',
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    missing: 'Enter your username and password.',
    errors: {
      invalidCredentials: 'Incorrect username or password.',
      rateLimited: 'Too many sign-in attempts. Please wait a minute and try again.',
      staffUseWeb: 'Staff accounts use the web workspace.',
      unreachable: 'Haven can’t be reached right now.',
    },
    demoTitle: 'Demo accounts',
    demoNote: 'These are fictional demo fixtures. They are not real people.',
    demoAction: 'Sign in as {{name}}',
    demoHint: 'Signs in with the published demo password',
  },
  theme: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    systemHint: 'Follow your device setting',
  },
  language: {
    en: 'English',
    pl: 'Polski',
  },
  notFound: {
    title: 'Not found',
    body: 'This screen does not exist.',
    home: 'Go to the home screen',
  },
};

export type AppStrings = typeof en;
