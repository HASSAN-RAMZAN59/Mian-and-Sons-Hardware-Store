const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read env file from backend
const envPath = path.join(__dirname, '..', 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

const url = envVars.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = envVars.DATABASE_NAME || 'Mian_Sons_hardware_db';

async function main() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('Connected to MongoDB database...');
    const db = client.db(dbName);
    const settingsCollection = db.collection('settings');
    
    // Find store_info setting
    const storeInfoDoc = await settingsCollection.findOne({ _id: 'store_info' });
    if (storeInfoDoc) {
      console.log('Found store_info document. Current logoUrl length:', storeInfoDoc.logoUrl ? storeInfoDoc.logoUrl.length : 'undefined');
      
      // Update logoUrl to /images/store-logo.png
      await settingsCollection.updateOne(
        { _id: 'store_info' },
        { 
          $set: { 
            logoUrl: '/images/store-logo.png',
            'value.logoUrl': '/images/store-logo.png' // just in case it's nested under value
          } 
        }
      );
      console.log('Successfully updated logoUrl to "/images/store-logo.png" in database!');
    } else {
      console.log('store_info document not found in settings collection.');
    }
  } catch (err) {
    console.error('Database operation failed:', err);
  } finally {
    await client.close();
  }
}

main();
