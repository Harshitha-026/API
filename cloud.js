const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB URI and Database
const uri = 'mongodb://localhost:27017'; // MongoDB URI (local instance)
const dbName = 'storeDB'; // Database name

// MongoDB collections
let db, productsCollection, ordersCollection;

// Connect to MongoDB
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        productsCollection = db.collection('products');
        ordersCollection = db.collection('orders');
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('Error connecting to MongoDB:', err));

app.use(express.json()); // For parsing application/json

// Get all products with optional filters (category, price range)
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

// Create a new product
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

// Update an existing product by ID
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

// Delete a product by ID
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

// Create a new order
app.post('/api/v1/orders', async (req, res) => {
    const { productIds, customerId } = req.body;
    
    try {
        // Fetch the products to check their availability
        const products = await productsCollection.find({ _id: { $in: productIds.map(id => ObjectId(id)) } }).toArray();
        
        // Check if any product is out of stock
        if (products.some(product => product.stock <= 0)) {
            return res.status(400).json({ message: "One or more products are out of stock." });
        }

        // Create a new order
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

// Get an order by ID
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

// Get all orders for a specific customer
app.get('/api/v1/customers/:customerId/orders', async (req, res) => {
    const { customerId } = req.params;

    try {
        const customerOrders = await ordersCollection.find({ customerId: Number(customerId) }).toArray();
        res.json(customerOrders);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving orders' });
    }
});

// Update the status of an order by ID
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

// Delete an order by ID
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
