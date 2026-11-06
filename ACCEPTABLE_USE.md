# Acceptable use

Bastion is for defending systems you own or are explicitly authorized to assess. © 2026 Flyhigh. All rights reserved.

## Allowed

- Passive assessment of a website or API host your organization operates, or a host covered by a written authorization from the owner.
- Reviewing dependency manifests your organization maintains, via the public OSV.dev database.
- Logging requests and agent tool calls on applications you operate, with a privacy notice that matches what you collect.
- Generating `robots.txt`, `ai.txt`, and middleware that enforce a crawler policy on those applications.
- Exporting the ledger and the executive brief for your own security and audit work.
- Checking an email address or password you are responsible for, and reading the public advisory feed.
- Reading the public global-attacks page and exporting the records it shows.
- Using the published demo sign-in to review the labelled Northwind fixture.
- Looking up a domain in the public breach catalog, and running the optional passive hints only when you own that host or have written authority to assess it.

## Not allowed

- Scanning, probing, or sending traffic to systems you do not own and are not authorized to assess. The ownership checkbox is a control, not a suggestion. Bypassing the scanner's address checks is misuse. The public exposure check uses the same rule for passive hints.
- Using the exposure check to harvest breach data in bulk, to test addresses you are not responsible for, or to build a list of who was affected. The rate limits are there to stop that. A result that names no breach is not proof an account is safe, and it must not be presented as one.
- Using the demo workspace, or the public exposure page, to send scan traffic to a host you do not own.
- Using Bastion to exploit a finding, to obtain credentials, to modify or destroy data, or to disrupt a service.
- Using the ledger, the browser snippet, or the agent log to watch people covertly, including employees or customers who have not been told what is collected.
- Publishing an ingest key in a place you do not control and then treating the resulting events as trustworthy.
- Presenting the posture index, the demo workspace, or a framework label as a certification, a penetration test, or a legal opinion.
- Reselling or redistributing this software except under a license from Flyhigh.

## Crawler policy

`robots.txt` and `ai.txt` express a preference. They do not, by themselves, create an obligation the crawler must honor, and they do not replace a contract or a statute. The middleware snippet is an access-control rule for a process you run. Confirm it does what you intend before you deploy it.

## Demo data

The account `demo@bastion.example` and the ingest key printed in the demo workspace are samples. They are not credentials for any production system. Northwind Labs is fictional.

## Enforcement

Use that violates this policy is outside the product's design. Stop, delete the data you were not authorized to collect, and tell the owner of the affected system.
