function saveShopperDetails(data) {
  $.ajax({
    url: window.saveShopperDetailsURL,
    type: 'post',
    data: {
      shopperDetails: JSON.stringify(data),
      paymentMethod: 'amazonpay',
    },
    success(data) {
      console.log('inside success');
      console.log(JSON.stringify(data));
      const select = document.querySelector('#shippingMethods');
      select.innerHTML = "";
      data.shippingMethods.forEach(shippingMethod => {
        const option = document.createElement('option');
        option.setAttribute('data-shipping-id', shippingMethod.ID);
        option.innerText = `${shippingMethod.displayName} (${shippingMethod.estimatedArrivalTime})`;
        select.appendChild(option);
      });
      select.options[0].selected = true;
      select.dispatchEvent(new Event('change'));
    },
  });
}

async function mountAmazonPayComponent() {
  const amazonPayNode = document.getElementById('amazon-container');
  const checkout = await AdyenCheckout(window.Configuration);

  const amazonConfig = {
    showOrderButton: true,
    returnUrl: window.returnUrl,
    showChangePaymentDetailsButton: true,
    amount: JSON.parse(window.basketAmount),
    amazonCheckoutSessionId: window.amazonCheckoutSessionId,
  };

  const amazonPayComponent = checkout
    .create('amazonpay', amazonConfig)
    .mount(amazonPayNode);

  const shopperDetails = await amazonPayComponent.getShopperDetails();
  saveShopperDetails(shopperDetails);
}

mountAmazonPayComponent();