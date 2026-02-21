// ═══════════════════════════════════════════════════════════════
//  Education Config — 12 categories × 11 courses each
//  Tiered prereqs: basic (1-4), intermediate (5-8), advanced (9-11)
//  Completing all 11 → Bachelor's degree for that category
// ═══════════════════════════════════════════════════════════════

const meta = {
  maxActiveCourses: 1, // can only study one course at a time
};

/**
 * Helper: generate 11 courses for a category
 * @param {string} catId   - category key e.g. 'biology'
 * @param {string} catName - display name e.g. 'Biology'
 * @param {object[]} courses - array of 11 { name, desc, days, cost, rewards }
 * @param {object} bachelor - { name, rewards, unlocks }
 */
function cat(catId, catName, icon, courses, bachelor) {
  const built = courses.map((c, i) => {
    // Tiered prereqs: 1-4 basic (need previous in tier), 5-8 intermediate (need course 4), 9-11 advanced (need course 8)
    let prereqs = [];
    if (i > 0 && i <= 3) prereqs = [`${catId}_${i - 1}`];       // basic: sequential within tier
    else if (i === 4)     prereqs = [`${catId}_3`];               // intermediate entry: need last basic
    else if (i > 4 && i <= 7) prereqs = [`${catId}_${i - 1}`];   // intermediate: sequential within tier
    else if (i === 8)     prereqs = [`${catId}_7`];               // advanced entry: need last intermediate
    else if (i > 8)       prereqs = [`${catId}_${i - 1}`];       // advanced: sequential within tier

    return {
      id: `${catId}_${i}`,
      index: i,
      category: catId,
      name: c.name,
      description: c.desc,
      durationDays: c.days,
      cost: c.cost,
      rewards: c.rewards, // { manuallabor, intelligence, endurance }
      prereqs,
      tier: i <= 3 ? 'basic' : i <= 7 ? 'intermediate' : 'advanced',
    };
  });

  return {
    id: catId,
    name: catName,
    icon,
    courses: built,
    bachelor: {
      name: bachelor.name,
      rewards: bachelor.rewards,           // one-time stat lump
      passive: bachelor.passive || null,    // e.g. { stat: 'intelligence', multiplier: 1.03 }
      unlocks: bachelor.unlocks || null,    // e.g. 'law_rank_5'
    },
  };
}

// ── Helper: scale cost linearly from base to cap over 11 courses ──
function costs(base, cap) {
  return Array.from({ length: 11 }, (_, i) => Math.round(base + (cap - base) * (i / 10)));
}

// ── Helper: scale days linearly ──
function days(min, max) {
  return Array.from({ length: 11 }, (_, i) => Math.round(min + (max - min) * (i / 10)));
}

// ════════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════════

const CATEGORIES = {};

// 1. Biology 🧬
const bioCosts = costs(500, 1200);
const bioDays  = days(9, 26);
CATEGORIES.biology = cat('biology', 'Biology', '🧬', [
  { name: 'Intro to Biology',       desc: 'Cells, organisms, and the basics of life.',            days: bioDays[0],  cost: bioCosts[0],  rewards: { intelligence: 3, endurance: 1, manuallabor: 0 } },
  { name: 'Cell Biology',           desc: 'Deep dive into cellular structure and function.',       days: bioDays[1],  cost: bioCosts[1],  rewards: { intelligence: 4, endurance: 1, manuallabor: 0 } },
  { name: 'Genetics',               desc: 'DNA, inheritance, and genetic variation.',              days: bioDays[2],  cost: bioCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 0 } },
  { name: 'Microbiology',           desc: 'Bacteria, viruses, and microscopic life.',              days: bioDays[3],  cost: bioCosts[3],  rewards: { intelligence: 5, endurance: 2, manuallabor: 0 } },
  { name: 'Anatomy & Physiology',   desc: 'Human body systems and how they work.',                days: bioDays[4],  cost: bioCosts[4],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'Ecology',                desc: 'Ecosystems, food chains, and environmental science.',   days: bioDays[5],  cost: bioCosts[5],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'Biochemistry',           desc: 'Chemical processes within living organisms.',           days: bioDays[6],  cost: bioCosts[6],  rewards: { intelligence: 7, endurance: 2, manuallabor: 1 } },
  { name: 'Molecular Biology',      desc: 'Molecular mechanisms of gene expression.',             days: bioDays[7],  cost: bioCosts[7],  rewards: { intelligence: 8, endurance: 2, manuallabor: 1 } },
  { name: 'Immunology',             desc: 'The immune system and disease defense.',               days: bioDays[8],  cost: bioCosts[8],  rewards: { intelligence: 9, endurance: 3, manuallabor: 1 } },
  { name: 'Neuroscience',           desc: 'The brain, nervous system, and cognition.',            days: bioDays[9],  cost: bioCosts[9],  rewards: { intelligence: 10, endurance: 3, manuallabor: 1 } },
  { name: 'Pharmacology',           desc: 'Drug interactions and pharmaceutical science.',        days: bioDays[10], cost: bioCosts[10], rewards: { intelligence: 12, endurance: 3, manuallabor: 1 } },
], { name: "Bachelor's of Biology", rewards: { intelligence: 30, endurance: 10, manuallabor: 5 }, passive: { stat: 'intelligence', multiplier: 1.02 }, unlocks: 'pharma_company' });

// 2. Business 💼
const bizCosts = costs(500, 1200);
const bizDays  = days(9, 28);
CATEGORIES.business = cat('business', 'Business', '💼', [
  { name: 'Intro to Business',        desc: 'Fundamentals of commerce and enterprise.',             days: bizDays[0],  cost: bizCosts[0],  rewards: { intelligence: 3, endurance: 1, manuallabor: 1 } },
  { name: 'Accounting Basics',        desc: 'Debits, credits, and financial statements.',           days: bizDays[1],  cost: bizCosts[1],  rewards: { intelligence: 4, endurance: 1, manuallabor: 1 } },
  { name: 'Marketing Fundamentals',   desc: 'Consumer behavior and market strategies.',             days: bizDays[2],  cost: bizCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 1 } },
  { name: 'Business Ethics',          desc: 'Moral principles in the corporate world.',             days: bizDays[3],  cost: bizCosts[3],  rewards: { intelligence: 5, endurance: 2, manuallabor: 1 } },
  { name: 'Finance',                  desc: 'Investment, banking, and financial management.',       days: bizDays[4],  cost: bizCosts[4],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'Operations Management',    desc: 'Supply chains, logistics, and efficiency.',            days: bizDays[5],  cost: bizCosts[5],  rewards: { intelligence: 6, endurance: 2, manuallabor: 2 } },
  { name: 'Human Resources',          desc: 'Managing people, recruitment, and labor law.',         days: bizDays[6],  cost: bizCosts[6],  rewards: { intelligence: 7, endurance: 2, manuallabor: 2 } },
  { name: 'Business Strategy',        desc: 'Competitive advantage and strategic planning.',        days: bizDays[7],  cost: bizCosts[7],  rewards: { intelligence: 8, endurance: 3, manuallabor: 2 } },
  { name: 'Entrepreneurship',         desc: 'Starting and scaling new ventures.',                   days: bizDays[8],  cost: bizCosts[8],  rewards: { intelligence: 9, endurance: 3, manuallabor: 2 } },
  { name: 'International Business',   desc: 'Global trade, currency, and geopolitics.',             days: bizDays[9],  cost: bizCosts[9],  rewards: { intelligence: 10, endurance: 3, manuallabor: 2 } },
  { name: 'Corporate Leadership',     desc: 'Executive management and organizational change.',      days: bizDays[10], cost: bizCosts[10], rewards: { intelligence: 12, endurance: 4, manuallabor: 2 } },
], { name: "Bachelor's of Business", rewards: { intelligence: 25, endurance: 12, manuallabor: 8 }, passive: { stat: 'intelligence', multiplier: 1.02 }, unlocks: 'company_director' });

// 3. Combat Training ⚔️
const combCosts = costs(500, 1200);
const combDays  = days(9, 28);
CATEGORIES.combat = cat('combat', 'Combat Training', '⚔️', [
  { name: 'Basic Drill',            desc: 'Fundamental military movement and commands.',           days: combDays[0],  cost: combCosts[0],  rewards: { manuallabor: 3, endurance: 2, intelligence: 0 } },
  { name: 'Weapons Handling',       desc: 'Firearms safety and marksmanship basics.',              days: combDays[1],  cost: combCosts[1],  rewards: { manuallabor: 4, endurance: 2, intelligence: 1 } },
  { name: 'Field Exercises',        desc: 'Outdoor survival and navigation.',                      days: combDays[2],  cost: combCosts[2],  rewards: { manuallabor: 5, endurance: 3, intelligence: 1 } },
  { name: 'Hand-to-Hand Combat',    desc: 'Close quarters fighting techniques.',                   days: combDays[3],  cost: combCosts[3],  rewards: { manuallabor: 5, endurance: 3, intelligence: 1 } },
  { name: 'Tactical Operations',    desc: 'Squad-level combat tactics.',                           days: combDays[4],  cost: combCosts[4],  rewards: { manuallabor: 6, endurance: 3, intelligence: 2 } },
  { name: 'Explosives & Demolition',desc: 'Safe handling and deployment of ordnance.',             days: combDays[5],  cost: combCosts[5],  rewards: { manuallabor: 7, endurance: 3, intelligence: 2 } },
  { name: 'Sniper Training',        desc: 'Long-range precision shooting.',                        days: combDays[6],  cost: combCosts[6],  rewards: { manuallabor: 7, endurance: 4, intelligence: 2 } },
  { name: 'Jungle Warfare',         desc: 'Combat operations in dense terrain.',                   days: combDays[7],  cost: combCosts[7],  rewards: { manuallabor: 8, endurance: 4, intelligence: 2 } },
  { name: 'Urban Combat',           desc: 'Building clearance and CQB tactics.',                   days: combDays[8],  cost: combCosts[8],  rewards: { manuallabor: 9, endurance: 5, intelligence: 2 } },
  { name: 'Special Operations',     desc: 'Covert missions and black ops training.',               days: combDays[9],  cost: combCosts[9],  rewards: { manuallabor: 10, endurance: 5, intelligence: 3 } },
  { name: 'Commander School',       desc: 'Lead large-scale military operations.',                 days: combDays[10], cost: combCosts[10], rewards: { manuallabor: 12, endurance: 5, intelligence: 4 } },
], { name: "Bachelor's of Combat Training", rewards: { manuallabor: 30, endurance: 15, intelligence: 5 }, passive: { stat: 'manuallabor', multiplier: 1.02 }, unlocks: 'army_rank_5' });

// 4. Computer Science 💻
const csCosts = costs(500, 1200);
const csDays  = days(9, 28);
CATEGORIES.computer_science = cat('computer_science', 'Computer Science', '💻', [
  { name: 'Intro to Programming',      desc: 'Variables, loops, and basic logic.',                  days: csDays[0],  cost: csCosts[0],  rewards: { intelligence: 4, endurance: 0, manuallabor: 0 } },
  { name: 'Data Structures',           desc: 'Arrays, trees, graphs, and hash maps.',               days: csDays[1],  cost: csCosts[1],  rewards: { intelligence: 5, endurance: 0, manuallabor: 0 } },
  { name: 'Algorithms',                desc: 'Sorting, searching, and optimization.',               days: csDays[2],  cost: csCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 0 } },
  { name: 'Databases',                 desc: 'SQL, NoSQL, and data modeling.',                      days: csDays[3],  cost: csCosts[3],  rewards: { intelligence: 6, endurance: 1, manuallabor: 0 } },
  { name: 'Networking',                desc: 'TCP/IP, protocols, and network architecture.',        days: csDays[4],  cost: csCosts[4],  rewards: { intelligence: 7, endurance: 1, manuallabor: 0 } },
  { name: 'Operating Systems',         desc: 'Process management, memory, and file systems.',       days: csDays[5],  cost: csCosts[5],  rewards: { intelligence: 7, endurance: 1, manuallabor: 1 } },
  { name: 'Cybersecurity',             desc: 'Hacking, encryption, and defense.',                   days: csDays[6],  cost: csCosts[6],  rewards: { intelligence: 8, endurance: 1, manuallabor: 1 } },
  { name: 'Software Engineering',      desc: 'Design patterns, testing, and architecture.',         days: csDays[7],  cost: csCosts[7],  rewards: { intelligence: 9, endurance: 1, manuallabor: 1 } },
  { name: 'Machine Learning',          desc: 'AI, neural networks, and data science.',              days: csDays[8],  cost: csCosts[8],  rewards: { intelligence: 10, endurance: 2, manuallabor: 1 } },
  { name: 'Distributed Systems',       desc: 'Scaling, consensus, and cloud computing.',            days: csDays[9],  cost: csCosts[9],  rewards: { intelligence: 11, endurance: 2, manuallabor: 1 } },
  { name: 'Advanced Research',         desc: 'Cutting-edge CS theory and application.',             days: csDays[10], cost: csCosts[10], rewards: { intelligence: 13, endurance: 2, manuallabor: 1 } },
], { name: "Bachelor's of Computer Science", rewards: { intelligence: 35, endurance: 5, manuallabor: 5 }, passive: { stat: 'intelligence', multiplier: 1.03 }, unlocks: 'tech_company' });

// 5. General Studies 📚
const gsCosts = costs(500, 1200);
const gsDays  = days(9, 25);
CATEGORIES.general_studies = cat('general_studies', 'General Studies', '📚', [
  { name: 'Study Skills',           desc: 'Time management, note-taking, and exam prep.',          days: gsDays[0],  cost: gsCosts[0],  rewards: { intelligence: 2, endurance: 1, manuallabor: 1 } },
  { name: 'Critical Thinking',      desc: 'Logic, reasoning, and argumentation.',                  days: gsDays[1],  cost: gsCosts[1],  rewards: { intelligence: 3, endurance: 1, manuallabor: 1 } },
  { name: 'Academic Writing',       desc: 'Essay structure, citations, and clarity.',               days: gsDays[2],  cost: gsCosts[2],  rewards: { intelligence: 3, endurance: 1, manuallabor: 1 } },
  { name: 'Philosophy',             desc: 'Ethics, metaphysics, and epistemology.',                days: gsDays[3],  cost: gsCosts[3],  rewards: { intelligence: 4, endurance: 1, manuallabor: 1 } },
  { name: 'Sociology',              desc: 'Society, culture, and social institutions.',            days: gsDays[4],  cost: gsCosts[4],  rewards: { intelligence: 4, endurance: 2, manuallabor: 1 } },
  { name: 'Economics 101',          desc: 'Supply, demand, and market fundamentals.',              days: gsDays[5],  cost: gsCosts[5],  rewards: { intelligence: 5, endurance: 2, manuallabor: 1 } },
  { name: 'Political Science',      desc: 'Government systems and political theory.',              days: gsDays[6],  cost: gsCosts[6],  rewards: { intelligence: 5, endurance: 2, manuallabor: 2 } },
  { name: 'Anthropology',           desc: 'Human cultures and evolutionary history.',              days: gsDays[7],  cost: gsCosts[7],  rewards: { intelligence: 6, endurance: 2, manuallabor: 2 } },
  { name: 'Environmental Studies',  desc: 'Sustainability and the natural world.',                 days: gsDays[8],  cost: gsCosts[8],  rewards: { intelligence: 6, endurance: 3, manuallabor: 2 } },
  { name: 'Ethics in Society',      desc: 'Moral dilemmas and real-world decision making.',        days: gsDays[9],  cost: gsCosts[9],  rewards: { intelligence: 7, endurance: 3, manuallabor: 2 } },
  { name: 'Senior Capstone',        desc: 'Interdisciplinary final project.',                      days: gsDays[10], cost: gsCosts[10], rewards: { intelligence: 8, endurance: 3, manuallabor: 3 } },
], { name: "Bachelor's of General Studies", rewards: { intelligence: 20, endurance: 10, manuallabor: 10 }, passive: { stat: 'all', multiplier: 1.01 } });

// 6. Health & Fitness 🏋️
const hfCosts = costs(500, 1200);
const hfDays  = days(9, 27);
CATEGORIES.health_fitness = cat('health_fitness', 'Health & Fitness', '🏋️', [
  { name: 'Nutrition Basics',         desc: 'Macronutrients, calories, and meal planning.',         days: hfDays[0],  cost: hfCosts[0],  rewards: { endurance: 3, manuallabor: 2, intelligence: 1 } },
  { name: 'Basic Exercise Science',   desc: 'How muscles grow and adapt.',                          days: hfDays[1],  cost: hfCosts[1],  rewards: { endurance: 3, manuallabor: 3, intelligence: 1 } },
  { name: 'Strength Training',        desc: 'Progressive overload and resistance training.',        days: hfDays[2],  cost: hfCosts[2],  rewards: { endurance: 3, manuallabor: 4, intelligence: 1 } },
  { name: 'Cardio & Conditioning',    desc: 'Endurance training and VO2 max.',                      days: hfDays[3],  cost: hfCosts[3],  rewards: { endurance: 4, manuallabor: 3, intelligence: 1 } },
  { name: 'Sports Nutrition',         desc: 'Performance-optimized diet strategies.',               days: hfDays[4],  cost: hfCosts[4],  rewards: { endurance: 4, manuallabor: 4, intelligence: 2 } },
  { name: 'Flexibility & Recovery',   desc: 'Stretching, mobility, and injury prevention.',         days: hfDays[5],  cost: hfCosts[5],  rewards: { endurance: 5, manuallabor: 4, intelligence: 2 } },
  { name: 'Personal Training Cert',   desc: 'Become a certified personal trainer.',                 days: hfDays[6],  cost: hfCosts[6],  rewards: { endurance: 5, manuallabor: 5, intelligence: 2 } },
  { name: 'Advanced Biomechanics',    desc: 'Movement science and force analysis.',                 days: hfDays[7],  cost: hfCosts[7],  rewards: { endurance: 6, manuallabor: 5, intelligence: 3 } },
  { name: 'Sports Medicine',          desc: 'Athlete injuries and rehabilitation.',                 days: hfDays[8],  cost: hfCosts[8],  rewards: { endurance: 6, manuallabor: 6, intelligence: 3 } },
  { name: 'Elite Performance',        desc: 'Peak athletic training methodologies.',                days: hfDays[9],  cost: hfCosts[9],  rewards: { endurance: 7, manuallabor: 6, intelligence: 3 } },
  { name: 'Mastery of the Body',      desc: 'Total physical and mental optimization.',              days: hfDays[10], cost: hfCosts[10], rewards: { endurance: 8, manuallabor: 7, intelligence: 3 } },
], { name: "Bachelor's of Health & Fitness", rewards: { endurance: 25, manuallabor: 20, intelligence: 8 }, passive: { stat: 'endurance', multiplier: 1.02 } });

// 7. History 📜
const hisCosts = costs(500, 1200);
const hisDays  = days(9, 26);
CATEGORIES.history = cat('history', 'History', '📜', [
  { name: 'Ancient Civilizations',   desc: 'Mesopotamia, Egypt, Greece, and Rome.',                days: hisDays[0],  cost: hisCosts[0],  rewards: { intelligence: 3, endurance: 1, manuallabor: 0 } },
  { name: 'Medieval History',        desc: 'Feudalism, crusades, and the Dark Ages.',              days: hisDays[1],  cost: hisCosts[1],  rewards: { intelligence: 4, endurance: 1, manuallabor: 0 } },
  { name: 'Renaissance & Reform',    desc: 'Art, science, and religious upheaval.',                days: hisDays[2],  cost: hisCosts[2],  rewards: { intelligence: 4, endurance: 1, manuallabor: 1 } },
  { name: 'Colonial Empires',        desc: 'Exploration, colonization, and trade.',                days: hisDays[3],  cost: hisCosts[3],  rewards: { intelligence: 5, endurance: 1, manuallabor: 1 } },
  { name: 'Industrial Revolution',   desc: 'Steam power, factories, and urbanization.',           days: hisDays[4],  cost: hisCosts[4],  rewards: { intelligence: 5, endurance: 2, manuallabor: 1 } },
  { name: 'World War I',             desc: 'Trenches, alliances, and total war.',                  days: hisDays[5],  cost: hisCosts[5],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'World War II',            desc: 'Global conflict and the atomic age.',                  days: hisDays[6],  cost: hisCosts[6],  rewards: { intelligence: 6, endurance: 2, manuallabor: 2 } },
  { name: 'Cold War Era',            desc: 'Superpowers, proxy wars, and espionage.',              days: hisDays[7],  cost: hisCosts[7],  rewards: { intelligence: 7, endurance: 2, manuallabor: 2 } },
  { name: 'Modern Conflicts',        desc: 'Terrorism, asymmetric warfare, and geopolitics.',      days: hisDays[8],  cost: hisCosts[8],  rewards: { intelligence: 8, endurance: 3, manuallabor: 2 } },
  { name: 'Historical Analysis',     desc: 'Research methods and historiography.',                 days: hisDays[9],  cost: hisCosts[9],  rewards: { intelligence: 9, endurance: 3, manuallabor: 2 } },
  { name: 'Thesis Defense',          desc: 'Original research and scholarly contribution.',        days: hisDays[10], cost: hisCosts[10], rewards: { intelligence: 10, endurance: 3, manuallabor: 2 } },
], { name: "Bachelor's of History", rewards: { intelligence: 28, endurance: 8, manuallabor: 6 }, passive: { stat: 'intelligence', multiplier: 1.02 } });

// 8. Law ⚖️
const lawCosts = costs(500, 1200);
const lawDays  = days(10, 30);
CATEGORIES.law = cat('law', 'Law', '⚖️', [
  { name: 'Intro to Law',            desc: 'Legal systems, courts, and constitutional basics.',    days: lawDays[0],  cost: lawCosts[0],  rewards: { intelligence: 4, endurance: 1, manuallabor: 0 } },
  { name: 'Criminal Law',            desc: 'Offenses, defenses, and criminal procedure.',          days: lawDays[1],  cost: lawCosts[1],  rewards: { intelligence: 5, endurance: 1, manuallabor: 0 } },
  { name: 'Constitutional Law',      desc: 'Rights, amendments, and judicial review.',             days: lawDays[2],  cost: lawCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 0 } },
  { name: 'Contract Law',            desc: 'Agreements, obligations, and remedies.',               days: lawDays[3],  cost: lawCosts[3],  rewards: { intelligence: 6, endurance: 1, manuallabor: 1 } },
  { name: 'Tort Law',                desc: 'Civil wrongs, negligence, and liability.',             days: lawDays[4],  cost: lawCosts[4],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'Property Law',            desc: 'Ownership, land, and intellectual property.',          days: lawDays[5],  cost: lawCosts[5],  rewards: { intelligence: 7, endurance: 2, manuallabor: 1 } },
  { name: 'Evidence & Procedure',    desc: 'Rules of evidence and courtroom protocol.',            days: lawDays[6],  cost: lawCosts[6],  rewards: { intelligence: 8, endurance: 2, manuallabor: 1 } },
  { name: 'Corporate Law',           desc: 'Business entities, mergers, and securities.',          days: lawDays[7],  cost: lawCosts[7],  rewards: { intelligence: 9, endurance: 2, manuallabor: 1 } },
  { name: 'International Law',       desc: 'Treaties, human rights, and global governance.',       days: lawDays[8],  cost: lawCosts[8],  rewards: { intelligence: 10, endurance: 3, manuallabor: 1 } },
  { name: 'Legal Ethics',            desc: 'Professional responsibility and bar standards.',       days: lawDays[9],  cost: lawCosts[9],  rewards: { intelligence: 11, endurance: 3, manuallabor: 1 } },
  { name: 'Bar Exam Prep',           desc: 'Comprehensive review and mock examinations.',          days: lawDays[10], cost: lawCosts[10], rewards: { intelligence: 13, endurance: 3, manuallabor: 1 } },
], { name: "Bachelor's of Law", rewards: { intelligence: 35, endurance: 8, manuallabor: 5 }, passive: { stat: 'intelligence', multiplier: 1.03 }, unlocks: 'law_rank_5' });

// 9. Mathematics 🔢
const mathCosts = costs(500, 1200);
const mathDays  = days(9, 28);
CATEGORIES.mathematics = cat('mathematics', 'Mathematics', '🔢', [
  { name: 'Pre-Calculus',            desc: 'Algebra, trigonometry, and functions.',                 days: mathDays[0],  cost: mathCosts[0],  rewards: { intelligence: 4, endurance: 0, manuallabor: 0 } },
  { name: 'Calculus I',              desc: 'Limits, derivatives, and integrals.',                  days: mathDays[1],  cost: mathCosts[1],  rewards: { intelligence: 5, endurance: 0, manuallabor: 0 } },
  { name: 'Calculus II',             desc: 'Series, sequences, and multivariable.',                days: mathDays[2],  cost: mathCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 0 } },
  { name: 'Linear Algebra',          desc: 'Vectors, matrices, and transformations.',              days: mathDays[3],  cost: mathCosts[3],  rewards: { intelligence: 6, endurance: 1, manuallabor: 0 } },
  { name: 'Differential Equations',  desc: 'Modeling change with equations.',                      days: mathDays[4],  cost: mathCosts[4],  rewards: { intelligence: 7, endurance: 1, manuallabor: 0 } },
  { name: 'Probability & Stats',     desc: 'Random variables, distributions, and inference.',      days: mathDays[5],  cost: mathCosts[5],  rewards: { intelligence: 7, endurance: 1, manuallabor: 1 } },
  { name: 'Discrete Mathematics',    desc: 'Combinatorics, graph theory, and logic.',              days: mathDays[6],  cost: mathCosts[6],  rewards: { intelligence: 8, endurance: 1, manuallabor: 1 } },
  { name: 'Number Theory',           desc: 'Primes, modular arithmetic, and cryptography.',        days: mathDays[7],  cost: mathCosts[7],  rewards: { intelligence: 9, endurance: 1, manuallabor: 1 } },
  { name: 'Real Analysis',           desc: 'Rigorous calculus: proofs and topology.',              days: mathDays[8],  cost: mathCosts[8],  rewards: { intelligence: 10, endurance: 2, manuallabor: 1 } },
  { name: 'Abstract Algebra',        desc: 'Groups, rings, and fields.',                           days: mathDays[9],  cost: mathCosts[9],  rewards: { intelligence: 11, endurance: 2, manuallabor: 1 } },
  { name: 'Senior Thesis',           desc: 'Original mathematical research.',                      days: mathDays[10], cost: mathCosts[10], rewards: { intelligence: 13, endurance: 2, manuallabor: 1 } },
], { name: "Bachelor's of Mathematics", rewards: { intelligence: 38, endurance: 5, manuallabor: 5 }, passive: { stat: 'intelligence', multiplier: 1.03 } });

// 10. Psychology 🧠
const psyCosts = costs(500, 1200);
const psyDays  = days(9, 27);
CATEGORIES.psychology = cat('psychology', 'Psychology', '🧠', [
  { name: 'Intro to Psychology',      desc: 'The mind, behavior, and scientific method.',           days: psyDays[0],  cost: psyCosts[0],  rewards: { intelligence: 3, endurance: 1, manuallabor: 1 } },
  { name: 'Developmental Psych',      desc: 'Human growth from infancy to old age.',               days: psyDays[1],  cost: psyCosts[1],  rewards: { intelligence: 4, endurance: 1, manuallabor: 1 } },
  { name: 'Social Psychology',        desc: 'Group behavior, conformity, and persuasion.',         days: psyDays[2],  cost: psyCosts[2],  rewards: { intelligence: 5, endurance: 1, manuallabor: 1 } },
  { name: 'Cognitive Psychology',     desc: 'Memory, attention, and problem solving.',             days: psyDays[3],  cost: psyCosts[3],  rewards: { intelligence: 5, endurance: 2, manuallabor: 1 } },
  { name: 'Abnormal Psychology',      desc: 'Mental disorders, diagnosis, and treatment.',         days: psyDays[4],  cost: psyCosts[4],  rewards: { intelligence: 6, endurance: 2, manuallabor: 1 } },
  { name: 'Behavioral Neuroscience',  desc: 'Brain structures and their behavioral effects.',      days: psyDays[5],  cost: psyCosts[5],  rewards: { intelligence: 7, endurance: 2, manuallabor: 1 } },
  { name: 'Research Methods',         desc: 'Experimental design and statistical analysis.',       days: psyDays[6],  cost: psyCosts[6],  rewards: { intelligence: 7, endurance: 2, manuallabor: 2 } },
  { name: 'Clinical Psychology',      desc: 'Therapy techniques and patient assessment.',          days: psyDays[7],  cost: psyCosts[7],  rewards: { intelligence: 8, endurance: 3, manuallabor: 2 } },
  { name: 'Forensic Psychology',      desc: 'Criminal profiling and legal psychology.',            days: psyDays[8],  cost: psyCosts[8],  rewards: { intelligence: 9, endurance: 3, manuallabor: 2 } },
  { name: 'Industrial Psychology',    desc: 'Workplace behavior and organizational design.',       days: psyDays[9],  cost: psyCosts[9],  rewards: { intelligence: 10, endurance: 3, manuallabor: 2 } },
  { name: 'Senior Research Project',  desc: 'Original psychological research.',                    days: psyDays[10], cost: psyCosts[10], rewards: { intelligence: 11, endurance: 3, manuallabor: 2 } },
], { name: "Bachelor's of Psychology", rewards: { intelligence: 30, endurance: 10, manuallabor: 8 }, passive: { stat: 'intelligence', multiplier: 1.02 } });

// 11. Self Defense 🥋
const sdCosts = costs(500, 1200);
const sdDays  = days(9, 28);
CATEGORIES.self_defense = cat('self_defense', 'Self Defense', '🥋', [
  { name: 'Awareness & Avoidance',   desc: 'Situational awareness and de-escalation.',             days: sdDays[0],  cost: sdCosts[0],  rewards: { manuallabor: 2, endurance: 2, intelligence: 1 } },
  { name: 'Basic Striking',          desc: 'Punches, kicks, and fundamental combos.',              days: sdDays[1],  cost: sdCosts[1],  rewards: { manuallabor: 3, endurance: 3, intelligence: 1 } },
  { name: 'Grappling Basics',        desc: 'Clinch work, takedowns, and escapes.',                 days: sdDays[2],  cost: sdCosts[2],  rewards: { manuallabor: 4, endurance: 3, intelligence: 1 } },
  { name: 'Ground Defense',          desc: 'Guard, submissions, and ground control.',              days: sdDays[3],  cost: sdCosts[3],  rewards: { manuallabor: 4, endurance: 4, intelligence: 1 } },
  { name: 'Weapon Defense',          desc: 'Defending against knives, clubs, and firearms.',       days: sdDays[4],  cost: sdCosts[4],  rewards: { manuallabor: 5, endurance: 4, intelligence: 2 } },
  { name: 'Krav Maga',               desc: 'Israeli military self-defense system.',                days: sdDays[5],  cost: sdCosts[5],  rewards: { manuallabor: 6, endurance: 4, intelligence: 2 } },
  { name: 'Brazilian Jiu-Jitsu',     desc: 'Advanced grappling and submission arts.',              days: sdDays[6],  cost: sdCosts[6],  rewards: { manuallabor: 6, endurance: 5, intelligence: 2 } },
  { name: 'Muay Thai',               desc: 'The art of eight limbs.',                              days: sdDays[7],  cost: sdCosts[7],  rewards: { manuallabor: 7, endurance: 5, intelligence: 2 } },
  { name: 'Mixed Martial Arts',      desc: 'Combining disciplines for complete fighting.',         days: sdDays[8],  cost: sdCosts[8],  rewards: { manuallabor: 8, endurance: 6, intelligence: 2 } },
  { name: 'Close Protection',        desc: 'Bodyguard techniques and VIP security.',               days: sdDays[9],  cost: sdCosts[9],  rewards: { manuallabor: 9, endurance: 6, intelligence: 3 } },
  { name: 'Master Instructor',       desc: 'Teaching self-defense at the highest level.',          days: sdDays[10], cost: sdCosts[10], rewards: { manuallabor: 10, endurance: 6, intelligence: 3 } },
], { name: "Bachelor's of Self Defense", rewards: { manuallabor: 25, endurance: 20, intelligence: 8 }, passive: { stat: 'manuallabor', multiplier: 1.02 } });

// 12. Sports Science 🏅
const ssCosts = costs(500, 1200);
const ssDays  = days(9, 28);
CATEGORIES.sports_science = cat('sports_science', 'Sports Science', '🏅', [
  { name: 'Intro to Sports Science', desc: 'Overview of athletic performance research.',           days: ssDays[0],  cost: ssCosts[0],  rewards: { endurance: 3, manuallabor: 2, intelligence: 1 } },
  { name: 'Exercise Physiology',     desc: 'How the body responds to physical stress.',            days: ssDays[1],  cost: ssCosts[1],  rewards: { endurance: 4, manuallabor: 2, intelligence: 1 } },
  { name: 'Kinesiology',             desc: 'The science of human movement.',                       days: ssDays[2],  cost: ssCosts[2],  rewards: { endurance: 4, manuallabor: 3, intelligence: 1 } },
  { name: 'Biomechanics',            desc: 'Forces and physics of athletic motion.',               days: ssDays[3],  cost: ssCosts[3],  rewards: { endurance: 4, manuallabor: 3, intelligence: 2 } },
  { name: 'Sports Psychology',       desc: 'Mental preparation and competitive mindset.',          days: ssDays[4],  cost: ssCosts[4],  rewards: { endurance: 5, manuallabor: 3, intelligence: 2 } },
  { name: 'Coaching Methods',        desc: 'Training plans, periodization, and team management.',  days: ssDays[5],  cost: ssCosts[5],  rewards: { endurance: 5, manuallabor: 4, intelligence: 2 } },
  { name: 'Injury Rehabilitation',   desc: 'Recovery protocols and return-to-play.',               days: ssDays[6],  cost: ssCosts[6],  rewards: { endurance: 6, manuallabor: 4, intelligence: 3 } },
  { name: 'Performance Analytics',   desc: 'Data-driven athletic optimization.',                   days: ssDays[7],  cost: ssCosts[7],  rewards: { endurance: 6, manuallabor: 5, intelligence: 3 } },
  { name: 'Strength & Conditioning', desc: 'Elite-level S&C program design.',                      days: ssDays[8],  cost: ssCosts[8],  rewards: { endurance: 7, manuallabor: 5, intelligence: 3 } },
  { name: 'Sports Therapy',          desc: 'Advanced therapeutic techniques for athletes.',         days: ssDays[9],  cost: ssCosts[9],  rewards: { endurance: 7, manuallabor: 6, intelligence: 3 } },
  { name: 'Research Capstone',       desc: 'Original sports science research.',                    days: ssDays[10], cost: ssCosts[10], rewards: { endurance: 8, manuallabor: 6, intelligence: 4 } },
], { name: "Bachelor's of Sports Science", rewards: { endurance: 25, manuallabor: 18, intelligence: 12 }, passive: { stat: 'endurance', multiplier: 1.02 } });


// ═══ Flat lookup: courseId → course object ═══
const ALL_COURSES = {};
const CATEGORY_LIST = Object.values(CATEGORIES);
for (const cat of CATEGORY_LIST) {
  for (const c of cat.courses) {
    ALL_COURSES[c.id] = c;
  }
}

module.exports = {
  meta,
  CATEGORIES,
  CATEGORY_LIST,
  ALL_COURSES,
};
