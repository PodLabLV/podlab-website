#!/usr/bin/env python3
"""
PodLab Portal — generation-jobs worker (Mac mini, Hermes cron).

Mirrors the pre-interview prep automation (~/.hermes/scripts/podlab_preinterview_prep.py):
a queue row goes in, `claude -p` runs a PodLab skill non-interactively, PDFs come out, and
they're delivered — here into the client's portal (Projects, for review) and their Drive
Projects folder, instead of Telegram.

Queue: public.portal_jobs (supabase/migrations/20261018_portal_v2_c.sql), filled when a client
submits onboarding (/portal/welcome):
  assetslab   always                         → assetslab skill → AssetsLab PDF (dark + light)
  vsl_pack    a VSL shoot is booked          → vsllab skill    → VSL, confirmation + 3 FAQ scripts, pack PDF
  brand_kit   they chose "I need help"       → brandkit skill  → brand guide PDF (+ board image), colors/fonts

Per job, LIVE:
  1. claim it atomically (rpc portal_claim_job: FOR UPDATE SKIP LOCKED)
  2. write the inputs to a job folder (~/.podlab/portal-jobs/<job id>/: job.json, intake.json, intake.txt, prompt.md)
  3. run `claude -p` with the skill; it writes files + manifest.json into <job>/out
  4. upload each PDF to the private client-deliverables bucket (what the client opens) and to
     the client's Drive Projects folder (03- Content / 04- Projects / <AssetsLab|VSL Pack|Brand Kit>)
     through the portal (POST /api/portal/jobs intent drive-session; Drive auth lives on Vercel)
  5. insert portal_assets + portal_asset_versions (status "in review", source_job_id) and, for
     VSL packs, portal_scripts + versions, so they show in Projects
  6. upsert a 'waiting' portal_notifications row ("Your AssetsLab is ready to review")
  7. mark the job done (output: profile / brand / drive ids, read later by onApproved())
  8. archive a copy under ~/PodLab OS/<lab>/<slug>/portal-<date>-<job> (never overwrites)

Cron-friendly: silent when there's nothing to do; one line per finished or failed job.

Usage:
  portal-jobs-worker.py                         DRY RUN (default): list queued jobs, build their job
                                                folders and prompts, show what would happen. Claims,
                                                runs and writes nothing.
  portal-jobs-worker.py --job-file job.json     dry run against a local job (no database needed)
  portal-jobs-worker.py --live [--max 1]        claim and run for real
  portal-jobs-worker.py --live --hold           run and upload, but publish nothing to the client yet
                                                (the job finishes with output.held = true)
  portal-jobs-worker.py --publish <job id> [--live]   release a held job to the client after review

Secrets (macOS Keychain, account "podlab", same as the other Hermes jobs):
  supabase-url, supabase-key        service role (already there for fit-call prep)
  portal-publish-key                PORTAL_PUBLISH_KEY on Vercel (new; needed for Drive uploads)
"""
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

# ---------- config ----------
CLAUDE = os.environ.get("PODLAB_CLAUDE", "/Users/tiptop/homebrew/bin/claude")
SITE = os.environ.get("PODLAB_SITE_URL", "https://podlablv.com")
JOBS_ROOT = os.path.expanduser(os.environ.get("PODLAB_JOBS_ROOT", "~/.podlab/portal-jobs"))
PODLAB_OS = os.path.expanduser("~/PodLab OS")
BUCKET = "client-deliverables"
WORKER = f"mac-mini:{os.getpid()}"
CLAUDE_TIMEOUT = {"assetslab": 3600, "vsl_pack": 2400, "brand_kit": 1800}
SKILLS = os.path.expanduser("~/.claude/skills")

LABEL = {"assetslab": "AssetsLab", "vsl_pack": "VSL scripts", "brand_kit": "brand kit"}
LAB = {"assetslab": "AssetsLab", "vsl_pack": "VideoSalesLab", "brand_kit": "BrandLab"}
ARCHIVE = {"assetslab": "assetslab", "vsl_pack": "vsllab", "brand_kit": "brandkit"}


# ---------- keychain + http (curl: python ssl is unreliable on this box) ----------
def kc(service, account="podlab"):
    for acct in (account, None):
        cmd = ["security", "find-generic-password", "-s", service] + (["-a", acct] if acct else []) + ["-w"]
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=5).stdout.strip()
            if out:
                return out
        except Exception:
            pass
    return None


def curl(method, url, headers=None, body=None, data_file=None, timeout=120):
    cmd = ["curl", "-sS", "-m", str(timeout), "-X", method, url, "-w", "\n%{http_code}"]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    if body is not None:
        cmd += ["--data-binary", json.dumps(body)]
    if data_file:
        cmd += ["--data-binary", f"@{data_file}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 10)
    raw, _, code = (r.stdout or "").rpartition("\n")
    try:
        status = int(code)
    except ValueError:
        status = 0
    try:
        parsed = json.loads(raw) if raw.strip() else None
    except Exception:
        parsed = raw
    return status, parsed


class Supa:
    def __init__(self):
        self.url = (kc("supabase-url") or "").rstrip("/")
        self.key = kc("supabase-key")

    @property
    def ok(self):
        return bool(self.url and self.key)

    def h(self, extra=None, schema="public"):
        h = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": "application/json",
             "Accept-Profile": schema, "Content-Profile": schema}
        h.update(extra or {})
        return h

    def get(self, path, schema="public"):
        return curl("GET", f"{self.url}/rest/v1/{path}", self.h(schema=schema))

    def post(self, path, body, prefer="return=representation"):
        return curl("POST", f"{self.url}/rest/v1/{path}", self.h({"Prefer": prefer}), body)

    def patch(self, path, body):
        return curl("PATCH", f"{self.url}/rest/v1/{path}", self.h({"Prefer": "return=minimal"}), body)

    def rpc(self, fn, body):
        return curl("POST", f"{self.url}/rest/v1/rpc/{fn}", self.h(), body)

    def upload(self, path, file, mime):
        h = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": mime, "x-upsert": "false"}
        return curl("POST", f"{self.url}/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}", h, data_file=file, timeout=600)


# ---------- inputs ----------
def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "client").lower()).strip("-") or "client"


def client_code(business, person):
    # vsllab's {CLIENT}: last word of the business or person name, uppercased, letters only.
    # Legal suffixes don't count: "Test Plumbing Co" → PLUMBING, not CO.
    words = [w for w in re.findall(r"[A-Za-z]+", business or person or "")
             if w.upper() not in {"LLC", "INC", "CO", "CORP", "LTD", "PLLC", "PC", "LP", "LLP"}]
    return words[-1].upper() if words else "CLIENT"


def prepare(job):
    """Write the job's inputs to its folder. Returns (job_dir, out_dir, prompt)."""
    jd = os.path.join(JOBS_ROOT, job["id"])
    out = os.path.join(jd, "out")
    os.makedirs(out, exist_ok=True)
    inp = job.get("input") or {}
    intake = inp.get("intake") or {}
    with open(os.path.join(jd, "job.json"), "w") as f:
        json.dump(job, f, indent=2)
    with open(os.path.join(jd, "intake.json"), "w") as f:
        json.dump(intake, f, indent=2)
    # Same "field: value" shape fetch-intake.sh prints, so the skill reads it the way it always does.
    with open(os.path.join(jd, "intake.txt"), "w") as f:
        f.write("\n".join(f"{k}: {v}" for k, v in intake.items()) + "\n")
    if inp.get("brand"):
        with open(os.path.join(jd, "brand.json"), "w") as f:
            json.dump(inp["brand"], f, indent=2)
    prompt = PROMPTS[job["kind"]](job, jd, out)
    if attachment_ids(job):
        prompt += (f"\nAttachments the client uploaded (mission/vision/values, materials to review) are in "
                   f"{jd}/attachments/ once downloaded. Read them and treat them as input, not gospel.\n")
    with open(os.path.join(jd, "prompt.md"), "w") as f:
        f.write(prompt)
    return jd, out, prompt


COMMON = """You are running unattended on PodLab's Mac mini for the client portal. Nobody can answer
questions: never stop to ask. Where the skill says "ask", decide, and list every assumption and every
missing intake field in the deliverable's Internal DNA / Assumptions section instead.

Hard rules:
- Never fabricate client facts, proof, numbers or testimonials. Leave a visible bracketed slot.
- No emojis. Contact email on deliverables is info@podlablv.com.
- Write ONLY inside {out}. Do not write to ~/PodLab OS, ~/Downloads, or anywhere else; the worker archives
  the files itself. You may READ ~/PodLab OS for an earlier deliverable for this client
  (see "Earlier work" below) and build on it instead of starting blank.
- Do not send email, Slack, SMS or anything else. Do not touch any database.
- Finish by writing {out}/manifest.json exactly as specified below (valid JSON, paths absolute).
"""


def _client_block(job, jd):
    c = (job.get("input") or {}).get("client") or {}
    return (f"Client: {c.get('full_name') or ''} — {c.get('business_name') or ''}\n"
            f"Website: {c.get('website') or '(none)'}\n"
            f"Intake (assetslab field names): {jd}/intake.json  (same data as {jd}/intake.txt)\n")


def _earlier(kind, job):
    c = (job.get("input") or {}).get("client") or {}
    s = slug(c.get("business_name"))
    if kind == "assetslab":
        return f"Earlier work: if \"{PODLAB_OS}/assetslab/{s}/deliverable.html\" exists, this is a revision: read it first and keep what still holds.\n"
    if kind == "vsl_pack":
        code = client_code(c.get("business_name"), c.get("full_name"))
        return f"Earlier work: if \"{PODLAB_OS}/vsllab/{code}/\" exists, read its pack first.\n"
    return ""


def prompt_assetslab(job, jd, out):
    c = (job.get("input") or {}).get("client") or {}
    name = re.sub(r"[^A-Za-z0-9]+", "-", c.get("business_name") or "Client").strip("-")
    return (COMMON.format(out=out) + "\n" + _client_block(job, jd) + _earlier("assetslab", job) + f"""
TASK: Use the assetslab skill to build this client's AssetsLab deliverable from the intake file above
(it replaces Phase 1 — do not run fetch-intake.sh). Run Phase 2 research as the skill says. Write
{out}/deliverable.html and render both editions with:
  bash {SKILLS}/assetslab/scripts/render-editions.sh "{out}" "{name}"
Rasterize a few pages and check them as the skill says. Do not `open` anything.

manifest.json:
{{
  "pdfs": [
    {{"path": "{out}/{name}-AssetsLab.pdf", "title": "AssetsLab — {c.get('business_name') or ''}", "role": "main"}},
    {{"path": "{out}/{name}-AssetsLab-Light.pdf", "title": "AssetsLab — light edition", "role": "light"}}
  ],
  "profile": {{
    "one_liner": "the dialed-in one-liner", "offer": "core offer + price", "ideal_client": "the primary ICP in one or two sentences",
    "outcome": "the transformation", "mechanism": "why it works", "voice": "voice in a line",
    "mission": "...", "vision": "...", "values": ["Value — one-line definition", "..."]
  }},
  "flags": ["missing or assumed intake fields"]
}}
""")


def prompt_vsl(job, jd, out):
    inp = job.get("input") or {}
    c = inp.get("client") or {}
    code = client_code(c.get("business_name"), c.get("full_name"))
    booking = inp.get("vsl_booking") or {}
    alab = inp.get("assetslab_dir")
    return (COMMON.format(out=out) + "\n" + _client_block(job, jd) + _earlier("vsl_pack", job) + f"""
Shoot booked: {booking.get('eventName') or 'VSL shoot'} on {booking.get('startAt') or 'TBD'}.
{"AssetsLab for this client (use it: ICP, offer, voice, mechanism): " + alab if alab else "No AssetsLab yet: work from the intake."}

TASK: Use the vsllab skill in CLIENT mode to produce the full pack into {out} (instead of
~/PodLab OS/vsllab/{code}/), {{CLIENT}} = {code}. Run the fit check; if the 6-minute VSL is the wrong
instrument, build what the skill says to build instead and say so in Assumptions. The mechanism is in
the intake ("mechanism"); if it is genuinely absent, do NOT invent one and do NOT build the pack: write
manifest.json as {{"needs_input": "the one question to ask the client"}} and stop.

Also write, as separate plain-text files in {out}:
  {code}-VSL-SCRIPT.txt            the main VSL script, exactly as in the pack
  {code}-CONFIRMATION-SCRIPT.txt   the 30–45 sec confirmation-page video ("you're booked, here's what happens")
  {code}-FAQ-1.txt, -FAQ-2.txt, -FAQ-3.txt   the three FAQ breakout scripts
Run the skill's checker and fix anything it flags.

manifest.json:
{{
  "pdfs": [
    {{"path": "{out}/{code}-VSL.pdf", "title": "VSL pack — {c.get('business_name') or ''}", "role": "main"}},
    {{"path": "{out}/{code}-VSL-Light.pdf", "title": "VSL pack — light edition", "role": "light"}}
  ],
  "scripts": [
    {{"kind": "vsl", "title": "VSL script", "path": "{out}/{code}-VSL-SCRIPT.txt"}},
    {{"kind": "confirmation", "title": "Confirmation video script", "path": "{out}/{code}-CONFIRMATION-SCRIPT.txt"}},
    {{"kind": "faq", "title": "FAQ 1: <the question>", "path": "{out}/{code}-FAQ-1.txt"}},
    {{"kind": "faq", "title": "FAQ 2: <the question>", "path": "{out}/{code}-FAQ-2.txt"}},
    {{"kind": "faq", "title": "FAQ 3: <the question>", "path": "{out}/{code}-FAQ-3.txt"}}
  ],
  "flags": ["everything under Assumptions that must be confirmed before rolling"]
}}
""")


def prompt_brand(job, jd, out):
    c = (job.get("input") or {}).get("client") or {}
    name = re.sub(r"[^A-Za-z0-9]+", "-", c.get("business_name") or "Client").strip("-")
    return (COMMON.format(out=out) + "\n" + _client_block(job, jd) + f"""
Brand questionnaire: {jd}/brand.json (brand_start, emotional_promise, visual_mode, colors_like,
colors_avoid, core_metaphor, brands_admired, avoid, tagline). The intake's brand_adjectives and
brand_tone apply too.

TASK: Use the brandkit skill. Do its BRAND STRATEGY FIRST step from these answers (category, audience,
emotional promise, visual world, core metaphor, what to avoid), then:
1. If an image-generation tool is available to you, generate ONE brand-kit overview board per the skill
   (3x3, its prompt template) and save it as {out}/{name}-Brand-Board.png. If none is available, skip
   the image and put the final board prompt in the guide's appendix.
2. Write {out}/brand-guide.html: a print-ready 8.5x11 brand guide (logo concept and the meaning behind it,
   color system with hex codes and roles, type pairing using Google Fonts with heading/body roles, tagline,
   voice in three words, image direction, do's and don'ts, the board if made). Render it with:
     bash {SKILLS}/assetslab/scripts/html-to-pdf.sh "{out}/brand-guide.html" "{out}/{name}-Brand-Guide.pdf"
   Colors: one dominant palette (base, primary accent, secondary accent, neutrals). Never guess a hex
   the client gave in words without saying it's an interpretation.

manifest.json:
{{
  "pdfs": [{{"path": "{out}/{name}-Brand-Guide.pdf", "title": "Brand kit — {c.get('business_name') or ''}", "role": "main"}}],
  "images": [{{"path": "{out}/{name}-Brand-Board.png", "role": "board"}}],
  "brand": {{
    "colors": [{{"hex": "#RRGGBB", "name": "Primary — role"}}],
    "fonts": [{{"name": "Font Name", "use": "Headings"}}, {{"name": "Font Name", "use": "Body"}}],
    "notes": "do's and don'ts in 3-6 short lines"
  }},
  "flags": []
}}
""")


PROMPTS = {"assetslab": prompt_assetslab, "vsl_pack": prompt_vsl, "brand_kit": prompt_brand}


def claude_cmd(jd, prompt):
    return [CLAUDE, "-p", prompt,
            "--permission-mode", "acceptEdits",
            "--allowedTools", "Skill", "Read", "Write", "Edit", "Glob", "Grep", "Bash", "WebSearch", "WebFetch",
            "--add-dir", jd, "--add-dir", SKILLS, "--add-dir", PODLAB_OS]


def attachment_ids(job):
    """Drive file ids of the client's onboarding uploads (entries like ".../file/d/<id>/view")."""
    text = json.dumps((job.get("input") or {}).get("intake") or {})
    return sorted(set(re.findall(r"drive\.google\.com/file/d/([\w-]{10,})/", text)))


def fetch_attachments(job, jd):
    """Download them through the portal (Drive auth lives on Vercel). Missing ones are just skipped."""
    key = kc("portal-publish-key")
    ids = attachment_ids(job)
    if not key or not ids:
        return []
    d = os.path.join(jd, "attachments")
    os.makedirs(d, exist_ok=True)
    got = []
    for fid in ids:
        dest = os.path.join(d, fid)
        r = subprocess.run(["curl", "-sS", "-m", "300", "-f", "-o", dest, "-X", "POST", f"{SITE}/api/portal/jobs",
                            "-H", "Content-Type: application/json", "-H", f"x-portal-publish-key: {key}",
                            "--data-binary", json.dumps({"intent": "drive-file", "jobId": job["id"], "driveFileId": fid})],
                           capture_output=True, text=True)
        if r.returncode == 0:
            got.append(dest)
    return got


# ---------- delivery ----------
def drive_upload(job, path, mime):
    """Resumable session from the portal, then one PUT. Returns the Drive file id or None (skipped)."""
    key = kc("portal-publish-key")
    if not key:
        return None, "no portal-publish-key in Keychain"
    status, r = curl("POST", f"{SITE}/api/portal/jobs",
                     {"Content-Type": "application/json", "x-portal-publish-key": key},
                     {"intent": "drive-session", "jobId": job["id"], "filename": os.path.basename(path),
                      "sizeBytes": os.path.getsize(path), "mimeType": mime})
    if status != 200 or not isinstance(r, dict) or r.get("error"):
        return None, f"drive session {status}: {r}"
    if r.get("skipped"):
        return None, r["skipped"]
    st, f = curl("PUT", r["sessionUrl"], {"Content-Type": mime}, data_file=path, timeout=900)
    if st not in (200, 201) or not isinstance(f, dict) or not f.get("id"):
        return None, f"drive upload {st}"
    return f["id"], None


def stage(db, job, manifest):
    """Upload the outputs (Drive + the private bucket). Nothing client-visible yet."""
    cid = job["client_id"]
    kind = job["kind"]
    staged = {"drive": [], "flags": list(manifest.get("flags") or []), "main": None, "scripts_staged": []}

    files = [(p, "application/pdf") for p in manifest.get("pdfs") or []]
    files += [(p, "image/png") for p in manifest.get("images") or []]
    for item, mime in files:
        path = item.get("path")
        if not path or not os.path.isfile(path):
            staged["flags"].append(f"missing output: {path}")
            continue
        fid, why = drive_upload(job, path, mime)
        if fid:
            staged["drive"].append({"name": os.path.basename(path), "driveFileId": fid, "role": item.get("role")})
        elif why:
            staged.setdefault("drive_skipped", why)

    # The client reviews the main PDF in Projects; the light edition and board live in Drive.
    main = next((p for p in manifest.get("pdfs") or [] if p.get("role") == "main" and os.path.isfile(p.get("path", ""))), None)
    if main:
        store = f"{cid}/{int(datetime.datetime.now().timestamp() * 1000)}-{os.path.basename(main['path'])}"
        st, r = db.upload(store, main["path"], "application/pdf")
        if st not in (200, 201):
            raise RuntimeError(f"storage upload {st}: {r}")
        staged["main"] = {"storage_path": store, "title": main.get("title") or LABEL[kind], "size_bytes": os.path.getsize(main["path"])}

    for sc in manifest.get("scripts") or []:
        p = sc.get("path")
        if not p or not os.path.isfile(p):
            staged["flags"].append(f"missing script: {p}")
            continue
        staged["scripts_staged"].append({"kind": sc.get("kind") or "vsl", "title": sc.get("title") or "Script", "body": open(p).read().strip()})

    if not staged["main"] and not staged["scripts_staged"]:
        raise RuntimeError("the skill produced nothing deliverable")
    if manifest.get("profile"):
        staged["profile"] = manifest["profile"]
    if manifest.get("brand"):
        staged["brand"] = manifest["brand"]
    return staged


def publish(db, job, staged):
    """Make it client-visible: portal_assets / portal_scripts rows (in review) + a 'waiting' notification."""
    cid = job["client_id"]
    kind = job["kind"]
    ids = {"assets": [], "scripts": []}
    main = staged.get("main")
    if main:
        st, rows = db.post("portal_assets", {
            "client_id": cid, "title": main["title"], "lab": LAB[kind], "file_type": "PDF",
            "status": "in review", "current_version": 1, "source_job_id": job["id"],
            "description": "Built from your onboarding answers. Light edition and source files are in your PodLab folder.",
        })
        if st not in (200, 201):
            raise RuntimeError(f"asset insert {st}: {rows}")
        asset = rows[0]
        st, v = db.post("portal_asset_versions", {
            "asset_id": asset["id"], "client_id": cid, "version_no": 1, "storage_path": main["storage_path"],
            "size_bytes": main.get("size_bytes"), "mime_type": "application/pdf",
            "note": "v1: generated from your onboarding", "uploaded_by": "PodLab",
        })
        if st not in (200, 201):
            raise RuntimeError(f"version insert {st}: {v}")
        ids["assets"].append(asset["id"])

    for sc in staged.get("scripts_staged") or []:
        words = len(sc["body"].split())
        st, rows = db.post("portal_scripts", {
            "client_id": cid, "title": sc["title"], "lab": "VideoSalesLab", "kind": sc["kind"],
            "status": "in review", "current_version": 1, "source": "vsllab",
        })
        if st not in (200, 201):
            raise RuntimeError(f"script insert {st}: {rows}")
        st, v = db.post("portal_script_versions", {
            "script_id": rows[0]["id"], "client_id": cid, "version_no": 1, "body": sc["body"], "word_count": words,
            "runtime_seconds": round(words / 150 * 60), "author_name": "PodLab", "author_kind": "ai",
            "note": "v1: generated from your onboarding",
        })
        if st not in (200, 201):
            raise RuntimeError(f"script version insert {st}: {v}")
        ids["scripts"].append(rows[0]["id"])

    title = {"assetslab": "Your AssetsLab is ready to review", "vsl_pack": "Your VSL scripts are ready to review",
             "brand_kit": "Your brand kit is ready to review"}[kind]
    ref = f"asset:{ids['assets'][0]}:v1" if ids["assets"] else f"job:{job['id']}:ready"
    db.post("portal_notifications?on_conflict=client_id,ref", {
        "client_id": cid, "kind": "review_ready", "direction": "waiting", "title": title,
        "body": "Read it, leave notes, or approve it. Approved items move into Assets.",
        "link": "/portal/projects", "ref": ref, "resolved_at": None, "read_at": None,
    }, prefer="resolution=merge-duplicates,return=minimal")
    db.post("portal_activity", {"client_id": cid, "kind": "deliverable", "title": title}, prefer="return=minimal")
    return ids


def deliver(db, job, out, manifest, hold):
    """Stage, then publish unless held for staff. Returns the job output."""
    result = stage(db, job, manifest)
    result["held"] = bool(hold)
    if not hold:
        result.update(publish(db, job, result))
        result["published_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return result


def archive(job, out):
    c = (job.get("input") or {}).get("client") or {}
    base = os.path.join(PODLAB_OS, ARCHIVE[job["kind"]],
                        client_code(c.get("business_name"), c.get("full_name")) if job["kind"] == "vsl_pack" else slug(c.get("business_name")))
    dest = os.path.join(base, f"portal-{datetime.date.today().isoformat()}-{job['id'][:8]}")
    shutil.copytree(out, dest, dirs_exist_ok=False)
    return dest


# ---------- run ----------
def assetslab_dir_for(db, job):
    """A finished AssetsLab for the same client feeds the VSL pack."""
    st, rows = db.get(f"portal_jobs?select=output&client_id=eq.{job['client_id']}&kind=eq.assetslab&status=eq.done&order=finished_at.desc&limit=1")
    if st == 200 and rows:
        return (rows[0].get("output") or {}).get("local_dir")
    return None


def run_live(db, job, hold):
    if job["kind"] == "vsl_pack":
        d = assetslab_dir_for(db, job)
        if d:
            job.setdefault("input", {})["assetslab_dir"] = d
    jd, out, prompt = prepare(job)
    fetch_attachments(job, jd)
    log = open(os.path.join(jd, "claude.log"), "w")
    try:
        r = subprocess.run(claude_cmd(jd, prompt), cwd=jd, stdout=log, stderr=subprocess.STDOUT,
                           timeout=CLAUDE_TIMEOUT[job["kind"]])
    finally:
        log.close()
    mpath = os.path.join(out, "manifest.json")
    if not os.path.isfile(mpath):
        raise RuntimeError(f"claude exited {r.returncode} without a manifest (log: {jd}/claude.log)")
    manifest = json.load(open(mpath))
    if manifest.get("needs_input"):
        raise NeedsInput(manifest["needs_input"])
    result = deliver(db, job, out, manifest, hold)
    try:
        result["local_dir"] = archive(job, out)
    except Exception as e:
        result["local_dir"] = out
        result["flags"].append(f"archive failed: {e}")
    return result


class NeedsInput(Exception):
    pass


def finish(db, job, status, output=None, error=None):
    body = {"status": status, "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    if status in ("done", "failed"):
        body["finished_at"] = body["updated_at"]
    if output is not None:
        body["output"] = output
    if error is not None:
        body["error"] = str(error)[:2000]
    db.patch(f"portal_jobs?id=eq.{job['id']}", body)


def business(job):
    return ((job.get("input") or {}).get("client") or {}).get("business_name") or job["client_id"][:8]


def dry_run(jobs, source):
    for job in jobs:
        jd, out, prompt = prepare(job)
        cmd = claude_cmd(jd, "<prompt.md>")
        print(f"[dry-run] {source} job {job['id'][:8]} · {job['kind']} · {business(job)}")
        print(f"  inputs   → {jd}/ (job.json, intake.json, intake.txt{', brand.json' if (job.get('input') or {}).get('brand') else ''}, prompt.md)")
        if attachment_ids(job):
            print(f"  attachments: {len(attachment_ids(job))} Drive file(s) → {jd}/attachments/ (via the portal)")
        print(f"  would run: {' '.join(cmd[:2])} … ({len(prompt)} chars) cwd={jd}")
        print(f"  then     : upload main PDF → {BUCKET}/{job['client_id']}/…, Drive Projects/{ {'assetslab': 'AssetsLab', 'vsl_pack': 'VSL Pack', 'brand_kit': 'Brand Kit'}[job['kind']] }/")
        print(f"             insert portal_assets (in review, source_job_id){' + portal_scripts' if job['kind'] == 'vsl_pack' else ''}, "
              f"notification 'waiting', job → done, archive → {PODLAB_OS}/{ARCHIVE[job['kind']]}/…")


def main():
    args = sys.argv[1:]
    live = "--live" in args
    hold = "--hold" in args
    max_jobs = int(args[args.index("--max") + 1]) if "--max" in args else 1
    job_file = args[args.index("--job-file") + 1] if "--job-file" in args else None

    if "--publish" in args:
        jid = args[args.index("--publish") + 1]
        db = Supa()
        st, rows = db.get(f"portal_jobs?select=*&id=eq.{jid}")
        if st != 200 or not rows:
            sys.exit(f"No job {jid} ({st})")
        job = rows[0]
        out = job.get("output") or {}
        if job["status"] != "done" or not out.get("held"):
            sys.exit("Only a finished job run with --hold can be published.")
        if not live:
            print(f"[dry-run] would publish {LABEL[job['kind']]} for {business(job)}: "
                  f"{'1 PDF' if out.get('main') else 'no PDF'}, {len(out.get('scripts_staged') or [])} script(s), then notify the client.")
            return
        out.update(publish(db, job, out))
        out["held"] = False
        out["published_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        db.patch(f"portal_jobs?id=eq.{jid}", {"output": out})
        print(f"Published {LABEL[job['kind']]} for {business(job)}.")
        return

    if job_file:
        job = json.load(open(job_file))
        if live:
            sys.exit("--job-file is for dry runs only; queue a real job instead.")
        dry_run([job], "local")
        return

    db = Supa()
    if not db.ok:
        print("Portal jobs: supabase creds missing from Keychain (svc=supabase-url / supabase-key)")
        return

    if not live:
        st, rows = db.get("portal_jobs?select=id,client_id,kind,status,input,attempts,created_at&status=eq.queued&order=created_at&limit=20")
        if st != 200:
            print(f"[dry-run] could not read portal_jobs ({st}): {rows}. Has migration 20261018_portal_v2_c.sql run?")
            return
        if rows:
            dry_run(rows, "queued")
        return  # silent when the queue is empty

    for _ in range(max_jobs):
        # AssetsLab and brand kits first: a VSL pack reads the AssetsLab when it exists.
        st, rows = db.rpc("portal_claim_job", {"worker": WORKER, "kinds": ["assetslab", "brand_kit"]})
        if st == 200 and not rows:
            st, rows = db.rpc("portal_claim_job", {"worker": WORKER, "kinds": ["vsl_pack"]})
        if st != 200:
            print(f"Portal jobs: claim failed ({st}): {rows}")
            return
        if not rows:
            return
        job = rows[0]
        try:
            result = run_live(db, job, hold)
            finish(db, job, "done", output=result)
            where = "staged for staff (--hold)" if hold else "in Projects for review"
            print(f"Portal job done: {LABEL[job['kind']]} for {business(job)} — {where}."
                  + (f" Flags: {'; '.join(result['flags'][:3])}" if result.get("flags") else ""))
        except NeedsInput as q:
            finish(db, job, "failed", error=f"needs input: {q}")
            print(f"Portal job needs input: {LABEL[job['kind']]} for {business(job)} — ask them: {q}")
        except Exception as e:
            retry = int(job.get("attempts") or 1) < 3
            finish(db, job, "queued" if retry else "failed", error=e)
            print(f"Portal job {'will retry' if retry else 'FAILED'}: {LABEL[job['kind']]} for {business(job)} — {e}")


if __name__ == "__main__":
    main()
