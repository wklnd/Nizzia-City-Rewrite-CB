const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const {
	getListings, listItem, buyFromListing, cancelListing,
	listPet, getPetListings, buyPetListing, cancelPetListing,
	listProperty, getPropertyListings, buyPropertyListing, cancelPropertyListing,
} = require('../controllers/marketController');

router.get('/listings', getListings);
router.post('/list', requireAuth, listItem);
router.post('/buy', requireAuth, buyFromListing);
router.post('/cancel', requireAuth, cancelListing);

// Pet market
router.get('/listings/pets', getPetListings);
router.post('/list/pet', requireAuth, listPet);
router.post('/buy/pet', requireAuth, buyPetListing);
router.post('/cancel/pet', requireAuth, cancelPetListing);

// Property market
router.get('/listings/properties', getPropertyListings);
router.post('/list/property', requireAuth, listProperty);
router.post('/buy/property', requireAuth, buyPropertyListing);
router.post('/cancel/property', requireAuth, cancelPropertyListing);

module.exports = router;
