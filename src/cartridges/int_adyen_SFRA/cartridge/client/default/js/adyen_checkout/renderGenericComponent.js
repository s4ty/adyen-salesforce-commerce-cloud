const store = require('../../../../store');
const { renderPaymentMethod } = require('./renderPaymentMethod');
const helpers = require('./helpers');
const { installmentLocales } = require('./localesUsingInstallments');
const { createSession } = require('../commons');

function addPosTerminals(terminals) {
  const ddTerminals = document.createElement('select');
  ddTerminals.id = 'terminalList';
  Object.keys(terminals).forEach((t) => {
    const option = document.createElement('option');
    option.value = terminals[t];
    option.text = terminals[t];
    ddTerminals.appendChild(option);
  });
  document.querySelector('#adyenPosTerminals').append(ddTerminals);
}

function setCheckoutConfiguration(checkoutOptions) {
  const setField = (key, val) => val && { [key]: val };
  store.checkoutConfiguration = {
    ...store.checkoutConfiguration,
    ...setField('amount', checkoutOptions.amount),
    ...setField('countryCode', checkoutOptions.countryCode),
  };
}

function resolveUnmount(key, val) {
  try {
    return Promise.resolve(val.node.unmount(`component_${key}`));
  } catch (e) {
    // try/catch block for val.unmount
    return Promise.resolve(false);
  }
}

/**
 * To avoid re-rendering components twice, unmounts existing components from payment methods list
 */
function unmountComponents() {
  const promises = Object.entries(store.componentsObj).map(([key, val]) => {
    delete store.componentsObj[key];
    return resolveUnmount(key, val);
  });
  return Promise.all(promises);
}

function renderStoredPaymentMethod(imagePath) {
  return (pm) => {
    if (pm.supportedShopperInteractions.includes('Ecommerce')) {
      renderPaymentMethod(pm, true, imagePath);
    }
  };
}

function renderStoredPaymentMethods(data, imagePath) {
  if (data.storedPaymentMethods) {
    const { storedPaymentMethods } = data;
    storedPaymentMethods.forEach(renderStoredPaymentMethod(imagePath));
  }
}

function renderPaymentMethods(data, imagePath, adyenDescriptions) {
  data.paymentMethods.forEach((pm) => {
    renderPaymentMethod(pm, false, imagePath, adyenDescriptions[pm.type]);
  });
}

function renderPosTerminals(adyenConnectedTerminals) {
  const removeChilds = () => {
    const posTerminals = document.querySelector('#adyenPosTerminals');
    while (posTerminals.firstChild) {
      posTerminals.removeChild(posTerminals.firstChild);
    }
  };

  if (adyenConnectedTerminals?.uniqueTerminalIds?.length) {
    removeChilds();
    addPosTerminals(adyenConnectedTerminals.uniqueTerminalIds);
  }
}

function setAmazonPayConfig(adyenPaymentMethods) {
  const amazonpay = adyenPaymentMethods.paymentMethods.find(
    (paymentMethod) => paymentMethod.type === 'amazonpay',
  );
  if (amazonpay) {
    store.checkoutConfiguration.paymentMethodsConfiguration.amazonpay.configuration =
      amazonpay.configuration;
    store.checkoutConfiguration.paymentMethodsConfiguration.amazonpay.addressDetails = {
      name: `${document.querySelector('#shippingFirstNamedefault')?.value} ${
        document.querySelector('#shippingLastNamedefault')?.value
      }`,
      addressLine1: document.querySelector('#shippingAddressOnedefault')?.value,
      city: document.querySelector('#shippingAddressCitydefault')?.value,
      stateOrRegion: document.querySelector('#shippingAddressCitydefault')
        ?.value,
      postalCode: document.querySelector('#shippingZipCodedefault')?.value,
      countryCode: document.querySelector('#shippingCountrydefault')?.value,
      phoneNumber: document.querySelector('#shippingPhoneNumberdefault')?.value,
    };
  }
}

function setInstallments(amount) {
  try {
    if (installmentLocales.indexOf(window.Configuration.locale) < 0) {
      return;
    }
    const [minAmount, numOfInstallments] = window.installments
      ?.replace(/\[|]/g, '')
      .split(',');
    if (minAmount <= amount.value) {
      store.checkoutConfiguration.paymentMethodsConfiguration.card.installmentOptions = {
        card: {},
      }; // eslint-disable-next-line max-len
      store.checkoutConfiguration.paymentMethodsConfiguration.card.installmentOptions.card.values = helpers.getInstallmentValues(
        numOfInstallments,
      );
      store.checkoutConfiguration.paymentMethodsConfiguration.card.showInstallmentAmounts = true;
    }
  } catch (e) {} // eslint-disable-line no-empty
}

function renderGiftCard(paymentMethod) {
    let giftCardNode;
    const giftcardContainer =  document.querySelector("#giftcard-container");
    const giftCardLabel =  document.querySelector("#giftCardLabel");
    const closeGiftCardModal =  document.createElement("button");
    closeGiftCardModal.id = "closeGiftCardModal";
    closeGiftCardModal.innerText = "X";
    document.querySelector("#adyenModalDialog").appendChild(giftcardContainer);
    document.querySelector("#adyenModalDialog").appendChild(closeGiftCardModal);
    giftCardLabel.addEventListener('click', () => {
        $('#action-modal').modal({ backdrop: 'static', keyboard: false });
        giftcardContainer.innerText = "";
        console.log('inside giftcardContainer onclick');
        giftCardNode = store.checkout.create(paymentMethod.type).mount(giftcardContainer);
    });

    closeGiftCardModal.addEventListener('click', () => {
        $('#action-modal').modal('hide');
        giftCardNode.unmount(`component_giftcard`);
//        document.querySelector("#component_giftcard").remove();
//        renderPaymentMethod({type: "giftcard"}, false, store.checkoutConfiguration.session.imagePath, null, true);
//        document.querySelector("#component_giftcard").style.display = "block";
    });

    store.componentsObj["giftcard"] = {node: giftCardNode};
}

/**
 * Calls createSession and then renders the retrieved payment methods (including card component)
 */
module.exports.renderGenericComponent = async function renderGenericComponent() {
  if (Object.keys(store.componentsObj).length !== 0) {
    await unmountComponents();
  }

  const session = await createSession();

  store.checkoutConfiguration.session = {
    id: session.id,
    sessionData: session.sessionData,
    imagePath: session.imagePath,
    adyenDescriptions: session.adyenDescriptions,
  };
  store.checkout = await AdyenCheckout(store.checkoutConfiguration);
  setCheckoutConfiguration(store.checkout.options);
  setInstallments(store.checkout.options.amount);
  setAmazonPayConfig(store.checkout.paymentMethodsResponse);
  document.querySelector('#paymentMethodsList').innerHTML = '';

    console.log('paymentMethodsResponse ' + JSON.stringify(store.checkout.paymentMethodsResponse.paymentMethods));
    store.checkout.paymentMethodsResponse.paymentMethods.some(pm => {
        if(pm.type === "giftcard") {
            console.log('inside giftcard if statement')
            renderGiftCard(pm);
        }
    });

  renderStoredPaymentMethods(
    store.checkout.paymentMethodsResponse,
    session.imagePath,
  );
  renderPaymentMethods(
    store.checkout.paymentMethodsResponse,
    session.imagePath,
    session.adyenDescriptions,
  );
  renderPosTerminals(session.adyenConnectedTerminals);

  const firstPaymentMethod = document.querySelector(
    'input[type=radio][name=brandCode]',
  );
  firstPaymentMethod.checked = true;
  helpers.displaySelectedMethod(firstPaymentMethod.value);

  helpers.createShowConfirmationForm(
    window.ShowConfirmationPaymentFromComponent,
  );
};
