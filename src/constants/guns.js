// ELAD Training App — pistol manufacturers → models database.
// Broad coverage: Israeli brands first, then worldwide. Every list ends with
// "אחר" (Other) which opens manual entry. Not exhaustive by design — manual
// entry always covers anything missing.

export const OTHER = 'אחר / הקלדה ידנית';

export const GUN_DB = {
  // ── Israeli ──
  'IWI (ישראל)': [
    'מסאדה (Masada)', 'מסאדה סלים (Masada Slim)', 'מסאדה טקטי (Masada Tactical)',
    'ג׳ריקו 941 (Jericho 941)', 'ג׳ריקו Enhanced', 'ג׳ריקו 941 PSL', 'ג׳ריקו Mid-Size',
    'Uzi Pro Pistol', OTHER,
  ],
  'Bul Armory (ישראל)': [
    'SAS II TAC', 'SAS II TAC Pro', 'SAS II Ultralight', 'SAS II UR', 'SAS II Bullet',
    'Axe', 'Axe Cleaver', 'Axe Fulcrum', 'Cherokee', 'Cherokee Compact',
    'Trophy', '1911 Government', '1911 Commander', OTHER,
  ],
  'Magnum Research / Desert Eagle': [
    'Desert Eagle Mark XIX .50 AE', 'Desert Eagle .44 Magnum', 'Desert Eagle .357',
    'Baby Eagle III', 'Baby Desert Eagle II', OTHER,
  ],
  'Emtan (ישראל)': ['MZ-9', 'Karmiel', OTHER],

  // ── Global striker / polymer ──
  'Glock': [
    '17', '17 Gen5', '19', '19 Gen5', '19X', '26', '43', '43X', '44', '45', '48',
    '22', '23', '27', '31', '34', '35', '21', '30', '20', '40', '41', '42', OTHER,
  ],
  'SIG Sauer': [
    'P320', 'P320 X-Carry', 'P320 XCompact', 'P320 XTen', 'P365', 'P365X', 'P365 XL', 'P365 XMacro',
    'P226', 'P229', 'P228 / M11', 'P238', 'P938', 'P210', '1911', OTHER,
  ],
  'CZ': [
    'CZ 75 B', 'CZ 75 SP-01', 'CZ 75 Compact', 'CZ 75 Shadow 2', 'CZ Shadow 2 Compact',
    'CZ P-10 C', 'CZ P-10 F', 'CZ P-10 S', 'CZ P-07', 'CZ P-09', 'CZ TS 2', OTHER,
  ],
  'Beretta': [
    '92FS', '92X', '92X RDO', '92X Performance', 'M9', 'M9A3', 'APX', 'APX A1',
    'PX4 Storm', '80X Cheetah', '3032 Tomcat', '21A Bobcat', OTHER,
  ],
  'Smith & Wesson': [
    'M&P9 M2.0', 'M&P9 Shield', 'M&P9 Shield Plus', 'M&P9c', 'M&P9 Metal',
    'SD9 VE', 'Bodyguard 380', 'CSX', 'Model 686 (רולבר)', 'Model 642 (רולבר)', '5906', OTHER,
  ],
  'Heckler & Koch (H&K)': [
    'VP9', 'VP9SK', 'VP40', 'P30', 'P30L', 'USP', 'USP Compact', 'HK45', 'P2000', 'SFP9', OTHER,
  ],
  'Walther': [
    'PPQ', 'PDP', 'PDP Compact', 'PDP F-Series', 'PPS', 'PPK', 'PPK/S',
    'Q4 Steel Frame', 'Q5 Match', 'P99', 'WMP', OTHER,
  ],
  'Springfield Armory': [
    'XD', 'XD-M', 'XD-M Elite', 'XD-S', 'Hellcat', 'Hellcat Pro', 'Echelon',
    '1911', 'Prodigy', 'SA-35', OTHER,
  ],
  'Ruger': [
    'SR9', 'LC9', 'LC9s', 'LCP', 'LCP II', 'LCP Max', 'Max-9', 'American Pistol',
    'Security-9', 'SR1911', 'SR22', 'GP100 (רולבר)', 'LCR (רולבר)', OTHER,
  ],
  'Canik': [
    'TP9 SF', 'TP9 Elite SC', 'TP9 Elite Combat', 'Mete SFT', 'Mete SFx',
    'Mete MC9', 'TP9 SFx', 'Rival', 'Rival-S', OTHER,
  ],
  'FN Herstal': [
    'FN 509', 'FN 509 Compact', 'FN 509 Tactical', 'FN 503', 'FN 545', 'FNX-9',
    'FNS-9', 'Five-seveN', 'FN High Power', OTHER,
  ],
  'Taurus': [
    'G2C', 'G3', 'G3C', 'GX4', 'GX4 Carry', 'PT111', 'TX22', '856 (רולבר)', '605 (רולבר)', OTHER,
  ],

  // ── 2011 / 1911 specialists ──
  'Staccato (2011)': ['C2', 'CS', 'P', 'XC', 'XL', 'HD', OTHER],
  'Colt': [
    '1911 Government', '1911 Commander', 'Defender', 'Combat Elite',
    'King Cobra (רולבר)', 'Python (רולבר)', 'Anaconda (רולבר)', OTHER,
  ],
  'Kimber': ['Micro 9', 'Micro 380', '1911 Custom', 'R7 Mako', 'Ultra Carry', 'Rapide', OTHER],
  'Dan Wesson': ['TCP', 'Vigil', 'Kodiak', 'Specialist', 'DWX', 'ECP', OTHER],
  'Wilson Combat': ['EDC X9', 'SFX9', '1911 Professional', 'CQB', 'Beretta 92G Brigadier', OTHER],
  'Rock Island / Armscor': ['1911 GI', '1911 Tactical', 'TAC Ultra', 'STK100', 'AL22', OTHER],

  // ── Turkish (common in IL market) ──
  'Sarsilmaz (SAR)': ['SAR9', 'SAR9 Gen3', 'SAR9 Compact', 'SAR9 Sport', 'K2', 'K2P', 'B6', 'B6P', OTHER],
  'Girsan / EAA': ['Regard MC', 'MC28', 'MC9', 'MC1911', 'Witness2311', 'MC P35', OTHER],

  // ── Other quality brands ──
  'Shadow Systems': ['MR920', 'DR920', 'CR920', 'XR920', OTHER],
  'Mossberg': ['MC1sc', 'MC2c', 'MC2sc', OTHER],
  'Steyr': ['M9-A1', 'M9-A2', 'S9-A1', 'L9-A2', 'C9-A2', OTHER],
  'Grand Power': ['K100', 'P1', 'P11', 'P40', 'Q100', 'X-Calibur', OTHER],
  'Arex': ['Delta', 'Delta Gen2', 'Zero 1', 'Rex Alpha', OTHER],
  'Tanfoglio': ['Stock II', 'Limited', 'Witness', 'Gold Custom', 'Force', OTHER],
  'Browning': ['Hi-Power', '1911-380', '1911-22', 'Buck Mark', OTHER],
  'Bersa': ['Thunder 380', 'TPR9', 'TPR9c', 'BP9CC', OTHER],
  'Kel-Tec': ['P17', 'PMR-30', 'P-11', 'PF-9', 'P-15', OTHER],
  'SCCY': ['CPX-1', 'CPX-2', 'DVG-1', OTHER],
  'Diamondback': ['DB9', 'DBAM29', 'Sidekick', OTHER],
  'Laugo Arms': ['Alien', OTHER],

  [OTHER]: [],
};

export const MANUFACTURERS = Object.keys(GUN_DB);

// ── Red-dot / pistol optics database ──
export const OPTICS_DB = {
  'Holosun': ['507C X2', '507K X2', '407C', '407K', '508T', '509T', 'EPS', 'EPS Carry', 'SCS (MOS/320)', 'AEMS', OTHER],
  'Trijicon': ['RMR Type 2', 'RMR HD', 'RMRcc', 'SRO', 'RCR', OTHER],
  'Aimpoint': ['ACRO P-2', 'ACRO C-2', OTHER],
  'Vortex': ['Venom', 'Viper', 'Defender-CCW', 'Defender-XL', 'Defender-ST', OTHER],
  'Leupold': ['DeltaPoint Pro', 'DeltaPoint Micro', OTHER],
  'Sig Sauer': ['Romeo1 Pro', 'Romeo2', 'Romeo-X Pro', 'Romeo-X Compact', OTHER],
  'Steiner': ['MPS', OTHER],
  'C-More': ['STS2', 'RTS2', OTHER],
  'Swampfox': ['Sentinel', 'Justice', 'Liberty', 'Kingslayer', OTHER],
  'Primary Arms': ['SLx RS-10', 'GLx RS-15', 'Classic 21', OTHER],
  'Burris': ['FastFire 3', 'FastFire 4', 'FastFire C', OTHER],
  'Meprolight (ישראל)': ['MicroRDS', 'MPO-DF', 'MPO-PRO', 'Foresight', OTHER],
  [OTHER]: [],
};

export const OPTICS_BRANDS = Object.keys(OPTICS_DB);

