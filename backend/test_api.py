"""
Unit and integration tests for the OAuth Guide Backend API.
Tests all endpoints, schema validation, and search functionality.
"""
import unittest
from fastapi.testclient import TestClient
from main import app, list_all_guides, load_guide, LIBRARY_DIR
from guides.schema import OAuthGuide


class TestOAuthGuideAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_health(self):
        """Test health check root endpoint."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

    def test_get_all_guides(self):
        """Test listing all library guides."""
        res = self.client.get("/api/guides")
        self.assertEqual(res.status_code, 200)
        guides = res.json()
        self.assertGreaterEqual(len(guides), 10)
        # Verify required keys in summary
        required_keys = {"app", "slug", "website", "difficulty", "setup_time_estimate", "summary"}
        for g in guides:
            self.assertTrue(required_keys.issubset(g.keys()), f"Missing keys in {g}")

    def test_get_single_guide_github(self):
        """Test retrieving a specific known guide (github)."""
        res = self.client.get("/api/guides/github")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["app"], "GitHub")
        self.assertEqual(data["difficulty"], "easy")
        self.assertFalse(data["requires_approval"])
        self.assertTrue(len(data["steps"]) >= 4)
        # Verify Pydantic schema validation
        guide_obj = OAuthGuide(**data)
        self.assertEqual(guide_obj.slug, "github")

    def test_get_single_guide_google(self):
        """Test retrieving the Google guide with CASA assessment details."""
        res = self.client.get("/api/guides/google")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["difficulty"], "very_hard")
        self.assertTrue(data["requires_approval"])
        self.assertTrue(data["requirements"]["needs_security_audit"])

    def test_guide_not_found(self):
        """Test non-existent guide returns 404."""
        res = self.client.get("/api/guides/nonexistent-app-xyz")
        self.assertEqual(res.status_code, 404)

    def test_search_guides(self):
        """Test search endpoint filtering."""
        res = self.client.get("/api/search?q=slack")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slug"], "slack")

    def test_search_empty_query(self):
        """Test search with empty query returns all guides."""
        res = self.client.get("/api/search?q=")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertEqual(len(results), len(list(LIBRARY_DIR.glob('*.json'))))

    def test_all_library_files_valid_schema(self):
        """Ensure every JSON file in the library strictly matches the OAuthGuide model."""
        guides = list_all_guides()
        for g in guides:
            full_guide = load_guide(g["slug"])
            obj = OAuthGuide(**full_guide)
            self.assertIsNotNone(obj.app)
            self.assertIn(obj.difficulty, ["easy", "medium", "hard", "very_hard"])



class TestGeneratedGuides(unittest.TestCase):
    def test_normalize_guide_validates_and_merges_sources(self):
        import json
        from agent.researcher import extract_json, normalize_guide
        base = load_guide("github")
        base["confidence"] = "verified"
        base["slug"] = "My App!"
        raw = "Here you go:\n```json\n" + json.dumps(base) + "\n```"
        g = normalize_guide(extract_json(raw), "My App", [{"title": "t", "url": "https://x.dev/docs", "type": "official_docs"}])
        self.assertEqual(g["slug"], "my-app")
        self.assertEqual(g["confidence"], "source_supported")
        self.assertTrue(any(s["url"] == "https://x.dev/docs" for s in g["sources"]))

    def test_invalid_slug_rejected(self):
        res = TestClient(app).get("/api/guides/..%2Fmain")
        self.assertEqual(res.status_code, 404)


class TestResearchJobs(unittest.IsolatedAsyncioTestCase):
    async def test_library_job_replays_events_and_is_reused(self):
        from agent import jobs
        job, reused = jobs.start_job("GitHub", None, "key")
        self.assertFalse(reused)
        first = [e async for e in jobs.stream_events(job)]
        self.assertIn('"type": "guide"', "".join(first))
        self.assertEqual(job.status, "done")
        # A late client (page refresh) can replay everything and resume from an offset.
        replay = [e async for e in jobs.stream_events(job, start=2)]
        self.assertTrue(replay and replay[0].startswith("id: 2"))
        again, reused = jobs.start_job("github", None, "key")
        self.assertTrue(reused)
        self.assertEqual(again.id, job.id)

    async def test_hung_model_times_out_and_reports_error(self):
        from agent import jobs, researcher

        async def hang(*a, **k):
            raise TimeoutError("no response from the model in time")

        orig = researcher._run_attempt
        researcher._run_attempt = hang
        try:
            job, _ = jobs.start_job("Zzz Unknown App", None, "key")
            events = [e async for e in jobs.stream_events(job)]
        finally:
            researcher._run_attempt = orig
        self.assertEqual(job.status, "error")
        self.assertIn("took too long", job.events[-1]["message"])


class TestProbeAndLimits(unittest.IsolatedAsyncioTestCase):
    def test_ssrf_guard_rejects_private_and_non_http(self):
        from agent.probe import is_public_url
        for bad in ("http://127.0.0.1/x", "http://localhost/", "http://169.254.169.254/latest", "file:///etc/passwd", "ftp://example.com"):
            self.assertFalse(is_public_url(bad), bad)

    async def test_probe_records_machine_checks(self):
        from agent import probe
        async def fake_check(client, url):
            return url, 200, "reachable"
        async def fake_discovery(client, website):
            return None
        orig = (probe._check, probe._discovery)
        probe._check, probe._discovery = fake_check, fake_discovery
        try:
            guide = load_guide("github")
            guide = await probe.probe_guide(guide)
        finally:
            probe._check, probe._discovery = orig
        self.assertEqual(guide["verification"]["status"], "automated_checks")
        self.assertTrue(any("Link check" in a["action"] for a in guide["agent_actions"]))

    def test_rate_limit(self):
        import main
        from fastapi import HTTPException
        main._hits.clear()
        old = main.RATE_LIMIT_PER_HOUR
        main.RATE_LIMIT_PER_HOUR = 2
        try:
            main.check_rate_limit("1.2.3.4")
            main.check_rate_limit("1.2.3.4")
            with self.assertRaises(HTTPException) as ctx:
                main.check_rate_limit("1.2.3.4")
            self.assertEqual(ctx.exception.status_code, 429)
            main.check_rate_limit("5.6.7.8")  # other clients are unaffected
        finally:
            main.RATE_LIMIT_PER_HOUR = old
            main._hits.clear()


class TestSetupKitAndProbe(unittest.IsolatedAsyncioTestCase):
    def test_setup_kit_slack_has_manifest_and_prefilled_link(self):
        c = TestClient(app)
        kit = c.get("/api/guides/slack").json()["setup_kit"]
        self.assertTrue(any(f["filename"] == "slack-app-manifest.json" for f in kit["files"]))
        self.assertTrue(any("manifest_json=" in l["url"] for l in kit["links"]))
        self.assertTrue(any("backend.composio.dev" in v["value"] for v in kit["values"]))

    def test_every_library_guide_has_endpoints_and_next_step(self):
        for g in list_all_guides():
            full = load_guide(g["slug"])
            self.assertTrue(full["oauth_endpoints"]["authorization_url"].startswith("https://"), g["slug"])
            self.assertTrue(full["next_step"], g["slug"])
            self.assertTrue(full["verification"], g["slug"])

    def test_probe_rejects_non_https_and_private(self):
        c = TestClient(app)
        self.assertEqual(c.post("/api/probe", json={"authorization_url": "http://example.com"}).status_code, 422)

    async def test_probe_endpoints_blocks_private_addresses(self):
        from agent.setup import probe_endpoints
        r = await probe_endpoints("https://127.0.0.1/oauth/authorize", "https://localhost/token")
        self.assertTrue(all(x["outcome"] == "skipped" for x in r))

    def test_classifier(self):
        from agent.setup import _classify_authorize
        self.assertEqual(_classify_authorize(302, "/oauth2/authorize_error?x=1", "")[0], "rejects_client")
        self.assertEqual(_classify_authorize(302, "https://x.com/signin?next", "")[0], "login_first")
        self.assertEqual(_classify_authorize(400, "", "invalid_client")[0], "rejects_client")
        self.assertEqual(_classify_authorize(403, "", "")[0], "blocked")

if __name__ == "__main__":
    unittest.main()

