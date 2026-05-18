# Foodies

Foodies is a restaurant planning web app for groups of friends. Users can create an account, manage friends, create parties, set food preferences, compare taste with friends, and get restaurant recommendations for a selected location. The app is designed around helping a group agree on where to eat.

This project was built as a group project for the University at Buffalo CSE 442 course. This repository represents the first version of the app, so some workflows and setup steps are still oriented toward local development and class-project deployment.

## Features

- User signup, login, logout, and profile settings
- Friend requests and friend lists
- Party creation and party member management
- Session preferences for cuisine, dietary restrictions, price, time, and location
- Google Maps / Places powered restaurant recommendations
- Visited restaurant tracking and ratings
- Shared taste comparison between friends
- Finalized restaurant plans for a party

## Tech Stack

- Frontend: React, Vite, React Router, CSS
- Backend: PHP
- Database: MySQL
- Local development: XAMPP on Windows
- External APIs: Google Maps JavaScript API and Google Places APIs

## Project Structure

- `frontend-poc/`: React/Vite frontend app
- `src/`: PHP backend endpoints
- `src/config.example.php`: example backend config for local secrets
- `frontend-poc/.env.example`: example frontend environment file
- `tests/`: Postman collections and test overrides
- `XAMPP_SETUP.md`: extra local setup notes

## Requirements

- XAMPP with Apache and MySQL
- Node.js and npm
- A Google Maps API key with the needed Maps / Places APIs enabled

## Running the App Locally

### 1. Put the project under XAMPP

This project expects to be served from:

```text
C:\xampp\htdocs\foodies
```

Copy or clone this repository to that path.

### 2. Start XAMPP

Open the XAMPP Control Panel and start:

- Apache
- MySQL

### 3. Configure backend secrets

Copy the example PHP config:

```text
src/config.example.php -> src/config.php
```

Then edit `src/config.php` with your local values. For a default XAMPP setup, the database values can stay as:

```php
define('FOODIES_DB_HOST', 'localhost');
define('FOODIES_DB_USER', 'root');
define('FOODIES_DB_PASS', '');
define('FOODIES_DB_NAME', 'foodies_test');
```

Set `GOOGLE_API_KEY` to your own Google API key.

`src/config.php` is ignored by git so real credentials do not get committed.

### 4. Configure frontend secrets

From `frontend-poc/`, copy:

```text
.env.example -> .env.local
```

Then set:

```text
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Browser-delivered Maps JavaScript keys are visible to users by design, so restrict this key in Google Cloud by HTTP referrer and API scope.

### 5. Create the local database

Open this URL in your browser:

```text
http://localhost/foodies/src/db_setup.php
```

This creates the local `foodies_test` database and a test user.

### 6. Run the frontend in development mode

Open a terminal:

```bash
cd C:\xampp\htdocs\foodies\frontend-poc
npm install
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173
```

The Vite dev server proxies backend requests to the PHP endpoints served by XAMPP.

## Backend-Only Check

You can verify the PHP backend directly at:

```text
http://localhost/foodies/src/test_login.html
```

The local setup script creates a test account:

```text
username: testuser
password: password123
```

These credentials are for local development only.

## Production / Public Repo Notes

- Do not commit `src/config.php`, `.env`, `.env.local`, or uploaded files.
- Rotate any API keys or database passwords that were ever committed before this public version.
- Restrict Google API keys in Google Cloud.
- For deployment, prefer server environment variables over `src/config.php`.

## Status

This is version 1 of Foodies. The app is functional as a class-project prototype, but future versions may improve deployment, production hardening, UI polish, and recommendation quality.
