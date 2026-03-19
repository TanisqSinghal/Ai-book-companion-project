import { PricingTable } from "@clerk/nextjs";
import { SUBSCRIPTION_LIMITS } from "@/lib/subscriptions-constants";

const planFeatureCards = [
  {
    name: "Free",
    features: [
      `Up to ${SUBSCRIPTION_LIMITS.free.maxBooks} book`,
      `Up to ${SUBSCRIPTION_LIMITS.free.maxSessionsPerMonth} voice sessions per month`,
      `${SUBSCRIPTION_LIMITS.free.maxSessionMinutes}-minute sessions`,
    ],
  },
  {
    name: "Standard",
    features: [
      `Up to ${SUBSCRIPTION_LIMITS.standard.maxBooks} books`,
      `Up to ${SUBSCRIPTION_LIMITS.standard.maxSessionsPerMonth} voice sessions per month`,
      `${SUBSCRIPTION_LIMITS.standard.maxSessionMinutes}-minute sessions`,
    ],
  },
  {
    name: "Pro",
    features: [
      `Up to ${SUBSCRIPTION_LIMITS.pro.maxBooks} books`,
      "Unlimited voice sessions per month",
      `${SUBSCRIPTION_LIMITS.pro.maxSessionMinutes}-minute sessions`,
    ],
  },
];

export default function SubscriptionsPage() {
  return (
    <main className="wrapper container">
      <section className="mx-auto max-w-6xl pt-6 pb-4">
        <div className="mb-10 flex flex-col items-center text-center">
          <h1 className="page-title-xl">Choose Your Plan</h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
          Upgrade to unlock more books, longer sessions, and advanced features.
          </p>
        </div>

        <div className="clerk-pricing-container clerk-pricing-table-wrapper w-full">
          <PricingTable />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {planFeatureCards.map((plan) => (
            <section
              key={plan.name}
              className="rounded-[14px] border border-[var(--border-subtle)] bg-white p-5 shadow-soft-sm"
            >
              <h2 className="text-xl font-semibold font-serif text-[var(--text-primary)]">
                {plan.name} includes
              </h2>
              <ul className="mt-3 space-y-2 text-[var(--text-secondary)]">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}