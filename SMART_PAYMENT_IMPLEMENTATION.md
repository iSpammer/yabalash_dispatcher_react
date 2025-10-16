# Smart Payment Collection Implementation

## Overview
This document describes the implementation of the smart payment collection feature for the Yabalash driver app, which correctly calculates collection amounts based on order source (B2B vs B2C).

## Business Logic

### Order Types

1. **B2B Orders (dispatch_panel)**
   - Created by restaurants via dispatcher.yabalash.com
   - Restaurant pays delivery fees
   - Driver collects ONLY customer's food payment
   - Example: Customer pays AED 50.00 for food, restaurant pays AED 13.00 delivery fee → Driver collects AED 50.00

2. **B2C Orders (customer_app/website)**
   - Created by customers via yabalash.com or mobile app
   - Customer pays both food and delivery fees
   - Driver collects BOTH amounts
   - Example: Customer pays AED 50.00 for food + AED 13.00 delivery fee → Driver collects AED 63.00

## Implementation Files

### 1. Core Utility: `/src/utils/paymentCalculations.js`

This is the central calculation engine with the following functions:

#### `calculateDriverCollection(orderData)`
Main calculation function that determines collection amount based on order source.

**Parameters:**
- `orderData.order_source`: 'dispatch_panel', 'customer_app', or 'website'
- `orderData.cash_to_be_collected`: Customer's food payment
- `orderData.order_cost`: Delivery fee amount
- `orderData.delivery_fee_paid_by`: 'restaurant' or 'customer'
- `orderData.collect_delivery_fees`: boolean

**Returns:**
```javascript
{
  totalAmount: 50.00,              // Total to collect
  includesDeliveryFees: false,     // Whether delivery fees included
  orderType: 'B2B',                // Order classification
  breakdown: {
    customerPayment: 50.00,        // Food payment
    deliveryFees: 0,               // Delivery fee to collect
    actualDeliveryFee: 13.00,      // Actual delivery fee (reference)
    note: 'Delivery fee paid by restaurant'
  }
}
```

#### `safeCalculateCollection(orderData)`
Error-safe wrapper with comprehensive error handling. Use this in components.

#### `formatCurrency(amount, currency, decimals)`
Formats amounts with currency symbol.

#### `getCollectionLabel(orderType, includesDeliveryFees)`
Returns appropriate label for display.

#### `validateOrderData(orderData)`
Validates order data structure and returns warnings/errors.

#### `testCases` & `runTests()`
Built-in test cases for verification.

### 2. TaskDetail Screen: `/src/Screens/TaskDetail/TaskDetail.js`

**Changes:**
- Import smart collection utilities (line 35-39)
- Updated Drop task payment display (line 1046-1089)
  - Shows calculated total amount
  - Displays breakdown for B2C orders
  - Shows order type badge (B2B/B2C)
  - Indicates who pays delivery fee
- Updated Task Detail box display (line 1624-1651)
  - Shows correct total with smart label
  - Compact delivery fee indicator for B2C

**Display Logic:**
```javascript
const collectionData = safeCalculateCollection(taskDetail?.order);
```

### 3. TaskListCard Component: `/src/Components/TaskListCard.js`

**Changes:**
- Import smart collection utilities (line 25)
- Updated cash collected display for history (line 170-217)
  - Shows correct collected amount
  - Displays breakdown for B2C orders

## API Integration

### Expected API Response Structure

```json
{
  "data": [
    {
      "id": 363,
      "task_status": 2,
      "order": {
        "id": 39,
        "order_source": "dispatch_panel",
        "delivery_fee_paid_by": "restaurant",
        "collect_delivery_fees": false,
        "cash_to_be_collected": "50.00",
        "amount": "50.00",
        "order_cost": "13.00",
        "driver_cost": "8.00"
      }
    }
  ],
  "currency": {
    "symbol": "د.إ",
    "iso_code": "AED"
  }
}
```

## Testing

### Test Scenarios

#### Test Case 1: B2B Order (Restaurant pays delivery)
```javascript
Input: {
  order_source: 'dispatch_panel',
  cash_to_be_collected: '50.00',
  order_cost: '13.00',
  delivery_fee_paid_by: 'restaurant'
}
Expected Output: totalAmount = 50.00, orderType = 'B2B'
```

#### Test Case 2: B2C Order (Customer pays delivery)
```javascript
Input: {
  order_source: 'customer_app',
  cash_to_be_collected: '80.00',
  order_cost: '13.00',
  delivery_fee_paid_by: 'customer',
  collect_delivery_fees: true
}
Expected Output: totalAmount = 93.00, orderType = 'B2C'
```

#### Test Case 3: Legacy Order (Missing fields)
```javascript
Input: {
  cash_to_be_collected: '25.00',
  order_cost: '10.00'
  // Missing: order_source, delivery_fee_paid_by, collect_delivery_fees
}
Expected Output: totalAmount = 25.00, orderType = 'B2B' (fallback)
```

### Running Tests

```javascript
import {runTests} from './src/utils/paymentCalculations';

// Run all test cases
const results = runTests();
console.log('Test Results:', results);
// Output: { allPassed: true, results: [...], summary: {...} }
```

## Error Handling

### Null/Undefined Protection
- All numeric values safely parsed with `parseFloat()`
- Missing fields default to safe values
- Extensive console logging for debugging

### Error Scenarios Handled
1. Missing order data → Returns error fallback with zero amount
2. Invalid numeric values → Defaults to 0
3. Missing new API fields → Falls back to B2B logic (current behavior)
4. Negative values → Converted to 0

## Display Examples

### Drop Task - B2B Order
```
Customer Payment
AED 50.00

[B2B] Delivery fee paid by restaurant
```

### Drop Task - B2C Order
```
Total to Collect
AED 93.00

  Food: AED 80.00
  Delivery Fee: AED 13.00

[B2C] Customer pays all fees
```

### Task Detail Box - B2B
```
CUSTOMER PAYMENT
Cash
AED 50.00
```

### Task Detail Box - B2C
```
TOTAL TO COLLECT
Cash
AED 93.00
+AED13.00 delivery
```

## UI Components

### Payment Display Components

1. **Main Collection Display** (TaskDetail Drop section)
   - Large, bold total amount
   - Order type badge (B2B/B2C)
   - Breakdown for B2C orders
   - Clear note about who pays

2. **Compact Display** (TaskDetail detail box)
   - Smart label (Customer Payment vs Total to Collect)
   - Compact delivery fee indicator
   - Bold total amount

3. **History Display** (TaskListCard)
   - Shows collected amount
   - Breakdown for B2C orders in small text

## Color Coding

- **B2B Orders**: Blue badge (colors.circularBlue)
- **B2C Orders**: Orange badge (colors.circularOrnage)
- **Total Amount**: Theme color (colors.themeColor) for emphasis

## Backward Compatibility

The implementation is fully backward compatible:

1. **Missing Fields**: If new API fields (`order_source`, `delivery_fee_paid_by`, etc.) are missing, system defaults to current behavior (B2B logic)
2. **Legacy Orders**: Orders created before migration will show correct amounts
3. **Graceful Degradation**: If calculation fails, displays `cash_to_be_collected` amount

## Console Logging

The utility includes comprehensive logging for debugging:

```javascript
console.log('[PaymentCalc] Processing order:', {
  orderSource,
  deliveryFeePaidBy,
  collectDeliveryFees,
  cashToCollect,
  deliveryFees
});
```

## Future Enhancements

Potential improvements:

1. **Currency Support**: Currently hardcoded to 'AED', can be made dynamic from API
2. **Localization**: Labels currently in English, can support multiple languages
3. **Analytics**: Track collection accuracy and driver performance
4. **Confirmation**: Add collection confirmation screen before task completion
5. **Receipt**: Generate collection receipt for driver/customer

## Troubleshooting

### Issue: Wrong amount displayed
**Solution**: Check order data structure matches expected format. Run `validateOrderData(order)` to identify missing fields.

### Issue: Calculation mismatch with backend
**Solution**: Verify API response fields match documentation. Check console logs for calculation details.

### Issue: Old orders show incorrect amounts
**Solution**: This is expected if orders were created before field addition. System uses fallback logic.

## Git Safety

Implementation done on feature branch: `feature/smart-payment-collection`

To revert if needed:
```bash
git checkout main
git branch -D feature/smart-payment-collection
```

## Contact & Support

For questions or issues:
1. Check console logs for detailed calculation info
2. Validate API response structure
3. Run built-in test cases
4. Review this documentation

---

**Implementation Date**: 2025-10-11
**Version**: 1.0.0
**Developer**: Claude Code
**Status**: Ready for Testing
