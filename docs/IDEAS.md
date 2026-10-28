# Ideas parked for later

Not planned work. Nothing here is committed to; it is a place to keep ideas so they are not lost. The repository is public, so keep personal details, keys and account names out of this file.

## Installable app
- **PWA first.** A web app manifest, icons, and a versioned service worker so the site installs and works offline. It reuses the static site as it is.
- **Then Capacitor** to wrap the same site for the app stores, adding native features: study reminders for concepts set to Revisit, and offline use.
- **Store costs and rules.** Apple and Google charge developer fees, and Google requires a closed test with a minimum number of testers before a new app can go to production. Check the current rules before starting.
- **Never commit signing keys,** keystores, provisioning profiles or store credentials. Keep them outside the repository.

## Sync and accounts
- Progress that follows the learner across devices needs accounts and a backend, and a privacy policy to go with them. Until then, Export and Import of the progress file is the workaround.

## Study features
- A **review mode and flashcards** built from the Predict checks.
- **Quizzes** at the end of a module, with the amber "not quite" style.
- **Spaced repetition** over the flashcards and the Revisit list.
- **Search** over concepts and the glossary.
- **Cheat sheets** per module that print well.
- A **prerequisite map** of the modules.

## Quality
- Run the browser tests in **Safari (WebKit) and Firefox** engines as well as Chromium.
- **GitHub Actions** to run `tools/verify.mjs` on every push.
- **Lighthouse** runs for performance and accessibility.
- A **VoiceOver** pass, and a check on **a real phone**.
- Three **learner think-aloud sessions**, to see where real learners get stuck.
- An **expert review** of the maths and the "In an LLM" claims in Modules 0 to 2, including the items marked Verify in `docs/CLAIMS.md`.

## An experiment
- A throwaway **Lovable** experiment: import the site as a ZIP into Lovable to see what it produces. Treat the result as disposable and do not merge it.

## Publishing hygiene
- Add a **licence** for the code and for the text.
- An **About and sources** page that lists the books, papers and fonts used.
- A **privacy statement** (today progress stays in the browser; say so, and update it if that changes).
- **Commit-email cleanup:** check which email address appears in the public git history and use a no-reply address going forward.
