"use client";

import { VoiceSphere } from "@/components/agent/voice-sphere";
import { MicIcon } from "@/components/common/icons";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { brand } from "@/lib/brand";

const EXAMPLES = brand.voiceExamples;

const STEPS = [
  { n: "1", title: "Say what you need", text: `In ${brand.assistant.languages}` },
  { n: "2", title: "Watch it shop", text: "Products are found and added on screen" },
  { n: "3", title: "Confirm and pay", text: "It only pays after you say yes" },
];

/**
 * The home page's main feature panel: shop by voice. The whole panel starts a call;
 * the sphere stays still until a call is running (no idle animation).
 */
export function VoiceBanner() {
  const { active, label, toggle } = useVoiceSession();

  return (
    <section aria-labelledby="voice-heading" className="relative h-full overflow-hidden rounded-2xl bg-[#2b3035] text-white">
      <div className="flex h-full flex-col gap-8 p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <MicIcon className="h-3.5 w-3.5" />
            {/* "Cartiva Voice", but "CocaVoice" rather than "CocaVoice Voice". */}
            {/voice$/i.test(brand.assistant.name) ? brand.assistant.name : `${brand.assistant.name} Voice`}
          </p>
          <h2 id="voice-heading" className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Just say what you need.
          </h2>
          <p className="mt-3 text-base text-white/70">
            {brand.assistant.name} finds the products, fills your cart and checks out with you, right on this screen.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void toggle()}
              aria-pressed={active}
              aria-label={active ? `Stop ${brand.assistant.name} voice assistant` : `Start talking to ${brand.assistant.name}`}
              className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold transition-colors ${
                active ? "bg-white/15 text-white hover:bg-white/20" : "bg-white text-[#16150f] hover:bg-white/90" // fixed dark text: zinc-900 turns light in dark mode
              }`}
            >
              <MicIcon className="h-5 w-5" />
              {active ? `${label} · Tap to stop` : "Tap to talk"}
            </button>
            <span className="text-sm text-white/55">No app needed · works in your browser</span>
          </div>

          <p className="mt-6 text-xs font-medium tracking-wide text-white/50 uppercase">Try saying</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/80">
                {example}
              </li>
            ))}
          </ul>

          <ol className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  {step.n}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium">{step.title}</span>
                  <span className="mt-0.5 block text-xs text-white/55">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={() => void toggle()}
          tabIndex={-1}
          aria-hidden
          className="hidden shrink-0 self-center rounded-full lg:block lg:pr-6"
        >
          <VoiceSphere mode={active ? "listening" : "idle"} size={180} still={!active} />
        </button>
      </div>
    </section>
  );
}
