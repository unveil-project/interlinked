### Motivation and Context
Fixes #14531

Enables full multimodal vision support for Anthropic Claude models (Claude 3.5 Sonnet, 3.7 Sonnet, Opus 4.8, Fable 5.1 / Mythos 5.1) in Semantic Kernel Python by properly converting `ImageContent` into Anthropic image content blocks.

### Description
1. Added `_create_image_content` helper in `semantic_kernel/connectors/ai/anthropic/services/utils.py` to convert `ImageContent` into Anthropic Base64 image payload blocks.
2. Updated `_format_user_message` to iterate over `message.items` when multimodal items are present, while retaining backwards-compatible single text string format for standard text-only messages.
3. Added unit tests in `python/tests/unit/connectors/ai/anthropic/services/test_anthropic_chat_completion.py` covering:
   - Text-only messages (backward compatibility)
   - Multimodal Text + Image messages
   - Image-only messages

Author: Chau Vu / CPF-FAMILY (@chauvuusvn)