# Technische Analyse: Feature-002: Product Inventory Management

## 1. Scope

### In scope
- Aanmaken van een nieuw product met naam, SKU, beschrijving en initiële voorraad
- Opvragen van een enkel product op basis van ID of SKU
- Opvragen van alle producten (met paginering)
- Bijwerken van productinformatie (naam, beschrijving)
- Voorraad verhogen of verlagen via een stockmutatie
- Verwijderen van een product (alleen als voorraad 0 is)
- Opvragen van producten met voorraad onder een instelbare drempelwaarde (low-stock alert)

### Out of scope
- Gebruikersbeheer en authenticatie
- Leveranciersbeheer
- Bestel- en aankoopflows
- Barcode- of QR-scanning
- Rapportage en dashboards

## 2. Assumptions
- Geen specifieke aannames gedefinieerd.

## 3. Open Questions
- Geen specifieke open vragen gedefinieerd.

## 4. Domain Model

### Entiteiten
| Entiteit | Velden | Constraints |
|----------|--------|-------------|
| Product | id: Long | notNull |
| | sku: String | notNull, minLength:3, maxLength:20, pattern:^[A-Z][A-Z0-9-]{2,19}$ |
| | name: String | notNull, maxLength:100 |
| | description: String | maxLength:500 |
| | stock: Integer | notNull, min:0 |
| | createdAt: LocalDateTime | notNull |
| | lastModifiedAt: LocalDateTime | notNull |
| StockMutation | id: Long | notNull |
| | productId: Long | notNull |
| | type: String | notNull, enum:IN,OUT |
| | quantity: Integer | notNull, min:1 |
| | mutationDate: LocalDateTime | notNull |

## 5. API Design

### Endpoints
| Method | Path | Beschrijving |
|--------|------|--------------|
| POST | /api/products | Maak een nieuw product aan |
| GET | /api/products | Haal een lijst met producten op |
| GET | /api/products/{id} | Haal een specifiek product op |
| PUT | /api/products/{id} | Update een bestaand product |
| DELETE | /api/products/{id} | Verwijder een product |
| POST | /api/products/{productId}/stock-mutations | Voeg een stockmutatie toe |
| GET | /api/products/{productId}/stock-mutations | Haal de stockmutaties voor een product op |

### Request DTO
#### CreateProductRequest
```json
{
  "sku": "string",
  "name": "string",
  "description": "string",
  "stock": "integer"
}
```
#### UpdateProductRequest
```json
{
  "name": "string",
  "description": "string",
  "stock": "integer"
}
```
#### CreateStockMutationRequest
```json
{
  "type": "string",
  "quantity": "integer"
}
```

### Response DTO
#### ProductResponse
```json
{
  "id": "long",
  "sku": "string",
  "name": "string",
  "description": "string",
  "stock": "integer",
  "createdAt": "localDateTime",
  "lastModifiedAt": "localDateTime"
}
```
#### ProductListResponse
```json
{
  "content": [
    {
      "id": "long",
      "sku": "string",
      "name": "string",
      "description": "string",
      "stock": "integer",
      "createdAt": "localDateTime",
      "lastModifiedAt": "localDateTime"
    }
  ],
  "page": "integer",
  "size": "integer",
  "totalElements": "long",
  "totalPages": "integer"
}
```
#### StockMutationResponse
```json
{
  "id": "long",
  "productId": "long",
  "type": "string",
  "quantity": "integer",
  "mutationDate": "localDateTime"
}
```
#### StockMutationListResponse
```json
{
  "content": [
    {
      "id": "long",
      "productId": "long",
      "type": "string",
      "quantity": "integer",
      "mutationDate": "localDateTime"
    }
  ],
  "page": "integer",
  "size": "integer",
  "totalElements": "long",
  "totalPages": "integer"
}
```

### Error formaat
```json
{
  "correlationId": "uuid",
  "code": "ERROR_CODE",
  "message": "Beschrijving",
  "fieldErrors": [
    {
      "field": "fieldName",
      "message": "Error message for field"
    }
  ]
}
```

## 6. Backend Design

### Lagen
- **Controller**: Behandelt inkomende HTTP-requests en valideert basisinput.
- **Service**: Bevat de business logica en orkestreert repositories.
- **Repository**: Verantwoordelijk voor data-access operaties.
- **ValidationService**: Valideert bedrijfsregels.

### Klassen
| Klasse | Verantwoordelijkheid |
|--------|---------------------|
| ProductController | Exposeert REST endpoints voor productbeheer. |
| ProductService | Implementeert business logica voor productbeheer. |
| ProductRepository | Data-access operaties voor producten. |
| Product | JPA entiteit voor producten. |
| CreateProductRequest | Request DTO voor productcreatie. |
| UpdateProductRequest | Request DTO voor productupdates. |
| ProductResponse | Response DTO voor productgegevens. |
| ProductListResponse | Response DTO voor een lijst met producten. |
| ProductSkuAlreadyExistsException | Exception bij dubbele SKU. |
| ProductNotFoundException | Exception bij ontbrekende product. |
| ProductCannotBeDeletedException | Exception bij poging tot verwijderen met voorraad > 0. |
| ProductValidationService | Valideert bedrijfsregels voor producten. |
| ProductSkuUniquenessValidator | Valideert de uniciteit van de SKU. |
| ProductStockValidationService | Valideert voorraadgerelateerde bedrijfsregels. |
| StockMutationController | Exposeert REST endpoints voor stockmutaties. |
| StockMutationService | Implementeert business logica voor stockmutaties. |
| StockMutationRepository | Data-access operaties voor stockmutaties. |
| StockMutation | JPA entiteit voor stockmutaties. |
| CreateStockMutationRequest | Request DTO voor stockmutatiecreatie. |
| StockMutationResponse | Response DTO voor stockmutatiegegevens. |
| StockMutationListResponse | Response DTO voor een lijst met stockmutaties. |
| StockMutationOutOfStockException | Exception bij OUT-mutatie die voorraad negatief maakt. |
| StockMutationValidationService | Valideert bedrijfsregels voor stockmutaties. |
| StockMutationQuantityValidator | Valideert de hoeveelheid van een stockmutatie. |
| ApiError | Standaard foutstructuur voor API-antwoorden. |
| GlobalExceptionHandler | Centrale exception handler. |
| ValidationErrorHandler | Specifieke handler voor validatiefouten. |
| PageableRequest | DTO voor pagineringparameters. |
| CorrelationIdFilter | Beheert correlation IDs. |
| DateTimeUtils | Hulpprogramma's voor datum- en tijdbewerkingen. |

## 7. Frontend Design
- Geen frontend design gespecificeerd in de input.

## 8. Security & Privacy
- Endpoints vereisen geen authenticatie (auth: "none" gespecificeerd in API design).
- Input validatie aan de backend (REQ-016).

## 9. Observability
- **Logging**: Inkomende requests, business events, fouten met correlationId.
- **Metrics**: Request count, response tijd (p95), error rate per endpoint.

## 10. Performance & Scalability
- Database indexen op veelgebruikte filtervelden (bijv. SKU, productId).
- p95 responstijd < 500ms (REQ-014).

## 11. Test Strategy

### Unit tests
- Validators en business logica in de service en validation lagen.
- DTO validatie.

### Integration tests
- Volledige request/response cyclus per endpoint.
- Successcenario's (2xx) en foutscenario's (4xx, 5xx).
- SKU uniciteit validatie.
- Voorraadbeheer logica.

### E2E tests
- Gebruikersflow van aanmaken product tot opvragen met low-stock alert.
- Flow van stockmutaties en bijbehorende voorraadupdates.
- Verwijderen van een product.

## 12. Traceability Matrix

| REQ | Backend | Tests |
|-----|---------|-------|
| REQ-001 | Product, ProductValidationService, CreateProductRequest, UpdateProductRequest | Valideer dat een SKU maximaal 20 tekens lang is., Valideer dat een SKU alleen hoofdletters, cijfers en koppeltekens bevat., Valideer dat een SKU niet leeg is. |
| REQ-002 | Product, ProductValidationService, CreateProductRequest, UpdateProductRequest | Valideer dat de productnaam verplicht is en maximaal 100 tekens lang., Valideer dat de productbeschrijving optioneel is en maximaal 500 tekens lang., Valideer dat de voorraad een geheel getal is en minimaal 0. |
| REQ-003 | ProductService, CreateProductRequest | Valideer dat bij het aanmaken van een product de initiële voorraad opgegeven moet worden., Valideer dat de initiële voorraad minimaal 0 is. |
| REQ-004 | ProductRepository, ProductSkuUniquenessValidator, ProductService | Valideer dat een SKU niet dubbel kan voorkomen bij het aanmaken of updaten van een product. |
| REQ-005 | ProductStockValidationService, StockMutationService, StockMutationRepository | Valideer dat een voorraadverlaging die de voorraad onder 0 zou brengen wordt geweigerd., Valideer dat de voorraad nooit negatief wordt. |
| REQ-006 | ProductService, ProductRepository | Valideer dat een product alleen verwijderd kan worden als de huidige voorraad exact 0 is. |
| REQ-007 | ProductController, ProductService | Valideer dat de low-stock drempelwaarde ingesteld kan worden via een query parameter., Valideer dat de standaard low-stock drempelwaarde 10 is. |
| REQ-008 | ProductController, ProductService, PageableRequest | Valideer dat het opvragen van producten gepagineerd is met 'page' en 'size' query parameters., Valideer dat de standaard 'page' 0 is., Valideer dat de standaard 'size' 20 is., Valideer dat de maximale 'size' 100 is. |
| REQ-009 | Product, ProductValidationService, CreateProductRequest, UpdateProductRequest | Valideer dat een SKU tussen de 3 en 20 tekens lang is., Valideer dat een SKU alleen A-Z, 0-9 en '-' bevat., Valideer dat een SKU begint met een letter. |
| REQ-010 | StockMutation, CreateStockMutationRequest, StockMutationValidationService | Valideer dat een stockmutatie een type (IN of OUT) heeft., Valideer dat de hoeveelheid van een stockmutatie minimaal 1 is. |
| REQ-011 | StockMutationService, StockMutationOutOfStockException, GlobalExceptionHandler | Valideer dat bij een OUT-mutatie groter dan de huidige voorraad, het systeem HTTP 422 teruggeeft met een duidelijke foutmelding. |
| REQ-012 | ProductService, ProductCannotBeDeletedException, GlobalExceptionHandler | Valideer dat bij het verwijderen van een product met voorraad > 0, het systeem HTTP 409 teruggeeft. |
| REQ-013 | Product, ProductValidationService, CreateProductRequest, UpdateProductRequest | Valideer dat de productnaam en SKU getrimd worden (leading/trailing whitespace verwijderd) bij opslaan. |
| REQ-014 | CorrelationIdFilter, GlobalExceptionHandler | Meet de responstijd van alle API endpoints onder normaal gebruik en valideer dat deze binnen 500ms blijft. |
| REQ-015 | ProductController, StockMutationController, ApiError, GlobalExceptionHandler, ValidationErrorHandler | Valideer dat de API REST-conventies volgt., Valideer dat alle antwoorden in JSON formaat zijn., Valideer dat foutmeldingen de structuur { "error": "...", "details": "..." } volgen. |
| REQ-016 | ProductValidationService, StockMutationValidationService, ValidationErrorHandler, GlobalExceptionHandler | Valideer dat invoervalidatie server-side gebeurt., Valideer dat ongeldige verzoeken HTTP 400 teruggeven met een beschrijving per veld. |
| REQ-017 | Product, ProductRepository | Valideer dat elk product een uniek, auto-generated ID heeft. |
| REQ-018 | Product, DateTimeUtils | Valideer dat een product een aanmaakdatum heeft., Valideer dat een product een laatste wijzigingsdatum heeft. |
| REQ-019 | StockMutation, StockMutationRepository | Valideer dat elke stockmutatie een uniek ID heeft. |
| REQ-020 | StockMutation, StockMutationRepository | Valideer dat een stockmutatie gekoppeld is aan een product via productId. |
| REQ-021 | StockMutation, DateTimeUtils | Valideer dat een stockmutatie een mutatie datum heeft. |
