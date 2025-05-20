/**
 * Example script to search the generated production_schedule.json file for bill_of_materials
 * Run this with Node.js
 */

const fs = require('fs');
const path = require('path');

// Path to the production schedule JSON file
const filePath = path.join(__dirname, '../../production_schedule.json');

// Load JSON data
let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log('Successfully loaded production_schedule.json');
} catch (error) {
  console.error('Error loading JSON file:', error.message);
  process.exit(1);
}

// Statistics counters
let totalWarehouses = 0;
let totalProducts = 0;
let productsWithBOM = 0;
let totalComponents = 0;

// Results storage
const bomProducts = [];

// Search through the JSON structure
for (const [warehouseName, products] of Object.entries(data)) {
  totalWarehouses++;
  
  for (const [productKey, productInfo] of Object.entries(products)) {
    totalProducts++;
    
    if (productInfo.bill_of_materials && Array.isArray(productInfo.bill_of_materials) && productInfo.bill_of_materials.length > 0) {
      productsWithBOM++;
      totalComponents += productInfo.bill_of_materials.length;
      
      bomProducts.push({
        warehouse: warehouseName,
        product: productKey,
        familia: productInfo.familia,
        grupo: productInfo.grupo,
        linea: productInfo.linea,
        tipo: productInfo.tipo,
        state: productInfo.state,
        components: productInfo.bill_of_materials.map(c => ({
          line_id: c.line_id,
          product_id: c.product_id,
          product_code: c.product_code,
          product_name: c.product_name,
          location_name: c.location_name,
          quantity: c.quantity,
          uom_name: c.uom_name
        }))
      });
    }
  }
}

// Print statistics
console.log('\n===== BOM SEARCH RESULTS =====');
console.log(`Total warehouses: ${totalWarehouses}`);
console.log(`Total products: ${totalProducts}`);
console.log(`Products with BOM: ${productsWithBOM} (${Math.round(productsWithBOM/totalProducts*100)}%)`);
console.log(`Total components: ${totalComponents}`);
console.log(`Average components per BOM: ${(totalComponents/productsWithBOM).toFixed(2)}`);

// Print first 5 products with BOM (for example)
console.log('\n===== SAMPLE PRODUCTS WITH BOM =====');
for (let i = 0; i < Math.min(5, bomProducts.length); i++) {
  const product = bomProducts[i];
  console.log(`\n${i+1}. ${product.product} (${product.warehouse})`);
  console.log(`   Familia: ${product.familia}, Grupo: ${product.grupo}, Línea: ${product.linea}`);
  console.log(`   State: ${product.state}`);
  console.log(`   Components (${product.components.length}):`);
  
  for (let j = 0; j < Math.min(3, product.components.length); j++) {
    const comp = product.components[j];
    console.log(`     - ${comp.product_name} (${comp.product_code}): ${comp.quantity} ${comp.uom_name}`);
    console.log(`       Location: ${comp.location_name}, Line ID: ${comp.line_id}`);
  }
  
  if (product.components.length > 3) {
    console.log(`     - ... and ${product.components.length - 3} more components`);
  }
}

// Save full results to a file
const outputPath = path.join(__dirname, '../../bom_search_results.json');
fs.writeFileSync(outputPath, JSON.stringify(bomProducts, null, 2));
console.log(`\nFull results saved to: ${outputPath}`);

// Example of searching for specific components
function searchComponents(keyword) {
  const results = bomProducts.flatMap(product => 
    product.components
      .filter(comp => 
        comp.product_name.toLowerCase().includes(keyword.toLowerCase()) || 
        comp.product_code.toLowerCase().includes(keyword.toLowerCase())
      )
      .map(comp => ({
        warehouse: product.warehouse,
        product: product.product,
        component: comp
      }))
  );
  
  return results;
}

// Example search
const searchKeyword = 'metal'; // Change this to search for different components
const searchResults = searchComponents(searchKeyword);

console.log(`\n===== SEARCH RESULTS FOR "${searchKeyword}" =====`);
console.log(`Found ${searchResults.length} matching components`);

for (let i = 0; i < Math.min(5, searchResults.length); i++) {
  const result = searchResults[i];
  console.log(`\n${i+1}. ${result.component.product_name} (${result.component.product_code})`);
  console.log(`   Used in: ${result.product}`);
  console.log(`   Warehouse: ${result.warehouse}`);
  console.log(`   Quantity: ${result.component.quantity} ${result.component.uom_name}`);
  console.log(`   Location: ${result.component.location_name}`);
}

// To run a different search:
// 1. Change the searchKeyword variable above
// 2. Run this script with: node example-search.js