/**
 * Payment Collection Calculation Utility
 *
 * This module handles smart calculation of payment amounts that drivers should collect
 * based on order source (B2B vs B2C) and delivery fee payment responsibility.
 *
 * Business Logic:
 * - B2B Orders (dispatch_panel): Restaurant pays delivery fees → Driver collects only customer payment
 * - B2C Orders (customer_app/website): Customer pays delivery fees → Driver collects customer payment + delivery fees
 *
 * @module paymentCalculations
 */

/**
 * Calculate the total amount a driver should collect from the customer
 *
 * @param {Object} orderData - Order data from API
 * @param {string} orderData.order_source - Source of order: 'dispatch_panel', 'customer_app', or 'website'
 * @param {string} orderData.delivery_fee_paid_by - Who pays delivery fee: 'restaurant' or 'customer'
 * @param {boolean} orderData.collect_delivery_fees - Whether to collect delivery fees from customer
 * @param {string|number} orderData.cash_to_be_collected - Customer payment amount
 * @param {string|number} orderData.amount - Alias for cash_to_be_collected
 * @param {string|number} orderData.order_cost - Delivery service fee
 * @param {string|number} orderData.driver_cost - Driver's earning (optional)
 *
 * @returns {Object} Collection details
 * @returns {number} totalAmount - Total amount driver should collect
 * @returns {boolean} includesDeliveryFees - Whether total includes delivery fees
 * @returns {string} orderType - Order type: 'B2B', 'B2C', 'Unknown', or 'Error'
 * @returns {Object} breakdown - Detailed breakdown of amounts
 * @returns {number} breakdown.customerPayment - Customer's food payment
 * @returns {number} breakdown.deliveryFees - Delivery fee amount
 * @returns {string} breakdown.note - Human-readable explanation
 *
 * @example
 * // B2B Order Example
 * const b2bOrder = {
 *   order_source: 'dispatch_panel',
 *   delivery_fee_paid_by: 'restaurant',
 *   cash_to_be_collected: '50.00',
 *   order_cost: '13.00'
 * };
 * const result = calculateDriverCollection(b2bOrder);
 * // Returns: { totalAmount: 50.00, includesDeliveryFees: false, orderType: 'B2B', ... }
 *
 * @example
 * // B2C Order Example
 * const b2cOrder = {
 *   order_source: 'customer_app',
 *   delivery_fee_paid_by: 'customer',
 *   collect_delivery_fees: true,
 *   cash_to_be_collected: '80.00',
 *   order_cost: '13.00'
 * };
 * const result = calculateDriverCollection(b2cOrder);
 * // Returns: { totalAmount: 93.00, includesDeliveryFees: true, orderType: 'B2C', ... }
 */
export const calculateDriverCollection = (orderData) => {
  // Validate input
  if (!orderData) {
    console.warn('[PaymentCalc] Order data is null or undefined');
    return getErrorFallback(null);
  }

  try {
    // Parse values safely (API returns strings)
    const cashToCollect = parseFloat(orderData.cash_to_be_collected || orderData.amount || 0);
    const deliveryFees = parseFloat(orderData.order_cost || 0);

    // Validate numeric values
    if (isNaN(cashToCollect)) {
      console.error('[PaymentCalc] Invalid cash_to_be_collected value:', orderData.cash_to_be_collected);
      return getErrorFallback(orderData);
    }

    if (isNaN(deliveryFees)) {
      console.error('[PaymentCalc] Invalid order_cost value:', orderData.order_cost);
      // Continue with deliveryFees = 0 for non-critical error
    }

    // Ensure non-negative values
    const safeCashToCollect = Math.max(0, cashToCollect);
    const safeDeliveryFees = Math.max(0, deliveryFees);

    // Handle missing fields (backward compatibility for older orders)
    const orderSource = orderData.order_source || 'dispatch_panel';
    const deliveryFeePaidBy = orderData.delivery_fee_paid_by || 'restaurant';
    const collectDeliveryFees = orderData.collect_delivery_fees ?? false;

    console.log('[PaymentCalc] Processing order:', {
      orderSource,
      deliveryFeePaidBy,
      collectDeliveryFees,
      cashToCollect: safeCashToCollect,
      deliveryFees: safeDeliveryFees
    });

    // B2B Logic: Restaurant pays delivery fees
    // Conditions: order_source is 'dispatch_panel' OR delivery_fee_paid_by is 'restaurant'
    if (orderSource === 'dispatch_panel' || deliveryFeePaidBy === 'restaurant') {
      return {
        totalAmount: safeCashToCollect,
        includesDeliveryFees: false,
        orderType: 'B2B',
        breakdown: {
          customerPayment: safeCashToCollect,
          deliveryFees: 0,
          actualDeliveryFee: safeDeliveryFees, // For reference (paid by restaurant)
          note: 'Delivery fee paid by restaurant'
        }
      };
    }

    // B2C Logic: Customer pays delivery fees
    // Conditions: collect_delivery_fees is true OR delivery_fee_paid_by is 'customer'
    //             OR order_source is 'customer_app' or 'website'
    if (
      collectDeliveryFees ||
      deliveryFeePaidBy === 'customer' ||
      orderSource === 'customer_app' ||
      orderSource === 'website'
    ) {
      return {
        totalAmount: safeCashToCollect + safeDeliveryFees,
        includesDeliveryFees: true,
        orderType: 'B2C',
        breakdown: {
          customerPayment: safeCashToCollect,
          deliveryFees: safeDeliveryFees,
          note: 'Customer pays all fees'
        }
      };
    }

    // Fallback for edge cases (should rarely hit this)
    console.warn('[PaymentCalc] Falling back to default B2B behavior for order:', orderSource);
    return {
      totalAmount: safeCashToCollect,
      includesDeliveryFees: false,
      orderType: 'Unknown',
      breakdown: {
        customerPayment: safeCashToCollect,
        deliveryFees: 0,
        actualDeliveryFee: safeDeliveryFees,
        note: 'Using fallback calculation (defaulting to B2B)'
      }
    };

  } catch (error) {
    console.error('[PaymentCalc] Unexpected error in calculation:', error);
    return getErrorFallback(orderData);
  }
};

/**
 * Safe wrapper for calculateDriverCollection with comprehensive error handling
 * This is the recommended function to use in components
 *
 * @param {Object} orderData - Order data from API
 * @returns {Object} Collection details with guaranteed structure
 */
export const safeCalculateCollection = (orderData) => {
  try {
    // Validate required fields
    if (!orderData) {
      throw new Error('Order data is missing');
    }

    return calculateDriverCollection(orderData);

  } catch (error) {
    console.error('[PaymentCalc] Safe calculation error:', error);
    return getErrorFallback(orderData);
  }
};

/**
 * Get error fallback response with safe defaults
 * @private
 */
const getErrorFallback = (orderData) => {
  const fallbackAmount = orderData ? parseFloat(orderData.cash_to_be_collected || orderData.amount || 0) : 0;
  const safeFallback = Math.max(0, isNaN(fallbackAmount) ? 0 : fallbackAmount);

  return {
    totalAmount: safeFallback,
    includesDeliveryFees: false,
    orderType: 'Error',
    breakdown: {
      customerPayment: safeFallback,
      deliveryFees: 0,
      note: 'Error in calculation - using customer payment only'
    }
  };
};

/**
 * Format collection amount with currency symbol
 *
 * @param {number} amount - Amount to format
 * @param {Object} currency - Currency object from API
 * @param {string} currency.symbol - Currency symbol (e.g., 'د.إ', '$', '€')
 * @param {string} currency.iso_code - ISO currency code (e.g., 'AED', 'USD')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 *
 * @example
 * formatCurrency(50.5, { symbol: 'د.إ', iso_code: 'AED' })
 * // Returns: "50.50 د.إ"
 */
export const formatCurrency = (amount, currency, decimals = 2) => {
  if (!currency || typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }

  const formattedAmount = amount.toFixed(decimals);
  const symbol = currency.symbol || currency.iso_code || '';

  return `${formattedAmount} ${symbol}`.trim();
};

/**
 * Get user-friendly label for collection display
 *
 * @param {string} orderType - Order type from calculation result
 * @param {boolean} includesDeliveryFees - Whether amount includes delivery fees
 * @returns {string} Display label
 */
export const getCollectionLabel = (orderType, includesDeliveryFees) => {
  if (orderType === 'B2B' || !includesDeliveryFees) {
    return 'Customer Payment';
  }
  if (orderType === 'B2C' || includesDeliveryFees) {
    return 'Total to Collect';
  }
  return 'Amount to Collect';
};

/**
 * Validate order data structure
 *
 * @param {Object} orderData - Order data to validate
 * @returns {Object} Validation result
 * @returns {boolean} isValid - Whether data is valid
 * @returns {Array<string>} errors - List of validation errors
 * @returns {Array<string>} warnings - List of validation warnings
 */
export const validateOrderData = (orderData) => {
  const errors = [];
  const warnings = [];

  if (!orderData) {
    errors.push('Order data is null or undefined');
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  if (!orderData.cash_to_be_collected && !orderData.amount) {
    errors.push('Missing cash_to_be_collected or amount field');
  }

  // Check for deprecated or legacy data
  if (!orderData.order_source) {
    warnings.push('Missing order_source field - using fallback logic');
  }

  if (!orderData.delivery_fee_paid_by) {
    warnings.push('Missing delivery_fee_paid_by field - using fallback logic');
  }

  if (orderData.collect_delivery_fees === undefined) {
    warnings.push('Missing collect_delivery_fees field - using fallback logic');
  }

  // Validate numeric fields
  const cashValue = parseFloat(orderData.cash_to_be_collected || orderData.amount || 0);
  if (isNaN(cashValue)) {
    errors.push('Invalid cash_to_be_collected value');
  }

  if (cashValue < 0) {
    warnings.push('Negative cash_to_be_collected value detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Test cases for verification
 * Use this in development/testing to verify calculations
 */
export const testCases = [
  // B2B Order (Current dispatch.yabalash.com behavior)
  {
    name: 'B2B Order - Dispatch Panel',
    order: {
      order_source: 'dispatch_panel',
      delivery_fee_paid_by: 'restaurant',
      collect_delivery_fees: false,
      cash_to_be_collected: '50.00',
      order_cost: '13.00'
    },
    expected: { totalAmount: 50.00, orderType: 'B2B', includesDeliveryFees: false }
  },
  // B2C Order (Future yabalash.com integration)
  {
    name: 'B2C Order - Customer App',
    order: {
      order_source: 'customer_app',
      delivery_fee_paid_by: 'customer',
      collect_delivery_fees: true,
      cash_to_be_collected: '80.00',
      order_cost: '13.00'
    },
    expected: { totalAmount: 93.00, orderType: 'B2C', includesDeliveryFees: true }
  },
  // Legacy Order (Missing new fields)
  {
    name: 'Legacy Order - Backward Compatibility',
    order: {
      cash_to_be_collected: '25.00',
      order_cost: '10.00'
      // Missing: order_source, delivery_fee_paid_by, collect_delivery_fees
    },
    expected: { totalAmount: 25.00, orderType: 'B2B', includesDeliveryFees: false }
  },
  // B2C Website Order
  {
    name: 'B2C Order - Website',
    order: {
      order_source: 'website',
      delivery_fee_paid_by: 'customer',
      cash_to_be_collected: '100.00',
      order_cost: '15.00'
    },
    expected: { totalAmount: 115.00, orderType: 'B2C', includesDeliveryFees: true }
  },
  // Edge case: Zero delivery fees
  {
    name: 'Free Delivery - B2C',
    order: {
      order_source: 'customer_app',
      delivery_fee_paid_by: 'customer',
      collect_delivery_fees: true,
      cash_to_be_collected: '50.00',
      order_cost: '0.00'
    },
    expected: { totalAmount: 50.00, orderType: 'B2C', includesDeliveryFees: true }
  }
];

/**
 * Run all test cases and return results
 * @returns {Object} Test results
 */
export const runTests = () => {
  console.log('[PaymentCalc] Running test cases...');
  const results = testCases.map(testCase => {
    const result = calculateDriverCollection(testCase.order);
    const passed =
      result.totalAmount === testCase.expected.totalAmount &&
      result.orderType === testCase.expected.orderType &&
      result.includesDeliveryFees === testCase.expected.includesDeliveryFees;

    if (!passed) {
      console.error(`[PaymentCalc] Test FAILED: ${testCase.name}`, {
        expected: testCase.expected,
        actual: result
      });
    } else {
      console.log(`[PaymentCalc] Test PASSED: ${testCase.name}`);
    }

    return {
      name: testCase.name,
      passed,
      expected: testCase.expected,
      actual: result
    };
  });

  const allPassed = results.every(r => r.passed);
  console.log(`[PaymentCalc] Tests complete: ${results.filter(r => r.passed).length}/${results.length} passed`);

  return {
    allPassed,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    }
  };
};

export default {
  calculateDriverCollection,
  safeCalculateCollection,
  formatCurrency,
  getCollectionLabel,
  validateOrderData,
  testCases,
  runTests
};
