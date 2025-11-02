const express = require('express');
const router = express.Router();
const {
	getListings, listItem, buyFromListing, cancelListing,
	listPet, getPetListings, buyPetListing, cancelPetListing,
	listProperty, getPropertyListings, buyPropertyListing, cancelPropertyListing,
} = require('../controllers/marketController');

router.get('/listings', getListings);
router.post('/list', listItem);
router.post('/buy', buyFromListing);
router.post('/cancel', cancelListing);

// Pet market
router.get('/listings/pets', getPetListings);
router.post('/list/pet', listPet);
router.post('/buy/pet', buyPetListing);
router.post('/cancel/pet', cancelPetListing);

// Property market
router.get('/listings/properties', getPropertyListings);
router.post('/list/property', listProperty);
router.post('/buy/property', buyPropertyListing);
router.post('/cancel/property', cancelPropertyListing);

module.exports = router;
