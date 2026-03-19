var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

async function ensureInventory(productId) {
    let product = await productModel.findOne({
        _id: productId,
        isDeleted: false
    });

    if (!product) {
        return null;
    }

    let inventory = await inventoryModel.findOneAndUpdate(
        {
            product: productId
        },
        {
            $setOnInsert: {
                product: productId
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    ).populate({
        path: 'product'
    });

    return inventory;
}

function validateProductAndQuantity(req, res) {
    let product = req.body.product;
    let quantity = Number(req.body.quantity);

    if (!mongoose.Types.ObjectId.isValid(product)) {
        res.status(400).send({
            message: 'PRODUCT ID IS INVALID'
        });
        return null;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        res.status(400).send({
            message: 'QUANTITY MUST BE GREATER THAN 0'
        });
        return null;
    }

    return {
        product,
        quantity
    };
}

router.get('/', async function (req, res) {
    let data = await inventoryModel.find().populate({
        path: 'product'
    });
    res.send(data);
});

router.get('/:id', async function (req, res) {
    try {
        let id = req.params.id;
        let result = await inventoryModel.findById(id).populate({
            path: 'product'
        });

        if (result) {
            res.send(result)
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: error.message
        })
    }
});

router.post('/add-stock', async function (req, res) {
    try {
        let payload = validateProductAndQuantity(req, res);
        if (!payload) {
            return;
        }

        let inventory = await ensureInventory(payload.product);
        if (!inventory) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        let result = await inventoryModel.findOneAndUpdate(
            {
                product: payload.product
            },
            {
                $inc: {
                    stock: payload.quantity
                }
            },
            {
                new: true
            }
        ).populate({
            path: 'product'
        });

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        })
    }
});

router.post('/remove-stock', async function (req, res) {
    try {
        let payload = validateProductAndQuantity(req, res);
        if (!payload) {
            return;
        }

        let inventory = await ensureInventory(payload.product);
        if (!inventory) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        let result = await inventoryModel.findOneAndUpdate(
            {
                product: payload.product,
                stock: {
                    $gte: payload.quantity
                }
            },
            {
                $inc: {
                    stock: -payload.quantity
                }
            },
            {
                new: true
            }
        ).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'STOCK IS NOT ENOUGH'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        })
    }
});

router.post('/reservation', async function (req, res) {
    try {
        let payload = validateProductAndQuantity(req, res);
        if (!payload) {
            return;
        }

        let inventory = await ensureInventory(payload.product);
        if (!inventory) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        let result = await inventoryModel.findOneAndUpdate(
            {
                product: payload.product,
                stock: {
                    $gte: payload.quantity
                }
            },
            {
                $inc: {
                    stock: -payload.quantity,
                    reserved: payload.quantity
                }
            },
            {
                new: true
            }
        ).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'STOCK IS NOT ENOUGH'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        })
    }
});

router.post('/sold', async function (req, res) {
    try {
        let payload = validateProductAndQuantity(req, res);
        if (!payload) {
            return;
        }

        let inventory = await ensureInventory(payload.product);
        if (!inventory) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        let result = await inventoryModel.findOneAndUpdate(
            {
                product: payload.product,
                reserved: {
                    $gte: payload.quantity
                }
            },
            {
                $inc: {
                    reserved: -payload.quantity,
                    soldCount: payload.quantity
                }
            },
            {
                new: true
            }
        ).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'RESERVED IS NOT ENOUGH'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        })
    }
});

module.exports = router;
