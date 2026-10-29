# Objectives Alignment

How **Shadows of Judgment** relates to the Aug–Nov 2026 company objectives. The game is a *supporting asset* for Track P, not the subject of it.

## The Plan This Serves

| Track | Goal | Due | Sessions |
| --- | --- | --- | --- |
| P | Harness CI/CD practical + Azure DB copy | Nov 4, 2026 | 41 |
| F | Flutter Resident Wellness Tracker MVP | Nov 1, 2026 | 68 |
| H | Harness certifications — CI + CD | Nov 1, 2026 | 56 |
| K | Kubernetes primer (prerequisite for H22) | before H22 | 6 |

171 sessions, ~39 hours, ~3.2 hrs/week. Checkpoint dates: **Sep 6** pipeline deploys to test and rollback proven · **Sep 13** DB access requested, flags working · **Oct 4** Flutter saves entries · **Oct 18** CI cert · **Nov 1** CD cert, app on phone, playbook published.

Track P is primary: learn Harness by building, not by reading. H sessions are paired prep read the day before the matching P session.

## Open Decision — Deploy Target

**P1 is blocked on approval.** The plan targets Azure (IAM, ACR, Key Vault, Container Apps, Application Insights) using a throwaway `hello-harness` container. The request to use the Azure Dev/Test subscription is drafted but not sent.

The stated fallback is *"I can create or use an existing GCP app to practise Harness on."* **This repo is that fallback.** Which path is taken changes several sessions:

| | Azure approved | GCP fallback (this repo) |
| --- | --- | --- |
| P1–P5 | As written — resource group, ACR, Key Vault, Container Apps, App Insights | Substitute Artifact Registry, Secret Manager, Cloud Run, Cloud Logging/Monitoring |
| Deploy target | `hello-harness` throwaway | This game — already containerised and deployed |
| P10 Delegate | Kubernetes, `kubectl get pods` | Still needs a cluster; Cloud Run alone does not exercise Track K |
| Track K | Directly relevant | Still required for the CD exam regardless |

Send the P1/P2 request first. Everything in Phase A branches on the answer.

## What Track P Does *Not* Get From This Repo

Do not plan to satisfy these with the game:

- **P6–P9** — inventory and branch-flow mapping of **Oomph/ResHub** automation. Employer systems, not this repo.
- **P24–P28** — FME flags `pilot_phase1_enabled` / `future_work_enabled`, targeted at pilot homes and residents. That is the work app.
- **P33–P41** — Oomph DB copy to Azure. Requires access grants and a written PII decision. Start P33 in week 5; the delay is people, not code.

## What This Repo *Is* Good For

If the GCP fallback is taken, or as extra practice alongside Azure, the game beats `hello-harness` on the sessions where realism matters:

| Session | Why this repo helps |
| --- | --- |
| P12–P13 | Real multi-stage [Dockerfile](../Dockerfile) and a real PR flow, not a one-line container |
| P14 test gate | [CardResolver.js](../src/logic/CardResolver.js) and [GameLogic.js](../src/logic/GameLogic.js) are pure logic — the only genuinely testable code here, and the right place for the first meaningful tests |
| P23 rollback drill | A visible, deliberate break in a running game is far more legible in a demo than a broken hello-world |
| P31 dashboards | Cloud Run metrics next to logs is already the way in; real traffic makes error rate and latency mean something |
| H50–H54 playbook | Concrete examples beat invented ones |

**Caveat:** the game deploys to Cloud Run, so it does not exercise Kubernetes. Track K still has to be done separately for the CD exam.

## Current Baseline

- Vite/Phaser client, Express + Socket.IO server.
- Multi-stage [Dockerfile](../Dockerfile) builds the client and packages it with the production server.
- Deployed to Cloud Run, `europe-west1`, as `shadows-of-judgment`. One `256Mi` / `1 CPU` instance, scales to zero.
- Matchmaking and active games live in process memory, so `max-instances=1` is deliberate — a deploy or restart ends active matches.
- Deployment today is `gcloud run deploy --source .` run by hand: no CI, no test gate, no immutable image tag. That gap is exactly what Track P closes.

## Game Improvement — Personal, Not Company

The UX work in [UX_IMPROVEMENTS.md](UX_IMPROVEMENTS.md) is **not in the Aug–Nov plan** and has no company deadline. LinkedIn feedback said the concept reads well but the game is hard to understand and engage with; the fix is narration and visual storytelling first, then a momentum bar, simplified card display, and a guided tutorial.

Treat it as discretionary. It competes with 157 remaining sessions on a hard November deadline, so schedule it as slack-time work rather than letting it displace Track P. Where the two touch, the game gets the benefit for free: any UX change is a real commit to push through whatever pipeline exists.

## Guardrails

- Keep `max-instances=1` until multiplayer state moves out of process memory.
- Cloud Run revision rollback disconnects active matches — fine for a drill, worth stating in the runbook.
- Use a separate Cloud Run test service before any automated production deploy.
- Restrict production Socket.IO CORS to the approved origin instead of the current wildcard fallback.
- Tag every deployable image with the commit SHA. Never deploy an unversioned `latest`.
- Protect `main` and require the CI check before merge.
- Never point a Harness pipeline at prod resident data. P38 exports from a replica or snapshot only.

## Next Actions

1. **Send the Azure Dev/Test request (P1).** Everything in Phase A waits on it. The GCP fallback is ready if the answer is no.
2. Start P1–P5 on whichever platform is approved. Week 1 of the pacing plan is Aug 10–Sep 6 for P1–P23.
3. Read H2 before P10, H6 before P11, H4 before P12 — the full pairing table is in the plan.
4. Add tests to [CardResolver.js](../src/logic/CardResolver.js) and [GameLogic.js](../src/logic/GameLogic.js) if this repo becomes the P14 test gate.
5. Diarise P33 for week 5 regardless of progress elsewhere. Access requests have human latency.

## Related Documentation

- [UX and engagement improvements](UX_IMPROVEMENTS.md) — discretionary game work
- [Deployment guide](DEPLOYMENT.md) — current Cloud Run baseline
- [Team demo script](TEAM_DEMO_SCRIPT.md) — five-minute Harness and feature-flag demo, with current verification limits
- [Game design document](GDD.md)
- [Design notes](design-notes/)
