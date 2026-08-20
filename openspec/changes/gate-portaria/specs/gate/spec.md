## Purpose

Lets gate operators (portaria) view today's events, scan QR codes from attendee tickets, or type a manual entry code when the camera is unavailable, and see immediate contextual validation results before re-scanning the next ticket.

## ADDED Requirements

### Requirement: Gate operator event list for today

The frontend SHALL expose a route `/portaria` accessible only to authenticated users with role `GATE` or `ADMIN`. The route SHALL display published events whose date falls on the current calendar day. Each event SHALL be presented as a tappable card showing the event name and a meta line with the event time and location. When no events are scheduled for the current day, the screen SHALL display an empty state with a calendar-off icon and the message "Nenhum evento programado para hoje." The route SHALL NOT display the standard application navbar or footer; instead it SHALL render a minimal gate header with the application logo, a shield-check icon, and a "Portaria" label.

#### Scenario: Gate operator views today's events
- **WHEN** an authenticated `GATE` user navigates to `/portaria` and there are published events scheduled for today
- **THEN** the screen displays each event as a card with the event name and time/location meta, and tapping a card navigates to `/portaria/$eventId/validar`

#### Scenario: No events today
- **WHEN** an authenticated `GATE` user navigates to `/portaria` and no published events are scheduled for the current day
- **THEN** the screen displays a calendar-off icon and the message "Nenhum evento programado para hoje." instead of an event list

#### Scenario: Non-gate role blocked
- **WHEN** an authenticated user whose role is not `GATE` or `ADMIN` navigates to `/portaria`
- **THEN** the system redirects them to the home route `/`

#### Scenario: Unauthenticated user blocked
- **WHEN** an unauthenticated user navigates to `/portaria`
- **THEN** the system redirects them to the login page

### Requirement: QR camera scanner at portaria

The frontend SHALL expose a route `/portaria/$eventId/validar` accessible only to authenticated users with role `GATE` or `ADMIN`. The route SHALL display a camera viewfinder that continuously scans for QR codes. When a QR code is detected, the frontend SHALL parse the decoded text as JSON, extract the `id` and `sig` fields, and submit them to `POST /tickets/validate` along with the `expectedEventId` from the route parameter. The scanner SHALL pause while a validation request is in flight and resume when the result is dismissed. The route SHALL display a header with a back arrow and the selected event's name and meta (time and location). If camera access is denied or unavailable, the screen SHALL show a fallback message directing the operator to use the manual entry field below.

#### Scenario: Successful QR scan triggers validation
- **WHEN** the camera detects a QR code with valid JSON `{ "v": 1, "id": "...", "sig": "..." }`
- **THEN** the frontend sends `{ publicId, signature, expectedEventId }` to `POST /tickets/validate` and displays the result

#### Scenario: Camera permission denied
- **WHEN** the browser denies camera access or no camera is available
- **THEN** the viewfinder area shows a fallback message and the manual entry field remains functional below

#### Scenario: Non-gate role blocked from scan route
- **WHEN** an authenticated user whose role is not `GATE` or `ADMIN` navigates to `/portaria/$eventId/validar`
- **THEN** the system redirects them to `/portaria` or `/`

### Requirement: Manual code entry at portaria

Below the camera viewfinder on the scan route, the frontend SHALL display a labeled text input with placeholder "Código do ingresso" and a "Validar" button. The operator SHALL type the combined manual entry code (`shortId-manualCode`, e.g. `AB3XK9DM-7Q2MZP1T`) displayed on the ticket holder's screen. On submit, the frontend SHALL send `{ manualEntryCode, expectedEventId }` to `POST /tickets/validate`. The submit button SHALL be disabled while a validation request is in flight.

#### Scenario: Manual code submitted for validation
- **WHEN** the operator types a code in the format `XXXXXXXX-XXXXXXXX` and clicks "Validar"
- **THEN** the frontend sends `{ manualEntryCode, expectedEventId }` to `POST /tickets/validate` and displays the result

#### Scenario: Submit disabled during pending request
- **WHEN** a validation request is in flight
- **THEN** the "Validar" button is disabled and no new request can be triggered from the manual entry or the scanner

### Requirement: Validation result overlay with four states

After a validation response is received, the frontend SHALL display a full-screen overlay replacing the scanner UI. The overlay background SHALL be green (#3F7A55) for `VALID` results and red (#9B2531) for `ALREADY_USED`, `INVALID`, and `WRONG_EVENT` results. The overlay SHALL display a large result icon (circle-check for VALID, circle-x for others), a title, and a subtitle:
- `VALID`: title "Ingresso válido", subtitle `holderName · ticketLabel`
- `ALREADY_USED`: title "Ingresso já utilizado", subtitle `Usado às {formatted time}`
- `INVALID`: title "Ingresso inválido", subtitle "A assinatura não confere"
- `WRONG_EVENT`: title "Este ingresso é de outro evento", subtitle `ticketEventName`

The overlay SHALL display a white "Validar próximo" button at the bottom. Clicking it SHALL dismiss the overlay and reset to the scanning state with the camera resumed. The overlay SHALL also display a back arrow in the top bar that navigates to `/portaria`.

#### Scenario: Valid ticket result
- **WHEN** the validate endpoint returns `{ status: 'VALID', holderName: 'Maria Silva', ticketLabel: 'Pista' }`
- **THEN** the overlay shows a green background, circle-check icon, title "Ingresso válido", subtitle "Maria Silva · Pista", and a "Validar próximo" button

#### Scenario: Already used ticket result
- **WHEN** the validate endpoint returns `{ status: 'ALREADY_USED', holderName: 'Maria Silva', usedAt: '...' }`
- **THEN** the overlay shows a red background, circle-x icon, title "Ingresso já utilizado", subtitle with the formatted used-at time, and a "Validar próximo" button

#### Scenario: Invalid ticket result
- **WHEN** the validate endpoint returns `{ status: 'INVALID' }`
- **THEN** the overlay shows a red background, circle-x icon, title "Ingresso inválido", subtitle "A assinatura não confere", and a "Validar próximo" button

#### Scenario: Wrong event result
- **WHEN** the validate endpoint returns `{ status: 'WRONG_EVENT', ticketEventName: 'Festival de Cinema' }`
- **THEN** the overlay shows a red background, circle-x icon, title "Este ingresso é de outro evento", subtitle "Festival de Cinema", and a "Validar próximo" button

#### Scenario: Validar próximo resets to scanning
- **WHEN** the operator clicks "Validar próximo" on any result overlay
- **THEN** the overlay is dismissed, the camera scanner resumes, and the manual entry input is cleared

### Requirement: GATE role confinement to portaria routes

The frontend SHALL confine users with role `GATE` to only `/portaria` and `/portaria/*` routes. When a `GATE` user navigates to the home route `/`, the system SHALL redirect them to `/portaria`. When a `GATE` user attempts to access any other authenticated route that is not under `/portaria`, the system SHALL redirect them to `/portaria`. After login, if no redirect parameter is present, a `GATE` user SHALL land on `/portaria` (via the home route redirect).

#### Scenario: GATE user redirected from home
- **WHEN** an authenticated `GATE` user navigates to `/`
- **THEN** the system redirects them to `/portaria`

#### Scenario: GATE user redirected from other authenticated route
- **WHEN** an authenticated `GATE` user navigates to any route under `/_authenticated` that does not start with `/portaria`
- **THEN** the system redirects them to `/portaria`

#### Scenario: GATE user lands on portaria after login
- **WHEN** a `GATE` user logs in without a redirect parameter
- **THEN** the login flow navigates to `/`, which redirects to `/portaria`

### Requirement: Manual entry code display on ticket detail

The ticket detail card in owner mode SHALL display the combined manual entry code (`shortId-manualCode`) below the QR code, labeled "Código para entrada manual". The code SHALL be rendered in monospace font with wide letter spacing for readability. The manual entry code SHALL NOT be displayed in public share mode.

#### Scenario: Owner sees manual entry code
- **WHEN** an authenticated `CLIENT` views their ticket detail (`GET /tickets/mine/:publicId` rendered in the ticket detail card)
- **THEN** the card displays the QR code and, below it, "Código para entrada manual" followed by the `shortId-manualCode` value in monospace

#### Scenario: Public viewer does not see manual entry code
- **WHEN** an anonymous visitor opens a public ticket share link (`GET /tickets/:publicId` rendered in the ticket detail card)
- **THEN** the card does not display the manual entry code or the QR code
