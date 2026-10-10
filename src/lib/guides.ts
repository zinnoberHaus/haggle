export type Guide = {
  slug: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  tint: string;
  symbol: string;
  takeaway: string;
  sections: { heading: string; paragraphs: string[]; checklist?: string[] }[];
  example: {
    title: string;
    rows: { label: string; value: string }[];
    note: string;
  };
  sources: { label: string; url: string }[];
};

export const guides: Guide[] = [
  {
    slug: "compare-the-final-price",
    category: "Buying better",
    title: "The lowest sticker price isn’t always the best deal.",
    description:
      "A five-minute check for comparing the same product across stores, without losing the savings to shipping or conditions.",
    readTime: "4 min read",
    tint: "#EAE3D6",
    symbol: "=",
    takeaway:
      "Compare what leaves your wallet today before counting anything that might come back later.",
    sections: [
      {
        heading: "Start with an exact match",
        paragraphs: [
          "Write down the model, capacity, size, color, condition, and included accessories. A cheaper refurbished item or an older model may still be a good choice, but it is a different choice. Keep it in a separate comparison.",
          "Check who actually sells and ships the item. A marketplace listing on a familiar website can come from another seller with different return terms.",
        ],
      },
      {
        heading: "Make two totals",
        paragraphs: [
          "Your first total is the checkout cost: item price minus accepted discounts, plus shipping and any taxes or required fees shown by the merchant. Your second is a conditional estimate after eligible rewards. Keeping both numbers makes the uncertainty visible.",
          "If a discount needs a new membership, add the membership cost unless you already planned to buy it. Do not add extra items just to unlock a shipping threshold without comparing the extra spend to the delivery charge.",
        ],
      },
      {
        heading: "Give the return policy a place in the decision",
        paragraphs: [
          "A small price difference may matter less than a return shipping charge, a restocking fee, or a delivery date that misses your deadline. Read the terms for the exact item before making the purchase.",
        ],
        checklist: [
          "Same model and condition",
          "Coupon accepted in the actual cart",
          "Shipping, fees, and taxes checked",
          "Membership cost included where needed",
          "Return window and seller identified",
        ],
      },
    ],
    example: {
      title: "An illustrative comparison",
      rows: [
        { label: "Store A: $80 item + $9 shipping", value: "$89 today" },
        { label: "Store B: $86 item + free shipping", value: "$86 today" },
        { label: "Store B: possible eligible reward", value: "$3 later" },
      ],
      note: "Store B costs $3 less before any reward. Taxes are omitted only to keep this example simple; include them in your own comparison.",
    },
    sources: [
      {
        label: "FTC: Online shopping",
        url: "https://consumer.ftc.gov/articles/online-shopping",
      },
    ],
  },
  {
    slug: "set-a-useful-price-target",
    category: "Buy or wait",
    title: "Set a price target you can actually use.",
    description:
      "Decide what a purchase is worth to you, then track an exact model instead of chasing a percentage-off badge.",
    readTime: "3 min read",
    tint: "#E1E7F1",
    symbol: "↓",
    takeaway:
      "A target price is a decision rule, not a prediction that a retailer will eventually meet it.",
    sections: [
      {
        heading: "Pick the product before picking the discount",
        paragraphs: [
          "A 40% discount says little without knowing the comparison price. Choose the item and configuration you need, then write down the maximum total you would be happy paying.",
          "Use observed prices for the same model when they are available. A brief low at an unavailable seller is less useful than a price you could actually buy. A history with only a few observations should be treated as a few observations, not a complete year.",
        ],
      },
      {
        heading: "Include a deadline",
        paragraphs: [
          "If you need headphones for a trip next week, waiting indefinitely has a cost. Set two rules: a price that would make you buy early and a date on which you will decide using the best current option.",
          "Saving a deal keeps it easy to revisit. An alert preference only becomes an actual notification service when collection and delivery are enabled. Check the status in Haggle before relying on a notification.",
        ],
      },
      {
        heading: "If the price falls after you buy",
        paragraphs: [
          "Open the retailer’s current price-adjustment policy and your order receipt. Look for the purchase date, eligible item, claim deadline, and exclusions. A return window and a price-adjustment window can be different; one does not establish the other.",
          "Keep evidence of the lower listing and contact the retailer through its official support channel. Haggle does not submit a claim for you.",
        ],
        checklist: [
          "Exact model recorded",
          "Maximum checkout total chosen",
          "Purchase deadline set",
          "Source and observation date checked",
        ],
      },
    ],
    example: {
      title: "A simple buying rule",
      rows: [
        { label: "The item", value: "Exact model, new" },
        { label: "Buy early if checkout is", value: "$120 or less" },
        { label: "Decision date", value: "One week before needed" },
      ],
      note: "These are example preferences, not a price forecast or a promise of stock.",
    },
    sources: [
      {
        label: "FTC: Compare sellers and purchase terms",
        url: "https://consumer.ftc.gov/articles/online-shopping",
      },
    ],
  },
  {
    slug: "cashback-is-not-a-checkout-discount",
    category: "Rewards, explained",
    title: "Cashback belongs on a separate line.",
    description:
      "Understand the difference between paying less now and potentially earning money or points later.",
    readTime: "3 min read",
    tint: "#DFE5E2",
    symbol: "+",
    takeaway:
      "Treat a reward as conditional until the provider confirms it, and compare the purchase without it too.",
    sections: [
      {
        heading: "Three different kinds of savings",
        paragraphs: [
          "A coupon that is accepted by a merchant reduces the checkout price. A cashback portal may record an eligible shopping trip and pay later. A card reward is governed by the issuer’s program. They are different systems, even when they appear beside the same offer.",
          "A rate may apply only to eligible merchandise, not shipping, tax, or the entire basket. Use the terms for that merchant and category rather than multiplying a headline percentage by every dollar.",
        ],
      },
      {
        heading: "Read the exclusions before clicking through",
        paragraphs: [
          "Rakuten explains that excluded categories, cancellations, and coupons it does not list can affect cashback eligibility. Other providers have their own rules. Start with the provider’s current store page and keep the applicable terms with your purchase record.",
          "Do not assume that two cashback services can both claim the same purchase. Choose the route whose conditions you understand, and avoid counting a reward twice in your budget.",
        ],
      },
      {
        heading: "Count what actually arrives",
        paragraphs: [
          "Keep estimated, pending, confirmed, and received amounts separate. If you return something, update the estimate. A pending reward is not cash available to pay today’s bill.",
          "Use a payment method you already intended to use. Rewards do not justify interest, a late fee, or buying something you do not need.",
        ],
        checklist: [
          "Eligible category checked",
          "Coupon compatibility checked",
          "Reward calculated on the eligible amount",
          "Immediate and later totals separated",
        ],
      },
    ],
    example: {
      title: "One purchase, two numbers",
      rows: [
        { label: "Item price", value: "$100" },
        { label: "Accepted coupon", value: "−$10" },
        { label: "Checkout before tax/shipping", value: "$90" },
        { label: "Illustrative 5% eligible reward", value: "$4.50 later" },
      ],
      note: "The $4.50 is an estimate only if the full $90 qualifies. You still pay the merchant $90 before any additional charges.",
    },
    sources: [
      {
        label: "Rakuten: Online cashback and eligibility",
        url: "https://www.rakuten.com/help/category/online-cash-back-26577737853715",
      },
      {
        label: "Rakuten: Exclusions and limitations",
        url: "https://www.rakuten.com/help/exclusions.htm",
      },
    ],
  },
  {
    slug: "read-the-coupon-fine-print",
    category: "Coupon know-how",
    title: "When a coupon works, and when it doesn’t.",
    description:
      "Minimum spends, selected styles, memberships, and code stacking: read an offer before building your cart around it.",
    readTime: "3 min read",
    tint: "#EFE5DF",
    symbol: "%",
    takeaway:
      "A coupon is a possibility until the merchant accepts it for your exact cart.",
    sections: [
      {
        heading: "Translate the offer into a checklist",
        paragraphs: [
          "Identify the expiration date and time zone, minimum eligible spend, excluded brands or categories, and any account requirement. “Up to” describes the maximum available discount, not the discount on every item.",
          "Minimum spend can mean eligible merchandise after other discounts, excluding delivery and tax. Check how the merchant defines it rather than using your cart’s headline total.",
        ],
      },
      {
        heading: "Test the final result",
        paragraphs: [
          "Apply the code on the merchant’s checkout page and read the result. If it fails, inspect the eligibility details instead of assuming the listing is wrong or adding random items.",
          "When a store accepts only one code, compare the final totals with each offer. A dollar-off code can beat a larger percentage, and free delivery can beat either one on a small order. Recheck cashback terms before counting a coupon and a portal reward together.",
        ],
      },
      {
        heading: "Let an expired deal go",
        paragraphs: [
          "Codes can run out or change before a listing catches up. If the verified checkout total is no longer attractive, leave the item saved and decide later. The time already spent looking for a code is not a reason to buy.",
          "Avoid giving an unfamiliar coupon website payment details or installing software just to reveal a code. Use the retailer’s official checkout to confirm the offer.",
        ],
        checklist: [
          "Dates and exclusions read",
          "Minimum eligible spend checked",
          "Code accepted for this cart",
          "Final total better than the alternatives",
        ],
      },
    ],
    example: {
      title: "Compare the result, not the badge",
      rows: [
        { label: "$60 cart with 10% off", value: "$54" },
        { label: "$60 cart with $10 off", value: "$50" },
        { label: "Difference before delivery/tax", value: "$4" },
      ],
      note: "Assumes the entire cart is eligible and both codes are valid individually. They are not assumed to stack.",
    },
    sources: [
      {
        label: "FTC: Online shopping checks",
        url: "https://consumer.ftc.gov/articles/online-shopping",
      },
      {
        label: "Rakuten: Coupon exclusions",
        url: "https://www.rakuten.com/help/exclusions.htm",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
