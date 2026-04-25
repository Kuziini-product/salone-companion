-- Seed data for local dev: a handful of real Salone exhibitors
-- Replace with full catalog via the importer.

insert into companies (external_id, name, stand_number, pavilion, hall, website, description, source) values
  ('cassina',     'Cassina',         'B12', 'Pavilion 6', 'Hall 6',  'https://www.cassina.com',     'Italian luxury furniture manufacturer founded in 1927.', 'imported'),
  ('molteni',     'Molteni&C',       'D04', 'Pavilion 6', 'Hall 6',  'https://www.molteni.it',      'Modern furniture and contract solutions.',               'imported'),
  ('poliform',    'Poliform',        'A20', 'Pavilion 8', 'Hall 8',  'https://www.poliform.it',     'Living, dining, bedroom, kitchen systems.',              'imported'),
  ('b-and-b',     'B&B Italia',      'C02', 'Pavilion 6', 'Hall 6',  'https://www.bebitalia.com',   'Iconic Italian design since 1966.',                       'imported'),
  ('flexform',    'Flexform',        'B30', 'Pavilion 8', 'Hall 8',  'https://www.flexform.it',     'Sofas, armchairs, beds — refined modern design.',         'imported'),
  ('minotti',     'Minotti',         'A12', 'Pavilion 6', 'Hall 6',  'https://www.minotti.com',     'High-end indoor and outdoor collections.',               'imported'),
  ('kartell',     'Kartell',         'D11', 'Pavilion 12','Hall 12', 'https://www.kartell.com',     'Innovative plastic design furniture.',                   'imported'),
  ('artemide',    'Artemide',        'C18', 'Pavilion 13','Hall 13', 'https://www.artemide.com',    'Lighting design and innovation.',                        'imported'),
  ('flos',        'Flos',            'B22', 'Pavilion 13','Hall 13', 'https://www.flos.com',        'Decorative and architectural lighting.',                 'imported'),
  ('boffi',       'Boffi',           'A06', 'Pavilion 24','Hall 24', 'https://www.boffi.com',       'Kitchen and bathroom systems.',                          'imported')
on conflict (external_id) do nothing;

insert into tags (name, color) values
  ('Lighting',    '#F59E0B'),
  ('Sofas',       '#3B82F6'),
  ('Kitchen',     '#10B981'),
  ('Outdoor',     '#84CC16'),
  ('Office',      '#8B5CF6'),
  ('Premium',     '#EC4899'),
  ('Sustainable', '#22C55E')
on conflict (name) do nothing;
