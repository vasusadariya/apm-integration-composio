"""
Unit and integration tests for the OAuth Guide Backend API.
Tests all endpoints, schema validation, and search functionality.
"""
import unittest
from fastapi.testclient import TestClient
from main import app, list_all_guides, load_guide
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
        self.assertEqual(len(results), 12)

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

if __name__ == "__main__":
    unittest.main()

