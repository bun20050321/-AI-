from proofquery.config import Settings


def test_settings_require_model_and_keep_secrets_out_of_repr(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "secret-test-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")

    settings = Settings()

    assert settings.openai_model == "test-model"
    assert "secret-test-key" not in repr(settings)
    assert settings.max_upload_bytes == 50 * 1024 * 1024


def test_settings_allow_profiling_without_openai_credentials(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)

    settings = Settings()

    assert settings.openai_api_key is None
    assert settings.openai_model is None
