const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('http://localhost:8000/products');
    const products = Array.isArray(res.data) ? res.data : [];
    console.log('Total products:', products.length);
    const categoryProducts = new Map();
    products.forEach(p => {
      const cat = p.category || '';
      if (!categoryProducts.has(cat)) {
        categoryProducts.set(cat, []);
      }
      categoryProducts.get(cat).push(p.name);
    });

    console.log('\n--- Products in DB ---');
    for (const [cat, names] of categoryProducts.entries()) {
      console.log(`\nCategory: "${cat}"`);
      names.forEach(name => console.log(`  - ${name}`));
    }
  } catch (err) {
    console.error('Error fetching products:', err.message);
  }
}

main();
