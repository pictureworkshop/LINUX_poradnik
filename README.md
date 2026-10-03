# Ściąga Linux (PWA)

Samouczek i ściąga komend dla CachyOS i Linux Mint. Działa offline po pierwszym otwarciu.

- `src/` – treść (`data.js`), wygląd (`app.css`), logika (`app.js`), układ (`body.html`)
- `python3 build.py` – składa wszystko do `docs/` (gotowa PWA, serwowana przez GitHub Pages) i `artifact/`
- `docs/` – gotowa strona; GitHub Pages publikuje ją z tego folderu

## Uruchomienie lokalnie

    python3 -m http.server 8000 --directory docs

Otwórz http://localhost:8000 i kliknij ikonę instalacji w pasku adresu (Chrome/Edge/Brave).

## Żeby mieć ją na telefonie i każdym komputerze

PWA musi być pod adresem https. Najprościej za darmo:

- **Netlify Drop**: wejdź na app.netlify.com/drop i przeciągnij folder `docs`.
- **GitHub Pages**: Settings → Pages → branch main, folder /docs.

Potem na telefonie: Chrome → menu ⋮ → „Dodaj do ekranu głównego” (Android) lub Safari → Udostępnij → „Do ekranu początkowego” (iPhone).

Po zmianie treści podbij `VERSION` w `build.py`, żeby zainstalowane kopie pobrały nową wersję.
