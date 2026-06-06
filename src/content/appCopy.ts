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
    chooseCounty: "Alege judetul",
    chooseTown: "Alege localitatea",
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
      status: "GPS sau cautare manuala",
      description:
        "Activeaza GPS cand este sigur sa folosesti telefonul sau alege manual judetul si localitatea din datele salvate offline.",
      fallback: "Recomandarea foloseste ultima pozitie valida sau centrul adaposturilor din localitatea aleasa manual.",
      sourceLabels: {
        gps: "GPS activ",
        cache: "Ultima pozitie salvata",
        manual: "Localitate aleasa manual",
        none: "Fara pozitie disponibila",
      },
      permissionLabels: {
        idle: "GPS oprit",
        loading: "Se cauta pozitia",
        ready: "Pozitie disponibila",
        denied: "Permisiune refuzata",
        unavailable: "GPS indisponibil",
        error: "Eroare GPS",
        stale: "Pozitie salvata expirata",
      },
      accuracy: "Acuratete estimata",
      noAccuracy: "Acuratete necunoscuta",
      manualCountyPlaceholder: "Selecteaza judetul",
      manualTownPlaceholder: "Selecteaza localitatea",
      manualSelection: "Selectie manuala",
    },
    shelter: {
      title: "Adapost recomandat",
      status: "Recomandare calculata local",
      description:
        "Recomandarea favorizeaza cel mai apropiat adapost functional si marcheaza explicit adaposturile nefunctionale.",
      listTitle: "Lista apropiata",
      listPlaceholder: "Activeaza GPS sau alege manual o localitate pentru a vedea adaposturi apropiate.",
      capacityUnknown: "capacitate necunoscuta",
      capacityPeople: "persoane",
      primaryLabel: "Recomandare principala",
      nearestLabel: "Alte adaposturi apropiate",
      statusLabels: {
        functional: "functional",
        partial: "partial",
        unknown: "status necunoscut",
        nonfunctional: "nefunctional",
      },
      typeLabels: {
        public: "public",
        private: "privat",
        unknown: "tip necunoscut",
      },
      fields: {
        distance: "Distanta",
        town: "Localitate",
        capacity: "Capacitate",
        access: "Acces",
      },
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
