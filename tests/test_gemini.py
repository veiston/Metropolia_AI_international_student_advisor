import os
import sys
import json
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import gemini_API


class TestGeminiAdvisor(unittest.TestCase):

    def test_format_documents(self):
        result = gemini_API._format_documents([])
        self.assertEqual(result, "")

        docs = [{"name": "guide.txt", "text": "Metropolia instructions"}]
        result = gemini_API._format_documents(docs)
        self.assertIn("Document: guide.txt", result)
        self.assertIn("Metropolia instructions", result)

    def test_format_contents_alternation(self):
        history = [
            {"role": "assistant", "content": "Welcome!"},
            {"role": "assistant", "content": "⚠️ Network error"},
            {"role": "user", "content": "Where is the campus?"},
            {"role": "assistant", "content": "In Myllypuro."},
        ]
        contents = gemini_API._format_contents("How to reach it?", history)

        self.assertEqual(len(contents), 3)
        self.assertEqual(contents[0].role, "user")
        self.assertEqual(contents[0].parts[0].text, "Where is the campus?")
        self.assertEqual(contents[1].role, "model")
        self.assertEqual(contents[1].parts[0].text, "In Myllypuro.")
        self.assertEqual(contents[2].role, "user")
        self.assertEqual(contents[2].parts[0].text, "How to reach it?")

    def test_extract_citations(self):
        mock_web = MagicMock()
        mock_web.title = "Migri"
        mock_web.uri = "https://migri.fi"

        mock_grounding = MagicMock()
        mock_grounding.grounding_chunks = [MagicMock(web=mock_web)]

        mock_candidate = MagicMock()
        mock_candidate.grounding_metadata = mock_grounding

        mock_chunk = MagicMock()
        mock_chunk.candidates = [mock_candidate]

        citations = gemini_API._extract_citations(mock_chunk)
        self.assertEqual(len(citations), 1)
        self.assertEqual(citations[0]["source"], "Migri")
        self.assertEqual(citations[0]["url"], "https://migri.fi")

    @patch("api.gemini_API.genai.Client")
    def test_query_gemini_stream_success(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_chunk = MagicMock()
        mock_chunk.text = "Hello student"
        mock_chunk.candidates = []

        mock_client.models.generate_content_stream.return_value = [mock_chunk]

        stream = gemini_API.query_gemini_stream("Hello")
        events = list(stream)

        self.assertIn('data: {"text": "Hello student"}\n\n', events)
        self.assertIn("data: [DONE]\n\n", events)

    @patch("api.gemini_API.genai.Client")
    def test_query_gemini_stream_fallback(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        fallback_chunk = MagicMock()
        fallback_chunk.text = "Fallback answer"
        fallback_chunk.candidates = []

        mock_client.models.generate_content_stream.side_effect = [
            Exception("Primary model unavailable"),
            [fallback_chunk],
        ]

        stream = gemini_API.query_gemini_stream("Hello")
        events = list(stream)

        self.assertIn('data: {"text": "Fallback answer"}\n\n', events)
        self.assertIn("data: [DONE]\n\n", events)

    @patch("api.gemini_API.genai.Client")
    def test_query_gemini_stream_quota_error(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_client.models.generate_content_stream.side_effect = Exception("429 RESOURCE_EXHAUSTED")

        stream = gemini_API.query_gemini_stream("Hello")
        events = list(stream)

        has_quota_message = False
        for event in events:
            if "quota exceeded" in event.lower():
                has_quota_message = True
                break

        self.assertTrue(has_quota_message)
        self.assertIn("data: [DONE]\n\n", events)

    @patch("api.gemini_API.genai.Client")
    def test_analyze_document_success(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        expected = {
            "summary": "Admission letter",
            "checklist": [{"title": "Accept seat", "description": "By July 15", "urgency": "High"}],
            "risks": "Missing deadline forfeits place",
        }
        mock_res = MagicMock()
        mock_res.text = json.dumps(expected)
        mock_client.models.generate_content.return_value = mock_res

        result = gemini_API.analyze_document(b"Admission content", "offer.pdf", "application/pdf")
        self.assertEqual(result["summary"], "Admission letter")
        self.assertEqual(len(result["checklist"]), 1)


if __name__ == "__main__":
    unittest.main()
