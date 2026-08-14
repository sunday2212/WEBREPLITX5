// API Configuration

export const getGroqAPIKey = () => localStorage.getItem('groqApiKey') || "";

export const updateAPIKey = (groqKey) => {
    localStorage.setItem('groqApiKey', groqKey);
};

export const getAPIUrl = () => 'https://api.groq.com/openai/v1/chat/completions';

export const DIFFICULTY_LEVELS = {
    'Easy': 'Basic recall, non-clinical',
    'Medium': 'Applied, mixed topics',
    'Hard': 'Advanced clinical, case-based'
};

export const SUBJECTS = {
    'Anatomy': [
        'Anatomy',
        'Introduction',
        'General Embryology',
        'Histology',
        'Osteology and Arthrology',
        'Neuro Anatomy',
        'Head and Neck',
        'Back Region',
        'Thorax',
        'Upper Limb',
        'Abdomen',
        'Pelvis and Perineum',
        'Lower Limb'
    ],

    'Biochemistry': [
        'Biochemistry',
        'Introduction',
        'Carbohydrate Chemistry',
        'Carbohydrate Metabolism',
        'Oxidative Phosphorylation',
        'Lipid Chemistry',
        'Lipid Metabolism',
        'Amino Acids and Proteins Chemistry',
        'Amino Acid and Protein Metabolism',
        'Genetics',
        'Enzymes',
        'Heme Synthesis',
        'Vitamins'
    ],

    'Physiology': [
        'Physiology',
        'General Physiology',
        'Nerve Muscle Physiology',
        'Cardiovascular System',
        'Blood Physiology',
        'Excretory System',
        'Respiratory System',
        'Gastrointestinal System',
        'The Nervous System',
        'Endocrine and Reproductive System'
    ],

    'Pharmacology': [
        'Pharmacology',
        'Introduction to Pharmacology',
        'General Pharmacology',
        'ANS Pharmacology',
        'Autacoids',
        'Renal Pharmacology',
        'CVS Pharmacology',
        'CNS Pharmacology',
        'Endocrine Pharmacology',
        'Antimicrobials: Anti Bacterial Drugs',
        'Chemotherapy of Specific Microbial Diseases',
        'Respiratory Pharmacology',
        'GIT Pharmacology',
        'Drugs Affecting Blood and Blood Formation',
        'Anticancer Drugs',
        'Immunomodulator Drugs',
        'Anaesthesia',
        'Special Topics'
    ],

    'Pathology': [
        'Pathology',
        'Cell Injury',
        'Inflammation',
        'Genetics',
        'Neoplasia',
        'Immunity',
        'CVS, Blood Vessels and Vasculitis',
        'Respiratory System',
        'Salivary Glands',
        'Gastrointestinal Tract',
        'Liver, Biliary System and Pancreas',
        'Renal System',
        'Genital System',
        'Breast Pathology',
        'Central Nervous System',
        'Endocrinology',
        'Bone Disorder',
        'Skin and Musculoskeletal',
        'Hematology: Red Blood Cells',
        'Hematology: White Blood Cells',
        'Platelets',
        'Blood',
        'Tissue Processing'
    ],

    'Microbiology': [
        'Microbiology',
        'General Microbiology',
        'Systemic Bacteriology',
        'Virology',
        'Mycology',
        'Parasitology',
        'Immunology'
    ],

    'ENT': [
        'ENT',
        'Ear',
        'Nose and Paranasal Sinuses',
        'Pharynx',
        'Larynx',
        'Miscellaneous Topics'
    ],

    'PSM': [
        'PSM',
        'Epidemiology',
        'Concept of Health and Disease',
        'Vaccines and Cold Chain',
        'Screening of Diseases',
        'Demography and Health',
        'Family Planning and Contraceptive',
        'Preventive Medicine in Obstetrics, Pediatrics and Geriatrics',
        'Nutrition and Health',
        'Social Sciences and Health',
        'Environment and Health',
        'Communicable and Non-Communicable Diseases',
        'National Health Programs',
        'Health Education and Communication',
        'Health Planning and Management',
        'Health Care of the Community in India',
        'International Health',
        'Allied Health Disciplines',
        'Biostatistics'
    ],

    'Forensic Medicine': [
        'Forensic Medicine',
        'Post Mortem Techniques',
        'IPC Sections',
        'Torture and its Types',
        'Court of Law',
        'Traces of Evidences',
        'Sexual Jurisprudence',
        'Medical Jurisprudence',
        'Infanticide',
        'Asphyxial Deaths',
        'Forensic Traumatology',
        'Ballistics',
        'Forensic Identification',
        'Forensic Toxicology',
        'Forensic Thanatology',
        'Forensic Psychiatry'
    ],

    'Pediatrics': [
        'Pediatrics',
        'Growth',
        'Normal Development',
        'Development and Behavioral Disorder',
        'Puberty and Adolescence',
        'Neonatology',
        'Nutrition and Malnutrition',
        'Fluid and Electrolyte Disturbances',
        'Genetics and Genetic Disorders',
        'Inborn Errors of Metabolism',
        'Diseases of Immune System',
        'Infectious Diseases',
        'Immunization',
        'Pediatric Cardiology',
        'Pediatric Hematology and Oncology',
        'Pediatric Gastroenterology',
        'Pediatrics Respiratory Disorder',
        'Pediatric Nephrology',
        'Pediatric Neurology',
        'Musculoskeletal Disorder in Children',
        'Pediatric Endocrinology',
        'Common Childhood Poisoning',
        'Clinical Essentials'
    ],

    'Radiology': [
        'Radiology',
        'Basics of Radiology',
        'Thoracic Radiology',
        'Head & Neck Imaging',
        'Gastrointestinal Radiology',
        'Hepatobiliary Radiology',
        'Genitourinary Radiology',
        'OBGY Imaging',
        'Musculoskeletal Radiology',
        'Nuclear Medicine',
        'Radiotherapy'
    ],

    'Surgery': [
        'Surgery',
        'Introduction',
        'High Yield Topics',
        'Endocrine Surgery',
        'Hepatobiliary Pancreatic Surgery',
        'Gastrointestinal Surgery',
        'Urology',
        'Cardiothoracic Vascular Surgery',
        'Plastic Surgery',
        'Neurosurgery',
        'Head and Neck',
        'Oncology',
        'Others',
        'Clinical Essentials'
    ],

    'Anesthesia': [
        'Anesthesia',
        'Introduction & History of Anesthesia',
        'Pre-Anaesthetic Evaluation',
        'Oxygen Therapy and Airway',
        'Anesthesia Machine',
        'Anesthesia Circuits',
        'Monitoring in Anesthesia',
        'Mechanical Ventilation and Modes of Ventilation',
        'Inhalational Anesthetic Agents',
        'Intravenous Anesthetic Agents',
        'Neuromuscular Blockade',
        'Regional Anesthesia',
        'Perioperative Fluids',
        'Miscellaneous',
        'Cardiopulmonary Cerebral Resuscitation',
        'Brain Death'
    ],

    'Medicine': [
        'Medicine',
        'Cardiology',
        'Emergency Medicine',
        'Endocrine',
        'Nephrology',
        'GIT',
        'Hematology',
        'Rheumatology',
        'Liver',
        'Pulmonology',
        'Infectious',
        'Clinical Essential'
    ],

    'Psychiatry': [
        'Psychiatry',
        'Basics of Psychiatry',
        'Schizophrenia Spectrum and Other Psychotic Disorder',
        'Mood Disorders',
        'Neurotic, Stress-Related and Somatoform Disorders',
        'Substance-Related and Addictive Disorder',
        'Child Psychiatry',
        'Organic Mental Disorders',
        'Sleep Disorders',
        'Sexual Disorders',
        'Eating Disorders',
        'Personality Disorder',
        'Forensic Psychiatry',
        'Psychology',
        'Miscellaneous'
    ],

    'Orthopedics': [
        'Orthopedics',
        'Bone and Imaging',
        'Bone and Joint Infections',
        'Tuberculosis of Bone and Joints',
        'Orthopedics Oncology',
        'Peripheral Nerve Injuries',
        'General + Upper Limb Traumatology',
        'Spine + Pelvis + Lower Limb Traumatology',
        'Complications in Orthopaedics',
        'Metabolic Disorders',
        'Arthritis',
        'Sports Injuries',
        'Pediatric Orthopedics',
        'Miscellaneous'
    ],

    'Dermatology': [
        'Dermatology',
        'Introduction to Dermatology',
        'Cutaneous Infection',
        'Mycobacterial Infections',
        'Immunobullous Disorder',
        'Papulosquamous Disorder',
        'Skin Appendages and Their Disorders',
        'Sexually Transmitted Infections',
        'Eczema',
        'Pigmentary Disorder',
        'Connective Tissue Disorders',
        'Skin Tumors',
        'Systemic Diseases and Skin',
        'Miscellaneous Disorder'
    ],

    'Ophthalmology': [
        'Ophthalmology',
        'Basics of Ophthalmology',
        'Errors in Optics',
        'Conjunctiva',
        'Sclera',
        'Cornea',
        'Retina and Vitreous',
        'Lens',
        'Glaucoma',
        'Uveal tract',
        'Lid and Lacrimal Apparatus',
        'Orbit',
        'Specific Disorders of the Eye',
        'Practical Ophthalmology',
        'Systemic Ophthalmology',
        'Community Ophthalmology',
        'Instruments'
    ],

    'OBGY': [
        'OBGY',
        'Fundamentals of Reproduction',
        'Normal Pregnancy and Antenatal Care',
        'Labor and Puerperium',
        'Obstetric Complications',
        'Medical and Surgical Complications in Pregnancy',
        'General Gynaecology',
        'Gynaecologic Infections',
        'Infertility and Menopause',
        'Gynaecologic Oncology',
        'Instruments'
    ]
};
