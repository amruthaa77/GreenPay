import os
import pytest
from pydantic import ValidationError
from app.core.config import Settings

def test_default_cors_origins(monkeypatch):
    """When no CORS_ORIGINS env var is provided, defaults to local dev URLs."""
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    s = Settings()
    assert isinstance(s.CORS_ORIGINS, list)
    assert len(s.CORS_ORIGINS) == 12
    assert "http://localhost:5173" in s.CORS_ORIGINS
    assert "http://localhost:5174" in s.CORS_ORIGINS
    assert "http://127.0.0.1:3000" in s.CORS_ORIGINS

def test_comma_separated_origins_env(monkeypatch):
    """Parses standard comma-separated origins from environment variables."""
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "https://greenpay-citizen.vercel.app, https://greenpay-admin.vercel.app"
    )
    s = Settings()
    assert s.CORS_ORIGINS == [
        "https://greenpay-citizen.vercel.app",
        "https://greenpay-admin.vercel.app"
    ]

def test_comma_separated_with_trailing_slashes_and_whitespace(monkeypatch):
    """Strips whitespace and trailing slashes from comma-separated origins."""
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "  https://greenpay-citizen.vercel.app/ ,   https://greenpay-admin.vercel.app/  "
    )
    s = Settings()
    assert s.CORS_ORIGINS == [
        "https://greenpay-citizen.vercel.app",
        "https://greenpay-admin.vercel.app"
    ]

def test_json_array_origins_env(monkeypatch):
    """Parses JSON array of origins from environment variables."""
    monkeypatch.setenv(
        "CORS_ORIGINS",
        '["https://greenpay-citizen.vercel.app", "https://greenpay-admin.vercel.app"]'
    )
    s = Settings()
    assert s.CORS_ORIGINS == [
        "https://greenpay-citizen.vercel.app",
        "https://greenpay-admin.vercel.app"
    ]

def test_json_array_with_trailing_slashes(monkeypatch):
    """Strips trailing slashes from origins inside JSON arrays."""
    monkeypatch.setenv(
        "CORS_ORIGINS",
        '["https://greenpay-citizen.vercel.app/", "https://greenpay-admin.vercel.app/"]'
    )
    s = Settings()
    assert s.CORS_ORIGINS == [
        "https://greenpay-citizen.vercel.app",
        "https://greenpay-admin.vercel.app"
    ]

def test_single_origin_env(monkeypatch):
    """Parses a single origin string from environment variables."""
    monkeypatch.setenv("CORS_ORIGINS", "https://greenpay-citizen.vercel.app")
    s = Settings()
    assert s.CORS_ORIGINS == ["https://greenpay-citizen.vercel.app"]

def test_single_origin_with_trailing_slash(monkeypatch):
    """Strips trailing slash from a single origin string."""
    monkeypatch.setenv("CORS_ORIGINS", "https://greenpay-citizen.vercel.app/")
    s = Settings()
    assert s.CORS_ORIGINS == ["https://greenpay-citizen.vercel.app"]

def test_wildcard_origin(monkeypatch):
    """Supports wildcard origin '*'."""
    monkeypatch.setenv("CORS_ORIGINS", "*")
    s = Settings()
    assert s.CORS_ORIGINS == ["*"]

def test_empty_string_origin_env(monkeypatch):
    """Empty string in environment variable returns an empty list without error."""
    monkeypatch.setenv("CORS_ORIGINS", "")
    s = Settings()
    assert s.CORS_ORIGINS == []

def test_whitespace_only_origin_env(monkeypatch):
    """Whitespace-only string returns an empty list without error."""
    monkeypatch.setenv("CORS_ORIGINS", "   ")
    s = Settings()
    assert s.CORS_ORIGINS == []

def test_malformed_json_rejected(monkeypatch):
    """Rejects malformed JSON with a clear ValidationError."""
    monkeypatch.setenv("CORS_ORIGINS", '["https://broken.vercel.app')
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "Invalid JSON format for CORS_ORIGINS" in str(exc_info.value)

def test_json_object_rejected(monkeypatch):
    """Rejects JSON objects that are not arrays."""
    monkeypatch.setenv("CORS_ORIGINS", '{"origin": "https://broken.vercel.app"}')
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "CORS_ORIGINS JSON must be an array of origin strings" in str(exc_info.value)

def test_json_array_non_string_rejected(monkeypatch):
    """Rejects JSON arrays containing non-string items."""
    monkeypatch.setenv("CORS_ORIGINS", '[123, 456]')
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "CORS origin items must be strings" in str(exc_info.value)

def test_invalid_scheme_rejected(monkeypatch):
    """Rejects origins with non-http(s) scheme."""
    monkeypatch.setenv("CORS_ORIGINS", "ftp://greenpay-citizen.vercel.app")
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "scheme must be 'http' or 'https'" in str(exc_info.value)

def test_missing_scheme_or_host_rejected(monkeypatch):
    """Rejects origins missing a scheme or host."""
    monkeypatch.setenv("CORS_ORIGINS", "invalid_origin_url")
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "scheme must be 'http' or 'https'" in str(exc_info.value)

def test_path_in_origin_rejected(monkeypatch):
    """Rejects origins that contain paths."""
    monkeypatch.setenv("CORS_ORIGINS", "https://greenpay-citizen.vercel.app/api/v1")
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "origins cannot contain a path" in str(exc_info.value)

def test_query_in_origin_rejected(monkeypatch):
    """Rejects origins that contain query parameters."""
    monkeypatch.setenv("CORS_ORIGINS", "https://greenpay-citizen.vercel.app?param=1")
    with pytest.raises(ValidationError) as exc_info:
        Settings()
    assert "origins cannot contain query parameters" in str(exc_info.value)

def test_direct_python_list_initialization():
    """Validates that passing a list directly to Settings still validates and cleans origins."""
    s = Settings(CORS_ORIGINS=["https://direct.vercel.app/", "https://direct-admin.vercel.app/"])
    assert s.CORS_ORIGINS == [
        "https://direct.vercel.app",
        "https://direct-admin.vercel.app"
    ]
