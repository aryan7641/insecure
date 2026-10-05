from insurance_extractor.llm import CompactLLMExtractor


def test_multimodal_input_shape():
    extractor = object.__new__(CompactLLMExtractor)
    payload = extractor._input_openai("health", "PAGE 15\nOptional Covers", ["health.policy.optional_covers"], {15: "data:image/jpeg;base64,abc"})
    user = payload[1]
    assert user["role"] == "user"
    assert isinstance(user["content"], list)
    assert any(x.get("type") == "image_url" for x in user["content"])
    assert any(x.get("type") == "text" and "VISUAL_PAGE=15" in x.get("text", "") for x in user["content"])
