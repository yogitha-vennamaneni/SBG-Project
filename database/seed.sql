-- SBG Scheduler — Seed Data
-- Matches the sample data in client/src/data/sampleData.ts
-- Run AFTER 001_initial.sql and 002_scheduling_export.sql
--
-- Note: 002_scheduling_export.sql renames technicians -> installers,
-- job_technicians -> job_installers, and technician_availability -> installer_availability.


-- ============================================================
-- SEED DATA
-- ============================================================

-- ─── Customers ───────────────────────────────────────────────────────────────

INSERT INTO customers (id, first_name, last_name, email, phone, street, suburb, state, postcode, nmi) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Michael',  'Chen',     'michael.chen@email.com',     '0412 345 678', '42 Doncaster Rd',  'Doncaster',  'VIC', '3108', 'VICXXX1234'),
  ('c0000001-0000-0000-0000-000000000002', 'Sarah',    'Johnson',  'sarah.johnson@email.com',    '0423 456 789', '18 Main St',       'Ringwood',   'VIC', '3134', NULL),
  ('c0000001-0000-0000-0000-000000000003', 'Robert',   'Williams', 'robert.williams@email.com',  '0434 567 890', '7 Church St',      'Burwood',    'VIC', '3125', 'VICXXX5678'),
  ('c0000001-0000-0000-0000-000000000004', 'Emily',    'Brown',    'emily.brown@email.com',      '0445 678 901', '23 Elgar Rd',      'Nunawading', 'VIC', '3131', NULL),
  ('c0000001-0000-0000-0000-000000000005', 'David',    'Taylor',   'david.taylor@email.com',     '0456 789 012', '55 Station St',    'Box Hill',   'VIC', '3128', 'VICXXX9012'),
  ('c0000001-0000-0000-0000-000000000006', 'Jennifer', 'Anderson', 'jennifer.anderson@email.com','0467 890 123', '91 Canterbury Rd', 'Forest Hill','VIC', '3131', NULL),
  ('c0000001-0000-0000-0000-000000000007', 'James',    'Wilson',   'james.wilson@email.com',     '0478 901 234', '14 Burke Rd',      'Camberwell', 'VIC', '3124', 'VICXXX3456');

-- ─── Installers ──────────────────────────────────────────────────────────────
-- Block 1: original technicians (no installer_code)

INSERT INTO installers (id, first_name, last_name, email, phone, role, licence_number, rec_registration, skills, is_active) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Jake',   'Morrison', 'jake.morrison@sbg.com.au',  '0411 111 111', 'installer',   NULL,          'A12345', ARRAY['solar_installation','battery_installation','solar_adjustment']::job_type[], TRUE),
  ('a0000001-0000-0000-0000-000000000002', 'Priya',  'Sharma',   'priya.sharma@sbg.com.au',   '0422 222 222', 'electrician', 'VIC-EW-4521', 'B67890', ARRAY['ev_charger','battery_installation','solar_installation']::job_type[], TRUE),
  ('a0000001-0000-0000-0000-000000000003', 'Liam',   'O''Brien', 'liam.obrien@sbg.com.au',    '0433 333 333', 'installer',   NULL,          'C11223', ARRAY['solar_installation','roof_renovation','solar_adjustment']::job_type[], TRUE),
  ('a0000001-0000-0000-0000-000000000004', 'Amara',  'Nguyen',   'amara.nguyen@sbg.com.au',   '0444 444 444', 'supervisor',  'VIC-EC-8834', 'D44556', ARRAY['solar_installation','battery_installation','ev_charger','roof_renovation','solar_adjustment']::job_type[], TRUE),
  ('a0000001-0000-0000-0000-000000000005', 'Connor', 'Walsh',    'connor.walsh@sbg.com.au',   '0455 555 555', 'electrician', 'VIC-EW-3317', NULL,     ARRAY['ev_charger','battery_installation']::job_type[], TRUE);

-- Block 2: scheduling export installers (INS-01 to INS-09)

INSERT INTO installers (id, first_name, last_name, email, phone, role, installer_code, state, home_base, working_days, shift_start, shift_end, leave_start, leave_end) VALUES
  ('a0000002-0000-0000-0000-000000000001', 'Marcus', 'Bell',      'marcus.bell@sbg.com.au',      '0462 855 736', 'installer', 'INS-01', 'VIC', 'Ringwood',      ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000002', 'Anita',  'Rao',       'anita.rao@sbg.com.au',        '0469 783 452', 'installer', 'INS-02', 'VIC', 'Werribee',      ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000003', 'Tom',    'Alvarez',   'tom.alvarez@sbg.com.au',      '0483 863 951', 'installer', 'INS-03', 'VIC', 'Frankston',     ARRAY['Tue','Wed','Thu','Fri','Sat'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000004', 'Sarah',  'Whitmore',  'sarah.whitmore@sbg.com.au',   '0410 859 458', 'installer', 'INS-04', 'NSW', 'Parramatta',    ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', '2026-10-05', '2026-10-09'),
  ('a0000002-0000-0000-0000-000000000005', 'Daniel', 'Okafor',    'daniel.okafor@sbg.com.au',    '0490 394 937', 'installer', 'INS-05', 'NSW', 'Penrith',       ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000006', 'Liam',   'Chen',      'liam.chen@sbg.com.au',        '0477 799 295', 'installer', 'INS-06', 'NSW', 'Hornsby',       ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000007', 'Jess',   'Kowalski',  'jess.kowalski@sbg.com.au',    '0479 767 391', 'installer', 'INS-07', 'QLD', 'Chermside',     ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000008', 'Aaron',  'Te Rangi',  'aaron.terangi@sbg.com.au',    '0417 473 839', 'installer', 'INS-08', 'QLD', 'Logan Central', ARRAY['Tue','Wed','Thu','Fri','Sat'], '07:00', '17:00', NULL,         NULL),
  ('a0000002-0000-0000-0000-000000000009', 'Bec',    'Halloran',  'bec.halloran@sbg.com.au',     '0430 447 331', 'installer', 'INS-09', 'WA',  'Joondalup',     ARRAY['Mon','Tue','Wed','Thu','Fri'], '07:00', '17:00', NULL,         NULL);

-- ─── Installer availability (original technicians, Mon-Fri 07-17) ─────────────

INSERT INTO installer_availability (installer_id, day_of_week, start_time, end_time) VALUES
  -- Jake Morrison
  ('a0000001-0000-0000-0000-000000000001', 1, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000001', 2, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000001', 3, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000001', 4, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000001', 5, '07:00', '17:00'),
  -- Priya Sharma
  ('a0000001-0000-0000-0000-000000000002', 1, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000002', 2, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000002', 3, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000002', 4, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000002', 5, '07:00', '17:00'),
  -- Liam O'Brien (Fri ends 15:00)
  ('a0000001-0000-0000-0000-000000000003', 1, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000003', 2, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000003', 3, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000003', 4, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000003', 5, '07:00', '15:00'),
  -- Amara Nguyen (Sat 08-13)
  ('a0000001-0000-0000-0000-000000000004', 1, '08:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000004', 2, '08:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000004', 3, '08:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000004', 4, '08:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000004', 5, '08:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000004', 6, '08:00', '13:00'),
  -- Connor Walsh
  ('a0000001-0000-0000-0000-000000000005', 1, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000005', 2, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000005', 3, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000005', 4, '07:00', '17:00'),
  ('a0000001-0000-0000-0000-000000000005', 5, '07:00', '17:00');

-- ─── Customers: export jobs (J-1001 to J-1053) ──────────────────────────────
-- Promoted from inline fields on jobs; customer_id on those jobs is back-filled
-- after the jobs INSERT via an UPDATE on matching email.

INSERT INTO customers (id, first_name, last_name, email, phone, street, suburb, state, postcode) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Amelia',    'Kelly',        'amelia.kelly@outlook.com',      '0416 418 142', '118 Railway Pde',   'Hornsby',       'NSW', '2077'),
  ('c0000002-0000-0000-0000-000000000002', 'Declan',    'Wilson',       'declan.wilson@iinet.net.au',    '0446 966 675', '96 Railway Pde',    'Geelong',       'VIC', '3220'),
  ('c0000002-0000-0000-0000-000000000003', 'William',   'Rossi',        'williamrossi@iinet.net.au',     '0465 531 957', '140 Railway Pde',   'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000004', 'Lachlan',   'Rossi',        'lachlan_rossi@outlook.com',     '0497 441 799', '131 Kingfisher Dr', 'Newcastle',     'NSW', '2300'),
  ('c0000002-0000-0000-0000-000000000005', 'Bruce',     'Kelly',        'bruce_kelly@iinet.net.au',      '0437 628 663', '120 Waratah Ct',    'Wollongong',    'NSW', '2500'),
  ('c0000002-0000-0000-0000-000000000006', 'Omar',      'Taylor',       'omar.taylor@gmail.com',         '0499 400 726', '108 Boronia Ave',   'Newcastle',     'NSW', '2300'),
  ('c0000002-0000-0000-0000-000000000007', 'Sophie',    'Brown',        'sophie.brown@gmail.com',        '0413 528 185', '175 Victoria Rd',   'Glen Waverley', 'VIC', '3150'),
  ('c0000002-0000-0000-0000-000000000008', 'Tane',      'Garcia',       'tane_garcia@iinet.net.au',      '0454 954 476', '142 Station St',    'Fremantle',     'WA',  '6160'),
  ('c0000002-0000-0000-0000-000000000009', 'Noah',      'Schneider',    'noah.schneider@bigpond.com',    '0415 684 679', '76 Valley View Ct', 'Newcastle',     'NSW', '2300'),
  ('c0000002-0000-0000-0000-000000000010', 'Elena',     'McKenzie',     'elenamckenzie@bigpond.com',     '0450 321 998', '14 Grevillea Way',  'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000011', 'Marco',     'White',        'marco_white@gmail.com',         '0470 761 504', '34 Main Rd',        'Ringwood',      'VIC', '3134'),
  ('c0000002-0000-0000-0000-000000000012', 'Mia',       'Petrov',       'mia_petrov@outlook.com',        '0440 395 868', '80 Eucalyptus Dr',  'Armadale',      'WA',  '6112'),
  ('c0000002-0000-0000-0000-000000000013', 'Tegan',     'Taylor',       'tegan.taylor@iinet.net.au',     '0449 421 389', '7 Seaview Rd',      'Toowoomba',     'QLD', '4350'),
  ('c0000002-0000-0000-0000-000000000014', 'Rhys',      'Kelly',        'rhys.kelly@bigpond.com',        '0470 463 361', '69 Park Ave',       'Capalaba',      'QLD', '4157'),
  ('c0000002-0000-0000-0000-000000000015', 'Alexander', 'O''Brien',     'alexanderobrien@iinet.net.au',  '0479 683 650', '102 Acacia Pl',     'Gosford',       'NSW', '2250'),
  ('c0000002-0000-0000-0000-000000000016', 'Margaret',  'Sato',         'margaretsato@iinet.net.au',     '0484 660 100', '21 High St',        'Liverpool',     'NSW', '2170'),
  ('c0000002-0000-0000-0000-000000000017', 'Tane',      'Taylor',       'tane.taylor@outlook.com',       '0483 786 900', '55 George St',      'Glen Waverley', 'VIC', '3150'),
  ('c0000002-0000-0000-0000-000000000018', 'Noah',      'Hassan',       'noahhassan@outlook.com',        '0457 577 966', '174 Grevillea Way', 'Liverpool',     'NSW', '2170'),
  ('c0000002-0000-0000-0000-000000000019', 'Ella',      'Anderson',     'ella.anderson@bigpond.com',     '0429 934 987', '35 Kingfisher Dr',  'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000020', 'Nadia',     'Ryan',         'nadiaryan@bigpond.com',         '0454 557 520', '49 Creekside Pl',   'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000021', 'James',     'Lopez',        'james.lopez@iinet.net.au',      '0478 471 132', '48 Park Ave',       'Fremantle',     'WA',  '6160'),
  ('c0000002-0000-0000-0000-000000000022', 'Rhys',      'Lee',          'rhys_lee@gmail.com',            '0414 111 492', '160 Creekside Pl',  'Ballarat',      'VIC', '3350'),
  ('c0000002-0000-0000-0000-000000000023', 'Rhys',      'Jones',        'rhysjones@yahoo.com.au',        '0493 896 677', '163 George St',     'Redcliffe',     'QLD', '4020'),
  ('c0000002-0000-0000-0000-000000000024', 'Priya',     'Martin',       'priya.martin@yahoo.com.au',     '0469 989 922', '26 Jacaranda Rd',   'Sunbury',       'VIC', '3429'),
  ('c0000002-0000-0000-0000-000000000025', 'Tane',      'White',        'tanewhite@iinet.net.au',        '0437 819 631', '118 Kingfisher Dr', 'Hornsby',       'NSW', '2077'),
  ('c0000002-0000-0000-0000-000000000026', 'Liam',      'Khan',         'liam_khan@gmail.com',           '0491 576 476', '108 Boronia Ave',   'Wollongong',    'NSW', '2500'),
  ('c0000002-0000-0000-0000-000000000027', 'Marco',     'Martin',       'marcomartin@outlook.com',       '0429 184 191', '134 Creekside Pl',  'Fremantle',     'WA',  '6160'),
  ('c0000002-0000-0000-0000-000000000028', 'Liam',      'Chen',         'liam_chen@iinet.net.au',        '0441 178 796', '144 Creekside Pl',  'Ringwood',      'VIC', '3134'),
  ('c0000002-0000-0000-0000-000000000029', 'Mateo',     'Taylor',       'mateotaylor@yahoo.com.au',      '0433 510 601', '106 Creekside Pl',  'Logan Central', 'QLD', '4114'),
  ('c0000002-0000-0000-0000-000000000030', 'James',     'White',        'james_white@iinet.net.au',      '0417 999 412', '6 High St',         'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000031', 'Hana',      'Costa',        'hana.costa@outlook.com',        '0495 974 780', '106 Ridgeway Dr',   'Blacktown',     'NSW', '2148'),
  ('c0000002-0000-0000-0000-000000000032', 'Harper',    'Tanaka',       'harper_tanaka@yahoo.com.au',    '0431 712 136', '102 Wattle Cres',   'Toowoomba',     'QLD', '4350'),
  ('c0000002-0000-0000-0000-000000000033', 'Ruby',      'Chen',         'rubychen@yahoo.com.au',         '0433 756 128', '162 Waratah Ct',    'Parramatta',    'NSW', '2150'),
  ('c0000002-0000-0000-0000-000000000034', 'Liam',      'Ryan',         'liam_ryan@bigpond.com',         '0498 595 232', '107 Hillcrest Ave', 'Gosford',       'NSW', '2250'),
  ('c0000002-0000-0000-0000-000000000035', 'Wei',       'Kaur',         'wei.kaur@outlook.com',          '0451 652 643', '132 George St',     'Werribee',      'VIC', '3030'),
  ('c0000002-0000-0000-0000-000000000036', 'Tane',      'Williams',     'tane.williams@iinet.net.au',    '0477 344 165', '78 Ridgeway Dr',    'Springfield',   'QLD', '4300'),
  ('c0000002-0000-0000-0000-000000000037', 'Ruby',      'O''Brien',     'ruby.obrien@gmail.com',         '0414 574 990', '130 Banksia Ct',    'Sunbury',       'VIC', '3429'),
  ('c0000002-0000-0000-0000-000000000038', 'Wei',       'O''Brien',     'wei_obrien@iinet.net.au',       '0431 966 337', '3 Park Ave',        'Joondalup',     'WA',  '6027'),
  ('c0000002-0000-0000-0000-000000000039', 'Helen',     'Nguyen',       'helen_nguyen@bigpond.com',      '0493 634 654', '130 George St',     'Campbelltown',  'NSW', '2560'),
  ('c0000002-0000-0000-0000-000000000040', 'Bronwyn',   'Fraser',       'bronwyn_fraser@outlook.com',    '0429 647 478', '9 Eucalyptus Dr',   'Craigieburn',   'VIC', '3064'),
  ('c0000002-0000-0000-0000-000000000041', 'Wei',       'Jones',        'wei.jones@yahoo.com.au',        '0468 644 971', 'TBC (new build)',   'Geelong',       'VIC', '3220'),
  ('c0000002-0000-0000-0000-000000000042', 'Tegan',     'Jones',        'teganjones@yahoo.com.au',       '0440 292 647', '89 Ridgeway Dr',    'Baldivis',      'WA',  '6171'),
  ('c0000002-0000-0000-0000-000000000043', 'Mateo',     'Garcia',       'mateo.garcia@outlook.com',      '0471 557 134', '27 Church St',      'Hornsby',       'NSW', '2077'),
  ('c0000002-0000-0000-0000-000000000044', 'Ethan',     'O''Brien',     'ethan_obrien@yahoo.com.au',     '0495 774 308', '162 Station St',    'Ipswich',       'QLD', '4305'),
  ('c0000002-0000-0000-0000-000000000045', 'Nadia',     'Te Wiata',     'nadiatewiata@outlook.com',      '0495 516 115', '14 Banksia Ct',     'Wollongong',    'NSW', '2500'),
  ('c0000002-0000-0000-0000-000000000046', 'Ruby',      'McKenzie',     'ruby_mckenzie@iinet.net.au',    '0426 236 222', '87 Park Ave',       'Berwick',       'VIC', '3806'),
  ('c0000002-0000-0000-0000-000000000047', 'Alexander', 'Smith',        'alexander.smith@bigpond.com',   '0465 299 975', '101 Lorikeet Cl',   'Hornsby',       'NSW', '2077'),
  ('c0000002-0000-0000-0000-000000000048', 'Noah',      'Smith',        'noahsmith@iinet.net.au',        '0428 965 228', '6 Melaleuca St',    'Southport',     'QLD', '4215'),
  ('c0000002-0000-0000-0000-000000000049', 'Ruby',      'Parata',       'ruby_parata@bigpond.com',       '0487 955 948', '128 Railway Pde',   'Joondalup',     'WA',  '6027'),
  ('c0000002-0000-0000-0000-000000000050', 'Noah',      'Papadopoulos', 'noah_papadopoulos@iinet.net.au','0497 399 678', '5 Park Ave',        'Wollongong',    'NSW', '2500'),
  ('c0000002-0000-0000-0000-000000000051', 'James',     'Costa',        'james_costa@bigpond.com',       '0483 310 817', '10 George St',      'North Lakes',   'QLD', '4509'),
  ('c0000002-0000-0000-0000-000000000052', 'Lucas',     'Brown',        'lucas_brown@outlook.com',       '0446 912 477', '84 George St',      'Springfield',   'QLD', '4300'),
  ('c0000002-0000-0000-0000-000000000053', 'Arjun',     'Petrov',       'arjun_petrov@gmail.com',        '0441 931 925', '67 Church St',      'Armadale',      'WA',  '6112');

-- ─── Enquiries ───────────────────────────────────────────────────────────────

INSERT INTO enquiries (id, customer_id, job_type, description, roof_type, system_size_kw, panel_count, battery_capacity_kwh, weather_risk, status) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'solar_installation',  'Interested in 6.6kW system with battery backup', 'tile', 6.6, 16, NULL, 'low', 'quoted'),
  ('e0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'battery_installation', 'Add 13.5kWh battery to existing 5kW solar',       NULL,  NULL, NULL, 13.5, 'low', 'reviewed'),
  ('e0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000006', 'ev_charger',           '32A 3-phase EV charger for Tesla Model 3',         NULL,  NULL, NULL, NULL, 'low', 'new');

-- ─── Quotes ──────────────────────────────────────────────────────────────────

INSERT INTO quotes (id, enquiry_id, customer_id, job_type, line_items, subtotal, stc_rebate, gst, total, deposit_amount, balance_amount, valid_until, docsign_status) VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    'e0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'solar_installation',
    '[
      {"description":"SunPower Maxeon 415W Panels (×16)","qty":16,"unitPrice":320,"total":5120},
      {"description":"Fronius Primo 6.0 Inverter","qty":1,"unitPrice":1800,"total":1800},
      {"description":"Installation Labour","qty":1,"unitPrice":1200,"total":1200},
      {"description":"Electrical Compliance","qty":1,"unitPrice":450,"total":450},
      {"description":"STC Rebate (87 STCs × $38)","qty":1,"unitPrice":-3306,"total":-3306}
    ]',
    9264.00, 3306.00, 926.40, 6884.40, 1376.88, 5507.52,
    CURRENT_DATE + INTERVAL '30 days', 'signed'
  ),
  (
    'd0000001-0000-0000-0000-000000000002',
    'e0000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000002',
    'battery_installation',
    '[
      {"description":"Tesla Powerwall 2 (13.5kWh)","qty":1,"unitPrice":8500,"total":8500},
      {"description":"Gateway & Installation","qty":1,"unitPrice":1200,"total":1200},
      {"description":"Electrical Connection","qty":1,"unitPrice":600,"total":600}
    ]',
    10300.00, 0.00, 1030.00, 11330.00, 2266.00, 9064.00,
    CURRENT_DATE + INTERVAL '30 days', 'sent'
  );

-- ─── Jobs: original ───────────────────────────────────────────────────────────

INSERT INTO jobs (id, quote_id, customer_id, job_type, status, scheduled_date, scheduled_start_time, estimated_duration, street, suburb, state, postcode, nmi, system_size_kw, panel_count, panel_model, inverter_model, weather_risk, notes) VALUES
  (
    'f0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'solar_installation', 'scheduled',
    CURRENT_DATE + INTERVAL '1 day', '08:00', 360,
    '42 Doncaster Rd', 'Doncaster', 'VIC', '3108', 'VICXXX1234',
    6.6, 16, 'SunPower Maxeon 415W', 'Fronius Primo 6.0', 'low',
    'North-facing roof, good shade clearance. Gate code: 4521'
  ),
  (
    'f0000001-0000-0000-0000-000000000002',
    'd0000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000002',
    'battery_installation', 'in_progress',
    CURRENT_DATE, '09:00', 240,
    '18 Main St', 'Ringwood', 'VIC', '3134', NULL,
    NULL, NULL, NULL, NULL, 'low',
    'Existing 5kW Enphase system. Main switchboard in garage.'
  ),
  (
    'f0000001-0000-0000-0000-000000000003',
    NULL,
    'c0000001-0000-0000-0000-000000000003',
    'solar_installation', 'completed',
    CURRENT_DATE - INTERVAL '3 days', '08:00', 360,
    '7 Church St', 'Burwood', 'VIC', '3125', 'VICXXX5678',
    10.0, 24, 'REC Alpha 415W', 'SMA Sunny Boy 10.0', 'low', NULL
  ),
  (
    'f0000001-0000-0000-0000-000000000004',
    NULL,
    'c0000001-0000-0000-0000-000000000004',
    'ev_charger', 'enquiry',
    NULL, NULL, 180,
    '23 Elgar Rd', 'Nunawading', 'VIC', '3131', NULL,
    NULL, NULL, NULL, NULL, 'low',
    'Wants 32A 3-phase for Rivian R1T'
  ),
  (
    'f0000001-0000-0000-0000-000000000005',
    NULL,
    'c0000001-0000-0000-0000-000000000005',
    'roof_renovation', 'deposit_paid',
    CURRENT_DATE + INTERVAL '5 days', '07:00', 480,
    '55 Station St', 'Box Hill', 'VIC', '3128', 'VICXXX9012',
    NULL, NULL, NULL, NULL, 'medium',
    'Terracotta tile replacement before solar install'
  ),
  (
    'f0000001-0000-0000-0000-000000000006',
    NULL,
    'c0000001-0000-0000-0000-000000000006',
    'solar_adjustment', 'quote_sent',
    NULL, NULL, 120,
    '91 Canterbury Rd', 'Forest Hill', 'VIC', '3131', NULL,
    5.0, NULL, NULL, 'Fronius Symo 5.0', 'low',
    'Panels need retilting — reduced output since neighbour''s tree grew'
  ),
  (
    'f0000001-0000-0000-0000-000000000007',
    NULL,
    'c0000001-0000-0000-0000-000000000007',
    'battery_installation', 'scheduled',
    CURRENT_DATE + INTERVAL '2 days', '10:00', 240,
    '14 Burke Rd', 'Camberwell', 'VIC', '3124', 'VICXXX3456',
    NULL, NULL, NULL, NULL, 'low',
    'Sonnen Eco 10 install. Meter box in alley at rear.'
  );

-- ─── Jobs: scheduling export (J-1001 to J-1053) ──────────────────────────────
-- assigned_installer_id resolved from INS-XX codes to UUIDs

INSERT INTO jobs (job_code, customer_name, customer_phone, customer_email, street, suburb, state, postcode, job_type, battery_model, scheduled_start, duration_blocks, status, assigned_installer_id, notes, created_at) VALUES
  ('J-1001', 'Amelia Kelly',       '0416 418 142', 'amelia.kelly@outlook.com',      '118 Railway Pde',   'Hornsby',       'NSW', '2077', 'Battery upgrade',  '10 kWh',   '2026-09-30T01:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000004', NULL,                                                                                                                        '2026-08-15'),
  ('J-1002', 'Declan Wilson',      '0446 966 675', 'declan.wilson@iinet.net.au',    '96 Railway Pde',    'Geelong',       'VIC', '3220', 'Battery install',  '20 kWh',   '2026-09-29T00:00:00Z', 3, 'confirmed',   'a0000002-0000-0000-0000-000000000002', NULL,                                                                                                                        '2026-08-16'),
  ('J-1003', 'William Rossi',      '0465 531 957', 'williamrossi@iinet.net.au',     '140 Railway Pde',   'Werribee',      'VIC', '3030', 'Solar + battery',  '13.5 kWh', '2026-10-07T20:00:00Z', 5, 'scheduled',   'a0000002-0000-0000-0000-000000000003', NULL,                                                                                                                        '2026-08-17'),
  ('J-1004', 'Lachlan Rossi',      '0497 441 799', 'lachlan_rossi@outlook.com',     '131 Kingfisher Dr', 'Newcastle',     'NSW', '2300', 'Battery upgrade',  '10 kWh',   '2026-10-07T00:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000006', NULL,                                                                                                                        '2026-08-17'),
  ('J-1005', 'Bruce Kelly',        '0437 628 663', 'bruce_kelly@iinet.net.au',      '120 Waratah Ct',    'Wollongong',    'NSW', '2500', 'Battery install',  '13.5 kWh', '2026-09-30T23:00:00Z', 3, 'scheduled',   NULL,                                  NULL,                                                                                                                        '2026-08-17'),
  ('J-1006', 'Omar Taylor',        '0499 400 726', 'omar.taylor@gmail.com',         '108 Boronia Ave',   'Newcastle',     'NSW', '2300', 'Solar + battery',  '13.5 kWh', '2026-09-30T21:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000006', NULL,                                                                                                                        '2026-08-19'),
  ('J-1007', 'Sophie Brown',       '0413 528 185', 'sophie.brown@gmail.com',        '175 Victoria Rd',   'Glen Waverley', 'VIC', '3150', 'Battery upgrade',  '20 kWh',   NULL,                   3, 'unscheduled', NULL,                                  'Awaiting network approval',                                                                                                '2026-08-19'),
  ('J-1008', 'Tane Garcia',        '0454 954 476', 'tane_garcia@iinet.net.au',      '142 Station St',    'Fremantle',     'WA',  '6160', 'Solar + battery',  '13.5 kWh', NULL,                   4, 'unscheduled', NULL,                                  'Deposit paid, customer chasing a date',                                                                                    '2026-08-19'),
  ('J-1009', 'Noah Schneider',     '0415 684 679', 'noah.schneider@bigpond.com',    '76 Valley View Ct', 'Newcastle',     'NSW', '2300', 'Battery install',  '10 kWh',   '2026-10-09T01:00:00Z', 4, 'cancelled',   'a0000002-0000-0000-0000-000000000005', 'Customer cancelled - moving house',                                                                                        '2026-08-20'),
  ('J-1010', 'Elena McKenzie',     '0450 321 998', 'elenamckenzie@bigpond.com',     '14 Grevillea Way',  'Werribee',      'VIC', '3030', 'Solar + battery',  '13.5 kWh', '2026-10-05T02:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000003', NULL,                                                                                                                        '2026-08-22'),
  ('J-1011', 'Marco White',        '0470 761 504', 'marco_white@gmail.com',         '34 Main Rd',        'Ringwood',      'VIC', '3134', 'Solar + battery',  '20 kWh',   '2026-10-06T20:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000002', NULL,                                                                                                                        '2026-08-24'),
  ('J-1012', 'Mia Petrov',         '0440 395 868', 'mia_petrov@outlook.com',        '80 Eucalyptus Dr',  'Armadale',      'WA',  '6112', 'Solar + battery',  '20 kWh',   NULL,                   3, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-08-24'),
  ('J-1013', 'Tegan Taylor',       '0449 421 389', 'tegan.taylor@iinet.net.au',     '7 Seaview Rd',      'Toowoomba',     'QLD', '4350', 'Battery install',  '10 kWh',   NULL,                   3, 'unscheduled', NULL,                                  'Customer away until end of month',                                                                                         '2026-08-24'),
  ('J-1014', 'Rhys Kelly',         '0470 463 361', 'rhys.kelly@bigpond.com',        '69 Park Ave',       'Capalaba',      'QLD', '4157', 'Solar + battery',  '10 kWh',   '2026-09-29T22:00:00Z', 2, 'scheduled',   'a0000002-0000-0000-0000-000000000008', NULL,                                                                                                                        '2026-08-25'),
  ('J-1015', 'Alexander O''Brien', '0479 683 650', 'alexanderobrien@iinet.net.au',  '102 Acacia Pl',     'Gosford',       'NSW', '2250', 'Battery upgrade',  '20 kWh',   '2026-10-02T02:00:00Z', 2, 'scheduled',   'a0000002-0000-0000-0000-000000000005', NULL,                                                                                                                        '2026-08-27'),
  ('J-1016', 'Margaret Sato',      '0484 660 100', 'margaretsato@iinet.net.au',     '21 High St',        'Liverpool',     'NSW', '2170', 'Solar + battery',  '13.5 kWh', '2026-10-01T01:00:00Z', 4, 'confirmed',   'a0000002-0000-0000-0000-000000000006', NULL,                                                                                                                        '2026-08-28'),
  ('J-1017', 'Tane Taylor',        '0483 786 900', 'tane.taylor@outlook.com',       '55 George St',      'Glen Waverley', 'VIC', '3150', 'Solar + battery',  '20 kWh',   NULL,                   4, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-08-28'),
  ('J-1018', 'Noah Hassan',        '0457 577 966', 'noahhassan@outlook.com',        '174 Grevillea Way', 'Liverpool',     'NSW', '2170', 'Solar + battery',  '13.5 kWh', '2026-09-28T21:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000004', NULL,                                                                                                                        '2026-08-29'),
  ('J-1019', 'Ella Anderson',      '0429 934 987', 'ella.anderson@bigpond.com',     '35 Kingfisher Dr',  'Werribee',      'VIC', '3030', 'Battery install',  '13.5 kWh', '2026-10-06T23:00:00Z', 5, 'scheduled',   'a0000002-0000-0000-0000-000000000003', NULL,                                                                                                                        '2026-08-30'),
  ('J-1020', 'Nadia Ryan',         '0454 557 520', 'nadiaryan@bigpond.com',         '49 Creekside Pl',   'Werribee',      'VIC', '3030', 'Battery install',  '13.5 kWh', '2026-09-28T22:00:00Z', 5, 'scheduled',   'a0000002-0000-0000-0000-000000000003', NULL,                                                                                                                        '2026-08-30'),
  ('J-1021', 'James Lopez',        '0478 471 132', 'james.lopez@iinet.net.au',      '48 Park Ave',       'Fremantle',     'WA',  '6160', 'Battery install',  '13.5 kWh', '2026-10-05T02:00:00Z', 3, 'confirmed',   'a0000002-0000-0000-0000-000000000009', NULL,                                                                                                                        '2026-08-30'),
  ('J-1022', 'Rhys Lee',           '0414 111 492', 'rhys_lee@gmail.com',            '160 Creekside Pl',  'Ballarat',      'VIC', '3350', 'Battery upgrade',  '10 kWh',   '2026-10-04T20:00:00Z', 4, 'scheduled',   'a0000002-0000-0000-0000-000000000001', NULL,                                                                                                                        '2026-08-31'),
  ('J-1023', 'Rhys Jones',         '0493 896 677', 'rhysjones@yahoo.com.au',        '163 George St',     'Redcliffe',     'QLD', '4020', 'Battery upgrade',  '13.5 kWh', '2026-10-05T21:00:00Z', 5, 'confirmed',   'a0000002-0000-0000-0000-000000000007', NULL,                                                                                                                        '2026-08-31'),
  ('J-1024', 'Priya Martin',       '0469 989 922', 'priya.martin@yahoo.com.au',     '26 Jacaranda Rd',   'Sunbury',       'VIC', '3429', 'Solar + battery',  '13.5 kWh', '2026-09-29T00:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000001', NULL,                                                                                                                        '2026-09-01'),
  ('J-1025', 'Tane White',         '0437 819 631', 'tanewhite@iinet.net.au',        '118 Kingfisher Dr', 'Hornsby',       'NSW', '2077', 'Battery upgrade',  '13.5 kWh', '2026-10-08T23:00:00Z', 2, 'confirmed',   'a0000002-0000-0000-0000-000000000005', NULL,                                                                                                                        '2026-09-01'),
  ('J-1026', 'Liam Khan',          '0491 576 476', 'liam_khan@gmail.com',           '108 Boronia Ave',   'Wollongong',    'NSW', '2500', 'Solar + battery',  '13.5 kWh', '2026-10-01T23:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000005', NULL,                                                                                                                        '2026-09-01'),
  ('J-1027', 'Marco Martin',       '0429 184 191', 'marcomartin@outlook.com',       '134 Creekside Pl',  'Fremantle',     'WA',  '6160', 'Solar + battery',  '10 kWh',   '2026-10-02T02:00:00Z', 4, 'scheduled',   'a0000002-0000-0000-0000-000000000009', NULL,                                                                                                                        '2026-09-01'),
  ('J-1028', 'Liam Chen',          '0441 178 796', 'liam_chen@iinet.net.au',        '144 Creekside Pl',  'Ringwood',      'VIC', '3134', 'Battery upgrade',  '10 kWh',   NULL,                   4, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-01'),
  ('J-1029', 'Mateo Taylor',       '0433 510 601', 'mateotaylor@yahoo.com.au',      '106 Creekside Pl',  'Logan Central', 'QLD', '4114', 'Solar + battery',  '10 kWh',   '2026-09-29T23:00:00Z', 4, 'scheduled',   'a0000002-0000-0000-0000-000000000007', NULL,                                                                                                                        '2026-09-02'),
  ('J-1030', 'James White',        '0417 999 412', 'james_white@iinet.net.au',      '6 High St',         'Werribee',      'VIC', '3030', 'Solar + battery',  '13.5 kWh', '2026-09-30T00:00:00Z', 4, 'scheduled',   'a0000002-0000-0000-0000-000000000002', NULL,                                                                                                                        '2026-09-03'),
  ('J-1031', 'Hana Costa',         '0495 974 780', 'hana.costa@outlook.com',        '106 Ridgeway Dr',   'Blacktown',     'NSW', '2148', 'Battery upgrade',  '20 kWh',   '2026-09-30T23:00:00Z', 3, 'confirmed',   'a0000002-0000-0000-0000-000000000004', NULL,                                                                                                                        '2026-09-04'),
  ('J-1032', 'Harper Tanaka',      '0431 712 136', 'harper_tanaka@yahoo.com.au',    '102 Wattle Cres',   'Toowoomba',     'QLD', '4350', 'Battery upgrade',  '20 kWh',   '2026-10-06T22:00:00Z', 2, 'scheduled',   'a0000002-0000-0000-0000-000000000008', NULL,                                                                                                                        '2026-09-04'),
  ('J-1033', 'Ruby Chen',          '0433 756 128', 'rubychen@yahoo.com.au',         '162 Waratah Ct',    'Parramatta',    'NSW', '2150', 'Battery install',  '10 kWh',   '2026-10-06T21:00:00Z', 2, 'scheduled',   'a0000002-0000-0000-0000-000000000006', NULL,                                                                                                                        '2026-09-05'),
  ('J-1034', 'Liam Ryan',          '0498 595 232', 'liam_ryan@bigpond.com',         '107 Hillcrest Ave', 'Gosford',       'NSW', '2250', 'Solar + battery',  '20 kWh',   NULL,                   5, 'unscheduled', NULL,                                  'Two-storey - needs scaffold',                                                                                              '2026-09-05'),
  ('J-1035', 'Wei Kaur',           '0451 652 643', 'wei.kaur@outlook.com',          '132 George St',     'Werribee',      'VIC', '3030', 'Solar + battery',  '20 kWh',   NULL,                   4, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-05'),
  ('J-1036', 'Tane Williams',      '0477 344 165', 'tane.williams@iinet.net.au',    '78 Ridgeway Dr',    'Springfield',   'QLD', '4300', 'Battery install',  '10 kWh',   '2026-10-03T04:00:00Z', 5, 'scheduled',   'a0000002-0000-0000-0000-000000000008', NULL,                                                                                                                        '2026-09-07'),
  ('J-1037', 'Ruby O''Brien',      '0414 574 990', 'ruby.obrien@gmail.com',         '130 Banksia Ct',    'Sunbury',       'VIC', '3429', 'Battery install',  '20 kWh',   '2026-09-28T22:00:00Z', 4, 'confirmed',   'a0000002-0000-0000-0000-000000000001', NULL,                                                                                                                        '2026-09-08'),
  ('J-1038', 'Wei O''Brien',       '0431 966 337', 'wei_obrien@iinet.net.au',       '3 Park Ave',        'Joondalup',     'WA',  '6027', 'Solar + battery',  '13.5 kWh', '2026-10-01T02:00:00Z', 5, 'confirmed',   'a0000002-0000-0000-0000-000000000009', NULL,                                                                                                                        '2026-09-08'),
  ('J-1039', 'Helen Nguyen',       '0493 634 654', 'helen_nguyen@bigpond.com',      '130 George St',     'Campbelltown',  'NSW', '2560', 'Solar + battery',  '10 kWh',   NULL,                   3, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-09'),
  ('J-1040', 'Bronwyn Fraser',     '0429 647 478', 'bronwyn_fraser@outlook.com',    '9 Eucalyptus Dr',   'Craigieburn',   'VIC', '3064', 'Battery install',  '13.5 kWh', '2026-10-06T21:00:00Z', 4, 'confirmed',   'a0000002-0000-0000-0000-000000000001', NULL,                                                                                                                        '2026-09-10'),
  ('J-1041', 'Wei Jones',          '0468 644 971', 'wei.jones@yahoo.com.au',        'TBC (new build)',   'Geelong',       'VIC', '3220', 'Battery upgrade',  '20 kWh',   '2026-09-27T21:00:00Z', 2, 'confirmed',   'a0000002-0000-0000-0000-000000000002', NULL,                                                                                                                        '2026-09-12'),
  ('J-1042', 'Tegan Jones',        '0440 292 647', 'teganjones@yahoo.com.au',       '89 Ridgeway Dr',    'Baldivis',      'WA',  '6171', 'Battery upgrade',  '20 kWh',   '2026-10-01T00:00:00Z', 2, 'confirmed',   'a0000002-0000-0000-0000-000000000009', NULL,                                                                                                                        '2026-09-13'),
  ('J-1043', 'Mateo Garcia',       '0471 557 134', 'mateo.garcia@outlook.com',      '27 Church St',      'Hornsby',       'NSW', '2077', 'Battery install',  '13.5 kWh', '2026-10-05T21:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000006', NULL,                                                                                                                        '2026-09-14'),
  ('J-1044', 'Ethan O''Brien',     '0495 774 308', 'ethan_obrien@yahoo.com.au',     '162 Station St',    'Ipswich',       'QLD', '4305', 'Battery install',  '20 kWh',   NULL,                   3, 'unscheduled', NULL,                                  'Customer prefers afternoon',                                                                                               '2026-09-14'),
  ('J-1045', 'Nadia Te Wiata',     '0495 516 115', 'nadiatewiata@outlook.com',      '14 Banksia Ct',     'Wollongong',    'NSW', '2500', 'Battery install',  '13.5 kWh', NULL,                   3, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-17'),
  ('J-1046', 'Ruby McKenzie',      '0426 236 222', 'ruby_mckenzie@iinet.net.au',    '87 Park Ave',       'Berwick',       'VIC', '3806', 'Battery upgrade',  '20 kWh',   '2026-10-04T21:00:00Z', 5, 'scheduled',   'a0000002-0000-0000-0000-000000000002', NULL,                                                                                                                        '2026-09-18'),
  ('J-1047', 'Alexander Smith',    '0465 299 975', 'alexander.smith@bigpond.com',   '101 Lorikeet Cl',   'Hornsby',       'NSW', '2077', 'Battery install',  '13.5 kWh', '2026-10-05T21:00:00Z', 4, 'scheduled',   'a0000002-0000-0000-0000-000000000004', NULL,                                                                                                                        '2026-09-18'),
  ('J-1048', 'Noah Smith',         '0428 965 228', 'noahsmith@iinet.net.au',        '6 Melaleuca St',    'Southport',     'QLD', '4215', 'Battery install',  '10 kWh',   '2026-10-02T00:00:00Z', 3, 'scheduled',   'a0000002-0000-0000-0000-000000000007', NULL,                                                                                                                        '2026-09-18'),
  ('J-1049', 'Ruby Parata',        '0487 955 948', 'ruby_parata@bigpond.com',       '128 Railway Pde',   'Joondalup',     'WA',  '6027', 'Battery upgrade',  '10 kWh',   NULL,                   5, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-18'),
  ('J-1050', 'Noah Papadopoulos',  '0497 399 678', 'noah_papadopoulos@iinet.net.au','5 Park Ave',        'Wollongong',    'NSW', '2500', 'Battery upgrade',  '13.5 kWh', '2026-09-28T22:00:00Z', 5, 'confirmed',   'a0000002-0000-0000-0000-000000000006', 'Rescheduled 3 times at customer request (12 Aug, 26 Aug, 9 Sep). Do not move again without calling first.',             '2026-09-19'),
  ('J-1051', 'James Costa',        '0483 310 817', 'james_costa@bigpond.com',       '10 George St',      'North Lakes',   'QLD', '4509', 'Battery upgrade',  '13.5 kWh', '2026-10-01T22:00:00Z', 4, 'confirmed',   'a0000002-0000-0000-0000-000000000007', NULL,                                                                                                                        '2026-09-20'),
  ('J-1052', 'Lucas Brown',        '0446 912 477', 'lucas_brown@outlook.com',       '84 George St',      'Springfield',   'QLD', '4300', 'Solar + battery',  '10 kWh',   '2026-10-09T23:00:00Z', 5, 'confirmed',   'a0000002-0000-0000-0000-000000000008', NULL,                                                                                                                        '2026-09-20'),
  ('J-1053', 'Arjun Petrov',       '0441 931 925', 'arjun_petrov@gmail.com',        '67 Church St',      'Armadale',      'WA',  '6112', 'Battery install',  '10 kWh',   NULL,                   3, 'unscheduled', NULL,                                  NULL,                                                                                                                        '2026-09-22');

-- ─── Back-fill customer_id on export jobs ────────────────────────────────────
-- Matches on email; every export job has a unique email so this is a 1:1 link.

UPDATE jobs
SET    customer_id = c.id
FROM   customers c
WHERE  jobs.customer_email = c.email
  AND  jobs.job_code IS NOT NULL;

-- ─── Job installer assignments (original jobs) ────────────────────────────────

INSERT INTO job_installers (job_id, installer_id) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003'),
  ('f0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002'),
  ('f0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004'),
  ('f0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003'),
  ('f0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004'),
  ('f0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000002');

-- ─── Job status history ──────────────────────────────────────────────────────

INSERT INTO job_status_history (job_id, status, note, updated_by) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'enquiry',        'Enquiry received online',               'system'),
  ('f0000001-0000-0000-0000-000000000001', 'quoted',         'Quote Q-2024-001 generated',            'admin'),
  ('f0000001-0000-0000-0000-000000000001', 'quote_sent',     'Sent via DocuSeal to michael.chen',     'admin'),
  ('f0000001-0000-0000-0000-000000000001', 'quote_accepted', 'Signed by customer',                    'system'),
  ('f0000001-0000-0000-0000-000000000001', 'deposit_paid',   'Deposit $1,376.88 received via Stripe', 'system'),
  ('f0000001-0000-0000-0000-000000000001', 'scheduled',      'Scheduled for tomorrow 8am',            'admin'),
  ('f0000001-0000-0000-0000-000000000002', 'enquiry',        'Enquiry received',                      'system'),
  ('f0000001-0000-0000-0000-000000000002', 'deposit_paid',   'Deposit paid',                          'system'),
  ('f0000001-0000-0000-0000-000000000002', 'scheduled',      'Booked for today',                      'admin'),
  ('f0000001-0000-0000-0000-000000000002', 'in_progress',    'Priya on-site, started 09:15',          'system'),
  ('f0000001-0000-0000-0000-000000000003', 'enquiry',        NULL,                                    'system'),
  ('f0000001-0000-0000-0000-000000000003', 'scheduled',      NULL,                                    'admin'),
  ('f0000001-0000-0000-0000-000000000003', 'in_progress',    NULL,                                    'system'),
  ('f0000001-0000-0000-0000-000000000003', 'completed',      '24 panels installed, grid connected',   'jake.morrison@sbg.com.au');

-- ─── Job status history: export jobs ─────────────────────────────────────────
-- Seed one history entry per export job reflecting its current status.

INSERT INTO job_status_history (job_id, status, note, updated_by)
SELECT
  id,
  status,
  'Imported from scheduling export (2026-09-28 to 2026-10-11)',
  'system'
FROM jobs
WHERE job_code IS NOT NULL;

-- ─── Invoices ────────────────────────────────────────────────────────────────

INSERT INTO invoices (id, job_id, customer_id, invoice_number, type, line_items, subtotal, gst, total, due_date, status) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'INV-2024-0001', 'deposit',
    '[{"description":"Deposit (20%) — Solar Install 6.6kW","qty":1,"unitPrice":1376.88,"total":1376.88}]',
    1251.71, 125.17, 1376.88,
    CURRENT_DATE + INTERVAL '7 days', 'paid'
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'f0000001-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000003',
    'INV-2024-0002', 'full',
    '[
      {"description":"REC Alpha 415W Panels (×24)","qty":24,"unitPrice":380,"total":9120},
      {"description":"SMA Sunny Boy 10.0 Inverter","qty":1,"unitPrice":2200,"total":2200},
      {"description":"Installation Labour","qty":1,"unitPrice":1600,"total":1600},
      {"description":"Electrical Compliance & Commissioning","qty":1,"unitPrice":550,"total":550}
    ]',
    12245.45, 1224.55, 13470.00,
    CURRENT_DATE - INTERVAL '1 day', 'paid'
  );

-- ─── Certificates ────────────────────────────────────────────────────────────

INSERT INTO certificates (id, job_id, type, ces_work_description, ces_licence_number, ces_rec_registration, ces_completion_date, ces_certification_date, stc_system_owner, stc_install_date, stc_system_size_kw, stc_certificate_qty) VALUES
  (
    'ca000001-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000003',
    'CES',
    'Installation of 10kW grid-connected PV system — 24 × REC Alpha 415W panels, SMA Sunny Boy 10.0 inverter. All work complies with AS/NZS 5033:2021, AS 4777.1:2016 and the Electricity Safety Act 1998 (Vic).',
    'VIC-EC-8834', 'D44556',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '3 days',
    NULL, NULL, NULL, NULL
  ),
  (
    'ca000001-0000-0000-0000-000000000002',
    'f0000001-0000-0000-0000-000000000003',
    'STC_assignment',
    NULL, NULL, NULL, NULL, NULL,
    'Robert Williams',
    CURRENT_DATE - INTERVAL '3 days',
    10.0, 138
  );

-- ─── Rate cards ──────────────────────────────────────────────────────────────

INSERT INTO rate_cards (job_type, description, unit, unit_price, is_active) VALUES
  ('solar_installation',  'Solar Panels (per panel)',              'per_panel', 320.00,  TRUE),
  ('solar_installation',  'String Inverter Supply',                'fixed',     1800.00, TRUE),
  ('solar_installation',  'Microinverter (per panel)',             'per_panel', 210.00,  TRUE),
  ('solar_installation',  'Installation Labour',                   'fixed',     1200.00, TRUE),
  ('solar_installation',  'Electrical Compliance',                 'fixed',     450.00,  TRUE),
  ('battery_installation','Battery Supply & Installation',         'fixed',     8500.00, TRUE),
  ('battery_installation','Gateway & Commissioning',               'fixed',     1200.00, TRUE),
  ('battery_installation','Electrical Connection',                 'fixed',     600.00,  TRUE),
  ('ev_charger',          'EV Charger Unit (16A)',                 'fixed',     850.00,  TRUE),
  ('ev_charger',          'EV Charger Unit (32A)',                 'fixed',     1200.00, TRUE),
  ('ev_charger',          'EV Installation Labour',               'fixed',     650.00,  TRUE),
  ('ev_charger',          'Electrical Permit',                     'fixed',     250.00,  TRUE),
  ('roof_renovation',     'Roof Tile Supply (per m²)',             'per_kw',    85.00,   TRUE),
  ('roof_renovation',     'Roof Labour (per m²)',                  'per_kw',    45.00,   TRUE),
  ('roof_renovation',     'Scaffolding',                           'fixed',     600.00,  TRUE),
  ('solar_adjustment',    'Technician Call-Out',                   'fixed',     280.00,  TRUE),
  ('solar_adjustment',    'Panel Re-Tilt/Adjustment (per panel)', 'per_panel', 45.00,   TRUE),
  ('solar_adjustment',    'Inverter Reconfiguration',              'fixed',     180.00,  TRUE);

-- ─── Verify ──────────────────────────────────────────────────────────────────

SELECT
  'customers (total)'            AS "table", COUNT(*)    AS rows FROM customers                          UNION ALL
SELECT 'customers (original 7)',              COUNT(*)           FROM customers  WHERE id::text LIKE 'c0000001%' UNION ALL
SELECT 'customers (from export)',             COUNT(*)           FROM customers  WHERE id::text LIKE 'c0000002%' UNION ALL
SELECT 'installers (total)',                  COUNT(*)           FROM installers                          UNION ALL
SELECT 'installers (original)',               COUNT(*)           FROM installers WHERE installer_code IS NULL    UNION ALL
SELECT 'installers (export INS-XX)',          COUNT(*)           FROM installers WHERE installer_code IS NOT NULL UNION ALL
SELECT 'installer_availability',              COUNT(*)           FROM installer_availability              UNION ALL
SELECT 'enquiries',                           COUNT(*)           FROM enquiries                           UNION ALL
SELECT 'quotes',                              COUNT(*)           FROM quotes                              UNION ALL
SELECT 'jobs (total)',                        COUNT(*)           FROM jobs                                UNION ALL
SELECT 'jobs (original)',                     COUNT(*)           FROM jobs      WHERE job_code IS NULL    UNION ALL
SELECT 'jobs (export J-XXXX)',                COUNT(*)           FROM jobs      WHERE job_code IS NOT NULL UNION ALL
SELECT 'jobs with customer_id linked',        COUNT(*)           FROM jobs      WHERE customer_id IS NOT NULL UNION ALL
SELECT 'job_installers',                      COUNT(*)           FROM job_installers                      UNION ALL
SELECT 'job_status_history',                  COUNT(*)           FROM job_status_history                  UNION ALL
SELECT 'invoices',                            COUNT(*)           FROM invoices                            UNION ALL
SELECT 'certificates',                        COUNT(*)           FROM certificates                        UNION ALL
SELECT 'rate_cards',                          COUNT(*)           FROM rate_cards;
