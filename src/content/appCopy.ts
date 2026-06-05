export const appCopy = {
  productLabel: "Adapost Urgenta Romania",
  title: "Gaseste rapid un adapost apropiat",
  subtitle:
    "Interfata este gandita pentru telefon, lumina slaba si momente in care reteaua poate cadea.",
  actions: {
    findShelter: "Cauta adapost",
    emergencyGuide: "Instructiuni",
    enableLocation: "Activeaza GPS",
    manualSearch: "Cauta manual",
    call112: "Suna 112",
    sms113: "SMS 113",
  },
  status: {
    title: "Starea aplicatiei",
    offlineReady: "Pregatita pentru folosire offline dupa prima incarcare.",
    manualFallback: "Cautarea manuala dupa judet si localitate ramane disponibila.",
    localOnly: "Coordonatele raman pe dispozitiv. Fara conturi sau telemetrie.",
  },
  sections: {
    location: {
      title: "Pozitia ta",
      status: "Asteapta permisiunea GPS",
      description:
        "Cand modulul de localizare este conectat la interfata, aici va aparea ultima pozitie valida si acuratetea estimata.",
      fallback: "Daca GPS-ul nu merge, vei putea alege judetul si localitatea din datele salvate offline.",
    },
    shelter: {
      title: "Adapost recomandat",
      status: "Urmeaza conectarea la lista de adaposturi",
      description:
        "Recomandarea va favoriza cel mai apropiat adapost functional si va marca explicit adaposturile nefunctionale.",
      listTitle: "Lista apropiata",
      listPlaceholder: "Distantele, directia si capacitatea vor aparea aici dupa conectarea locatiei.",
    },
    emergency: {
      title: "Ghid rapid",
      description:
        "Pastreaza instructiunile la indemana si urmeaza autoritatile cand informatiile oficiale difera.",
    },
    source: {
      title: "Sursa datelor",
      reviewed: "Date adaposturi vendorizate",
      official: "Sursa oficiala IGSU",
      repository: "Set JSON de referinta",
      disclaimer:
        "Datele pot deveni depasite. In teren, indicatiile 112, RO-Alert, DSU, IGSU si ale echipelor de interventie au prioritate.",
    },
  },
  navigation: {
    status: "Stare",
    shelter: "Adapost",
    emergency: "Urgenta",
  },
} as const;
