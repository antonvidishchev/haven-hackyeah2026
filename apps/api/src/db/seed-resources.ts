import type { SupportResource } from '@haven/shared';
import { RecordId } from 'surrealdb';
import type { QueryFn } from './migrations.js';

const weekdays = { en: 'Mon–Fri 9:00–17:00', pl: 'pn.–pt. 9:00–17:00' };
const evenings = { en: 'Mon–Sat 16:00–22:00', pl: 'pn.–sob. 16:00–22:00' };
const always = { en: '24 hours, every day', pl: 'całą dobę, codziennie' };

const allCategories: SupportResource['categories'] = [
  'verbal_harassment',
  'physical_intimidation',
  'threat',
  'discrimination',
  'online_harassment',
  'vandalism_hate_symbols',
  'other',
];

let contactNumber = 0;
/** A fictional resource; every name says so, every contact is a 000 number and example.org. */
function r(
  slug: string,
  kind: SupportResource['kind'],
  name: [en: string, pl: string],
  description: [en: string, pl: string],
  match: Pick<SupportResource, 'categories' | 'districts' | 'severities'> & {
    keywords: [en: string[], pl: string[]];
    languages?: string[];
    hours?: SupportResource['availableHours'];
  },
): SupportResource {
  contactNumber += 1;
  return {
    slug,
    kind,
    name: { en: `${name[0]} (fictional)`, pl: `${name[1]} (fikcyjne)` },
    description: { en: description[0], pl: description[1] },
    categories: match.categories,
    districts: match.districts,
    languages: match.languages ?? ['pl', 'en'],
    severities: match.severities,
    keywords: { en: match.keywords[0], pl: match.keywords[1] },
    contact: `+48 12 000 00 ${String(contactNumber).padStart(2, '0')} · ${slug}@example.org`,
    availableHours: match.hours ?? weekdays,
  };
}

export const supportResources: SupportResource[] = [
  r(
    'old-town-transit-safety',
    'victim_support',
    ['Old Town Transit Safety Desk', 'Punkt Bezpieczeństwa w Komunikacji – Stare Miasto'],
    [
      'Support after harassment on trams, buses and at stops in the city centre.',
      'Wsparcie po nękaniu w tramwajach, autobusach i na przystankach w centrum.',
    ],
    {
      categories: ['verbal_harassment', 'physical_intimidation', 'threat'],
      districts: ['I'],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['tram', 'bus', 'stop', 'night'],
        ['tramwaj', 'autobus', 'przystanek', 'noc'],
      ],
      hours: evenings,
    },
  ),
  r(
    'victim-support-centre',
    'victim_support',
    ['Kraków Victim Support Centre', 'Krakowskie Centrum Wsparcia Pokrzywdzonych'],
    [
      'Practical and emotional help for people who were threatened or attacked.',
      'Praktyczna i emocjonalna pomoc dla osób, którym grożono lub które zaatakowano.',
    ],
    {
      categories: ['physical_intimidation', 'threat', 'discrimination', 'verbal_harassment'],
      districts: [],
      severities: ['medium', 'high', 'emergency'],
      keywords: [
        ['assault', 'threat', 'attack', 'injury'],
        ['napaść', 'groźby', 'atak', 'uraz'],
      ],
    },
  ),
  r(
    'community-legal-clinic',
    'legal_aid',
    ['Community Legal Clinic', 'Społeczna Poradnia Prawna'],
    [
      'Free advice on reporting to the police, complaints and your rights in court.',
      'Bezpłatne porady o zgłoszeniu na policję, skargach i prawach w sądzie.',
    ],
    {
      categories: ['threat', 'discrimination', 'online_harassment', 'vandalism_hate_symbols'],
      districts: [],
      severities: ['medium', 'high'],
      keywords: [
        ['lawyer', 'court', 'police', 'complaint'],
        ['prawnik', 'sąd', 'policja', 'skarga'],
      ],
    },
  ),
  r(
    'hate-crime-legal-network',
    'legal_aid',
    ['Hate Crime Legal Network', 'Sieć Prawna ds. Przestępstw z Nienawiści'],
    [
      'Lawyers who help when you were targeted because of who you are.',
      'Prawnicy, którzy pomagają, gdy ktoś zaatakował Cię z powodu tego, kim jesteś.',
    ],
    {
      categories: ['discrimination', 'vandalism_hate_symbols', 'verbal_harassment'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['hate', 'racist', 'religion', 'ethnicity'],
        ['nienawiść', 'rasist', 'religia', 'pochodzenie'],
      ],
    },
  ),
  r(
    'ukrainian-interpreter-desk',
    'translation',
    ['Ukrainian Interpreter Desk', 'Punkt Tłumaczeń na Język Ukraiński'],
    [
      'Interpreters for reports, police visits and appointments, in Ukrainian and Russian.',
      'Tłumacze przy zgłoszeniach, na policji i podczas wizyt, po ukraińsku i rosyjsku.',
    ],
    {
      categories: allCategories,
      districts: [],
      severities: [],
      languages: ['uk', 'ru', 'pl'],
      keywords: [
        ['ukrainian', 'russian', 'interpreter', 'translation'],
        ['ukraiński', 'rosyjski', 'tłumacz'],
      ],
    },
  ),
  r(
    'english-interpreter-line',
    'translation',
    ['English Interpreter Line', 'Linia Tłumaczy Języka Angielskiego'],
    [
      'Phone interpreting for visitors, students and residents who do not speak Polish.',
      'Tłumaczenie telefoniczne dla turystów, studentów i mieszkańców, którzy nie mówią po polsku.',
    ],
    {
      categories: allCategories,
      districts: [],
      severities: [],
      languages: ['en', 'pl'],
      keywords: [
        ['english', 'tourist', 'interpreter', 'foreigner'],
        ['angielski', 'turysta', 'tłumacz', 'cudzoziemiec'],
      ],
    },
  ),
  r(
    'calm-mind-counselling',
    'psychological_support',
    ['Calm Mind Counselling', 'Poradnia Spokojna Głowa'],
    [
      'Short-term counselling for fear, stress and sleeplessness after an incident.',
      'Krótkoterminowe wsparcie przy lęku, stresie i bezsenności po zdarzeniu.',
    ],
    {
      categories: [
        'verbal_harassment',
        'physical_intimidation',
        'threat',
        'discrimination',
        'online_harassment',
      ],
      districts: [],
      severities: ['medium', 'high'],
      keywords: [
        ['anxiety', 'fear', 'sleep', 'stress'],
        ['lęk', 'strach', 'sen', 'stres'],
      ],
    },
  ),
  r(
    'night-support-line',
    'helpline',
    ['Night Support Line', 'Nocny Telefon Wsparcia'],
    [
      'Someone to talk to at any hour when you feel unsafe or alone.',
      'Rozmowa o każdej porze, gdy czujesz się zagrożony lub samotny.',
    ],
    {
      categories: allCategories,
      districts: [],
      severities: ['high', 'emergency'],
      keywords: [
        ['night', 'alone', 'scared', 'unsafe'],
        ['noc', 'sam', 'boję', 'samotn'],
      ],
      hours: always,
    },
  ),
  r(
    'youth-support-line',
    'helpline',
    ['Youth Support Line', 'Telefon Wsparcia dla Młodzieży'],
    [
      'For pupils and teenagers facing bullying at school or online.',
      'Dla uczniów i nastolatków doświadczających nękania w szkole lub w sieci.',
    ],
    {
      categories: ['verbal_harassment', 'online_harassment', 'discrimination'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['school', 'pupil', 'teenager', 'bullying'],
        ['szkoła', 'uczeń', 'nastolat', 'nękanie'],
      ],
      hours: evenings,
    },
  ),
  r(
    'digital-safety-lab',
    'digital_safety',
    ['Digital Safety Lab', 'Laboratorium Bezpieczeństwa Cyfrowego'],
    [
      'Help securing accounts, saving abusive messages and getting posts removed.',
      'Pomoc w zabezpieczeniu kont, zapisaniu obraźliwych wiadomości i usunięciu wpisów.',
    ],
    {
      categories: ['online_harassment', 'threat'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['online', 'instagram', 'facebook', 'messages', 'account', 'hacked'],
        ['internet', 'wiadomości', 'konto', 'hejt'],
      ],
    },
  ),
  r(
    'stalking-advice-service',
    'victim_support',
    ['Stalking Advice Service', 'Poradnia ds. Uporczywego Nękania'],
    [
      'Safety planning when someone keeps following, watching or contacting you.',
      'Plan bezpieczeństwa, gdy ktoś uporczywie Cię śledzi, obserwuje lub kontaktuje się z Tobą.',
    ],
    {
      categories: ['threat', 'online_harassment', 'physical_intimidation'],
      districts: [],
      severities: ['medium', 'high'],
      keywords: [
        ['following', 'stalking', 'watching', 'ex-partner'],
        ['śledzi', 'nęka', 'obserwuje', 'były'],
      ],
    },
  ),
  r(
    'nowa-huta-neighbour-mediation',
    'community_mediation',
    ['Nowa Huta Neighbour Mediation', 'Mediacje Sąsiedzkie Nowa Huta'],
    [
      'Trained mediators for disputes between neighbours in blocks and estates.',
      'Mediatorzy pomagający w sporach sąsiedzkich w blokach i na osiedlach.',
    ],
    {
      categories: ['verbal_harassment', 'other', 'vandalism_hate_symbols'],
      districts: ['XIV', 'XV', 'XVI', 'XVII', 'XVIII'],
      severities: ['low', 'medium'],
      keywords: [
        ['neighbour', 'noise', 'stairwell', 'block'],
        ['sąsiad', 'hałas', 'klatka', 'blok'],
      ],
    },
  ),
  r(
    'city-centre-mediation',
    'community_mediation',
    ['City Centre Mediation Point', 'Punkt Mediacji w Centrum'],
    [
      'Mediation between tenants, neighbours and landlords in the city centre.',
      'Mediacje między najemcami, sąsiadami i właścicielami mieszkań w centrum.',
    ],
    {
      categories: ['verbal_harassment', 'other'],
      districts: ['I', 'II', 'VII'],
      severities: ['low', 'medium'],
      keywords: [
        ['neighbour', 'tenant', 'courtyard', 'landlord'],
        ['sąsiad', 'najemca', 'podwórko', 'właściciel'],
      ],
    },
  ),
  r(
    'podgorze-community-centre',
    'ngo',
    ['Podgórze Community Centre', 'Centrum Społeczne Podgórze'],
    [
      'Local drop-in support, youth activities and help connecting with services.',
      'Lokalne wsparcie bez zapisów, zajęcia dla młodzieży i pomoc w kontakcie ze służbami.',
    ],
    {
      categories: ['verbal_harassment', 'discrimination', 'vandalism_hate_symbols'],
      districts: ['IX', 'XI', 'XII', 'XIII'],
      severities: ['low', 'medium'],
      keywords: [
        ['community', 'youth', 'park'],
        ['społeczność', 'młodzież', 'park'],
      ],
    },
  ),
  r(
    'kazimierz-neighbourhood-network',
    'ngo',
    ['Kazimierz Neighbourhood Network', 'Sieć Sąsiedzka Kazimierz'],
    [
      'Volunteers who look out for nightlife streets and report hate graffiti.',
      'Wolontariusze dbający o ulice nocnego życia i zgłaszający graffiti z nienawiścią.',
    ],
    {
      categories: ['vandalism_hate_symbols', 'verbal_harassment'],
      districts: ['I'],
      severities: ['low', 'medium'],
      keywords: [
        ['graffiti', 'wall', 'bar', 'nightlife'],
        ['graffiti', 'mur', 'bar', 'nocne'],
      ],
      hours: evenings,
    },
  ),
  r(
    'clean-walls-volunteers',
    'ngo',
    ['Clean Walls Volunteers', 'Wolontariusze Czyste Mury'],
    [
      'Volunteers who paint over hate symbols and remove hateful stickers.',
      'Wolontariusze zamalowujący symbole nienawiści i usuwający naklejki.',
    ],
    {
      categories: ['vandalism_hate_symbols'],
      districts: [],
      severities: ['low', 'medium'],
      keywords: [
        ['graffiti', 'swastika', 'sticker', 'paint'],
        ['graffiti', 'swastyka', 'naklejka', 'farba'],
      ],
    },
  ),
  r(
    'rainbow-support-point',
    'ngo',
    ['Rainbow Support Point', 'Tęczowy Punkt Wsparcia'],
    [
      'Peer support and advice for LGBT+ people who faced harassment or violence.',
      'Wsparcie rówieśnicze i porady dla osób LGBT+, które doświadczyły nękania lub przemocy.',
    ],
    {
      categories: ['discrimination', 'verbal_harassment', 'physical_intimidation'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['lgbt', 'gay', 'trans', 'queer'],
        ['lgbt', 'gej', 'trans', 'queer'],
      ],
    },
  ),
  r(
    'migrant-rights-centre',
    'legal_aid',
    ['Migrant Rights Centre', 'Centrum Praw Migrantów'],
    [
      'Legal advice for foreigners facing discrimination, including residence questions.',
      'Porady prawne dla cudzoziemców doświadczających dyskryminacji, także w sprawach pobytu.',
    ],
    {
      categories: ['discrimination', 'verbal_harassment'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      languages: ['pl', 'en', 'uk', 'ru'],
      keywords: [
        ['foreigner', 'accent', 'migrant', 'residence'],
        ['cudzoziemiec', 'akcent', 'migrant', 'pobyt'],
      ],
    },
  ),
  r(
    'safe-streets-women-network',
    'victim_support',
    ['Safe Streets Women’s Network', 'Sieć Bezpieczne Ulice dla Kobiet'],
    [
      'Support for women after catcalling, groping or being followed in public.',
      'Wsparcie dla kobiet po zaczepkach, obmacywaniu lub śledzeniu w przestrzeni publicznej.',
    ],
    {
      categories: ['verbal_harassment', 'physical_intimidation', 'threat'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['catcalling', 'groping', 'following', 'woman'],
        ['zaczepki', 'obmacywanie', 'kobieta'],
      ],
    },
  ),
  r(
    'access-for-all-advocacy',
    'ngo',
    ['Access for All Advocacy', 'Rzecznictwo Dostępność dla Wszystkich'],
    [
      'Advocates for disabled residents who face harassment or discrimination.',
      'Rzecznicy osób z niepełnosprawnościami doświadczających nękania lub dyskryminacji.',
    ],
    {
      categories: ['discrimination', 'verbal_harassment'],
      districts: [],
      severities: ['low', 'medium'],
      keywords: [
        ['wheelchair', 'disability', 'blind', 'deaf'],
        ['wózek', 'niepełnospraw', 'niewidom', 'głuch'],
      ],
    },
  ),
  r(
    'campus-safety-office',
    'victim_support',
    ['Campus Safety Office', 'Biuro Bezpieczeństwa Kampusu'],
    [
      'Confidential help for students harassed on campus, in dormitories or online.',
      'Poufna pomoc dla studentów nękanych na kampusie, w akademikach lub w sieci.',
    ],
    {
      categories: ['verbal_harassment', 'discrimination', 'online_harassment'],
      districts: ['V', 'VII', 'II'],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['student', 'campus', 'dormitory', 'university'],
        ['student', 'kampus', 'akademik', 'uczelnia'],
      ],
    },
  ),
  r(
    'bronowice-family-support',
    'psychological_support',
    ['Bronowice Family Support', 'Wsparcie Rodzin Bronowice'],
    [
      'Counselling for parents and children affected by conflict or intimidation.',
      'Wsparcie psychologiczne dla rodziców i dzieci dotkniętych konfliktem lub zastraszaniem.',
    ],
    {
      categories: ['verbal_harassment', 'threat', 'other'],
      districts: ['IV', 'VI'],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['family', 'children', 'parent'],
        ['rodzina', 'dzieci', 'rodzic'],
      ],
    },
  ),
  r(
    'debniki-fan-dialogue',
    'community_mediation',
    ['Dębniki Fan Dialogue', 'Dialog Kibiców Dębniki'],
    [
      'Mediation and support around match days near the stadium.',
      'Mediacje i wsparcie w dni meczowe w okolicy stadionu.',
    ],
    {
      categories: ['verbal_harassment', 'physical_intimidation', 'vandalism_hate_symbols'],
      districts: ['VIII'],
      severities: ['low', 'medium'],
      keywords: [
        ['stadium', 'football', 'fans', 'match'],
        ['stadion', 'piłka', 'kibice', 'mecz'],
      ],
    },
  ),
  r(
    'senior-friendship-line',
    'helpline',
    ['Senior Friendship Line', 'Telefon Przyjaciela Seniora'],
    [
      'A friendly voice and practical help for older residents who feel threatened.',
      'Życzliwa rozmowa i praktyczna pomoc dla starszych mieszkańców, którzy czują się zagrożeni.',
    ],
    {
      categories: ['verbal_harassment', 'threat', 'other'],
      districts: [],
      severities: ['low', 'medium', 'high'],
      keywords: [
        ['elderly', 'senior', 'pension'],
        ['senior', 'emeryt', 'starsz'],
      ],
    },
  ),
  r(
    'trauma-recovery-group',
    'psychological_support',
    ['Trauma Recovery Group', 'Grupa Wsparcia po Traumie'],
    [
      'Group and one-to-one support after violence, panic attacks or nightmares.',
      'Wsparcie grupowe i indywidualne po przemocy, atakach paniki lub koszmarach.',
    ],
    {
      categories: ['physical_intimidation', 'threat'],
      districts: [],
      severities: ['high', 'emergency'],
      keywords: [
        ['trauma', 'nightmares', 'panic'],
        ['trauma', 'koszmar', 'panika'],
      ],
    },
  ),
];

/** Upserts every resource by slug, so re-seeding refreshes them. */
export async function seedSupportResources(query: QueryFn): Promise<number> {
  for (const resource of supportResources) {
    await query('UPSERT $id CONTENT $data', {
      id: new RecordId('support_resource', resource.slug),
      data: {
        slug: resource.slug,
        kind: resource.kind,
        name_en: resource.name.en,
        name_pl: resource.name.pl,
        description_en: resource.description.en,
        description_pl: resource.description.pl,
        categories: resource.categories,
        districts: resource.districts,
        languages: resource.languages,
        severities: resource.severities,
        keywords_en: resource.keywords.en,
        keywords_pl: resource.keywords.pl,
        contact: resource.contact,
        available_hours: resource.availableHours,
      },
    });
  }
  return supportResources.length;
}
