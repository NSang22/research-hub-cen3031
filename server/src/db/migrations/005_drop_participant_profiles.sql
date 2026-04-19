-- Migration 005: Drop study participant recruitment tables
-- Removes the study participant recruitment feature; platform refocused on undergraduate research recruitment only.

DROP TABLE IF EXISTS study_participant_profiles CASCADE;
DROP TABLE IF EXISTS participant_profiles CASCADE;
