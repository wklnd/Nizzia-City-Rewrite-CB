const Item = require('../models/Item');
const itemService = require('../services/itemService');

const getAllItems = async (req, res) => {
  const items = await Item.find();
  res.json(items);
};

const useItem = async (req, res) => {
  const { userId, itemId } = req.body;
  try {
    const result = await itemService.applyItem(userId, itemId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const createItem = async (req, res) => {
  const {
    name,
    type,
    description,
    effect,
    overdoseEffect,
    passiveEffect,
    type2,
    damage,
    armor,
    coverage,
    quality,
    price,
    sellable,
    usable
  } = req.body;

  try {
    // Base fields
    const payload = {
      name,
      type,
      description,
      price,
      sellable,
      usable
    };

    // Per‐type additions
    if (['medicine','alchool','enhancers','drugs'].includes(type)) {
      payload.effect = effect || {};
    }
    if (['alchool','drugs'].includes(type)) {
      payload.overdoseEffect = overdoseEffect || {};
    }
    if (['tools','collectibles'].includes(type)) {
      payload.passiveEffect = passiveEffect || {};
    }
    if (['weapon','armor','clothes'].includes(type) && type2) {
      payload.type2 = type2;
    }
    if (type === 'weapon') {
      payload.damage = Number(damage) || 0;
      payload.quality = Number(quality) || 0;
    }
    if (type === 'armor') {
      payload.armor = Number(armor) || 0;
      payload.coverage = Number(coverage) || 100;
      payload.quality = Number(quality) || 0;
    }

    const newItem = new Item(payload);
    await newItem.save();

    return res.status(201).json(newItem);
  } catch (err) {
    console.error('Failed to create item:', err);
    return res.status(400).json({ error: err.message });
  }
};

const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(deletedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { getAllItems, useItem, createItem, deleteItem };