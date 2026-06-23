# Dokument wymagań produktu (PRD) - Lexio

## 1. Przegląd produktu

Lexio to osobisty system nauki słownictwa angielskiego zbudowany wokół własnego kontekstu użytkownika. Składa się z trzech warstw: rozszerzenia przeglądarki Chrome (punkt przechwycenia), backendu Node.js hostowanego na Railway (silnik systemu), oraz mobilnej PWA (sesje powtórek).

Stack technologiczny backendu:

- Runtime: Node.js + TypeScript (tsx do uruchamiania, tsc do budowania)
- Framework HTTP: Hono z adapterem @hono/node-server
- Baza danych: SQLite via better-sqlite3 (plik lokalny, zero konfiguracji infrastruktury)
- ORM: Drizzle ORM + drizzle-kit do migracji schematu
- Walidacja danych: Zod
- AI: OpenAI SDK (openai) jako główny klient; @google/genai jako alternatywa/fallback
- Observability: Langfuse (@langfuse/tracing, @langfuse/otel) + OpenTelemetry SDK do tracingu wywołań AI
- Linter/formatter: Biome (zastępuje ESLint + Prettier)
- MCP: @modelcontextprotocol/sdk + @modelcontextprotocol/ext-apps (opcjonalne, Warstwa 3)

Główna pętla produktu: użytkownik zaznacza nieznane słowo podczas czytania artykułu technicznego → system w tle zapisuje słowo z kontekstem zdaniowym i generuje ćwiczenie przez AI → popup prezentuje gotowe ćwiczenie → użytkownik odpowiada i dostaje feedback → słowo trafia do harmonogramu powtórek → PWA umożliwia sesje powtórek w wolnej chwili.

Produkt jest budowany metodą "scratch your own itch" — najpierw jako narzędzie dla jednego użytkownika (senior frontend developer, zaawansowany angielski pasywny), po walidacji potencjalnie rozwijany do szerszego produktu.

Strategia warstwowa:

- Warstwa 0: extension → backend → SQLite (samo capture, bez AI)
- Warstwa 1: AI generuje ćwiczenie + popup + ocena odpowiedzi (MVP)
- Warstwa 2: PWA z powtórkami + podświetlanie zapisanych słów na stronach
- Warstwa 3: profil użytkownika + pełna personalizacja

Niniejszy PRD obejmuje Warstwy 0 i 1 jako definicję MVP.

---

## 2. Problem użytkownika

Użytkownik regularnie napotyka nieznane lub niepewne słowa podczas czytania anglojęzycznych artykułów technicznych, dokumentacji oraz oglądania materiałów na YouTube. Obecne zachowanie:

- około 50% napotkanych słów jest ignorowanych w trakcie czytania
- około 50% jest sprawdzanych w słowniku i zapominanych w ciągu godzin
- mniej niż 1% jest aktywnie zapisywanych i powtarzanych

Przyczyny:

- brak aktywnego przetwarzania słowa w momencie napotkania (pasywne czytanie nie buduje retencji)
- wysoki koszt przechwycenia (przejście do Anki, Notion lub innego narzędzia przerywa flow czytania)
- słowa są zapamiętywane bez kontekstu, co utrudnia ich późniejsze użycie
- brak systemu wymuszającego powrót do napotkanych słów w odpowiednim momencie

Efekt: po latach regularnej ekspozycji na angielski techniczny zasób słownika użytkownika rośnie wolno, użytkownik nie jest pewny użycia wielu słów w mowie i piśmie.

---

## 3. Wymagania funkcjonalne

### 3.1 Browser Extension (Chrome, Manifest V3)

- Nasłuchiwanie zdarzenia zaznaczenia tekstu na stronach internetowych
- Przechwycenie zaznaczonego słowa wraz z pełnym zdaniem kontekstowym, URL strony, tytułem strony/artykułu oraz datą i godziną
- Wysłanie przechwyconych danych do backendu przez REST API (autentykacja przez statyczny token API osadzony w extension)
- Wyświetlenie popupu (content script) z gotowym ćwiczeniem po otrzymaniu odpowiedzi z backendu
- Obsługa dwóch formatów ćwiczeń w popupie: uzupełnianie luki w zdaniu (fill-in-the-blank) oraz napisanie własnego zdania z danym słowem
- Przyjęcie odpowiedzi użytkownika i wysłanie jej do backendu w celu oceny przez AI
- Wyświetlenie feedbacku od AI (poprawność, komentarz, ewentualna korekta) w tym samym popupie
- Możliwość odrzucenia/zamknięcia popupu bez wykonania ćwiczenia (słowo i tak zostaje zapisane)
- Obsługa stanu ładowania (ćwiczenie jest generowane asynchronicznie — extension polling lub websocket)

### 3.2 Backend (Node.js + Hono + SQLite + Railway)

- REST API zbudowane na frameworku Hono (@hono/node-server) — lekki, typowany router z wbudowaną walidacją przez middleware
- Schemat bazy danych definiowany przez Drizzle ORM; migracje generowane przez drizzle-kit
- SQLite via better-sqlite3 jako baza danych (plik na dysku, synchroniczny dostęp, zero konfiguracji)
- Walidacja requestów i odpowiedzi przez Zod — schematy współdzielone między endpointami
- REST API endpoint przyjmujący nowe słowo z kontekstem (POST /words)
- Natychmiastowe zapisanie słowa i kontekstu do bazy danych
- Asynchroniczne wywołanie AI API w celu wygenerowania ćwiczenia dla zapisanego słowa
- Zapis wygenerowanego ćwiczenia do bazy danych (powiązanie z rekordem słowa)
- REST API endpoint zwracający gotowe ćwiczenie dla słowa (GET /words/:id/exercise)
- REST API endpoint przyjmujący odpowiedź użytkownika na ćwiczenie (POST /exercises/:id/attempts)
- Ocena odpowiedzi przez AI (wywołanie AI API z odpowiedzią użytkownika i oczekiwanym kontekstem)
- Zapis wyniku próby (ExerciseAttempt) do bazy danych
- Obliczenie daty następnej powtórki na podstawie algorytmu spaced repetition (SM-2 lub odpowiednik)
- REST API endpoint zwracający listę słów do powtórki na dany dzień (GET /review/due)
- REST API endpoint zwracający historię słów użytkownika (GET /words)
- Autentykacja wszystkich endpointów przez token API (Bearer token w nagłówku, middleware Hono)
- Tracing wszystkich wywołań AI przez Langfuse (latencja, tokeny, prompt/completion) via OpenTelemetry

### 3.3 Model danych

Word:
- id, created_at, word (tekst słowa), status (new / learning / mastered)

WordContext:
- id, word_id, sentence (zdanie źródłowe), source_url, source_title, captured_at

Exercise:
- id, word_id, type (fill_in_blank / write_sentence), prompt (treść ćwiczenia), expected_answer (wzorcowa odpowiedź), generated_at

ExerciseAttempt:
- id, exercise_id, user_answer, ai_feedback, is_correct, answered_at, next_review_at

### 3.4 PWA Mobile (Warstwa 2, poza zakresem MVP)

- Widok sesji powtórek (słowa z zaplanowaną datą powtórki <= dziś)
- Wykonanie ćwiczenia (te same formaty co w extension)
- Widok historii zapisanych słów z filtrowaniem po statusie
- Widok statystyk (liczba słów w kolekcji, % opanowanych, streak dzienny)

### 3.5 Generowanie ćwiczeń przez AI

- Główny klient AI: OpenAI SDK (modele z rodziny GPT-4o); @google/genai jako alternatywa/fallback
- Format A — uzupełnianie luki: AI generuje zdanie z luką w miejscu docelowego słowa, ćwiczenie wymaga wpisania właściwego słowa lub jego formy
- Format B — własne zdanie: AI prosi użytkownika o napisanie zdania używającego danego słowa w sensownym kontekście
- Treść ćwiczeń nawiązuje do domeny technicznej (frontend, AI, programowanie) gdy to możliwe
- Zdanie źródłowe z WordContext jest materiałem wejściowym dla AI przy generowaniu
- Ocena odpowiedzi przez AI zwraca: flagę poprawności (boolean), krótki feedback tekstowy, ewentualną sugestię poprawki
- Każde wywołanie AI jest instrumentowane przez Langfuse (tracing, latencja, liczba tokenów, treść promptu i odpowiedzi) — logi dostępne w dashboardzie Langfuse

---

## 4. Granice produktu

### W zakresie MVP (Warstwa 0 + 1):

- Chrome jako jedyna obsługiwana przeglądarka
- Artykuły tekstowe jako jedyne obsługiwane źródło (strony internetowe z zaznaczalnym tekstem)
- Jeden użytkownik (brak systemu rejestracji, brak multi-user)
- Statyczny token API jako jedyna metoda autentykacji
- Dwa formaty ćwiczeń: fill-in-the-blank i write-sentence
- Angielski jako jedyny obsługiwany język

### Poza zakresem MVP:

- YouTube i przechwytywanie słów z napisów wideo
- PWA mobile z sesjami powtórek (Warstwa 2)
- Podświetlanie wcześniej zapisanych słów podczas przeglądania stron (Warstwa 2)
- Profil użytkownika i pełna personalizacja ćwiczeń (Warstwa 3)
- System rejestracji i logowania (Warstwa 3)
- Obsługa wielu języków
- Firefox, Safari lub inne przeglądarki
- Format ćwiczenia z grafiką/skojarzeniami wizualnymi
- Eksport danych do Anki lub innych systemów
- Tryb offline

---

## 5. Historyjki użytkowników

### Przechwycenie słowa (Extension)

US-001
Tytuł: Przechwycenie słowa podczas czytania artykułu
Opis: Jako użytkownik czytający artykuł techniczny w Chrome, chcę zaznaczyć nieznane słowo i automatycznie wywołać zapis, aby nie przerywać czytania i nie tracić kontekstu słowa.
Kryteria akceptacji:
- Po zaznaczeniu słowa pojawia się przycisk/trigger (bez dodatkowych kliknięć interfejsu) inicjujący zapis
- System przechwytuje: zaznaczone słowo, pełne zdanie w którym wystąpiło, URL strony, tytuł strony, datę i godzinę
- Dane są wysyłane do backendu w ciągu 1 sekundy od zaznaczenia
- Użytkownik widzi wizualne potwierdzenie że słowo zostało zapisane

US-002
Tytuł: Wyświetlenie ćwiczenia w popupie po zaznaczeniu słowa
Opis: Jako użytkownik, który zaznaczył słowo, chcę zobaczyć gotowe ćwiczenie w ciągu maksymalnie 3 sekund, aby móc aktywnie przetworzyć słowo nie wychodząc ze strony.
Kryteria akceptacji:
- Popup pojawia się w pobliżu zaznaczonego tekstu
- Popup zawiera zaznaczone słowo, zdanie źródłowe lub ćwiczenie oparte na nim, pole do wpisania odpowiedzi
- Czas od zaznaczenia do wyświetlenia popupu z ćwiczeniem wynosi maksymalnie 3 sekundy
- Gdy ćwiczenie nie jest jeszcze gotowe, popup pokazuje stan ładowania

US-003
Tytuł: Odpowiedź na ćwiczenie fill-in-the-blank w popupie
Opis: Jako użytkownik, chcę wypełnić lukę w zdaniu wpisując właściwe słowo, aby aktywnie utrwalić jego formę i użycie.
Kryteria akceptacji:
- Popup wyświetla zdanie z luką w miejscu docelowego słowa
- Użytkownik może wpisać odpowiedź w polu tekstowym
- Po zatwierdzeniu odpowiedzi system zwraca feedback AI (poprawne/niepoprawne + komentarz)
- Feedback pojawia się w ciągu 3 sekund od wysłania odpowiedzi
- Użytkownik widzi wzorcową odpowiedź niezależnie od tego czy jego odpowiedź była poprawna

US-004
Tytuł: Odpowiedź na ćwiczenie write-sentence w popupie
Opis: Jako użytkownik, chcę napisać własne zdanie używające danego słowa, aby utrwalić je przez aktywną produkcję.
Kryteria akceptacji:
- Popup wyświetla polecenie napisania zdania z danym słowem
- Użytkownik może wpisać zdanie w polu tekstowym
- AI ocenia poprawność użycia słowa w kontekście (nie gramatykę jako całość)
- Feedback zawiera informację czy słowo zostało użyte poprawnie oraz sugestię jeśli nie
- Cały flow mieści się w jednym popupie bez przeładowania strony

US-005
Tytuł: Odrzucenie ćwiczenia bez odpowiedzi
Opis: Jako użytkownik, chcę móc zamknąć popup bez wykonania ćwiczenia, gdy jestem zbyt zajęty czytaniem, aby słowo i tak zostało zapisane do powtórki.
Kryteria akceptacji:
- Popup zawiera przycisk zamknięcia/odrzucenia
- Po zamknięciu popupu słowo pozostaje zapisane w systemie ze statusem "new"
- Słowo trafia do harmonogramu powtórek z najniższym priorytetem
- Strona wraca do normalnego stanu bez żadnych artefaktów wizualnych

US-006
Tytuł: Zduplikowane słowo — obsługa ponownego zaznaczenia
Opis: Jako użytkownik, chcę żeby system poinformował mnie gdy zaznaczam słowo które już mam w kolekcji, aby nie tracić czasu na powtórne ćwiczenie tego samego słowa.
Kryteria akceptacji:
- System wykrywa duplikaty (to samo słowo, case-insensitive)
- Popup dla duplikatu pokazuje status słowa ("już znasz to słowo" / "to słowo jest w trakcie nauki")
- Użytkownik może mimo to wykonać ćwiczenie lub zamknąć popup
- Nowy kontekst zdaniowy jest zawsze zapisywany niezależnie od duplikatu

### Autentykacja i bezpieczeństwo

US-007
Tytuł: Autentykacja extension z backendem przez token API
Opis: Jako użytkownik, chcę żeby moje słowa były wysyłane tylko do mojego backendu i nie były dostępne bez autoryzacji, aby moje dane były bezpieczne.
Kryteria akceptacji:
- Extension wysyła token API w nagłówku Authorization każdego requestu
- Backend odrzuca requesty bez prawidłowego tokenu z kodem 401
- Token jest skonfigurowany raz podczas instalacji extension (nie wpisywany przy każdym użyciu)
- Token nie jest widoczny w logach ani w UI extension

### Backend i przetwarzanie danych

US-008
Tytuł: Asynchroniczne generowanie ćwiczenia po zapisie słowa
Opis: Jako system, chcę generować ćwiczenie przez AI zaraz po zapisie słowa (nie w momencie otwarcia popupu), aby użytkownik nie czekał na AI w trakcie czytania.
Kryteria akceptacji:
- Po zapisaniu Word i WordContext backend natychmiast wywołuje AI API asynchronicznie
- Wygenerowane ćwiczenie jest zapisane w tabeli Exercise powiązanej z Word
- Extension może odpytywać backend o status ćwiczenia (polling lub endpoint statusu)
- Jeśli generowanie trwa ponad 5 sekund, użytkownik jest informowany o opóźnieniu

US-009
Tytuł: Zapis wyniku próby i obliczenie daty następnej powtórki
Opis: Jako system, chcę zapisywać każdą odpowiedź użytkownika i planować datę następnej powtórki, aby algorytm spaced repetition działał poprawnie.
Kryteria akceptacji:
- Każda odpowiedź użytkownika tworzy rekord ExerciseAttempt z: treścią odpowiedzi, wynikiem AI (poprawna/niepoprawna), feedbackiem, datą odpowiedzi
- Na podstawie wyniku obliczana jest data next_review_at (poprawna odpowiedź: interval rośnie; niepoprawna: reset do 1 dnia)
- Status słowa (Word.status) jest aktualizowany na podstawie historii prób
- Słowo osiąga status "mastered" po co najmniej 3 poprawnych powtórkach w rosnących interwałach

US-010
Tytuł: Pobranie listy słów do powtórki
Opis: Jako użytkownik (lub PWA), chcę pobrać listę słów których data powtórki minęła lub jest na dziś, aby wiedzieć co powinienem dziś powtórzyć.
Kryteria akceptacji:
- Endpoint GET /review/due zwraca słowa gdzie next_review_at <= teraz
- Odpowiedź zawiera dla każdego słowa: treść słowa, status, ostatni kontekst zdaniowy, typ ćwiczenia
- Lista jest sortowana od najdłużej zaległych do najnowszych
- Endpoint wymaga autentykacji tokenem API

### Historia i przegląd kolekcji

US-011
Tytuł: Przeglądanie historii zapisanych słów
Opis: Jako użytkownik, chcę zobaczyć wszystkie słowa które zapisałem, aby mieć wgląd w rozmiar i postęp mojej kolekcji.
Kryteria akceptacji:
- Endpoint GET /words zwraca listę wszystkich słów użytkownika
- Każde słowo ma: treść, status, datę dodania, liczbę prób, datę następnej powtórki
- Lista może być filtrowana po statusie (new / learning / mastered)
- Endpoint wymaga autentykacji tokenem API

US-012
Tytuł: Podgląd szczegółów słowa z kontekstem i historią prób
Opis: Jako użytkownik, chcę zobaczyć skąd pochodzi dane słowo i jak mi szło przy poprzednich powtórkach, aby lepiej rozumieć postęp nauki.
Kryteria akceptacji:
- Endpoint GET /words/:id zwraca pełne dane słowa
- Odpowiedź zawiera: wszystkie WordContext (zdania, źródła), historię ExerciseAttempt z wynikami i feedbackiem
- Data i URL źródła są widoczne dla każdego kontekstu
- Endpoint wymaga autentykacji tokenem API

### Obsługa błędów i edge case'y

US-013
Tytuł: Obsługa błędu AI API przy generowaniu ćwiczenia
Opis: Jako użytkownik, chcę żeby słowo zostało zapisane nawet gdy AI nie może wygenerować ćwiczenia, aby nie tracić przechwyconych słów z powodu błędów zewnętrznych serwisów.
Kryteria akceptacji:
- Błąd AI API nie blokuje zapisu Word i WordContext
- Backend wykonuje do 2 ponownych prób generowania w odstępach 5 sekund
- Po nieudanych próbach słowo ma status ćwiczenia "generation_failed"
- Użytkownik w popupie widzi komunikat że ćwiczenie jest niedostępne, ale słowo zostało zapisane

US-014
Tytuł: Brak połączenia z internetem podczas zaznaczania słowa
Opis: Jako użytkownik, chcę żeby extension poinformowała mnie gdy nie może połączyć się z backendem, abym wiedział że słowo nie zostało zapisane.
Kryteria akceptacji:
- Extension wykrywa brak odpowiedzi z backendu (timeout po 5 sekundach)
- Użytkownik widzi komunikat błędu w miejscu gdzie normalnie pojawia się popup
- Extension nie traci danych — opcjonalne przechowanie w local storage do ponownego wysłania
- Komunikat błędu znika po 3 sekundach bez interakcji użytkownika

US-015 — BACKLOG (moved: single-word enforcement adopted instead; phrases deferred)

---

## 6. Metryki sukcesu

### Metryki główne (Warstwa 0 + 1)

- Wskaźnik przechwycenia: liczba słów zapisanych dziennie przez extension (cel: minimum 3 dziennie po 2 tygodniach użytkowania)
- Wskaźnik ukończenia ćwiczenia: % zaznaczonych słów dla których użytkownik ukończył ćwiczenie w popupie (cel: >70%)
- Czas do ćwiczenia: mediana czasu od zaznaczenia słowa do wyświetlenia gotowego ćwiczenia (cel: <3 sekundy)

### Metryki retencji (Warstwa 2+)

- Retencja po 7 dniach: % słów z Warstwy 1 które użytkownik rozpoznaje bez podpowiedzi po 7 dniach (cel: >60%)
- Wskaźnik powrotu do powtórek: % zaplanowanych powtórek które użytkownik faktycznie wykonuje w PWA (cel: >50%)

### Metryki subiektywne (walidacja co 2 tygodnie)

- Czy użytkownik subiektywnie czuje że jego słownik aktywny rośnie (ocena 1-5, cel: >= 4 po 4 tygodniach)
- Czy użytkownik używa extension w naturalnym flow czytania bez świadomego wysiłku (tak/nie po 2 tygodniach)

### Metryki techniczne

- Dostępność backendu: uptime >= 99% w miesięcznym oknie
- Wskaźnik błędów AI API: % requestów zakończonych niepowodzeniem po 2 próbach (cel: <5%)
- Czas odpowiedzi backendu dla POST /words: p95 < 500ms (bez czasu generowania AI)

## Progress

- #6 Single-word enforcement: extension rejects multi-word selections client-side; backend returns 422 for whitespace in word field; US-015 moved to backlog