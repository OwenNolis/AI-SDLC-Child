# Feature-002: Product Inventory Management

## Doel
Als magazijnbeheerder wil ik producten en hun voorraadniveaus beheren via een REST API zodat de voorraad altijd up-to-date is en stocktekorten tijdig gesignaleerd worden.

## Scope

In scope:
- Aanmaken van een nieuw product met naam, SKU, beschrijving en initiële voorraad
- Opvragen van een enkel product op basis van ID of SKU
- Opvragen van alle producten (met paginering)
- Bijwerken van productinformatie (naam, beschrijving)
- Voorraad verhogen of verlagen via een stockmutatie
- Verwijderen van een product (alleen als voorraad 0 is)
- Opvragen van producten met voorraad onder een instelbare drempelwaarde (low-stock alert)

Out of scope:
- Gebruikersbeheer en authenticatie
- Leveranciersbeheer
- Bestel- en aankoopflows
- Barcode- of QR-scanning
- Rapportage en dashboards

## Requirements
- REQ-001: Een product heeft een unieke SKU (max 20 tekens, alleen hoofdletters, cijfers en koppeltekens).
- REQ-002: Een product heeft een naam (verplicht, max 100 tekens), een optionele beschrijving (max 500 tekens) en een voorraad (geheel getal, minimaal 0).
- REQ-003: Bij aanmaken van een product moet de initiële voorraad opgegeven worden (minimaal 0).
- REQ-004: Een SKU mag niet dubbel voorkomen in het systeem.
- REQ-005: Voorraad mag nooit negatief worden; een verlaging die de voorraad onder 0 zou brengen wordt geweigerd.
- REQ-006: Een product kan alleen verwijderd worden als de huidige voorraad exact 0 is.
- REQ-007: De low-stock drempelwaarde is instelbaar per opvraging (query parameter, standaard 10).
- REQ-008: Paginering bij het opvragen van alle producten: page en size als query parameters (standaard page=0, size=20, max size=100).

## Business rules
- BR-001: SKU-formaat: 3 tot 20 tekens, alleen A-Z, 0-9 en koppelteken (-), moet beginnen met een letter.
- BR-002: Een stockmutatie heeft een type (IN of OUT) en een hoeveelheid (minimaal 1).
- BR-003: Bij een OUT-mutatie groter dan de huidige voorraad geeft het systeem HTTP 422 terug met een duidelijke foutmelding.
- BR-004: Bij verwijderen van een product met voorraad > 0 geeft het systeem HTTP 409 terug.
- BR-005: Productnaam en SKU worden bij opslaan getrimd (leading/trailing whitespace verwijderd).

## Non-functional
- NFR-001: Alle endpoints geven een antwoord binnen 500ms onder normaal gebruik.
- NFR-002: De API volgt REST-conventies en geeft JSON terug met consistente foutstructuur: { "error": "...", "details": "..." }.
- NFR-003: Invoervalidatie gebeurt server-side; ongeldige verzoeken krijgen HTTP 400 met een beschrijving per veld.

## Data
- Entiteit: Product, velden: id: Long (auto-generated), sku: String, name: String, description: String (nullable), stock: Integer, createdAt: LocalDateTime, updatedAt: LocalDateTime
- Entiteit: StockMutation, velden: id: Long, productId: Long, type: Enum(IN, OUT), quantity: Integer, mutatedAt: LocalDateTime
- Constraints: sku uniek, stock >= 0, quantity >= 1

## API notes
- Endpoint: POST /api/products — nieuw product aanmaken
- Request: { "sku": "PROD-001", "name": "Laptop Stand", "description": "Aluminium laptop stand", "initialStock": 50 }
- Response 201: { "id": 1, "sku": "PROD-001", "name": "Laptop Stand", "stock": 50, ... }
- Response 400: validatiefout (ongeldige SKU, naam te lang, enz.)
- Response 409: SKU bestaat al

- Endpoint: GET /api/products/{id} — product opvragen op ID
- Response 200: product object
- Response 404: product niet gevonden

- Endpoint: GET /api/products?page=0&size=20 — alle producten opvragen
- Response 200: { "content": [...], "page": 0, "size": 20, "totalElements": 150 }

- Endpoint: PUT /api/products/{id} — productinformatie bijwerken (naam, beschrijving)
- Request: { "name": "...", "description": "..." }
- Response 200: bijgewerkt product object
- Response 404: product niet gevonden

- Endpoint: POST /api/products/{id}/stock — stockmutatie uitvoeren
- Request: { "type": "IN", "quantity": 25 }
- Response 200: { "id": 1, "sku": "PROD-001", "stock": 75, ... }
- Response 404: product niet gevonden
- Response 422: voorraad zou negatief worden

- Endpoint: DELETE /api/products/{id} — product verwijderen
- Response 204: succesvol verwijderd
- Response 404: product niet gevonden
- Response 409: voorraad is niet 0

- Endpoint: GET /api/products/low-stock?threshold=10 — producten onder drempelwaarde opvragen
- Response 200: lijst van producten met stock <= threshold
