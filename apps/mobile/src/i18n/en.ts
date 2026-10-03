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
