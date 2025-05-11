const jobSettings = {
  meta: {
    maxEmployees: 16,
    maxRating: 10,
  },
  jobs: {
    1: {
      jobId: 1,
      name: "Army",

      rankZero: {
        name: "Private",
        pay: 125,
        jobPoints: 1,
        pointsForPromotion: 5,
        requiredStats: { manuallabor: 2, intelligence: 2, endurance: 2 },
        statsGained: { manuallabor: 3, intelligence: 1, endurance: 2 },
      },
      rankOne: {
        name: "Corporal",
        pay: 150,
        jobPoints: 2,
        pointsForPromotion: 10,
        requiredStats: { manuallabor: 50, intelligence: 15, endurance: 20 },
        statsGained: { manuallabor: 5, intelligence: 2, endurance: 3 },
      },
      rankTwo: {
        name: "Sergeant",
        pay: 180,
        jobPoints: 3,
        pointsForPromotion: 15,
        requiredStats: { manuallabor: 120, intelligence: 35, endurance: 50 },
        statsGained: { manuallabor: 8, intelligence: 3, endurance: 5 },
      },
      rankThree: {
        name: "Master Sergeant",
        pay: 220,
        jobPoints: 4,
        pointsForPromotion: 20,
        requiredStats: { manuallabor: 325, intelligence: 60, endurance: 115 },
        statsGained: { manuallabor: 12, intelligence: 4, endurance: 7 },
      },
      rankFour: {
        name: "Warrant Officer",
        pay: 225,
        jobPoints: 5,
        pointsForPromotion: 25,
        requiredStats: { manuallabor: 700, intelligence: 160, endurance: 300 },
        statsGained: { manuallabor: 17, intelligence: 7, endurance: 10 },
      },
      rankFive: {
        name: "Lieutenant",
        pay: 325,
        jobPoints: 6,
        pointsForPromotion: 30,
        requiredStats: { manuallabor: 1300, intelligence: 360, endurance: 595 },
        statsGained: { manuallabor: 20, intelligence: 9, endurance: 11 },
      },
      rankSix: {
        name: "Major",
        pay: 550,
        jobPoints: 7,
        pointsForPromotion: 35,
        requiredStats: { manuallabor: 2550, intelligence: 490, endurance: 900 },
        statsGained: { manuallabor: 24, intelligence: 10, endurance: 13 },
      },
      rankSeven: {
        name: "Colonel",
        pay: 755,
        jobPoints: 8,
        pointsForPromotion: 40,
        requiredStats: { manuallabor: 4150, intelligence: 600, endurance: 1100 },
        statsGained: { manuallabor: 28, intelligence: 12, endurance: 15 },
      },
      rankEight: {
        name: "Brigadier",
        pay: 1000,
        jobPoints: 9,
        pointsForPromotion: 45,
        requiredStats: { manuallabor: 7500, intelligence: 1350, endurance: 2530 },
        statsGained: { manuallabor: 33, intelligence: 18, endurance: 15 },
      },
      rankNine: {
        name: "General",
        pay: 2500,
        jobPoints: 10,
        pointsForPromotion: null,
        requiredStats: { manuallabor: 10000, intelligence: 2000, endurance: 4000 },
        statsGained: { manuallabor: 40, intelligence: 25, endurance: 20 },
      },

      abilityOne: {
        name: "Army Training",
        description: "Increases the effectiveness of all army jobs.",
        unlockedAt: 0,
        effect: {
          gain: "strength",
          value: 10,
        },
      },
      abilityTwo: {
        name: "Army Training II",
        description: "Defense training",
        unlockedAt: 1,
        effect: {
          gain: "strength",
          value: 20,
        },
      },
      abilityThree: {
        name: "Steal a Weapon",
        description: "Steal a weapon from the army.",
        unlockedAt: 4,
        effect: {
          item: "weapon",
          quantity: 1,
        },
      },
      abilityFour: {
        name: "Spy on the Enemy",
        description: "See another player's stats.",
        unlockedAt: 9,
        effect: {
          spy: "", // player ID should be dynamically assigned when used
        },
      },
    },
  },
};

module.exports = jobSettings;
