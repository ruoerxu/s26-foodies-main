# XAMPP Setup (Windows)

This project expects to be served from:

`C:\xampp\htdocs\foodies`

## 1. Copy files into `htdocs`

Copy this repo to:

`C:\xampp\htdocs\foodies`

You should have at least:

- `C:\xampp\htdocs\foodies\src\login.php`
- `C:\xampp\htdocs\foodies\src\logout.php`
- `C:\xampp\htdocs\foodies\src\connect.php`
- `C:\xampp\htdocs\foodies\src\users_json.php`
- `C:\xampp\htdocs\foodies\src\db_setup.php`
- `C:\xampp\htdocs\foodies\src\test_login.html`
- `C:\xampp\htdocs\foodies\frontend-poc\...`

## 2. Start XAMPP services

In XAMPP Control Panel, start:

- Apache
- MySQL

## 3. Create DB and test user

Open:

`http://localhost/foodies/src/db_setup.php`

This creates:

- database: `foodies_test`
- table: `users`
- test login: `testuser` / `password123`

## 4. Verify backend quickly

Open:

`http://localhost/foodies/src/test_login.html`

Submit with:

- username: `testuser`
- password: `password123`

Expected: successful JSON response.

## 5. Frontend (optional)

If you build the React app, serve the build under `/foodies/` and keep `src/` at the same level so requests to `/foodies/src/login.php` work.

Dev note:

- `src/connect.php` uses XAMPP defaults (`localhost`, `root`, empty password, `foodies_test`).
- For local secrets, copy `src/config.example.php` to ignored `src/config.php` and fill in real values.
- For deployed environments, set secrets with Apache/server env vars:
  - `FOODIES_DB_HOST`
  - `FOODIES_DB_USER`
  - `FOODIES_DB_PASS`
  - `FOODIES_DB_NAME`
  - `GOOGLE_API_KEY`
- For the Vite frontend map page, copy `frontend-poc/.env.example` to `frontend-poc/.env.local` and set `VITE_GOOGLE_MAPS_API_KEY`.
  Browser-delivered Maps JavaScript keys are public by design, so restrict this key in Google Cloud by HTTP referrer and API scope.
