import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Burn Subtitles Into Your Videos
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Open-source subtitle editor with styled text, timeline editing, and rendering — right in your browser or on your server.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border px-6 py-3 font-medium hover:bg-muted"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-8 pb-24 md:grid-cols-3">
        {[
          {
            title: 'Client-Side Rendering',
            description:
              'Render videos directly in your browser with FFmpeg.wasm. No upload needed — your data stays private.',
          },
          {
            title: 'Server Rendering',
            description:
              'For longer videos, use server-side FFmpeg processing with job queue and progress tracking.',
          },
          {
            title: 'Full Style Control',
            description:
              'Font, size, color, background, outline, shadow, position — customize every aspect of your subtitles.',
          },
          {
            title: 'Timeline Editor',
            description:
              'Drag, resize, and fine-tune subtitle timing with a visual timeline and keyboard shortcuts.',
          },
          {
            title: 'SRT Import/Export',
            description:
              'Import existing SRT files, edit them visually, and export back to SRT format.',
          },
          {
            title: 'Self-Hostable',
            description:
              'Deploy on Vercel or your own VPS with Docker. Same codebase, different infrastructure.',
          },
        ].map((feature) => (
          <div key={feature.title} className="rounded-lg border p-6">
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
