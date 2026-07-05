/* Demo-mode content: the app stays fully explorable without an API key.
   Quizzes and flashcards are real; the tutor explains how to unlock itself. */

export const DEMO_QUIZZES = {
  "how the internet works": {
    topic: "How the Internet Works",
    questions: [
      { q: "At its core, what is the internet?", options: ["A single giant supercomputer", "A network of networks that agree to speak the same protocols", "A wireless cloud owned by big tech companies", "A database of all websites"], answer: 1, explain: "First principles: the internet is just many independent networks agreeing on shared rules (protocols like IP) so any machine can reach any other." },
      { q: "What does a packet contain besides your data?", options: ["Nothing — just raw data", "Addressing info, like a letter's envelope", "A copy of the whole website", "Your password"], answer: 1, explain: "Data is chopped into packets, each wrapped with source and destination addresses — like mailing many small envelopes." },
      { q: "Why can a video call keep working if one route between cities fails?", options: ["Packets can be re-routed dynamically around failures", "The video is stored locally", "Wi-Fi takes over automatically", "It can't — the call always drops"], answer: 0, explain: "Routers constantly share route info; packets simply flow along a different path. Resilience was a founding design goal." },
      { q: "What does DNS do?", options: ["Encrypts your traffic", "Translates names like example.com into IP addresses", "Speeds up downloads", "Blocks viruses"], answer: 1, explain: "Think of DNS as the internet's phone book: humans use names, routers use numbers." },
      { q: "What does HTTPS add on top of HTTP?", options: ["Faster loading", "Encryption and proof you're talking to the real site", "More colorful websites", "Unlimited bandwidth"], answer: 1, explain: "TLS encrypts the conversation and authenticates the server — an eavesdropper sees only scrambled bytes." },
    ],
  },
  "compound interest": {
    topic: "Compound Interest",
    questions: [
      { q: "What is the core mechanism of compounding?", options: ["Earning interest on your interest", "Banks adding bonus money", "Inflation reducing debt", "Buying low, selling high"], answer: 0, explain: "Growth feeds on itself: each period's interest joins the principal and itself earns interest — exponential, not linear." },
      { q: "Roughly how long does money take to double at 7% per year (Rule of 72)?", options: ["About 5 years", "About 10 years", "About 20 years", "About 30 years"], answer: 1, explain: "72 ÷ 7 ≈ 10.3 years. The Rule of 72 is a quick mental model for doubling time." },
      { q: "Why does starting to save at 25 beat starting at 35, even with the same total contributions?", options: ["Younger people get better rates", "The earliest money compounds for the most periods", "Taxes are lower when young", "It doesn't — timing is irrelevant"], answer: 1, explain: "Time in the market is the exponent. The earliest dollars do the heaviest lifting." },
      { q: "Compound interest working AGAINST you looks like…", options: ["A savings account", "Credit card debt growing on unpaid balances", "A paid-off mortgage", "A coupon bond"], answer: 1, explain: "The same exponential math applies to what you owe — unpaid interest gets added to the balance and grows." },
      { q: "If a quantity grows 10% per year, its growth is…", options: ["Linear", "Exponential", "Random", "Logarithmic"], answer: 1, explain: "A constant *percentage* growth rate is the definition of exponential growth." },
    ],
  },
  default: {
    topic: "The Science of Learning",
    questions: [
      { q: "Which study habit produces the most durable memory?", options: ["Re-reading notes many times", "Highlighting key sentences", "Testing yourself and spacing practice over days", "One long cram session"], answer: 2, explain: "Retrieval practice + spacing is the most replicated result in learning science." },
      { q: "The 'forgetting curve' shows that…", options: ["Memory decays fastest right after learning, then levels off", "We forget at a constant rate", "Memories never truly fade", "Sleep erases memories"], answer: 0, explain: "Ebbinghaus: steep early decay — which well-timed reviews can flatten dramatically." },
      { q: "Why do analogies help us learn?", options: ["They make text longer", "They connect new ideas to existing knowledge structures", "They are entertaining", "They replace the need for practice"], answer: 1, explain: "Memory is associative — a new idea anchored to an old one has many retrieval routes." },
      { q: "What is 'desirable difficulty'?", options: ["Making studying pleasant", "Challenges that feel harder but produce stronger learning", "Studying only easy material", "Avoiding all mistakes"], answer: 1, explain: "Effortful retrieval (like flashcards you almost forgot) strengthens memory more than easy review." },
      { q: "Best response when you get a flashcard wrong?", options: ["Remove the card", "See it again soon and rebuild the memory", "Ignore it", "Only review it next month"], answer: 1, explain: "Lapsed cards reset to short intervals — exactly what SM-2 (this app's scheduler) does." },
    ],
  },
};

export function demoQuiz(topic) {
  const key = (topic || "").toLowerCase().trim();
  if (key.includes("internet") || key.includes("network") || key.includes("web")) return DEMO_QUIZZES["how the internet works"];
  if (key.includes("compound") || key.includes("interest") || key.includes("money") || key.includes("invest")) return DEMO_QUIZZES["compound interest"];
  return DEMO_QUIZZES.default;
}

export function demoPath(goal) {
  return {
    title: `Path: ${goal}`,
    why: "A demo plan — connect an API key in Settings to get a plan tailored to your background and goals.",
    milestones: [
      { title: "Build the foundation", topics: ["Core vocabulary of " + goal, "The 3 big ideas", "Common misconceptions"] },
      { title: "Understand the mechanics", topics: ["How it works from first principles", "Worked examples"] },
      { title: "Apply it", topics: ["A small hands-on project", "Explain it to someone else"] },
      { title: "Go deeper", topics: ["Edge cases and limits", "What the experts debate"] },
    ],
  };
}

export function demoReply(userText, u) {
  return `**Demo mode** (no API key set) — here's how I'd approach "${userText.slice(0, 80)}":

From first principles, I'd start by asking: what are the most basic facts we know for sure about this? Then build the idea up layer by layer, connect it to something you already know${u.interests[0] ? ` (maybe ${u.interests[0]}?)` : ""}, and finish with a quick check question.

Connect a Claude API key in ⚙️ Settings to unlock real tutoring — streaming explanations, custom quizzes on any topic, personalized learning paths, and auto-generated flashcards.

Meanwhile: the Quiz and Review tabs are fully playable in demo mode. Want to try one?`;
}
