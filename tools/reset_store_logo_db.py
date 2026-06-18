import os
from pymongo import MongoClient

def main():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    
    # Read .env file manually
    env_vars = {}
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.split('=', 1)
                env_vars[key.strip()] = val.strip()

    mongodb_url = env_vars.get('MONGODB_URL', 'mongodb://localhost:27017')
    database_name = env_vars.get('DATABASE_NAME', 'Mian_Sons_hardware_db')

    print(f"Connecting to database: {database_name}...")
    client = MongoClient(mongodb_url)
    try:
        db = client[database_name]
        settings_col = db['settings']
        
        # Check if store_info exists
        doc = settings_col.find_one({'_id': 'store_info'})
        if doc:
            print("Found store_info document. Current value:")
            print(doc)
            
            # Update logoUrl inside the document
            # If the schema stores it directly or under a 'value' dict, we update both to be safe
            update_fields = {'logoUrl': '/images/store-logo.png'}
            if 'value' in doc and isinstance(doc['value'], dict):
                update_fields['value.logoUrl'] = '/images/store-logo.png'
                
            res = settings_col.update_one({'_id': 'store_info'}, {'$set': update_fields})
            print(f"Update result: matched={res.matched_count}, modified={res.modified_count}")
            print("Successfully updated database logo settings to use default '/images/store-logo.png'.")
        else:
            print("store_info document not found in settings collection.")
            
    except Exception as e:
        print("Failed to update database:", e)
    finally:
        client.close()

if __name__ == '__main__':
    main()
