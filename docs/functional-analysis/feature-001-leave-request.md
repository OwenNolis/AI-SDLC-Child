# Feature-001: Verlofaanvraag indienen

## Doel
Als medewerker wil ik een verlofaanvraag kunnen indienen zodat mijn manager deze kan goedkeuren of afwijzen.

## Scope

In scope:
- Verlofaanvraag indienen met startdatum, einddatum en type verlof
- Overzicht van eigen verlofaanvragen tonen
- Verlofaanvraag intrekken zolang deze nog niet goedgekeurd is
- Resterende verlofdagen tonen
- Manager kan aanvragen goedkeuren of afwijzen met commentaar

Out of scope:
- Automatische goedkeuring bij afwezigheid manager
- Integratie met externe HR-systemen
- Verlofplanning voor het volledige team
- Notificaties via e-mail of push

## Requirements
- REQ-001: De medewerker kan een verlofaanvraag indienen met een startdatum, einddatum en verloftype (jaarlijks, ziekte, bijzonder).
- REQ-002: De startdatum moet voor of gelijk aan de einddatum liggen.
- REQ-003: Een verlofaanvraag kan niet worden ingediend voor een datum in het verleden.
- REQ-004: De medewerker kan zijn eigen verlofaanvragen bekijken met status (aangevraagd, goedgekeurd, afgewezen).
- REQ-005: De medewerker kan een aanvraag met status "aangevraagd" intrekken.
- REQ-006: De medewerker ziet hoeveel verlofdagen hij nog heeft voor het huidige jaar.
- REQ-007: De manager kan een openstaande verlofaanvraag goedkeuren of afwijzen met een verplicht commentaar bij afwijzing.
- REQ-008: Overlappende verlofaanvragen voor dezelfde medewerker zijn niet toegestaan.
- REQ-009: Bij ongeldige invoer worden veldspecifieke foutmeldingen getoond.

## Business rules
- BR-001: Een medewerker heeft maximaal 20 verlofdagen per jaar van type "jaarlijks".
- BR-002: Verlof van type "ziekte" heeft geen daglimiet.
- BR-003: Een goedgekeurde aanvraag kan niet meer gewijzigd worden.

## Non-functional
- NFR-001: De verlofaanvraag moet binnen 2 seconden verwerkt worden.
- NFR-002: Alleen de eigen medewerker en zijn directe manager mogen de aanvragen van die medewerker zien.

## Data
- Entiteit: LeaveRequest, velden: id: Long, employeeId: Long, managerId: Long, startDate: LocalDate, endDate: LocalDate, type: String, status: String, comment: String, createdAt: LocalDateTime
- Constraints: startDate notNull, endDate notNull, type enum:ANNUAL,SICK,SPECIAL, status enum:REQUESTED,APPROVED,REJECTED

## API notes
- Endpoint: POST /api/leave-requests — nieuwe aanvraag indienen
- Endpoint: GET /api/leave-requests — eigen aanvragen ophalen
- Endpoint: DELETE /api/leave-requests/{id} — aanvraag intrekken
- Endpoint: PUT /api/leave-requests/{id}/approve — aanvraag goedkeuren (manager)
- Endpoint: PUT /api/leave-requests/{id}/reject — aanvraag afwijzen met commentaar (manager)
- Endpoint: GET /api/leave-balance — resterende verlofdagen ophalen

## UX notes
- `/leave` route: overzicht van eigen verlofaanvragen
- `/leave/new` route: formulier voor nieuwe aanvraag
- `/manager/leave` route: overzicht voor manager van openstaande aanvragen
- Componenten:
  - `LeaveRequestList` — overzicht van aanvragen met status
  - `LeaveRequestForm` — formulier voor startdatum, einddatum en type
  - `LeaveBalanceCard` — toont resterende verlofdagen
  - `ManagerApprovalList` — lijst van openstaande aanvragen voor manager
  - `ApproveRejectModal` — modal voor goedkeuren/afwijzen met commentaarveld
  - `StatusBadge` — visuele status indicator per aanvraag
