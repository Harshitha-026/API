const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;
const uri = 'mongodb://localhost:27017'; 
const dbName = 'storeDB'; 
let db, productsCollection, ordersCollection;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        productsCollection = db.collection('products');
        ordersCollection = db.collection('orders');
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('Error connecting to MongoDB:', err));

app.use(express.json()); 

app.get('/api/v1/products', async (req, res) => {
    const { category, minPrice, maxPrice } = req.query;

    const query = {};
    if (category) query.category = category;
    if (minPrice) query.price = { $gte: Number(minPrice) };
    if (maxPrice) query.price = { $lte: Number(maxPrice) };

    try {
        const products = await productsCollection.find(query).toArray();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving products' });
    }
});

app.post('/api/v1/products', async (req, res) => {
    const { name, price, description, category, stock } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({ message: "Name, price, and category are required." });
    }

    const newProduct = { name, price, description, category, stock };

    try {
        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json({ id: result.insertedId, ...newProduct });
    } catch (err) {
        res.status(500).json({ message: 'Error creating product' });
    }
});

app.put('/api/v1/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category, stock } = req.body;

    const updatedProduct = {};
    if (name !== undefined) updatedProduct.name = name;
    if (price !== undefined) updatedProduct.price = price;
    if (description !== undefined) updatedProduct.description = description;
    if (category !== undefined) updatedProduct.category = category;
    if (stock !== undefined) updatedProduct.stock = stock;

    try {
        const result = await productsCollection.updateOne(
            { _id: ObjectId(id) },
            { $set: updatedProduct }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Product not found." });
        }
        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/api/v1/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await productsCollection.deleteOne({ _id: ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Product not found." });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});

app.post('/api/v1/orders', async (req, res) => {
    const { productIds, customerId } = req.body;
    
    try {
        const products = await productsCollection.find({ _id: { $in: productIds.map(id => ObjectId(id)) } }).toArray();
        
        if (products.some(product => product.stock <= 0)) {
            return res.status(400).json({ message: "One or more products are out of stock." });
        }

        const newOrder = {
            customerId,
            products: products.map(product => product._id),
            status: 'Pending',
        };

        const result = await ordersCollection.insertOne(newOrder);
        res.status(201).json({ id: result.insertedId, ...newOrder });
    } catch (err) {
        res.status(500).json({ message: 'Error creating order' });
    }
});

app.get('/api/v1/orders/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const order = await ordersCollection.findOne({ _id: ObjectId(id) });
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving order' });
    }
});

app.get('/api/v1/customers/:customerId/orders', async (req, res) => {
    const { customerId } = req.params;

    try {
        const customerOrders = await ordersCollection.find({ customerId: Number(customerId) }).toArray();
        res.json(customerOrders);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving orders' });
    }
});

app.put('/api/v1/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await ordersCollection.updateOne(
            { _id: ObjectId(id) },
            { $set: { status } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Order not found." });
        }
        res.json({ status });
    } catch (err) {
        res.status(500).json({ message: 'Error updating order status' });
    }
});

app.delete('/api/v1/orders/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await ordersCollection.deleteOne({ _id: ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Order not found." });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Error deleting order' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
