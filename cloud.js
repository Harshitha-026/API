const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json()); 
let products = [];
let orders = [];
app.get('/api/v1/products', (req, res) => {
    const { category, minPrice, maxPrice } = req.query;
    let filteredProducts = [...products];
    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    if (minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= Number(maxPrice));
    }
    res.json(filteredProducts);
});
app.post('/api/v1/products', (req, res) => {
    const { name, price, description, category, stock } = req.body;
    if (!name || !price || !category) {
        return res.status(400).json({ message: "Name, price, and category are required." });
    }
    const newProduct = {
        id: products.length + 1, 
        name,
        price,
        description,
        category,
        stock,
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});
app.put('/api/v1/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, description, category, stock } = req.body;
    const product = products.find(p => p.id === Number(id));
    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;
    res.json(product);
});
app.delete('/api/v1/products/:id', (req, res) => {
    const { id } = req.params;
    const productIndex = products.findIndex(p => p.id === Number(id));
    if (productIndex === -1) {
        return res.status(404).json({ message: "Product not found." });
    }
    products.splice(productIndex, 1);
    res.status(204).send();
});
app.post('/api/v1/orders', (req, res) => {
    const { productIds, customerId } = req.body;
    const orderItems = [];
    for (const productId of productIds) {
        const product = products.find(p => p.id === productId);
        if (!product || product.stock <= 0) {
            return res.status(400).json({ message: `Product with ID ${productId} is not available.` });
        }
        orderItems.push(product);
    }
    const newOrder = {
        id: orders.length + 1, 
        customerId,
        products: orderItems,
        status: 'Pending',
    };
    orders.push(newOrder);
    res.status(201).json(newOrder);
});
app.get('/api/v1/orders/:id', (req, res) => {
    const { id } = req.params;
    const order = orders.find(o => o.id === Number(id));
    if (!order) {
        return res.status(404).json({ message: "Order not found." });
    }
    res.json(order);
});
app.get('/api/v1/customers/:customerId/orders', (req, res) => {
    const { customerId } = req.params;
    const customerOrders = orders.filter(o => o.customerId === Number(customerId));
    res.json(customerOrders);
});
app.put('/api/v1/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = orders.find(o => o.id === Number(id));
    if (!order) {
        return res.status(404).json({ message: "Order not found." });
    }
    order.status = status; 
    res.json(order);
});
app.delete('/api/v1/orders/:id', (req, res) => {
    const { id } = req.params;
    const orderIndex = orders.findIndex(o => o.id === Number(id));
    if (orderIndex === -1) {
        return res.status(404).json({ message: "Order not found." });
    }
    orders.splice(orderIndex, 1);
    res.status(204).send();
});
app.post('/api/v1/products/:id/inventory', (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    const product = products.find(p => p.id === Number(id));
    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }
    product.stock += stock; 
    res.json(product);
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});