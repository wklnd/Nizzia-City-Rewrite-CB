#!/usr/bin/env node
/*
 Quick seed for Market: creates an NPC seller with items in the item market,
 one pet listing, and one property listing.
 Safe to re-run: uses upserts and skips duplicates when present.
*/

require('dotenv').config()
const mongoose = require('mongoose')
const connectDB = require('../../config/db')
const User = require('../../models/User')
const Player = require('../../models/Player')
const Counter = require('../../models/Counter')
const Item = require('../../models/Item')
const ItemMarket = require('../../models/ItemMarket')
const Pets = require('../../models/Pets')
const PetMarket = require('../../models/PetMarket')
const PropertyMarket = require('../../models/PropertyMarket')

async function getNextPlayerId(){
  const result = await Counter.findOneAndUpdate(
    { name: 'player' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return result.seq
}

async function ensureBot(){
  const email = 'market-bot@example.com'
  let user = await User.findOne({ email })
  if (!user){
    user = await User.create({ name: 'Market Bot', email, password: 'market-bot' })
    console.log('Created bot user', user._id.toString())
  }
  let player = await Player.findOne({ user: user._id })
  if (!player){
    const nextId = await getNextPlayerId()
    player = await Player.create({ user: user._id, name: 'Market Bot', id: nextId, gender: 'Enby', npc: true, level: 99, money: 1_000_000_000 })
    console.log('Created bot player', player.id)
  }
  return { user, player }
}

async function ensureItem(id, name, type, price){
  let item = await Item.findOne({ id: String(id) })
  if (!item){
    item = await Item.create({ id: String(id), name, type, price: Number(price||0), sellable: true, usable: false })
    console.log('Created item', id, name)
  }
  return item
}

async function upsertInventory(player, item, qty){
  const arr = Array.from(player.inventory || [])
  const idx = arr.findIndex(e => String(e.item) === String(item._id))
  if (idx >= 0) arr[idx].qty = Number(arr[idx].qty||0) + Number(qty||0)
  else arr.push({ item: item._id, qty: Number(qty||0) })
  player.inventory = arr
  await player.save()
}

async function seedItemListings(player){
  const i1 = await ensureItem('1', 'Xanax', 'drugs', 820000)
  const i2 = await ensureItem('2', 'Bat', 'weapon', 250)
  const i3 = await ensureItem('3', 'Glock 15', 'weapon', 1200)

  await upsertInventory(player, i1, 10)
  await upsertInventory(player, i2, 5)
  await upsertInventory(player, i3, 3)

  // Create listings if none exist for this seller and itemId
  const toList = [
    { item: i1, amount: 5, price: 900000 },
    { item: i2, amount: 2, price: 1000 },
    { item: i3, amount: 1, price: 3500 },
  ]
  for (const l of toList){
    const exists = await ItemMarket.findOne({ itemId: l.item.id, sellerId: player._id })
    if (exists) continue
    // Deduct from inventory to mirror controller behavior
    const inv = Array.from(player.inventory || [])
    const idx = inv.findIndex(e => String(e.item) === String(l.item._id))
    if (idx < 0 || Number(inv[idx].qty||0) < l.amount) continue
    inv[idx].qty = Number(inv[idx].qty||0) - l.amount
    if (inv[idx].qty <= 0) inv.splice(idx, 1)
    player.inventory = inv
    await player.save()
    await ItemMarket.create({ itemId: l.item.id, price: l.price, amountAvailable: l.amount, sellerId: player._id })
    console.log('Listed item', l.item.id, 'x', l.amount, 'for', l.price)
  }
}

async function seedPetListing(player){
  // Ensure bot owns a pet
  let pet = await Pets.findOne({ ownerId: player.user })
  if (!pet){
    pet = await Pets.create({ ownerId: player.user, name: 'Buddy', type: 'dog', age: 10, happyBonus: 10, petstoreCost: 10000 })
    console.log('Created bot pet', pet.name)
  }
  if (pet.listed) return
  const existing = await PetMarket.findOne({ pet: pet._id })
  if (existing) return
  pet.listed = true
  await pet.save()
  await PetMarket.create({ pet: pet._id, price: 50000, sellerId: player._id })
  console.log('Listed pet', pet.name, 'for', 50000)
}

function ensurePropertyOwned(player, propertyId){
  const arr = Array.from(player.properties || [])
  const has = arr.some(e => e.propertyId === propertyId)
  if (!has){ arr.push({ propertyId, upgrades: {}, acquiredAt: new Date() }) }
  player.properties = arr
}

async function seedPropertyListing(player){
  // Give the bot a couple of properties and set home
  ensurePropertyOwned(player, 'apartment')
  ensurePropertyOwned(player, 'house')
  ensurePropertyOwned(player, 'silo')
  if (!player.home || player.home === 'trailer') player.home = 'apartment'
  await player.save()

  // List 'house' if not already listed; don't list active home or trailer
  const already = await PropertyMarket.findOne({ sellerId: player._id, propertyId: 'house' })
  if (!already){
    // Remove one 'house' entry from owned properties
    const arr = Array.from(player.properties || [])
    const idx = arr.findIndex(e => e.propertyId === 'house')
    if (idx >= 0){
      const entry = arr.splice(idx, 1)[0]
      player.properties = arr
      await player.save()
      const upgrades = {}
      if (entry?.upgrades){
        if (typeof entry.upgrades.forEach === 'function') entry.upgrades.forEach((v,k)=>{ upgrades[k]=Number(v||0) })
        else Object.entries(entry.upgrades).forEach(([k,v])=>{ upgrades[k]=Number(v||0) })
      }
      await PropertyMarket.create({ propertyId: 'house', upgrades, price: 2_750_000, sellerId: player._id })
      console.log('Listed property house for', 2_750_000)
    }
  }
}

async function main(){
  await connectDB()
  try {
    const { player } = await ensureBot()
    await seedItemListings(player)
    await seedPetListing(player)
    await seedPropertyListing(player)
    console.log('Seed complete.')
  } catch (e){
    console.error('Seed failed:', e)
  } finally {
    await mongoose.disconnect()
  }
}

if (require.main === module){
  main()
}
