### What happened?

With @stripe/react-stripe-js 6.8.2 at c48d651, EmbeddedCheckoutProvider does not destroy an Embedded Checkout instance when the component unmounts before createEmbeddedCheckoutPage resolves.

The effect cleanup closes over the context value from the render that started initialization. At that point embeddedCheckout is null. When the promise later resolves, the cleanup callback still checks that stale null value, so destroy is never called and the initialized instance is leaked.

### Minimal regression

1. Return a deferred promise from createEmbeddedCheckoutPage.
2. Render EmbeddedCheckoutProvider.
3. Unmount the provider before resolving the promise.
4. Resolve it with a mocked Embedded Checkout instance.
5. Observe that instance.destroy has zero calls.

The existing teardown test only resolves initialization before unmounting, so it does not cover this ordering.

### Expected behavior

The eventual Embedded Checkout instance should be destroyed exactly once when initialization finishes after its provider has already unmounted.

### Environment

React Stripe.js 6.8.2, React 18.1.0, Jest/jsdom on macOS.
