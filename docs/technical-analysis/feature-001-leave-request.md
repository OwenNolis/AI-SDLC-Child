# Technische Analyse: Feature-001: Verlofaanvraag indienen

## 1. Scope

### In scope
- Verlofaanvraag indienen met startdatum, einddatum en type verlof
- Overzicht van eigen verlofaanvragen tonen
- Verlofaanvraag intrekken zolang deze nog niet goedgekeurd is
- Resterende verlofdagen tonen
- Manager kan aanvragen goedkeuren of afwijzen met commentaar

### Out of scope
- Automatische goedkeuring bij afwezigheid manager
- Integratie met externe HR-systemen
- Verlofplanning voor het volledige team
- Notificaties via e-mail of push

## 2. Assumptions
- Er is een bestaand authenticatie- en autorisatiesysteem aanwezig dat gebruikt kan worden om gebruikers te identificeren en hun rollen (medewerker, manager) te bepalen.
- De medewerker heeft een toegewezen manager in het systeem.
- De verlofdagen worden jaarlijks gereset aan het begin van het kalenderjaar.

## 3. Open Questions
- Hoe wordt omgegaan met feestdagen en weekenden bij het berekenen van verlofdagen?
- Wat is de exacte definitie van "bijzonder" verlof en zijn hier specifieke regels aan verbonden?
- Hoe wordt de jaarlijkse verlofdagenlimiet van 20 dagen beheerd en gereset?

## 4. Domain Model

| Entiteit       | Velden
