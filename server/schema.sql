CREATE TABLE kiwi_admin (
  id INTEGER PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);
CREATE TABLE kiwi_books (
  id CHAR(32) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  author VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  format VARCHAR(20) NOT NULL,
  price VARCHAR(20) NOT NULL,
  currency CHAR(3) NOT NULL,
  available INTEGER NOT NULL,
  published INTEGER NOT NULL,
  featured INTEGER NOT NULL,
  cover VARCHAR(80) NOT NULL,
  updated_at VARCHAR(30) NOT NULL
);
CREATE TABLE kiwi_settings (
  id INTEGER PRIMARY KEY,
  whatsapp VARCHAR(15) NOT NULL
);
INSERT INTO kiwi_settings (id, whatsapp) VALUES (1, '');
CREATE TABLE kiwi_attempts (
  attempt_key CHAR(64) PRIMARY KEY,
  attempts INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);
