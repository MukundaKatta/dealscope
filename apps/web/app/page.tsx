import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Nav */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DS</span>
            </div>
            <span className="font-bold text-xl">DealScope</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
            <Link href="/deals" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            AI-Powered Real Estate Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Find, analyze, and score
            <span className="text-primary"> investment deals</span> in seconds
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            DealScope scans thousands of listings, runs institutional-grade underwriting,
            and scores every deal so you never miss a profitable opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/deals"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-base font-medium hover:opacity-90 transition text-center"
            >
              Start Scanning Deals
            </Link>
            <Link
              href="/calculator"
              className="border border-border px-8 py-3 rounded-lg text-base font-medium hover:bg-accent transition text-center"
            >
              Try the Calculator
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl">
          {[
            { value: "50K+", label: "Properties Analyzed" },
            { value: "8.2%", label: "Avg Cash-on-Cash" },
            { value: "2.3s", label: "Analysis Time" },
            { value: "94%", label: "Scoring Accuracy" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything you need to invest smarter
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          From scanning markets to closing deals, DealScope gives you the edge.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Deal Scanner",
              description: "Automatically scan Zillow, MLS, and other sources for new listings matching your criteria. Get instant alerts on the best deals.",
              icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
            },
            {
              title: "AI Underwriting",
              description: "Institutional-grade analysis: cap rate, cash-on-cash, DSCR, IRR, and 5-year projections calculated in seconds.",
              icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
            },
            {
              title: "Deal Scoring",
              description: "Every property gets a 1-100 score across cash flow, appreciation, risk, location, and market factors. A+ to F grading.",
              icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
            },
            {
              title: "Comp Analysis",
              description: "Find comparable sales and rental comps with similarity scoring. Auto-adjust for differences in size, age, and features.",
              icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
            },
            {
              title: "Market Analytics",
              description: "ZIP-code level analytics: appreciation trends, rent growth, inventory, employment, schools, and crime data.",
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
            },
            {
              title: "Portfolio Tracker",
              description: "Track your owned properties with real-time equity, cash flow, and ROI. Monitor your entire portfolio in one dashboard.",
              icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="border rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-muted-foreground text-center mb-16">Start free. Upgrade when you need more.</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: "Free", price: "$0", period: "forever", features: ["5 analyses/month", "Basic deal scoring", "1 alert criteria", "Community support"], cta: "Get Started" },
            { name: "Pro", price: "$49", period: "/month", features: ["Unlimited analyses", "AI market commentary", "10 alert criteria", "SMS + push alerts", "Comp analysis", "Portfolio tracker", "Priority support"], cta: "Start Free Trial", popular: true },
            { name: "Enterprise", price: "$199", period: "/month", features: ["Everything in Pro", "MLS direct feed", "API access", "Team collaboration", "Custom scoring models", "Dedicated success manager"], cta: "Contact Sales" },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-xl p-8 ${plan.popular ? "border-primary shadow-lg ring-1 ring-primary relative" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/deals"
                className={`block text-center py-2.5 rounded-lg text-sm font-medium transition ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border hover:bg-accent"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">DS</span>
            </div>
            <span className="font-semibold">DealScope</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DealScope. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
