const Item = require('../models/Item');
const User = require('../models/Player');

const applyItem = async (userId, itemId) => {
  const user = await User.findById(userId);
  const item = await Item.findById(itemId);

  if (!item.usable) throw new Error('Item is not usable');

  // Apply the effect (basic example, assumes effect is { stat: +value })
  for (const stat in item.effect) {
    if (user.stats[stat] !== undefined) {
      user.stats[stat] += item.effect[stat];
    }
  }

  if (!overdose) {
    // Check for overdose
    for (const stat in item.overdoseEffect) {
      if (user.stats[stat] !== undefined) {
        user.stats[stat] += item.overdoseEffect[stat];
      }
    }
  }

  await user.save();
  return { message: `${item.name} used successfully.`, newStats: user.stats };
};

module.exports = { applyItem };