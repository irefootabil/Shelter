export const appCopy = {
  productLabel: "Adapost Urgenta Romania",
  title: "Gaseste rapid un adapost apropiat",
  subtitle:
    "Interfata este gandita pentru telefon, lumina slaba si momente in care reteaua poate cadea.",
  actions: {
    findShelter: "Cauta adapost",
    emergencyGuide: "Instructiuni",
    installApp: "Instaleaza aplicatia",
    enableLocation: "Activeaza GPS",
    enableCompass: "Activeaza busola",
    manualSearch: "Cauta manual",
    chooseCounty: "Alege judetul",
    chooseTown: "Alege localitatea",
    call112: "Suna 112",
    sms113: "SMS 113",
  },
  status: {
    title: "Starea aplicatiei",
    labels: {
      offline: "Offline",
      manual: "Manual",
      private: "Privat",
    },
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
    install: {
      title: "Instalare si offline",
      status: "Pregatire inainte de urgenta",
      description:
        "Deschide aplicatia online cel putin o data, apoi instaleaz-o din meniul browserului pentru acces rapid de pe ecranul telefonului.",
      steps: [
        "Verifica aceasta pagina cand ai internet pentru ca datele si interfata sa fie salvate pe dispozitiv.",
        "Pe Android foloseste Instalare aplicatie sau Adauga pe ecranul principal. Pe iPhone foloseste Partajare, apoi Adauga pe ecranul principal.",
        "Testeaza o reincarcare fara internet si cautarea manuala dupa judet si localitate.",
      ],
      caveat:
        "Daca ai sters datele browserului sau ai instalat pe un telefon nou, incarca din nou aplicatia online inainte sa te bazezi pe modul offline.",
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
    compass: {
      title: "Directie catre adapost",
      status: "Busola telefonului",
      directionPrefix: "Mergi aproximativ spre",
      headingPrefix: "Telefonul indica",
      headingUnavailable: "Busola telefonului nu este disponibila acum.",
      secondaryAid:
        "Foloseste directia ca ajutor secundar. Adresa adapostului si instructiunile autoritatilor raman prioritare.",
      fields: {
        compass: "Stare busola",
      },
      cardinalLabels: {
        N: "nord",
        NE: "nord-est",
        E: "est",
        SE: "sud-est",
        S: "sud",
        SW: "sud-vest",
        W: "vest",
        NW: "nord-vest",
      },
      statusLabels: {
        idle: "busola oprita",
        listening: "se asteapta orientarea telefonului",
        ready: "busola disponibila",
        readyCalibrated: "busola calibrata",
        "permission-required": "permisiune necesara",
        denied: "permisiune refuzata",
        unavailable: "busola indisponibila",
        error: "eroare busola",
        needsCalibration: "calibrare recomandata",
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
    primaryLabel: "Navigare principala",
    status: "Stare",
    install: "Offline",
    shelter: "Adapost",
    emergency: "Urgenta",
  },
  accessibility: {
    primaryActions: "Actiuni principale",
  },
} as const;
