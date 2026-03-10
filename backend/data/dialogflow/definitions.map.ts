// data/dialogflow/definitions.map.ts

// Przechowuje definicje dla intencji DefinicjaTerminu
export const definitionsMap = {
  // === Podstawy (od użytkownika) ===
  'tdee': "TDEE (Total Daily Energy Expenditure) to Twoje Całkowite Dzienne Zapotrzebowanie Energetyczne. Mówiąc prościej, jest to liczba kalorii, którą spalasz w ciągu całego dnia.",
  'progresywne przeciążenie': "Progresywne przeciążenie to fundamentalna zasada treningu. Oznacza, że musisz stopniowo zwiększać obciążenie dla swoich mięśni (np. przez większy ciężar lub więcej powtórzeń), aby zmusić je do adaptacji i wzrostu.",
  'hipertrofia': "Hipertrofia to naukowy termin na rozrost mięśni. To cel większości treningów siłowych, polegający na zwiększaniu rozmiaru włókien mięśniowych.",
  'rir': "RIR to 'Reps in Reserve', czyli 'powtórzenia w zapasie'. Jest to nowoczesny sposób na mierzenie intensywności serii. Np. 'RIR 2' oznacza, że zakończyłeś serię, czując, że miałeś siłę zrobić jeszcze maksymalnie 2 poprawne powtórzenia.",
  'fbw': "FBW to 'Full Body Workout', czyli trening całego ciała na jednej sesji. To świetna metoda dla początkujących lub osób, które mogą trenować tylko 2-3 razy w tygodniu.",
  'ppl': "PPL to popularny system treningowy 'Push, Pull, Legs' (Pchaj, Ciągnij, Nogi). Dzień 'Push' to ćwiczenia pchające (klatka, barki, triceps). Dzień 'Pull' to przyciągające (plecy, biceps). Dzień 'Legs' to nogi.",

  // === Odżywianie i Dieta ===
  'bmr': "BMR (Basal Metabolic Rate) to Podstawowa Przemiana Materii. To minimalna liczba kalorii, którą Twoje ciało spala w spoczynku, aby podtrzymać funkcje życiowe jak oddychanie czy bicie serca.",
  'makro': "Makro (lub 'makroskładniki') to trzy główne składniki odżywcze: białka, tłuszcze i węglowodany. Zarządzanie ich proporcjami jest kluczowe w diecie.",
  'redukcja': "Redukcja to okres, w którym celem jest utrata tkanki tłuszczowej. Osiąga się to przez utrzymywanie deficytu kalorycznego, czyli jedzenie mniejszej liczby kalorii, niż się spala.",
  'masa': "Masa (lub 'budowanie masy') to okres, w którym celem jest zwiększenie masy mięśniowej. Wymaga to zazwyczaj nadwyżki kalorycznej, czyli jedzenia więcej kalorii, niż się spala.",
  'rekompozycja': "Rekompozycja to proces jednoczesnej utraty tkanki tłuszczowej i budowania masy mięśniowej. Jest najbardziej efektywna u osób początkujących lub wracających do treningów po przerwie.",
  'deficyt kaloryczny': "Deficyt kaloryczny to stan, w którym spożywasz mniej kalorii niż Twoje TDEE (całkowite zapotrzebowanie). Jest to niezbędne do rozpoczęcia procesu odchudzania.",
  'nadwyżka kaloryczna': "Nadwyżka kaloryczna (lub 'sufit kaloryczny') to stan, w którym spożywasz więcej kalorii niż Twoje TDEE. Jest to niezbędne do efektywnego budowania masy mięśniowej.",
  'iifym': "IIFYM to skrót od 'If It Fits Your Macros' (Jeśli mieści się w Twoich makro). To elastyczne podejście do diety, które skupia się na trafianiu w dzienne cele makroskładników, zamiast rygorystycznego trzymania się 'czystych' produktów.",
  
  // === Zasady i Metody Treningowe ===
  'objętość': "Objętość treningowa to łączna 'praca' wykonana na treningu. Zazwyczaj liczy się ją jako iloczyn serii, powtórzeń i ciężaru (tonaż) lub po prostu sumę serii roboczych na daną partię mięśniową w skali tygodnia.",
  'intensywność': "Intensywność w treningu siłowym najczęściej odnosi się do procenta Twojego ciężaru maksymalnego (1RM). Im bliżej 1RM, tym wyższa intensywność. Może być też mierzona przez RIR lub RPE.",
  'częstotliwość': "Częstotliwość (lub 'frekwencja') to informacja, ile razy w tygodniu trenujesz daną partię mięśniową. Np. w treningu FBW częstotliwość dla każdej partii wynosi zazwyczaj 3.",
  'rpe': "RPE (Rate of Perceived Exertion) to 'Skala Odczuwanego Wysiłku', zazwyczaj w skali 1-10. RPE 9 oznacza, że seria była bardzo ciężka i został Ci w zapasie 1 powtórzenie (odpowiednik RIR 1).",
  'rom': "ROM (Range of Motion) to 'zakres ruchu'. Pełny ROM oznacza wykonanie ćwiczenia w pełnym, kontrolowanym zakresie ruchu, co jest kluczowe dla hipertrofii i zdrowia stawów.",
  'tut': "TUT (Time Under Tension) to 'czas pod napięciem'. Odnosi się do czasu, przez jaki mięsień jest aktywnie obciążony podczas serii. Wydłużanie fazy ekscentrycznej (opuszczania) zwiększa TUT.",
  'deload': "Deload to zaplanowany tydzień lżejszych treningów (z mniejszą objętością lub intensywnością). Pomaga w regeneracji układu nerwowego i zapobiega przetrenowaniu.",
  'split': "Split to plan treningowy, który dzieli treningi według partii mięśniowych (np. poniedziałek: klatka i triceps, wtorek: plecy i biceps). Popularny wśród średniozaawansowanych i zaawansowanych.",
  'upper/lower': "Upper/Lower to podział treningowy na 'Górę' i 'Dół' ciała. Zazwyczaj trenuje się 4 razy w tygodniu (Góra, Dół, Wolne, Góra, Dół), co pozwala na dobrą częstotliwość dla każdej partii.",
  'superseria': "Superseria to metoda polegająca na wykonaniu dwóch ćwiczeń (zazwyczaj na przeciwstawne grupy mięśniowe, np. biceps i triceps) jedno po drugim, bez przerwy lub z minimalną przerwą.",
  'seria łączona': "Seria łączona (Compound Set) to wykonanie dwóch ćwiczeń na tę samą grupę mięśniową jedno po drugim, bez przerwy (np. wyciskanie sztangi i rozpiętki na klatkę).",
  'dropset': "Dropset (lub 'seria zrzucana') to zaawansowana technika. Wykonujesz serię do upadku mięśniowego, natychmiast zmniejszasz ciężar o 20-30% i kontynuujesz serię do kolejnego upadku.",

  // === Fizjologia i Slang ===
  'doms': "DOMS (Delayed Onset Muscle Soreness), potocznie 'zakwasy', to opóźniona bolesność mięśni. Pojawia się 24-72 godziny po intensywnym treningu i jest normalną częścią adaptacji, a nie efektem kwasu mlekowego.",
  '1rm': "1RM (One-Rep Max) to Twój maksymalny ciężar, który jesteś w stanie podnieść poprawnie technicznie jeden raz. Służy do mierzenia siły maksymalnej i programowania treningu.",
  'pr': "PR (Personal Record) to Twój osobisty rekord w danym ćwiczeniu, np. najwięcej podniesionego ciężaru lub najwięcej powtórzeń z określonym ciężarem.",
  'regeneracja': "Regeneracja to kluczowy element postępu. Obejmuje procesy naprawcze w organizmie po treningu. Najważniejsze jej elementy to sen, odpowiednia dieta i nawodnienie.",
  'faza ekscentryczna': "Faza ekscentryczna (negatywna) to moment, w którym mięsień się wydłuża pod obciążeniem (np. opuszczanie sztangi do klatki). Jest kluczowa dla budowania siły i hipertrofii.",
  'faza koncentryczna': "Faza koncentryczna (pozytywna) to moment, w którym mięsień się skraca, pokonując opór (np. wyciskanie sztangi w górę).",
  'pompa mięśniowa': "Pompa mięśniowa to uczucie 'napompowania' i twardości mięśni podczas treningu. Jest to efekt zwiększonego napływu krwi (i płynów) do pracujących mięśni.",
  'asekuracja': "Asekuracja (spotting) to pomoc partnera treningowego, szczególnie podczas ciężkich serii (np. przy wyciskaniu leżąc), aby zapewnić bezpieczeństwo i pomóc dokończyć ostatnie powtórzenia.",

  // === Suplementacja ===
  'kreatyna': "Kreatyna to jeden z najlepiej przebadanych i najskuteczniejszych suplementów. Zwiększa siłę i wytrzymałość mięśni poprzez magazynowanie energii (ATP) w komórkach. Pomaga w budowaniu masy.",
  'białko serwatkowe': "Białko serwatkowe (Whey Protein) to popularna odżywka, która szybko dostarcza aminokwasów do budowy i regeneracji mięśni. Jest to wygodny sposób na uzupełnienie białka w diecie, zazwyczaj po treningu.",
  'kazeina': "Kazeina to białko wolnowchłanialne, również pochodzące z mleka. Zapewnia stały dopływ aminokwasów przez wiele godzin, dlatego często jest spożywana przed snem.",
  'bcaa': "BCAA (Branched-Chain Amino Acids) to aminokwasy rozgałęzione (leucyna, izoleucyna, walina). Kiedyś popularne, obecnie uważa się, że jeśli spożywasz wystarczającą ilość białka (np. z odżywki serwatkowej), dodatkowa suplementacja BCAA nie jest konieczna.",
  'przedtreningówka': "Przedtreningówka (Pre-workout) to suplement zażywany przed treningiem. Zazwyczaj zawiera kofeinę (na energię), beta-alaninę (powoduje mrowienie, opóźnia zmęczenie) i cytrulinę (na pompę mięśniową).",
};