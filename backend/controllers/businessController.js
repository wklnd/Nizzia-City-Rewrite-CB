const bizService = require('../services/businessService');

async function catalog(req, res) {
  try {
    const list = await bizService.getCatalog();
    res.json({ catalog: list });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function myBusinesses(req, res) {
  try {
    const list = await bizService.getMyBusinesses(req.authUserId);
    res.json({ businesses: list });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function buy(req, res) {
  try {
    const result = await bizService.buyBusiness(req.authUserId, req.body.businessId);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function sell(req, res) {
  try {
    const result = await bizService.sellBusiness(req.authUserId, req.body.bizId);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function upgrade(req, res) {
  try {
    const result = await bizService.upgradeBusiness(req.authUserId, req.body.bizId);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function hire(req, res) {
  try {
    const count = Number(req.body.count) || 1;
    const result = await bizService.hireStaff(req.authUserId, req.body.bizId, count);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function fire(req, res) {
  try {
    const count = Number(req.body.count) || 1;
    const result = await bizService.fireStaff(req.authUserId, req.body.bizId, count);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function collect(req, res) {
  try {
    const result = await bizService.collectIncome(req.authUserId, req.body.bizId);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function collectAll(req, res) {
  try {
    const result = await bizService.collectAll(req.authUserId);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function rename(req, res) {
  try {
    const result = await bizService.renameBusiness(req.authUserId, req.body.bizId, req.body.name);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = { catalog, myBusinesses, buy, sell, upgrade, hire, fire, collect, collectAll, rename };
