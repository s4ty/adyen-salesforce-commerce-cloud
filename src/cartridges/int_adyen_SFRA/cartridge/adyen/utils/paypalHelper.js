/**
 *                       ######
 *                       ######
 * ############    ####( ######  #####. ######  ############   ############
 * #############  #####( ######  #####. ######  #############  #############
 *        ######  #####( ######  #####. ######  #####  ######  #####  ######
 * ###### ######  #####( ######  #####. ######  #####  #####   #####  ######
 * ###### ######  #####( ######  #####. ######  #####          #####  ######
 * #############  #############  #############  #############  #####  ######
 *  ############   ############  #############   ############  #####  ######
 *                                      ######
 *                               #############
 *                               ############
 * Adyen Salesforce Commerce Cloud
 * Copyright (c) 2021 Adyen B.V.
 * This file is open source and available under the MIT license.
 * See the LICENSE file for more info.
 *
 * Add all product and shipping line items to request
 */
const Money = require('dw/value/Money');
const LineItemHelper = require('*/cartridge/adyen/utils/lineItemHelper');
const AdyenHelper = require('*/cartridge/adyen/utils/adyenHelper');

const PAYPAL_ITEM_CATEGORY = ['PHYSICAL_GOODS', 'DIGITAL_GOODS', 'DONATION'];
function getLineItems({ Order: order, Basket: basket }) {
  if (!(order || basket)) return null;
  const orderOrBasket = order || basket;
  const allLineItems = LineItemHelper.getAllLineItems(
    orderOrBasket.getAllLineItems(),
  );
  return allLineItems.map((lineItem) => {
    const lineItemObject = {};
    const description = LineItemHelper.getDescription(lineItem);
    const id = LineItemHelper.getId(lineItem);
    const quantity = LineItemHelper.getQuantity(lineItem);
    const itemAmount = LineItemHelper.getItemAmount(lineItem).divide(quantity);
    const vatAmount = LineItemHelper.getVatAmount(lineItem).divide(quantity);
    // eslint-disable-next-line
    if (lineItem.hasOwnProperty('category')) {
      if (PAYPAL_ITEM_CATEGORY.indexOf(lineItem.category) > -1) {
        lineItemObject.itemCategory = lineItem.category;
      }
    }
    lineItemObject.quantity = quantity;
    lineItemObject.description = description;
    lineItemObject.sku = id;
    lineItemObject.amountExcludingTax = itemAmount.getValue().toFixed();
    lineItemObject.taxAmount = vatAmount.getValue().toFixed();
    return lineItemObject;
  });
}

/**
 * @typedef {object} paypalShippingOption
 * @property {string} reference - shipping method id
 * @property {string} description - shipping method displayName
 * @property {('Shipping')} type
 * @property {{currencyCode: String, value: String}} amount
 *          - shipping cost for shipping method including tax
 * @property {boolean} selected - - shipping method is selected
 */

/**
 * @typedef {object} paypalUpdateOrderRequest
 * @property {String} pspReference - the pspReference returned from adyen /payments endpoint
 * @property {String} paymentData - encrypted payment data from paypal component
 * @property {{currencyCode: String, value: String}} amount
 *          - adjustedMerchandizeTotalGrossPrice + adjustedShippingTotalGrossPrice
 * @property {dw.util.ArrayList<paypalShippingOption>} deliveryMethods
 *          - list of paypalShippingOption
 */

/**
 * Returns applicable shipping methods(excluding store pickup methods)
 * for specific Shipment / ShippingAddress pair.
 * @param {String} pspReference - the pspReference returned from adyen /payments endpoint
 * @param {dw.order.basket} amount - a shipment of the current basket
 * @param {dw.util.ArrayList<ApplicableShippingMethodModel>} currentShippingMethods
 *        - a shipment of the current basket
 * @param {String} paymentData - encrypted payment data from paypal component
 * @returns {paypalUpdateOrderRequest} - list of applicable shipping methods or null
 */
function createPaypalUpdateOrderRequest(
  pspReference,
  currentBasket,
  currentShippingMethods,
  paymentData,
) {
  const adjustedShippingTotalGrossPrice = {
    currency: currentBasket.currencyCode,
    value: AdyenHelper.getCurrencyValueForApi(
      currentBasket.getAdjustedShippingTotalGrossPrice(),
    ).value,
  };
  const adjustedMerchandizeTotalGrossPrice = {
    currency: currentBasket.currencyCode,
    value:
      AdyenHelper.getCurrencyValueForApi(
        currentBasket.getAdjustedMerchandizeTotalGrossPrice(),
      ).value + adjustedShippingTotalGrossPrice.value,
  };
  const deliveryMethods = currentShippingMethods.map((shippingMethod) => {
    const { currencyCode, value } = shippingMethod.shippingCost;
    return {
      reference: shippingMethod.ID,
      description: shippingMethod.displayName,
      type: 'Shipping',
      amount: {
        currency: currencyCode,
        value: AdyenHelper.getCurrencyValueForApi(
          new Money(value, currencyCode),
        ).value,
      },
      selected: shippingMethod.selected,
    };
  });
  return {
    pspReference,
    paymentData,
    amount: adjustedMerchandizeTotalGrossPrice,
    deliveryMethods,
  };
}

module.exports = { createPaypalUpdateOrderRequest, getLineItems };
