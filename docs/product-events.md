# Sending product events to RaveSoft AI OS

Each product (CliqPOS, KOVABOT, HMS, Restovax) reports lifecycle events to
`POST https://ravesoftsolutions.com/api/os/webhooks/product`.

Setup: set `PRODUCT_WEBHOOK_SECRET` in RaveSoft (Vercel) and the same value in the product's server config.
Never expose the secret to browsers or mobile apps — send events from the product's backend only.

## Event shape (single object, or an array of up to 100)

| field | required | notes |
|---|---|---|
| businessUnit | yes | `CLIQPOS`, `KOVABOT`, `HMS`, `RESTOVAX` |
| type | yes | `REGISTERED`, `ACTIVATED`, `SUBSCRIBED`, `PAYMENT`, `USAGE`, `CHURNED`, `SUPPORT_TICKET` |
| externalId | yes | unique per event; retries with the same id are ignored |
| userRef | yes | the product's own account/tenant id (stable) |
| email, name | no | shown in the customer record |
| amountCents | PAYMENT | integer, USD cents. Creates/updates the customer and books revenue |
| recurring | no | defaults to true for PAYMENT |
| count | USAGE | number of actions since last event (feeds customer health) |
| occurredAt | no | ISO-8601; defaults to now |

Define **ACTIVATED** per product (e.g. CliqPOS: first sale recorded; KOVABOT: first AI employee live) —
the funnel page measures registration → activation → payment from these three events.

## Signing

`x-rave-signature` = hex HMAC-SHA256 of the **raw request body** with `PRODUCT_WEBHOOK_SECRET`.

### Node / TypeScript
```ts
import { createHmac } from "crypto";

export async function sendProductEvent(events: object | object[]) {
  const body = JSON.stringify(events);
  const sig = createHmac("sha256", process.env.RAVE_PRODUCT_WEBHOOK_SECRET!).update(body).digest("hex");
  const res = await fetch("https://ravesoftsolutions.com/api/os/webhooks/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-rave-signature": sig },
    body,
  });
  if (!res.ok) throw new Error(`RaveSoft event rejected: ${res.status}`); // log + retry later; ids make retries safe
  return res.json();
}

// e.g. on signup
await sendProductEvent({ businessUnit: "CLIQPOS", type: "REGISTERED", externalId: `reg-${user.id}`, userRef: String(user.id), email: user.email, name: user.shopName });
```

### PHP (Laravel / plain)
```php
function sendProductEvent(array $events): void {
    $body = json_encode($events);
    $sig  = hash_hmac('sha256', $body, env('RAVE_PRODUCT_WEBHOOK_SECRET'));
    $ch = curl_init('https://ravesoftsolutions.com/api/os/webhooks/product');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['content-type: application/json', "x-rave-signature: $sig"]]);
    $out = curl_exec($ch);
    if (curl_getinfo($ch, CURLINFO_HTTP_CODE) >= 300) { error_log("RaveSoft event failed: $out"); /* queue for retry */ }
    curl_close($ch);
}

sendProductEvent(['businessUnit' => 'CLIQPOS', 'type' => 'PAYMENT', 'externalId' => "pay-$payment->id",
    'userRef' => (string)$shop->id, 'name' => $shop->name, 'amountCents' => 4900, 'recurring' => true]);
```

## Checklist
1. Fire `REGISTERED` on signup, `ACTIVATED` on the first meaningful action, `PAYMENT` on every successful charge.
2. Send a daily `USAGE` event per active account with `count` = actions that day (health scoring needs ≥2 periods).
3. Send `CHURNED` on cancellation/non-renewal.
4. Queue and retry on failure — duplicates are safe because of `externalId`.
5. Check `/admin/products` for the funnel and `/admin/customers` for health once events arrive.
