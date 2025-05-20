/**
 * This file contains a custom fix to move the SO44041 order from MO1958338 to MO1961127
 * in the production_schedule.json file
 */

const fs = require('fs');
const path = require('path');

// Path to the production schedule JSON file
const filePath = path.join(__dirname, '../production_schedule.json');

// Read the file
console.log('Reading production schedule file...');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Find the product with MO1958338 and MO1961127
console.log('Looking for C2SRKEN469469 product...');
const productKey = '[C2SRKEN469469] CAJA 2 SOPORTES RECEPCION KENZA 4.69X4.69';

let numChanges = 0;

// Iterate through all warehouses to find the product
for (const warehouseName in data) {
  if (data[warehouseName][productKey]) {
    console.log(`Found product in warehouse: ${warehouseName}`);
    const product = data[warehouseName][productKey];
    
    // Find the MOs
    const mo1958338 = product.MOs.find(mo => mo.name === 'MO1958338');
    const mo1961127 = product.MOs.find(mo => mo.name === 'MO1961127');
    
    if (mo1958338 && mo1961127) {
      console.log('Found both MOs, checking for SO44041...');
      
      // Check if SO44041 exists in MO1958338
      if (mo1958338.pedidos && mo1958338.pedidos.SO44041) {
        console.log('Found SO44041 in MO1958338, moving to MO1961127...');
        
        // Move the order to MO1961127
        if (!mo1961127.pedidos) {
          mo1961127.pedidos = {};
        }
        
        mo1961127.pedidos.SO44041 = mo1958338.pedidos.SO44041;
        
        // Remove from MO1958338
        delete mo1958338.pedidos.SO44041;
        
        numChanges++;
        console.log('Successfully moved SO44041 to MO1961127');
      } else {
        console.log('SO44041 not found in MO1958338 pedidos');
      }
    } else {
      console.log('Could not find both MOs');
    }
  }
}

// Write the updated data back to the file
if (numChanges > 0) {
  console.log(`Made ${numChanges} changes, writing back to file...`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('File updated successfully!');
} else {
  console.log('No changes made, file not updated.');
}