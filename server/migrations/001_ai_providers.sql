-- Add AI provider configuration columns to settings table
ALTER TABLE settings ADD COLUMN ai_text_provider TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE settings ADD COLUMN ai_text_api_key TEXT;
ALTER TABLE settings ADD COLUMN ai_text_model TEXT;
ALTER TABLE settings ADD COLUMN ai_image_provider TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE settings ADD COLUMN ai_image_api_key TEXT;
ALTER TABLE settings ADD COLUMN ai_image_model TEXT;