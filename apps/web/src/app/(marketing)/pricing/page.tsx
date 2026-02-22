import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For personal projects and trying things out.',
    features: [
      'Client-side rendering (FFmpeg.wasm)',
      'SRT import & export',
      'Full style controls',
      'Timeline editor',
      'Up to 500 MB video files',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For creators who need server-side rendering.',
    features: [
      'Everything in Free',
      'Server-side FFmpeg rendering',
      'Up to 2 GB video files',
      '50 server renders/day',
      'Priority queue',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Self-hosted or high-volume needs.',
    features: [
      'Everything in Pro',
      'Unlimited server renders',
      'Self-host on your infra',
      'Custom storage backend',
      'Priority support',
    ],
    cta: 'Contact Us',
    href: 'mailto:hello@subtitleburner.com',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Start free with client-side rendering. Upgrade when you need server power.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-lg border p-8 ${tier.highlight ? 'border-primary ring-2 ring-primary' : ''}`}
          >
            <h2 className="text-xl font-semibold">{tier.name}</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
            <ul className="mt-6 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-primary">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              className={`mt-8 block rounded-md px-4 py-2 text-center text-sm font-medium ${
                tier.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border hover:bg-muted'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
