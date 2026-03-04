-- Add profile photo column to users table
ALTER TABLE users 
ADD COLUMN profile_photo VARCHAR(500) NULL AFTER position,
ADD COLUMN profile_photo_filename VARCHAR(255) NULL AFTER profile_photo;

-- Add index for faster lookups
CREATE INDEX idx_users_profile_photo ON users(profile_photo);
