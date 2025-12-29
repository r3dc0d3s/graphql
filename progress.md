# Project Progress Log

This document details the development process of the GraphQL Profile Page project, tracking progress from initial setup to the final styled frontend.

## Phase 1: Initial Setup & Frontend Logic (JavaScript)

### 1.1. File Structure & Initial HTML
- The project started with a basic structure: `index.html`, `script.js`, `style.css`, and markdown files for requirements and auditing.
- `index.html` was populated with a basic login form containing fields for a username/email and password.
- A second `<main>` section for the profile page (`#profile-page`) was added and initially hidden with `style="display: none;"`.
- Placeholders (`<span id="...">`) were added to the profile page to allow for dynamic injection of user data (name, ID, email).

### 1.2. Core JavaScript Logic (`script.js`)
- **DOM Element Selection:** Initial code was written to get references to all necessary DOM elements (the login form, login/profile pages, buttons, and data spans) using `document.getElementById`.
- **Event Handling:**
  - An `async` event listener was attached to the `loginForm` to handle the `submit` event, preventing default page reloads.
  - An event listener was attached to the `logoutButton` to handle the `click` event.
- **State Management & UX:**
  - `localStorage` was chosen as the mechanism to store the user's JWT, allowing their login state to persist across page reloads.
  - A `checkLoginStatus()` function was implemented and is called on every page load. It checks for a JWT in `localStorage` and directs the user to the appropriate page (profile or login), ensuring a seamless experience for returning users.

### 1.3. Code Refactoring
- **DRY Principle:** It was observed that the code to show/hide the login and profile pages was being repeated in multiple places.
- **`showPage()` Function:** This repeated logic was refactored into a single, reusable `showPage(pageToShow)` helper function. This improved code readability and maintainability by creating a single source of truth for view management.
- **Code Organization:** The file was later re-organized and re-indented for consistency. Helper functions, constants, and API call logic were grouped into logical sections.

## Phase 2: Data Handling & API Integration

### 2.1. Initial Approach: Mocking Data
- To rapidly develop the frontend UI without a live API, a mocking strategy was employed.
- **Mocked Login:** The login process was initially simulated by creating a hardcoded `fakeJwt` and storing it in `localStorage`.
- **Mocked Profile Data:** A `mockedProfileData` object was created to serve as a fake data source for the user's profile information. This allowed us to build out the profile page display logic.
- **Refinement:** Following discussion, the `mockedProfileData` constant was moved to the global scope for better organization and separation from function logic.

### 2.2. Pivot to Real APIs (Based on `requirements.md`)
- After a crucial review of `requirements.md`, it was understood that a backend did **not** need to be built. The project requires consuming pre-existing platform APIs.
- **Real Authentication:** The login logic was completely rewritten to target the platform's REST endpoint (`/api/auth/signin`).
  - Implemented **HTTP Basic Authentication** by correctly base64-encoding the `username:password` string using the browser's built-in `btoa()` function.
  - The `fetch` call was updated to send a `POST` request with the correct `Authorization: Basic ...` header.
  - Robust error handling was added by checking the `response.ok` property to handle invalid login attempts.
- **Real Data Fetching (In Progress):** The `fetchAndDisplayProfile` function was updated to prepare for real API calls. It now correctly checks for the JWT and includes commented-out examples of how a real `fetch` call to the GraphQL endpoint would be structured, using `Authorization: Bearer ...`.

## Phase 3: Styling (CSS)

- The initially empty `style.css` file was built out step-by-step to create a clean, modern, and user-friendly interface.
- **Layout:**
  - **Flexbox** was used on the `<body>` to center the main content container both horizontally and vertically on the page.
  - Inside the `<form>`, `display: flex` with `flex-direction: column` and the `gap` property were used to neatly stack and space the form elements.
- **Component Styling:**
  - Form inputs (`<input>`) and labels (`<label>`) were styled for readability and aesthetics. The `box-sizing: border-box;` property was used to ensure predictable input field sizing.
  - Buttons (`<button>`) were styled with a primary blue color, and a `:hover` pseudo-class was added to provide visual feedback to the user.
- **UX-Driven Styling:**
  - The `#logout-button` was specifically targeted and styled with a red background to differentiate it as a "destructive" or secondary action.
  - The `#login-error` paragraph was given a `min-height` to prevent the page layout from "jumping" when an error message appears or disappears.

---
This log reflects the completion of a fully functional and styled frontend application, ready for final integration with the live GraphQL API's data responses.
