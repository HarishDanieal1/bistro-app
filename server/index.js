require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { prisma } = require('./prisma');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Initialize Gemini AI Client
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Helper for Gemini queries with automatic retry on temporary 503 errors
async function generateContentWithRetry(prompt, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      console.warn(`Gemini attempt ${i + 1} failed:`, err.message);
      const isTemporary = err.message.includes('503') || 
                          err.message.includes('Service Unavailable') || 
                          err.message.includes('high demand') ||
                          err.message.includes('overloaded');
      if (isTemporary && i < retries - 1) {
        const waitTime = delay * Math.pow(2, i);
        console.log(`Temporary Gemini error. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
}

// Fallback menu items in case database connection fails
const fallbackMenu = [
  {
    id: 'fallback-1',
    name: 'Classic Wagyu Burger',
    description: 'Premium Wagyu beef patty on a warm toasted brioche bun with melted aged cheddar, crisp leaf lettuce, and house truffle aioli.',
    ingredients: 'Wagyu Beef, Aged Cheddar Cheese, Brioche Bun, Leaf Lettuce, Truffle Aioli, Garlic, Onion',
    price: 18.0,
    icon: '🍔',
    category: 'main',
    available: true,
  },
  {
    id: 'fallback-2',
    name: 'Truffle Fries',
    description: 'Crispy hand-cut golden fries tossed in white truffle oil, grated parmesan cheese, and fresh herbs.',
    ingredients: 'Potatoes, White Truffle Oil, Parmesan Cheese, Sea Salt, Parsley, Herbs',
    price: 10.0,
    icon: '🍟',
    category: 'appetizer',
    available: true,
  },
  {
    id: 'fallback-3',
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce hearts, fresh sourdough garlic croutons, shaved parmesan cheese, tossed in signature creamy Caesar dressing.',
    ingredients: 'Romaine Lettuce, Sourdough Croutons, Parmesan Cheese, Eggs, Anchovies, Garlic, Olive Oil, Lemon Juice',
    price: 14.0,
    icon: '🥗',
    category: 'salad',
    available: true,
  },
  {
    id: 'fallback-4',
    name: 'Sparkling Water',
    description: 'Chilled premium imported sparkling spring water infused with a slice of fresh organic lemon.',
    ingredients: 'Carbonated Spring Water, Organic Lemon Slice',
    price: 4.0,
    icon: '🥤',
    category: 'beverage',
    available: true,
  },
];

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password with bcrypt
    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'customer',
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare hashed password or check plain text fallback for seeded DB accounts
    const isPasswordValid =
      bcrypt.compareSync(password, user.password) ||
      (password === user.password); // Fallback for seeds

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// Welcome Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'The Intelligent Bistro API is fully operational! 🍳✨',
    version: '1.0.0',
    endpoints: {
      auth: ['/api/auth/login', '/api/auth/register'],
      menu: '/api/menu',
      orders: '/api/orders',
      chat: '/api/chat'
    }
  });
});

// ==========================================
// 2. MENU ROUTES (WITH ADMIN CRUD OPERATIONS)
// ==========================================

// Get Menu Items
app.get('/api/menu', async (req, res) => {
  try {
    const { available } = req.query;
    let where = {};
    if (available !== undefined) {
      where.available = available === 'true';
    }
    const items = await prisma.menuItem.findMany({ where });
    
    if (items.length) {
      res.json(items);
    } else {
      const filteredFallback = available !== undefined
        ? fallbackMenu.filter(item => item.available === (available === 'true'))
        : fallbackMenu;
      res.json(filteredFallback);
    }
  } catch (error) {
    console.error('Error fetching menu:', error);
    // Return fallback menu items so the app remains interactive in offline/demo mode
    const { available } = req.query;
    const filteredFallback = available !== undefined
      ? fallbackMenu.filter(item => item.available === (available === 'true'))
      : fallbackMenu;
    res.json(filteredFallback);
  }
});

// Admin: Create Menu Item
app.post('/api/menu', async (req, res) => {
  try {
    const { name, description, price, icon, category, available } = req.body;
    if (!name || !description || price === undefined || !icon || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        icon,
        category,
        available: available !== undefined ? available : true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Create Menu Item Error:', error);
    res.status(500).json({ error: 'Failed to create menu item', details: error.message });
  }
});

// Admin: Update Menu Item
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, icon, category, available } = req.body;
    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        icon,
        category,
        available: available !== undefined ? available : undefined,
      },
    });
    res.json(item);
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ error: 'Failed to update menu item', details: error.message });
  }
});

// Admin: Delete Menu Item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await prisma.menuItem.delete({
      where: { id },
    });
    res.json({ message: 'Menu item deleted successfully', item });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ error: 'Failed to delete menu item', details: error.message });
  }
});

// ==========================================
// 3. ORDER ROUTES
// ==========================================

// Create Order (Checkout)
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order structure' });
    }

    // Resolve userId for anonymous guests to guest@bistro.com
    let finalUserId = userId;
    if (userId === 'guest') {
      const guestUser = await prisma.user.upsert({
        where: { email: 'guest@bistro.com' },
        update: {},
        create: {
          email: 'guest@bistro.com',
          password: 'guest-no-password-login', // secure placeholder
          name: 'Guest Customer',
          role: 'customer',
        },
      });
      finalUserId = guestUser.id;
    }

    // 1. Get menuItem details to compute exact pricing and enforce security
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    const menuMap = new Map(dbMenuItems.map((item) => [item.id, item]));
    let total = 0;
    const orderItems = [];

    // 2. Calculate subtotal & construct relational items
    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId);
      if (!dbItem) {
        return res.status(404).json({ error: `Menu item with ID ${item.menuItemId} not found` });
      }
      if (dbItem.available === false) {
        return res.status(400).json({ error: `Sorry, ${dbItem.name} is currently sold out and cannot be ordered.` });
      }
      total += dbItem.price * item.quantity;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: dbItem.price,
      });
    }

    // 3. Create the Order inside a transaction block
    const order = await prisma.order.create({
      data: {
        userId: finalUserId,
        total,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Get Order History (Optionally filter by user ID)
app.get('/api/orders', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};

    const orders = await prisma.order.findMany({
      where: filter,
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// ==========================================
// 3.5. ADMIN CONSOLE SPECIFIC ROUTES
// ==========================================

// Admin: Get Registered Customers Directory
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'customer' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map aggregate spend and order statistics
    const formattedUsers = users.map((u) => {
      const totalSpend = u.orders.reduce((acc, o) => acc + o.total, 0);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        orderCount: u.orders.length,
        totalSpend,
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Fetch Admin Users Error:', error);
    res.status(500).json({ error: 'Failed to retrieve customer directory', details: error.message });
  }
});

// Admin: Get Revenue & Category Analytics (Weekly curves + category breakdowns)
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    // Compute core analytics parameters
    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const averageTicket = orders.length ? totalSales / orders.length : 0;

    // Sales by food category
    const categorySales = { main: 0, appetizer: 0, salad: 0, dessert: 0, beverage: 0 };
    for (const order of orders) {
      for (const item of order.items) {
        const cat = item.menuItem ? item.menuItem.category : 'main';
        if (categorySales[cat] !== undefined) {
          categorySales[cat] += item.price * item.quantity;
        } else {
          categorySales['main'] += item.price * item.quantity;
        }
      }
    }

    // Weekly sales trends: group orders by day of week
    const weekdayMap = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (const order of orders) {
      const date = new Date(order.createdAt);
      const dayName = weekdays[date.getDay()];
      weekdayMap[dayName] += order.total;
    }

    const weeklyTrend = weekdays.map(day => ({
      day,
      revenue: weekdayMap[day],
    }));

    res.json({
      totalSales,
      completedOrders,
      pendingOrders,
      averageTicket,
      categorySales,
      weeklyTrend,
    });
  } catch (error) {
    console.error('Fetch Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics', details: error.message });
  }
});

// Admin: Fetch all table orders in the restaurant
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Fetch Admin Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch all orders', details: error.message });
  }
});

// Admin: Update Order Status (Prepare, Complete, Cancel)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
});

// ==========================================
// 4. AI CONVERSATIONAL WAITER ROUTE
// ==========================================
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, preferences } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Fetch live menu items from Supabase dynamically
    let liveMenu = [];
    try {
      liveMenu = await prisma.menuItem.findMany();
    } catch (e) {
      console.warn('Prisma menu load failed, using fallback.');
    }
    if (!liveMenu.length) {
      liveMenu = fallbackMenu;
    }

    // 2. Format live menu list as structured instructions for Gemini
    const menuDescription = liveMenu
      .map((item) => `- ID: "${item.id}", Name: "${item.name}", Category: "${item.category}", Price: $${item.price}, Ingredients: "${item.ingredients || 'None'}", Available: ${item.available !== false ? 'Yes' : 'No'}`)
      .join('\n');

    // 3. Format customer dining assistant preferences
    let preferencesPrompt = '';
    if (preferences) {
      const { dietary, spice, allergies, tasteNote } = preferences;
      preferencesPrompt = `
CUSTOMER PERSONAL CULINARY PROFILE (Dining Assistant Mode):
- Dietary Restrictions: ${dietary || 'None'}
- Spice Tolerance: ${spice || 'Medium'}
- Allergies & Intolerances: ${allergies && allergies.length > 0 ? allergies.join(', ') : 'None'}
- Custom Taste Preferences & Culinary Dream: "${tasteNote || 'None'}"

YOUR ADDITIONAL ROLE AS A CULINARY ASSISTANT:
You are the customer's personal dietary guardian and taste curator. You must actively inspect their choices and conversation inputs against their profile:
1. ALLERGY & DIETARY ALERTS (CRITICAL SAFETY):
   - If the customer tries to order a menu item containing one of their declared allergies (e.g., ordering fries/burger when they have a Gluten allergy, or items containing cheese/parmesan/milk when they have a Dairy allergy, or dishes containing nuts/peanuts/tree nuts when they have a Nut allergy) or violating their dietary preference (e.g. ordering Classic Wagyu Burger when they are Vegan/Vegetarian):
     - DO NOT perform the "ADD" action. Instead, set the "action" to "CHAT".
     - In the "message", alert them of the dietary conflict immediately in a concerned but extremely professional manner (e.g., "I notice you have a Dairy allergy, and our Truffle Fries are tossed in parmesan. Would you like them prepared without cheese, or perhaps our house salad instead?").
     - Suggest a safe substitution from our active menu or custom adjustments (e.g. "made with gluten-free buns" or "without cheese").
     - If the customer explicitly requests a safe modification (e.g., "Wagyu Burger on a gluten-free bun" or "Truffle Fries without parmesan"), you may proceed with the "ADD" action, but acknowledge their customization in your response message so they know the kitchen will accommodate it.
2. SPICE COMPLIANCE:
   - If their spice tolerance is "Mild" and they order or ask about a potentially spicy item, remind them that you can request the kitchen to prepare it extra mild.
3. TASTE CURATION (CRAFT THE CUSTOMER'S DREAM MEAL):
   - Pay close attention to their custom taste preferences and culinary dreams. Recommend dishes and drinks from the menu that match their description. Explain exactly why these choices fit their dream culinary profile!
`;
    }

    // 4. Define clear, deterministic Waiter behavior
    const systemPrompt = `
You are the interactive AI Waiter for 'The Intelligent Bistro' mobile restaurant ordering app. 
Your goal is to parse customer ordering intents and return structured JSON actions to update their cart.

OUR ACTIVE MENU ITEMS (Synchronized from Database):
${menuDescription}
${preferencesPrompt}

JSON OUTPUT RULES:
You must ALWAYS respond in a VALID, PARSABLE JSON object. Do not include markdown code block syntax (like \`\`\`json). Just return the raw JSON object string.

The JSON object must have these keys:
1. "action": One of "ADD", "REMOVE", "CLEAR", or "CHAT".
   - Use "ADD" when user wants to add items to their order. (CRITICAL: You must NEVER add an item if its Available status is "No". If they try to add a sold out/unavailable item, you must set "action" to "CHAT" and politely explain in the "message" that the item is currently sold out and recommend another similar dish).
   - Use "REMOVE" when user wants to remove items or decrease quantities.
   - Use "CLEAR" if they say "empty my cart", "start over", or similar.
   - Use "CHAT" if they are just chatting, asking details about the menu, or ordering something we don't serve.
2. "items": (Required for "ADD" and "REMOVE" actions) An array of objects:
   - { "menuItemId": "exact-database-id-from-menu", "quantity": number }
3. "message": A warm, natural waiter reply (max 2 sentences) acknowledging the order or answering their questions.
   - E.g. for ADD: "Sure thing! I have added 2 Wagyu Burgers and 1 order of Truffle Fries to your cart."
   - E.g. if ordering a sold out/unavailable item: "I'm sorry, but our Truffle Fries are currently sold out. Can I interest you in our Classic Wagyu Burger instead?"
   - E.g. if ordering something not served: "I apologize, but we don't serve that item. Would you like to try our signature Classic Wagyu Burger instead?"

CONTEXT AWARENESS:
The user might refine a previous order (e.g. "make that two" or "nevermind, take off the drink").
Review the conversation history if provided to resolve quantities correctly.

Example Inputs & Outputs:
Input: "I want a wagyu burger and 2 truffle fries please"
Output: { "action": "ADD", "items": [{ "menuItemId": "seeded-item-id-for-wagyu-burger", "quantity": 1 }, { "menuItemId": "seeded-item-id-for-truffle-fries", "quantity": 2 }], "message": "Excellent choice! I've added a Wagyu Burger and two orders of Truffle Fries to your cart." }
`;

    // 5. Assemble the prompt context with system instructions and user history
    let contextHistory = '';
    if (history && Array.isArray(history)) {
      contextHistory = history.map((h) => `${h.sender === 'user' ? 'Customer' : 'AI Waiter'}: ${h.text}`).join('\n') + '\n';
    }

    const fullPrompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${contextHistory}Customer: ${message}\nOutput (strictly raw JSON):`;

    const result = await generateContentWithRetry(fullPrompt);
    const responseText = result.response.text().trim();

    // 5. Clean up any accidental markdown blocks that Gemini sometimes outputs
    let cleanedText = responseText;
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn('AI failed to output valid JSON, wrapping as CHAT fallback:', responseText);
      jsonResponse = {
        action: 'CHAT',
        message: responseText,
      };
    }

    res.json(jsonResponse);
  } catch (error) {
    console.error('AI Waiter Error:', error);
    res.status(500).json({ error: 'Internal AI Waiter error', details: error.message });
  }
});

// ==========================================
// 5. START SERVER
// ==========================================
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;