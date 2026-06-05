export type EmergencyNumber = {
  id: string;
  number: string;
  label: string;
  description: string;
  availability: string;
  action: string;
};

export type EmergencyInstructionGroup = {
  id: string;
  title: string;
  summary: string;
  items: readonly string[];
};

export type EmergencySource = {
  label: string;
  url: string;
};

export const emergencyNumbers = [
  {
    id: "single-emergency-number",
    number: "112",
    label: "Numarul unic pentru urgente",
    description:
      "Suna daca exista pericol imediat pentru viata, sanatate, incendiu, accident grav sau alta situatie care necesita interventie rapida.",
    availability: "Apel gratuit, disponibil permanent in Romania.",
    action: "Spune calm unde esti, ce s-a intamplat, cate persoane sunt afectate si ce pericole vezi.",
  },
  {
    id: "emergency-sms",
    number: "113",
    label: "SMS de urgenta pentru persoane cu deficiente de auz sau vorbire",
    description:
      "Foloseste SMS 113 doar daca nu poti comunica vocal si serviciul este disponibil pentru situatia ta.",
    availability: "Serviciu dedicat comunicarii prin SMS in urgente.",
    action: "Trimite locatia, tipul urgentei si numarul persoanelor afectate, cat mai scurt si clar.",
  },
] as const satisfies readonly EmergencyNumber[];

export const emergencyInstructionGroups = [
  {
    id: "first-actions",
    title: "Primele actiuni",
    summary: "Pastreaza cateva secunde pentru orientare si evita deciziile luate in panica.",
    items: [
      "Verifica daca tu si cei din jur sunteti raniti sau in pericol imediat.",
      "Suna la 112 doar pentru urgente reale si urmeaza instructiunile operatorului.",
      "Daca poti, opreste sursele evidente de foc, gaz sau curent fara sa te expui.",
      "Ia doar telefonul, actele, medicamentele esentiale si o lanterna daca sunt la indemana.",
    ],
  },
  {
    id: "earthquake",
    title: "In timpul unui cutremur",
    summary: "Protejeaza-ti capul si nu incerca sa parasesti cladirea in timpul miscarii seismice.",
    items: [
      "Adaposteste-te sub o masa solida, langa un perete interior sau langa o piesa rezistenta de mobilier.",
      "Stai departe de ferestre, oglinzi, rafturi, corpuri suspendate si obiecte care pot cadea.",
      "Nu folosi liftul si nu alerga pe scari cat timp cladirea se misca.",
      "Dupa oprirea miscarii, iesi calm daca exista avarii, miros de gaz, fum sau instructiuni oficiale de evacuare.",
    ],
  },
  {
    id: "go-to-shelter",
    title: "Drumul spre adapost",
    summary: "Alege traseul cel mai sigur, nu neaparat cel mai scurt.",
    items: [
      "Urmareste indicatiile autoritatilor, politiei, pompierilor si personalului de interventie.",
      "Evita cladirile avariate, cablurile cazute, podurile nesigure, zonele inundate si aglomeratiile.",
      "Mergi pe jos daca traficul este blocat sau daca autoritatile cer eliberarea drumurilor.",
      "Anunta o persoana apropiata unde mergi, doar daca poti face asta fara sa intarzii evacuarea.",
    ],
  },
  {
    id: "inside-shelter",
    title: "In adapost",
    summary: "Pastreaza ordinea si ajuta personalul sa gestioneze spatiul disponibil.",
    items: [
      "Ocupa doar locul indicat si pastreaza culoarele libere.",
      "Tine telefonul pe modul economic si foloseste apelurile doar cand sunt necesare.",
      "Ajuta copiii, varstnicii, persoanele cu dizabilitati si persoanele ranite fara sa blochezi accesul.",
      "Ramai in adapost pana cand autoritatile anunta ca zona este sigura.",
    ],
  },
  {
    id: "official-updates",
    title: "Informare oficiala",
    summary: "In situatii de urgenta, informatiile pot deveni rapid depasite.",
    items: [
      "Da prioritate mesajelor RO-Alert, DSU, IGSU, autoritatilor locale si echipelor de interventie.",
      "Nu distribui zvonuri, imagini neverificate sau rute nesigure.",
      "Daca datele din aplicatie contrazic instructiunile autoritatilor, urmeaza autoritatile.",
    ],
  },
] as const satisfies readonly EmergencyInstructionGroup[];

export const emergencySources = [
  {
    label: "FiiPregatit.ro - platforma DSU pentru pregatire in situatii de urgenta",
    url: "https://fiipregatit.ro/",
  },
  {
    label: "Serviciul de urgenta 112 - informatii STS despre serviciu si aplicatia Apel 112",
    url: "https://localizare.112.ro/privacy-policy/ro",
  },
] as const satisfies readonly EmergencySource[];

export const emergencyContent = {
  title: "Instructiuni de urgenta",
  intro:
    "Aceste instructiuni sunt disponibile offline dupa prima incarcare si sunt gandite pentru orientare rapida pana primesti indicatii oficiale.",
  disclaimer:
    "Aplicatia nu inlocuieste serviciul 112, RO-Alert, DSU, IGSU sau instructiunile autoritatilor. In orice conflict, urmeaza indicatiile oficiale primite in acel moment.",
  lastReviewed: "2026-06-06",
  numbers: emergencyNumbers,
  instructionGroups: emergencyInstructionGroups,
  sources: emergencySources,
} as const;
