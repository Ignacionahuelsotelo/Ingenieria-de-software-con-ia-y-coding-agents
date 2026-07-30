// Hero terminal: reveals a fake diff line by line, like an agent applying a patch.
(function heroDiff() {
  const el = document.getElementById("diff-output");
  if (!el) return;

  const lines = [
    { type: "rm", text: "- await sleep(1000) // retry ingenuo" },
    { type: "rm", text: "- if (fails) throw err" },
    { type: "add", text: "+ const backoff = expo(attempt, { max: 30_000 })" },
    { type: "add", text: "+ await sleep(backoff)" },
    { type: "add", text: "+ if (attempt > MAX_RETRIES) escalate(err)" },
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    el.innerHTML = lines
      .map((l) => `<span class="diff-${l.type}">${l.text}</span>`)
      .join("\n");
    return;
  }

  let lineIndex = 0;
  let charIndex = 0;
  const rendered = [];

  function tick() {
    if (lineIndex >= lines.length) return;
    const current = lines[lineIndex];

    if (charIndex === 0) rendered.push("");
    charIndex++;
    rendered[lineIndex] = current.text.slice(0, charIndex);

    el.innerHTML = rendered
      .map((text, i) => `<span class="diff-${lines[i].type}">${text}</span>`)
      .join("\n");

    if (charIndex >= current.text.length) {
      lineIndex++;
      charIndex = 0;
      setTimeout(tick, 220);
    } else {
      setTimeout(tick, 14);
    }
  }

  setTimeout(tick, 500);
})();

// Scroll reveal for section content.
(function scrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    targets.forEach((t) => t.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((t) => observer.observe(t));
})();

// Signup form: placeholder handler until a real backend/endpoint is wired up.
(function signupForm() {
  const form = document.getElementById("signup-form");
  const status = document.getElementById("signup-status");
  if (!form || !status) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) return;
    status.textContent = `$ listo — te escribimos a ${email} cuando abra la inscripción`;
    form.reset();
  });
})();
