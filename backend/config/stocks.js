// Stock configuration: defines available stocks and initial parameters
// Each stock uses a simple stochastic model with:
//  - avgYieldPerYear: expected annualized return (e.g., 0.10 = 10%/year)
//  - volatility: annualized volatility (e.g., 0.30 = 30%/year)

module.exports = {
  NIZZ: {
    symbol: 'NIZZ',
    name: 'Nizzia Inc',
    description: 'High-growth tech-leaning company with moderate volatility.',
    initialPrice: 1000,
    avgYieldPerYear: 0.12,
    volatility: 1.35,
    decimals: 2,
  },
  CUCO: {
    symbol: 'CUCO',
    name: 'City Utilities Co.',
    description: 'Stable local utilities company with modest growth.',
    initialPrice: 150,
    avgYieldPerYear: 0.15,
    volatility: 4.90,
    decimals: 2
  },
  FRIK: {
    symbol: 'FRIK',
    name: 'Freenuk International Kilo',
    description: 'Something something something.',
    initialPrice: 1,
    avgYieldPerYear: 0.25,
    volatility: 4.90,
    decimals: 4
  },
  NSI: {
    symbol: 'NSI',
    name: 'Nizzia Space Industries',
    description: 'Something something something.',
    initialPrice: 10000,
    avgYieldPerYear: 0.15,
    volatility: 4.90,
    decimals: 2
  },
  FLY: {
    symbol: 'PLPL',
    name: 'Plain Planes',
    description: 'Something something something.',
    initialPrice: 230,
    avgYieldPerYear: 0.05,
    volatility: 4.90,
    decimals: 2
  }

};
