const mongoose = require('mongoose');
const Player = require('../models/Player');
const Item = require('../models/Item');
const ItemMarket = require('../models/ItemMarket');
const PetMarket = require('../models/PetMarket');
const PropertyMarket = require('../models/PropertyMarket');
const Pets = require('../models/Pets');
const propertyService = require('../services/propertyService');



async function getListings(req, res){
  try {
    const { itemId, sellerId } = Object.assign({}, req.query);
    const q = {};
    if (itemId) q.itemId = String(itemId);
    if (sellerId) {
      const p = await Player.findById(sellerId);
      if (!p) return res.status(404).json({ error: 'Seller not found' });
      q.sellerId = p._id;
    }
  const rows = await ItemMarket.find(q).sort({ price: 1 }).lean();
    // Attach item meta (name, type)
    const itemIds = Array.from(new Set(rows.map(r => r.itemId)));
    const items = await Item.find({ id: { $in: itemIds } }).lean();
    const map = new Map(items.map(i => [i.id, i]));
    // Attach seller names
    const sellerIds = Array.from(new Set(rows.map(r => String(r.sellerId))));
    const sellers = await Player.find({ _id: { $in: sellerIds } }).select({ _id: 1, id: 1, name: 1 }).lean();
    const sMap = new Map(sellers.map(s => [String(s._id), s]));
    const out = rows.map(r => ({
      id: String(r._id),
      itemId: r.itemId,
      price: r.price,
      amountAvailable: r.amountAvailable,
      sellerId: String(r.sellerId),
      seller: sMap.get(String(r.sellerId))
        ? { id: String(r.sellerId), playerId: sMap.get(String(r.sellerId)).id, name: sMap.get(String(r.sellerId)).name }
        : { id: String(r.sellerId) },
      item: map.get(r.itemId) ? { id: map.get(r.itemId).id, name: map.get(r.itemId).name, type: map.get(r.itemId).type } : null,
    }));
    res.json({ listings: out });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function listItem(req, res){
  try {
    const userId = req.authUserId;
    const { itemId, qty, price } = req.body || {};
    const quantity = Math.max(1, Number(qty || 1));
    const unitPrice = Number(price || 0);
    if (!itemId || unitPrice <= 0) return res.status(400).json({ error: 'itemId and positive price are required' });

    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    // Resolve item by custom id (string) or _id
    let item = null;
    if (mongoose.Types.ObjectId.isValid(itemId)) item = await Item.findById(itemId);
    if (!item) item = await Item.findOne({ id: String(itemId) });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check inventory
    const inv = player.inventory || [];
    const idx = inv.findIndex(e => String(e.item) === String(item._id));
    if (idx < 0 || Number(inv[idx].qty || 0) < quantity) {
      return res.status(400).json({ error: 'Not enough quantity in inventory' });
    }

    // Deduct and create listing
    inv[idx].qty = Number(inv[idx].qty || 0) - quantity;
    if (inv[idx].qty <= 0) inv.splice(idx, 1);
    player.inventory = inv;
    await player.save();

    const row = await ItemMarket.create({ itemId: item.id, price: unitPrice, amountAvailable: quantity, sellerId: player._id });
    res.json({ ok: true, listing: { id: String(row._id), itemId: row.itemId, price: row.price, amountAvailable: row.amountAvailable } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function cancelListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const listing = await ItemMarket.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (String(listing.sellerId) !== String(player._id)) return res.status(403).json({ error: 'Not your listing' });
    const remaining = Number(listing.amountAvailable || 0);

    if (remaining > 0){
      const item = await Item.findOne({ id: listing.itemId });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      // Return to inventory (upsert)
      const inv = player.inventory || [];
      const idx = inv.findIndex(e => String(e.item) === String(item._id));
      if (idx >= 0) inv[idx].qty = Number(inv[idx].qty||0) + remaining;
      else inv.push({ item: item._id, qty: remaining });
      player.inventory = inv;
      await player.save();
    }
    await ItemMarket.deleteOne({ _id: listing._id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function buyFromListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId, qty } = req.body || {};
    const quantity = Math.max(1, Number(qty || 1));
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });

    const buyer = await Player.findOne({ user: userId });
    if (!buyer) return res.status(404).json({ error: 'Player not found' });

    const listing = await ItemMarket.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (Number(listing.amountAvailable || 0) < quantity) return res.status(400).json({ error: 'Not enough available' });

    const total = Number(listing.price || 0) * quantity;
    if (Number(buyer.money || 0) < total) return res.status(400).json({ error: 'Not enough money' });

    // Resolve item and seller
    const [item, seller] = await Promise.all([
      Item.findOne({ id: listing.itemId }),
      Player.findById(listing.sellerId)
    ]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Transfer money and items
    buyer.$locals._txMeta = { type: 'purchase', description: `Bought ${quantity}x ${item.name || 'item'} from market` };
    buyer.money = Number(buyer.money||0) - total;
    const binv = buyer.inventory || [];
    const bidx = binv.findIndex(e => String(e.item) === String(item._id));
    if (bidx >= 0) binv[bidx].qty = Number(binv[bidx].qty||0) + quantity;
    else binv.push({ item: item._id, qty: quantity });
    buyer.inventory = binv;

    if (seller && String(seller._id) !== String(buyer._id)) {
      seller.$locals._txMeta = { type: 'sale', description: `Sold ${quantity}x ${item.name || 'item'} on market` };
      seller.money = Number(seller.money||0) + total;
    }

    listing.amountAvailable = Number(listing.amountAvailable||0) - quantity;

    // Save
    await buyer.save();
    if (seller) await seller.save();
    if (listing.amountAvailable <= 0) await ItemMarket.deleteOne({ _id: listing._id });
    else await listing.save();

    res.json({ ok: true, money: buyer.money });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { getListings, listItem, buyFromListing, cancelListing };
// --- Pets Market ---
async function listPet(req, res){
  try {
    const userId = req.authUserId;
    const { price } = req.body || {};
    const unitPrice = Number(price||0);
    if (unitPrice <= 0) return res.status(400).json({ error: 'Positive price is required' });
    const seller = await Player.findOne({ user: userId });
    if (!seller) return res.status(404).json({ error: 'Player not found' });
    const pet = await Pets.findOne({ ownerId: seller.user });
    if (!pet) return res.status(404).json({ error: 'No pet to list' });
    if (pet.listed) return res.status(400).json({ error: 'Pet is already listed' });
    // Mark listed
    pet.listed = true; await pet.save();
    const row = await PetMarket.create({ pet: pet._id, price: unitPrice, sellerId: seller._id });
    res.json({ ok: true, listing: { id: String(row._id), price: row.price } });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function getPetListings(req, res){
  try {
    const rows = await PetMarket.find({}).sort({ price: 1 }).lean();
    const petIds = rows.map(r => r.pet);
    const pets = await Pets.find({ _id: { $in: petIds } }).lean();
    const pMap = new Map(pets.map(p => [String(p._id), p]));
    const sellerIds = Array.from(new Set(rows.map(r => String(r.sellerId))));
    const sellers = await Player.find({ _id: { $in: sellerIds } }).select({ _id: 1, id: 1, name: 1 }).lean();
    const sMap = new Map(sellers.map(s => [String(s._id), s]));
    const out = rows.map(r => {
      const pet = pMap.get(String(r.pet));
      const s = sMap.get(String(r.sellerId));
      return {
        id: String(r._id),
        price: r.price,
        sellerId: String(r.sellerId),
        seller: s ? { id: String(s._id), playerId: s.id, name: s.name } : { id: String(r.sellerId) },
        pet: pet ? { id: String(pet._id), name: pet.name, type: pet.type, happyBonus: pet.happyBonus, age: pet.age } : null,
      };
    });
    res.json({ listings: out });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function cancelPetListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });
    const seller = await Player.findOne({ user: userId });
    if (!seller) return res.status(404).json({ error: 'Player not found' });
    const row = await PetMarket.findById(listingId);
    if (!row) return res.status(404).json({ error: 'Listing not found' });
    if (String(row.sellerId) !== String(seller._id)) return res.status(403).json({ error: 'Not your listing' });
    const pet = await Pets.findById(row.pet);
    if (pet) { pet.listed = false; await pet.save(); }
    await PetMarket.deleteOne({ _id: row._id });
    res.json({ ok: true });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function buyPetListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });
    const buyer = await Player.findOne({ user: userId });
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    const row = await PetMarket.findById(listingId);
    if (!row) return res.status(404).json({ error: 'Listing not found' });
    const seller = await Player.findById(row.sellerId);
    const pet = await Pets.findById(row.pet);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (!pet.listed) return res.status(400).json({ error: 'Pet is no longer listed' });
    // Ensure buyer does not already own a pet
    const existing = await Pets.findOne({ ownerId: buyer.user });
    if (existing) return res.status(400).json({ error: 'Buyer already owns a pet' });
    const price = Number(row.price||0);
    if (Number(buyer.money||0) < price) return res.status(400).json({ error: 'Not enough money' });
    // Transfer
    buyer.$locals._txMeta = { type: 'purchase', description: `Bought pet from market` };
    buyer.money = Number(buyer.money||0) - price;
    if (seller && String(seller._id) !== String(buyer._id)) {
      seller.$locals._txMeta = { type: 'sale', description: `Sold pet on market` };
      seller.money = Number(seller.money||0) + price;
      await seller.save();
    }
    pet.ownerId = buyer.user; pet.listed = false; await pet.save();
    await buyer.save();
    await PetMarket.deleteOne({ _id: row._id });
    res.json({ ok: true, money: buyer.money });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

// --- Property Market ---
async function listProperty(req, res){
  try {
    const userId = req.authUserId;
    const { propertyId, price } = req.body || {};
    const unitPrice = Number(price||0);
    if (!propertyId || unitPrice <= 0) return res.status(400).json({ error: 'propertyId and positive price are required' });
    if (propertyId === 'trailer') return res.status(400).json({ error: 'Cannot list your starter trailer' });
    const seller = await Player.findOne({ user: userId });
    if (!seller) return res.status(404).json({ error: 'Player not found' });
    if (seller.home === propertyId) return res.status(400).json({ error: 'Cannot list your active home' });
    const arr = Array.from(seller.properties || []);
    const idx = arr.findIndex(p => p.propertyId === propertyId);
    if (idx < 0) return res.status(404).json({ error: 'Property not owned' });
    const entry = arr.splice(idx, 1)[0];
    seller.properties = arr; await seller.save();
    const upgrades = {};
    if (entry?.upgrades){
      if (typeof entry.upgrades.forEach === 'function') entry.upgrades.forEach((v,k)=>{ upgrades[k]=Number(v||0); });
      else Object.entries(entry.upgrades).forEach(([k,v])=>{ upgrades[k]=Number(v||0); });
    }
    const row = await PropertyMarket.create({ propertyId, upgrades, price: unitPrice, sellerId: seller._id });
    res.json({ ok: true, listing: { id: String(row._id), propertyId, price: unitPrice } });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function getPropertyListings(req, res){
  try {
    const rows = await PropertyMarket.find({}).sort({ price: 1 }).lean();
    const sellerIds = Array.from(new Set(rows.map(r => String(r.sellerId))));
    const sellers = await Player.find({ _id: { $in: sellerIds } }).select({ _id: 1, id: 1, name: 1 }).lean();
    const sMap = new Map(sellers.map(s => [String(s._id), s]));
    const PROPS = await propertyService.getCatalog();
    const out = rows.map(r => ({
      id: String(r._id),
      propertyId: r.propertyId,
      property: { id: r.propertyId, name: PROPS[r.propertyId]?.name || r.propertyId, baseHappyMax: PROPS[r.propertyId]?.baseHappyMax || 0 },
      upgrades: r.upgrades || {},
      price: r.price,
      sellerId: String(r.sellerId),
      seller: sMap.get(String(r.sellerId)) ? { id: String(r.sellerId), playerId: sMap.get(String(r.sellerId)).id, name: sMap.get(String(r.sellerId)).name } : { id: String(r.sellerId) },
    }));
    res.json({ listings: out });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function cancelPropertyListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });
    const seller = await Player.findOne({ user: userId });
    if (!seller) return res.status(404).json({ error: 'Player not found' });
    const row = await PropertyMarket.findById(listingId);
    if (!row) return res.status(404).json({ error: 'Listing not found' });
    if (String(row.sellerId) !== String(seller._id)) return res.status(403).json({ error: 'Not your listing' });
    // Return the property entry to seller
    const entry = { propertyId: row.propertyId, upgrades: row.upgrades || {}, acquiredAt: new Date() };
    const props = Array.from(seller.properties || []); props.push(entry); seller.properties = props; await seller.save();
    await PropertyMarket.deleteOne({ _id: row._id });
    res.json({ ok: true });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function buyPropertyListing(req, res){
  try {
    const userId = req.authUserId;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: 'listingId is required' });
    const buyer = await Player.findOne({ user: userId });
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    const row = await PropertyMarket.findById(listingId);
    if (!row) return res.status(404).json({ error: 'Listing not found' });
    const seller = await Player.findById(row.sellerId);
    const price = Number(row.price||0);
    if (Number(buyer.money||0) < price) return res.status(400).json({ error: 'Not enough money' });
    buyer.$locals._txMeta = { type: 'purchase', description: `Bought property from market` };
    buyer.money = Number(buyer.money||0) - price;
    if (seller && String(seller._id) !== String(buyer._id)) { seller.$locals._txMeta = { type: 'sale', description: 'Sold property on market' }; seller.money = Number(seller.money||0) + price; await seller.save(); }
    const props = Array.from(buyer.properties || []);
    props.push({ propertyId: row.propertyId, upgrades: row.upgrades || {}, acquiredAt: new Date() });
    buyer.properties = props; await buyer.save();
    await PropertyMarket.deleteOne({ _id: row._id });
    res.json({ ok: true, money: buyer.money });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

module.exports.listPet = listPet;
module.exports.getPetListings = getPetListings;
module.exports.cancelPetListing = cancelPetListing;
module.exports.buyPetListing = buyPetListing;
module.exports.listProperty = listProperty;
module.exports.getPropertyListings = getPropertyListings;
module.exports.cancelPropertyListing = cancelPropertyListing;
module.exports.buyPropertyListing = buyPropertyListing;
