# Team Demo Script: Five Minutes

## Before the Demo

- Open the live game, the production `test_mode_enabled` flag, and Cloud Run service metrics.
- Open Harness run #198 as a historical successful CD run, and run #209 as the latest PR validation. Run #209 passed its build and skipped production approval/CD.
- In the project-scoped Harness Delegates page, confirm `docker-delegate` is **Connected** with a recent heartbeat. Confirm the local Docker container is healthy.
- Check that no delegate token is in demo notes. Revoke/rotate any token that was exposed.
- Restore the flag's original production targeting after the demo.

## 1. Goal and Architecture: 30 Seconds

> “I used Shadows of Judgment to learn Harness CI/CD, deployment, rollback, and feature flags. The game runs on Google Cloud Run. Harness connects GitHub, Artifact Registry, and stored credentials.
>
> There is one live game environment. A separate dev-to-production promotion flow remains deferred.”

## 2. Build and Deployment: 1 Minute

Show the pipeline and execution history. Explain the distinction between CI and CD:

> “CI runs in Harness Cloud: it installs dependencies, runs tests, builds the client, and publishes a versioned container image. CD is a separate stage because production changes need an approval gate and rollback behavior. We could configure cloud-hosted CD infrastructure, but for this low-frequency project I chose a local Docker Delegate to avoid an always-on VM. That saves infrastructure cost, but the delegate must be running, healthy, connected, and eligible when CD starts.”
>
> “The CI step could invoke `gcloud`, but that would put production deployment inside the build stage. Keeping deployment in CD preserves the separate approval and rollback controls.”

Show run #198 as the historical successful CD run. Be clear about its limits:

> “Run #198 succeeded on `main`, but it predates the current immutable-image verification. The CD delegate uses Python 3's standard library to parse the OCI image index and verify the deployed platform digest. Run #209 validates PR build and guard behavior only; it skips CD, so the updated verification still needs an end-to-end main-branch run.”

Show PR #18 and run #209:

> “The production stages now run only for a webhook push to `main`. The PR validation passed, and both production approval and CD were skipped. This proves PR changes can be validated without reaching the production gate; it does not prove a production deployment.”

If asked why the delegate is local:

> “Harness Cloud already runs CI. CD currently uses my local Docker Delegate as a cost-conscious choice instead of keeping a cloud VM running. This is not a Harness limitation: cloud-hosted CD could be configured later, with the needed credentials and access to the deployment target.”

## 3. Feature Flags: 90 Seconds

On the live game's browser console, set the demo identity and reload:

```js
localStorage.setItem("sojPlayerId", "david");
location.reload();
```

Open the menu, then show `test_mode_enabled` in Harness.

> “Harness targets Test mode to browser ID `david`; everyone else receives `off`. This browser ID is a testing label, not secure authentication. The browser SDK downloads the flag rules and evaluates them locally; the game uses the result to show or hide the button.”

Use the Harness kill switch. Keep the game menu open:

> “The feature disappears without rebuilding or refreshing. In our measured production drill, disabling took 1.80 seconds.”

Restore the flag and its original targeting:

> “Restoring took 3.07 seconds in that drill. Those are observed results, not guaranteed timings. Existing battle controls aren't removed mid-match.”

## 4. Recovery and Monitoring: 1 Minute

> “If a problem is isolated behind a flag, kill that flag and preserve other working changes. If the application is broken more broadly, roll back the Cloud Run revision.”

For the rollback location:

- **Automated stage rollback:** Harness pipeline execution → failed CD stage → rollback logs. The CD stage captures the serving revision and its rollback script routes traffic back to it.
- **Manual Cloud Run rollback:** Google Cloud Console → Cloud Run → `shadows-of-judgment` → Revisions/Manage traffic; route traffic to the previous known-good revision.

For observability:

- **Application signals:** Google Cloud Console → Cloud Run → `shadows-of-judgment` → Observability → Metrics. Show request volume, errors, and latency; low traffic limits what these metrics can tell us.
- **Delivery signals:** Harness → pipeline → Execution History. Open a run to show stage outcomes, logs, and duration. Pipeline success rate measures delivery, not application reliability.
- **Alerting:** Automated alerts are deferred because this is a low-traffic project. State that monitoring during this demo is manual.

Do not report a deployment rollback-time result unless its measurement is recorded. The 1.80-second flag kill is not a deployment rollback measurement.

## 5. Lessons for Oomph: 1 Minute

> “The main lesson is to separate deploying code from releasing a feature. I’d apply targeted rollouts, tested kill switches, clear rollback instructions, and reliable deployment infrastructure to Oomph.”
>
> “We found that the live game image lacked the FME SDK configuration despite a successful pipeline. We corrected production manually by deploying a verified image digest. PR #18 adds unique per-run image tags and post-deploy digest and bundle checks. Those checks are in the PR, but they have not yet passed in a main-branch production CD run. The latest PR run skipped CD by design.”
>
> “This has been an assisted delivery exercise. The PR guard is validated, but a repeatable, intervention-free production release still needs a successful main-branch CD run with the connected delegate.”

## Completion Note

This script satisfies the “script” option for P31. Keep P30’s deployment rollback-time measurement unverified unless the recorded P22 result is available. The feature-flag kill-switch timing is a separate measurement.