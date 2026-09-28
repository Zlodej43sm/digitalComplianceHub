# Eight-minute customer demonstration

Use only synthetic fixture documents. Run `rtk pnpm seed:scenarios http://127.0.0.1:5178` after local setup, or pass the explicitly authorized hosted POC origin. The command is idempotent by scenario title.

## 0:00–1:00 — Orientation

Open the Northstar client account. Point out the synthetic-data banner, language switch, active/awaiting/completed totals and the next-action text attached to every case. Switch to Ukrainian and back to English.

## 1:00–2:30 — Client action

Open **Demo · Missing documents**. Explain the empty document state and disabled submission path. Create a fresh case, upload only the supplied fixtures and submit it. Do not upload customer or bank data.

## 2:30–4:00 — Manager control

Sign in as Alex Morgan. Open the submitted case from the assigned queue, start review and complete the five checks. Explain that the checklist is tied to the current document-version snapshot. Forward it to compliance.

## 4:00–5:30 — Assisted review

Sign in as Jamie Taylor and open **Demo · Amount discrepancy**. Show source-page evidence, the human-review warning and the explicit statement that simulated analysis cannot decide a case. Send the suggested correction request.

## 5:30–6:30 — Correction loop

Return as the Northstar client through the notification deep link. Upload `invoice-v2.pdf`, add a response and resubmit. Return as manager, repeat the version-bound checklist and forward it.

## 6:30–7:30 — Human decision

As compliance, show the earlier result marked historical and the corrected result with no predefined discrepancy. Add an internal note, record an approval reason and show the immutable audit timeline.

## 7:30–8:00 — Scope and isolation

Sign in as the Cedar client. Its queue, notifications and statistics must contain no Northstar cases. Close by stating that this POC uses synthetic data and simulated extraction; production identity, rule packs and operational integrations remain later phases.

## Recovery cues

- Empty queue: the page explains that no work is assigned.
- Failed upload: the inline error preserves the current case and tells the user to retry with a supplied PDF fixture.
- Failed analysis: compliance sees the failure and a retry action; workflow state is unchanged.
- Expired session: the account picker returns with a translated recovery message.
