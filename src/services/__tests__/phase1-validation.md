# Phase 1 - Onboarding Configuration Test Validation

## Test Scenarios for Smart Extraction

### ✅ Scenario 1: "Trabajo en X" Pattern (Missing Amount & Dates)
**Input:** "Trabajo en Microsoft"

**Expected Extraction:**
```json
{
  "company": "Microsoft",
  "type": "salary",
  "frequency": "monthly",
  "paymentDates": [1],
  "name": "Trabajo en Microsoft",
  "amount": null,
  "confidence": 0.4
}
```

**Expected Behavior:**
- ✅ Extract company name
- ✅ Apply salary type default
- ✅ Apply monthly frequency default
- ✅ Apply payment date default [1]
- ✅ Ask: "¿Cuánto recibes aproximadamente al mes trabajando en Microsoft?"

---

### ✅ Scenario 2: Vague Amount ("como", "unos")
**Input:** "Gano como 5000 al mes"

**Expected Extraction:**
```json
{
  "amount": 5000,
  "frequency": "monthly",
  "paymentDates": [1],
  "type": "salary",
  "name": "Salario",
  "confidence": 0.7
}
```

**Expected Behavior:**
- ✅ Parse "como 5000" → 5000
- ✅ Detect "al mes" → monthly
- ✅ Apply default payment date [1]
- ✅ Ask: "¿Hay alguna otra fuente de ingresos además de estos Q5,000 mensuales?"

---

### ✅ Scenario 3: Range Input
**Input:** "Entre 500-800 semanales de propinas"

**Expected Extraction:**
```json
{
  "minAmount": 500,
  "maxAmount": 800,
  "amount": 650,
  "frequency": "weekly",
  "paymentDates": [5],
  "isVariable": true,
  "type": "other",
  "name": "Otros Ingresos",
  "confidence": 0.6
}
```

**Expected Behavior:**
- ✅ Parse range → min: 500, max: 800, amount: 650 (average)
- ✅ Detect "semanales" → weekly
- ✅ Mark as variable
- ✅ Apply Friday default [5]

---

### ✅ Scenario 4: Frequency Only
**Input:** "Quincenal en mi trabajo"

**Expected Extraction:**
```json
{
  "frequency": "bi-weekly",
  "paymentDates": [15, 30],
  "type": "salary",
  "name": "Salario",
  "amount": null,
  "confidence": 0.5
}
```

**Expected Behavior:**
- ✅ Detect "quincenal" → bi-weekly
- ✅ Apply quincenal dates [15, 30]
- ✅ Infer salary type from "trabajo"
- ✅ Ask: "¿Cuánto recibes quincenalmente en tu trabajo?"

---

### ✅ Scenario 5: Complete Info (All Data Present)
**Input:** "Q5000 el 15 y 30 de cada mes de mi trabajo en Google"

**Expected Extraction:**
```json
{
  "amount": 5000,
  "frequency": "bi-weekly",
  "paymentDates": [15, 30],
  "type": "salary",
  "company": "Google",
  "name": "Trabajo en Google",
  "confidence": 0.9
}
```

**Expected Behavior:**
- ✅ Extract all fields correctly
- ✅ High confidence score
- ✅ Ready for SET_INCOME action
- ✅ Ask: "¿Tienes alguna otra fuente de ingresos?"

---

### ✅ Scenario 6: Freelance Variable Income
**Input:** "Soy freelance de diseño, varía entre 3000-8000"

**Expected Extraction:**
```json
{
  "type": "freelance",
  "minAmount": 3000,
  "maxAmount": 8000,
  "amount": 3000,
  "isVariable": true,
  "frequency": "monthly",
  "paymentDates": [1],
  "name": "Trabajo Freelance",
  "description": "diseño",
  "confidence": 0.6
}
```

**Expected Behavior:**
- ✅ Detect freelance type
- ✅ Extract range, use minAmount as conservative base
- ✅ Mark as variable
- ✅ Default to monthly frequency
- ✅ Ask: "¿Con qué frecuencia recibes estos pagos de diseño?"

---

### ✅ Scenario 7: Multiple Sources
**Input:** "Trabajo en Starbucks y tengo freelance los fines de semana"

**Expected Extraction:**
```json
[
  {
    "type": "salary",
    "company": "Starbucks",
    "name": "Trabajo en Starbucks",
    "frequency": "monthly",
    "paymentDates": [1],
    "amount": null,
    "confidence": 0.4
  },
  {
    "type": "freelance",
    "name": "Trabajo Freelance",
    "frequency": "weekly",
    "paymentDates": [5],
    "amount": null,
    "confidence": 0.3
  }
]
```

**Expected Behavior:**
- ✅ Extract both income sources
- ✅ Apply defaults to each
- ✅ Ask: "Entiendo que trabajas en Starbucks y haces freelance. ¿Cuánto recibes de cada uno?"

---

### ✅ Scenario 8: Casual Language with "k" suffix
**Input:** "Me pagan 5k quincenal"

**Expected Extraction:**
```json
{
  "amount": 5000,
  "frequency": "bi-weekly",
  "paymentDates": [15, 30],
  "type": "salary",
  "name": "Salario",
  "confidence": 0.7
}
```

**Expected Behavior:**
- ✅ Parse "5k" → 5000
- ✅ Detect "quincenal" → bi-weekly
- ✅ Apply default dates [15, 30]

---

### ✅ Scenario 9: Date Phrases ("fin de mes", "inicio")
**Input:** "Pago a fin de mes, como 3500"

**Expected Extraction:**
```json
{
  "amount": 3500,
  "frequency": "monthly",
  "paymentDates": [31],
  "type": "salary",
  "name": "Salario",
  "confidence": 0.7
}
```

**Expected Behavior:**
- ✅ Parse "como 3500" → 3500
- ✅ Detect "fin de mes" → paymentDates: [31]
- ✅ Default monthly frequency

---

### ✅ Scenario 10: No Clear Income Info
**Input:** "Hola, quiero configurar mi presupuesto"

**Expected Extraction:**
```json
{
  "amount": null,
  "frequency": null,
  "type": null,
  "confidence": 0.0
}
```

**Expected Behavior:**
- ✅ No crash/error
- ✅ Return minimal object
- ✅ Bussy asks: "Para empezar, cuéntame sobre tus ingresos. ¿Cuánto ganas y con qué frecuencia?"

---

## Success Criteria

### Extraction Accuracy
- [ ] **95%+ success rate** on extracting available data
- [ ] **0% crash rate** on incomplete/vague input
- [ ] **Intelligent defaults** applied in 100% of cases with missing data

### User Experience
- [ ] **< 3 questions average** to collect complete income data
- [ ] **< 2 minutes** to complete income setup
- [ ] **Clear acknowledgment** of what was understood
- [ ] **Specific questions** for missing critical data

### Data Quality
- [ ] **Payment dates** always populated (defaults when missing)
- [ ] **Income names** descriptive and useful
- [ ] **Confidence scores** accurate within 10%
- [ ] **Company names** extracted when mentioned

---

## Test Execution Plan

### Manual Testing
1. **Test each scenario** in Advanced Mode chat
2. **Verify extraction** matches expected JSON
3. **Check Bussy response** is appropriate
4. **Confirm data sync** to userStore

### Automated Testing (Future)
```typescript
describe('Smart Extraction Service', () => {
  test('handles "Trabajo en X" pattern', async () => {
    const result = await SmartExtractionService.extractFromMessage(
      "Trabajo en Microsoft",
      { userCountry: 'GT' }
    );
    expect(result.incomes[0].company).toBe('Microsoft');
    expect(result.incomes[0].paymentDates).toEqual([1]);
  });
  
  // ... more tests
});
```

---

## Known Limitations

1. **Complex income structures**: May require 2-3 iterations for gig economy workers
2. **Regional variations**: Optimized for Central America Spanish
3. **Ambiguous ranges**: Always uses conservative estimate (min or average)
4. **Multiple currencies**: Requires user profile country setting

---

## Next Steps

After validation:
1. ✅ All 10 scenarios pass
2. ✅ User testing with 5+ real users
3. ✅ Performance metrics collected
4. 🚀 **Ready for Phase 2: Budget UX Redesign**

