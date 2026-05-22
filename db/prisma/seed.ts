import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config' // Ensures your seed script reads your local .env values

// 1. Establish a direct pool connection using your working migration port string
const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)

// 2. Pass the adapter straight into the Prisma Client constructor
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clear existing data
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.user.deleteMany()

  // Create menu items
  const menu = await prisma.menuItem.createMany({
    data: [
      {
        name: 'Truffle Fries',
        description: 'Crispy hand-cut golden fries tossed in white truffle oil, grated parmesan cheese, and fresh herbs.',
        ingredients: 'Potatoes, White Truffle Oil, Parmesan Cheese, Sea Salt, Parsley, Herbs',
        price: 10,
        icon: '🍟',
        category: 'appetizer',
        available: true,
      },
      {
        name: 'Classic Wagyu Burger',
        description: 'Premium Wagyu beef patty on a warm toasted brioche bun with melted aged cheddar, crisp leaf lettuce, and house truffle aioli.',
        ingredients: 'Wagyu Beef, Aged Cheddar Cheese, Brioche Bun, Leaf Lettuce, Truffle Aioli, Garlic, Onion',
        price: 18,
        icon: '🍔',
        category: 'main',
        available: true,
      },
      {
        name: 'Grilled Salmon',
        description: 'Fresh perfectly grilled Atlantic salmon fillet served with lemon-garlic butter glaze.',
        ingredients: 'Atlantic Salmon Fillet, Butter, Lemon Juice, Garlic, Dill, Black Pepper',
        price: 22,
        icon: '🐟',
        category: 'main',
        available: true,
      },
      {
        name: 'Caesar Salad',
        description: 'Crisp romaine lettuce hearts, fresh sourdough garlic croutons, shaved parmesan cheese, tossed in signature creamy Caesar dressing.',
        ingredients: 'Romaine Lettuce, Sourdough Croutons, Parmesan Cheese, Eggs, Anchovies, Garlic, Olive Oil, Lemon Juice',
        price: 14,
        icon: '🥗',
        category: 'salad',
        available: true,
      },
      {
        name: 'Sparkling Water',
        description: 'Chilled premium imported sparkling spring water infused with a slice of fresh organic lemon.',
        ingredients: 'Carbonated Spring Water, Organic Lemon Slice',
        price: 4,
        icon: '💧',
        category: 'beverage',
        available: true,
      },
      {
        name: 'Chocolate Lava Cake',
        description: 'Warm, rich chocolate cake with a molten dark chocolate core, served with fresh raspberries and powdered sugar.',
        ingredients: 'Dark Chocolate, Butter, Sugar, Eggs, Wheat Flour, Fresh Raspberries, Milk, Vanilla Extract',
        price: 12,
        icon: '🍰',
        category: 'dessert',
        available: true,
      },
      {
        name: 'Pan-Seared Ribeye Steak',
        description: 'Prime dry-aged ribeye steak pan-seared with garlic herb butter, served with perfectly grilled asparagus.',
        ingredients: 'Prime Aged Ribeye Beef, Unsalted Butter, Fresh Garlic, Rosemary, Thyme, Asparagus, Black Pepper',
        price: 28,
        icon: '🥩',
        category: 'main',
        available: true,
      },
      {
        name: 'Thai Coconut Soup',
        description: 'Rich and creamy coconut broth infused with lemongrass, fresh ginger, wild shiitake mushrooms, and fresh cilantro.',
        ingredients: 'Coconut Milk, Shiitake Mushrooms, Lemongrass, Ginger, Galangal, Cilantro, Lime Juice',
        price: 11,
        icon: '🥣',
        category: 'appetizer',
        available: true,
      },
      {
        name: 'Lobster Mac & Cheese',
        description: 'Succulent fresh Maine lobster chunks folded in a creamy three-cheese macaroni, baked with a toasted herb breadcrumb crust.',
        ingredients: 'Maine Lobster Chunks, Macaroni Pasta, Cheddar Cheese, Gruyere Cheese, Parmesan Cheese, Cream, Milk, Butter, Wheat Breadcrumbs',
        price: 26,
        icon: '🦞',
        category: 'main',
        available: true,
      },
      {
        name: 'Keto Avocado Salmon Salad',
        description: 'Grilled salmon steak served over a bed of fresh baby spinach, sliced organic avocado, cherry tomatoes, and warm olive-oil vinaigrette.',
        ingredients: 'Atlantic Salmon Fillet, Organic Avocado, Baby Spinach, Cherry Tomatoes, Olive Oil, Lemon Juice, Sea Salt',
        price: 18,
        icon: '🥗',
        category: 'salad',
        available: true,
      },
    ],
  })

  // Create test customer
  await prisma.user.create({
    data: {
      email: 'customer@bistro.com',
      password: 'customer_123', // TODO: Hash this
      name: 'John Customer',
      role: 'customer',
    },
  })

  // Create test admin
  await prisma.user.create({
    data: {
      email: 'admin@bistro.com',
      password: 'admin_123', // TODO: Hash this
      name: 'Admin User',
      role: 'admin',
    },
  })

  console.log('✅ Database seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })